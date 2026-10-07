begin;

-- Phase 5 Slice 4A.1: global platform identity roots and immutable PAT/PHY identifiers.
-- Clinical patients remain therapist-owned charts. This migration does not use
-- public.patients.user_id as linkage authority and does not grant patient access
-- to any clinical or financial table.

create sequence public.platform_patient_public_id_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1
  maxvalue 999999999999
  cache 1
  no cycle;

create sequence public.physiotherapist_public_id_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1
  maxvalue 999999999999
  cache 1
  no cycle;

revoke all privileges on sequence
  public.platform_patient_public_id_seq,
  public.physiotherapist_public_id_seq
from public, anon, authenticated, service_role;

create table public.platform_patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete restrict,
  public_patient_id text not null unique,
  created_at timestamptz not null default now(),
  constraint platform_patients_public_patient_id_format_check
    check (public_patient_id ~ '^PAT-[0-9]{12}$')
);

alter table public.platform_patients enable row level security;

revoke all privileges on table public.platform_patients
  from public, anon, authenticated, service_role;
grant select on table public.platform_patients to authenticated, service_role;

create policy platform_patients_select_self
on public.platform_patients
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
      from public.app_users au
     where au.id = (select auth.uid())
       and au.role = 'patient'
  )
);

alter table public.physiotherapists
  add column public_physio_id text;

create table public.platform_identity_assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_type text not null check (assignment_type in ('PAT', 'PHY')),
  subject_id uuid not null,
  public_identifier text not null unique,
  assigned_at timestamptz not null default now(),
  provenance text not null default 'database_provisioning'
    check (provenance = 'database_provisioning'),
  constraint platform_identity_assignments_subject_key
    unique (assignment_type, subject_id),
  constraint platform_identity_assignments_identifier_format_check
    check (
      (assignment_type = 'PAT' and public_identifier ~ '^PAT-[0-9]{12}$')
      or
      (assignment_type = 'PHY' and public_identifier ~ '^PHY-[0-9]{12}$')
    )
);

alter table public.platform_identity_assignments enable row level security;

revoke all privileges on table public.platform_identity_assignments
  from public, anon, authenticated, service_role;
grant select on table public.platform_identity_assignments to service_role;

create or replace function private.assign_platform_patient_public_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select au.role
    into v_role
    from public.app_users au
   where au.id = new.user_id;

  if v_role is distinct from 'patient' then
    raise exception 'Platform patient identity requires a persisted patient role.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
      from public.physiotherapists p
     where p.user_id = new.user_id
  ) then
    raise exception 'Physiotherapist identity cannot receive a platform patient identity.'
      using errcode = '23514';
  end if;

  new.public_patient_id := 'PAT-' || lpad(
    nextval('public.platform_patient_public_id_seq'::regclass)::text,
    12,
    '0'
  );
  new.created_at := now();
  return new;
end;
$$;

create trigger platform_patients_assign_public_id
before insert on public.platform_patients
for each row execute function private.assign_platform_patient_public_id();

create or replace function private.reject_platform_patient_identity_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Platform patient identities are immutable.'
    using errcode = '55000';
end;
$$;

create trigger platform_patients_reject_mutation
before update or delete on public.platform_patients
for each row execute function private.reject_platform_patient_identity_mutation();

create or replace function private.assign_physiotherapist_public_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.public_physio_id := 'PHY-' || lpad(
    nextval('public.physiotherapist_public_id_seq'::regclass)::text,
    12,
    '0'
  );
  return new;
end;
$$;

create trigger physiotherapists_assign_public_id
before insert on public.physiotherapists
for each row execute function private.assign_physiotherapist_public_id();

create or replace function private.audit_platform_patient_identifier_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.platform_identity_assignments (
    assignment_type,
    subject_id,
    public_identifier,
    assigned_at,
    provenance
  ) values (
    'PAT',
    new.id,
    new.public_patient_id,
    now(),
    'database_provisioning'
  );
  return new;
end;
$$;

create trigger platform_patients_audit_identifier_assignment
after insert on public.platform_patients
for each row execute function private.audit_platform_patient_identifier_assignment();

create or replace function private.audit_physiotherapist_identifier_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.platform_identity_assignments (
      assignment_type,
      subject_id,
      public_identifier,
      assigned_at,
      provenance
    ) values (
      'PHY',
      new.id,
      new.public_physio_id,
      now(),
      'database_provisioning'
    );
  elsif old.public_physio_id is null and new.public_physio_id is not null then
    insert into public.platform_identity_assignments (
      assignment_type,
      subject_id,
      public_identifier,
      assigned_at,
      provenance
    ) values (
      'PHY',
      new.id,
      new.public_physio_id,
      now(),
      'database_provisioning'
    );
  end if;
  return new;
end;
$$;

create trigger physiotherapists_audit_identifier_assignment
after insert or update of public_physio_id on public.physiotherapists
for each row execute function private.audit_physiotherapist_identifier_assignment();

-- Stable database-side ordering gives existing therapists a deterministic
-- assignment order. The sequence is global, non-cycling, and never reused.
do $$
declare
  v_physio_id uuid;
  v_public_physio_id text;
begin
  for v_physio_id in
    select p.id
      from public.physiotherapists p
     where p.public_physio_id is null
     order by p.created_at, p.id
  loop
    v_public_physio_id := 'PHY-' || lpad(
      nextval('public.physiotherapist_public_id_seq'::regclass)::text,
      12,
      '0'
    );

    update public.physiotherapists
       set public_physio_id = v_public_physio_id
     where id = v_physio_id
       and public_physio_id is null;
  end loop;
end;
$$;

alter table public.physiotherapists
  alter column public_physio_id set not null,
  add constraint physiotherapists_public_physio_id_key unique (public_physio_id),
  add constraint physiotherapists_public_physio_id_format_check
    check (public_physio_id ~ '^PHY-[0-9]{12}$');

create or replace function private.reject_physiotherapist_public_id_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.public_physio_id is distinct from new.public_physio_id then
    raise exception 'Physiotherapist public identifier is immutable.'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger physiotherapists_reject_public_id_mutation
before update of public_physio_id on public.physiotherapists
for each row execute function private.reject_physiotherapist_public_id_mutation();

create or replace function private.reject_platform_identity_assignment_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Platform identity assignment audit is append-only.'
    using errcode = '55000';
end;
$$;

create trigger platform_identity_assignments_append_only
before update or delete on public.platform_identity_assignments
for each row execute function private.reject_platform_identity_assignment_mutation();

create or replace function private.ensure_platform_patient_identity(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_platform_patient_id uuid;
begin
  select au.role
    into v_role
    from public.app_users au
   where au.id = target_user_id;

  if v_role is distinct from 'patient' then
    raise exception 'Platform patient provisioning requires a persisted patient role.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
      from public.physiotherapists p
     where p.user_id = target_user_id
  ) then
    raise exception 'Patient account cannot own a physiotherapist identity.'
      using errcode = '23514';
  end if;

  select pp.id
    into v_platform_patient_id
    from public.platform_patients pp
   where pp.user_id = target_user_id;

  if v_platform_patient_id is not null then
    return v_platform_patient_id;
  end if;

  insert into public.platform_patients (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing
  returning id into v_platform_patient_id;

  if v_platform_patient_id is null then
    select pp.id
      into v_platform_patient_id
      from public.platform_patients pp
     where pp.user_id = target_user_id;
  end if;

  if v_platform_patient_id is null then
    raise exception 'Unable to resolve platform patient identity.'
      using errcode = '55000';
  end if;

  return v_platform_patient_id;
end;
$$;

-- Backfill only persisted patient-account identities. No clinical chart is
-- created and no public.patients.user_id value is read or modified.
do $$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select au.id
      from public.app_users au
     where au.role = 'patient'
     order by au.created_at, au.id
  loop
    perform private.ensure_platform_patient_identity(v_user_id);
  end loop;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  account_type text;
  persisted_role text;
  new_physio_id uuid;
begin
  account_type := private.resolve_initial_auth_account_type(new.raw_user_meta_data);

  insert into public.app_users (id, role)
  values (new.id, account_type)
  on conflict (id) do nothing;

  select au.role
    into persisted_role
    from public.app_users au
   where au.id = new.id;

  if persisted_role is distinct from account_type then
    raise exception 'Auth identity provisioning role conflict.'
      using errcode = '23514';
  end if;

  if persisted_role = 'patient' then
    if exists (
      select 1
        from public.physiotherapists p
       where p.user_id = new.id
    ) then
      raise exception 'Patient Auth identity cannot own a physiotherapist identity.'
        using errcode = '23514';
    end if;

    perform private.ensure_platform_patient_identity(new.id);
    return new;
  end if;

  insert into public.physiotherapists (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  select p.id
    into new_physio_id
    from public.physiotherapists p
   where p.user_id = new.id;

  if new_physio_id is null then
    raise exception 'Unable to resolve physiotherapist identity during Auth provisioning.'
      using errcode = '23514';
  end if;

  insert into public.physiotherapist_profiles (physio_id, email)
  values (new_physio_id, coalesce(new.email, ''))
  on conflict (physio_id) do nothing;

  insert into public.physiotherapist_settings (physio_id)
  values (new_physio_id)
  on conflict (physio_id) do nothing;

  return new;
end;
$$;

create or replace function public.get_my_platform_patient_identity()
returns table (
  id uuid,
  public_patient_id text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
begin
  if v_user_id is null then
    raise exception 'Platform patient identity requires authentication.'
      using errcode = '42501';
  end if;

  select au.role
    into v_role
    from public.app_users au
   where au.id = v_user_id;

  if v_role is distinct from 'patient' then
    raise exception 'Platform patient identity is available only to patient accounts.'
      using errcode = '42501';
  end if;

  return query
  select pp.id, pp.public_patient_id, pp.created_at
    from public.platform_patients pp
   where pp.user_id = v_user_id;

  if not found then
    raise exception 'Platform patient identity is not provisioned.'
      using errcode = '55000';
  end if;
end;
$$;

revoke all privileges on function private.assign_platform_patient_public_id()
  from public, anon, authenticated, service_role;
revoke all privileges on function private.reject_platform_patient_identity_mutation()
  from public, anon, authenticated, service_role;
revoke all privileges on function private.assign_physiotherapist_public_id()
  from public, anon, authenticated, service_role;
revoke all privileges on function private.audit_platform_patient_identifier_assignment()
  from public, anon, authenticated, service_role;
revoke all privileges on function private.audit_physiotherapist_identifier_assignment()
  from public, anon, authenticated, service_role;
revoke all privileges on function private.reject_physiotherapist_public_id_mutation()
  from public, anon, authenticated, service_role;
revoke all privileges on function private.reject_platform_identity_assignment_mutation()
  from public, anon, authenticated, service_role;
revoke all privileges on function private.ensure_platform_patient_identity(uuid)
  from public, anon, authenticated, service_role;

revoke all privileges on function public.handle_new_auth_user()
  from public, anon, authenticated, service_role;
grant execute on function public.handle_new_auth_user() to service_role;

revoke all privileges on function public.get_my_platform_patient_identity()
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_platform_patient_identity() to authenticated, service_role;

commit;