begin;

-- Phase 5: bounded patient passwordless authentication/session foundation.
-- An Auth user requested as a patient is not a PhysioBill patient until a
-- durable Auth identity is confirmed. Initial intent is recorded privately
-- and never becomes ongoing authorization state.

create table private.patient_auth_provisioning_intents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);

revoke all privileges on table private.patient_auth_provisioning_intents
  from public, anon, authenticated, service_role;

create or replace function private.require_confirmed_patient_auth_identity(
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_email_confirmed_at timestamptz;
  auth_phone_confirmed_at timestamptz;
  has_confirmed_durable_identity boolean;
begin
  select
    u.email_confirmed_at,
    u.phone_confirmed_at
  into
    auth_email_confirmed_at,
    auth_phone_confirmed_at
  from auth.users u
  where u.id = target_user_id
  for update;

  if not found then
    raise exception 'Patient platform identity requires a corresponding Auth identity.'
      using errcode = '23503';
  end if;

  select exists (
    select 1
    from auth.identities i
    where i.user_id = target_user_id
      and (
        (i.provider = 'phone' and auth_phone_confirmed_at is not null)
        or
        (i.provider = 'email' and auth_email_confirmed_at is not null)
      )
  )
  into has_confirmed_durable_identity;

  if not has_confirmed_durable_identity then
    raise exception 'Patient platform identity requires a confirmed durable Auth identity.'
      using errcode = '23514';
  end if;
end;
$$;

revoke all privileges on function private.require_confirmed_patient_auth_identity(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.assign_platform_patient_public_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_role text;
  assigned_value bigint;
begin
  perform private.require_confirmed_patient_auth_identity(new.user_id);

  select au.role
  into resolved_role
  from public.app_users au
  where au.id = new.user_id
  for update;

  if resolved_role is distinct from 'patient' then
    raise exception 'Platform patient identifiers require a patient app_user.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.physiotherapists p
    where p.user_id = new.user_id
  ) then
    raise exception 'Physiotherapist identities cannot receive a patient identifier.'
      using errcode = '23514';
  end if;

  if new.public_patient_id is not null then
    if new.public_patient_id !~ '^PAT-[0-9]{12}$' then
      raise exception 'Invalid platform patient identifier format.'
        using errcode = '22023';
    end if;
    return new;
  end if;

  assigned_value := nextval('public.platform_patient_public_id_seq'::regclass);
  new.public_patient_id := 'PAT-' || lpad(assigned_value::text, 12, '0');
  return new;
end;
$$;

revoke all privileges on function private.assign_platform_patient_public_id()
  from public, anon, authenticated, service_role;

create or replace function private.ensure_platform_patient_identity(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_role text;
  platform_patient_id uuid;
begin
  perform private.require_confirmed_patient_auth_identity(target_user_id);

  select au.role
  into resolved_role
  from public.app_users au
  where au.id = target_user_id
  for update;

  if resolved_role is distinct from 'patient' then
    raise exception 'Platform patient identity requires a patient app_user.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.physiotherapists p
    where p.user_id = target_user_id
  ) then
    raise exception 'Physiotherapist identities cannot receive a patient identifier.'
      using errcode = '23514';
  end if;

  select pp.id
  into platform_patient_id
  from public.platform_patients pp
  where pp.user_id = target_user_id;

  if platform_patient_id is not null then
    return platform_patient_id;
  end if;

  insert into public.platform_patients (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing
  returning id into platform_patient_id;

  if platform_patient_id is null then
    select pp.id
    into platform_patient_id
    from public.platform_patients pp
    where pp.user_id = target_user_id;
  end if;

  if platform_patient_id is null then
    raise exception 'Unable to resolve platform patient identity.'
      using errcode = '23514';
  end if;

  return platform_patient_id;
end;
$$;

revoke all privileges on function private.ensure_platform_patient_identity(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.provision_confirmed_patient(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  persisted_role text;
  platform_patient_id uuid;
begin
  if not exists (
    select 1
    from private.patient_auth_provisioning_intents intent
    where intent.user_id = target_user_id
  ) then
    raise exception 'Confirmed patient provisioning requires recorded initial patient intent.'
      using errcode = '23514';
  end if;

  perform private.require_confirmed_patient_auth_identity(target_user_id);

  if not exists (
    select 1
    from auth.users u
    join auth.identities i
      on i.user_id = u.id
     and i.provider = 'phone'
    where u.id = target_user_id
      and u.phone_confirmed_at is not null
  ) then
    raise exception 'New patient provisioning requires a confirmed phone Auth identity.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.physiotherapists p
    where p.user_id = target_user_id
  ) then
    raise exception 'Physiotherapist identity conflicts with patient provisioning.'
      using errcode = '23514';
  end if;

  insert into public.app_users (id, role)
  values (target_user_id, 'patient')
  on conflict (id) do nothing;

  select au.role
  into persisted_role
  from public.app_users au
  where au.id = target_user_id
  for update;

  if persisted_role is distinct from 'patient' then
    raise exception 'Persisted platform role conflicts with patient provisioning.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.physiotherapists p
    where p.user_id = target_user_id
  ) then
    raise exception 'Physiotherapist identity conflicts with patient provisioning.'
      using errcode = '23514';
  end if;

  platform_patient_id := private.ensure_platform_patient_identity(target_user_id);
  return platform_patient_id;
end;
$$;

revoke all privileges on function private.provision_confirmed_patient(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.enforce_physiotherapist_platform_persona()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  persisted_role text;
begin
  select au.role
  into persisted_role
  from public.app_users au
  where au.id = new.user_id
  for update;

  if persisted_role is distinct from 'physio' then
    raise exception 'Physiotherapist identity requires a physio app_user.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.platform_patients pp
    where pp.user_id = new.user_id
  ) then
    raise exception 'Patient and physiotherapist identities cannot coexist.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function private.enforce_physiotherapist_platform_persona()
  from public, anon, authenticated, service_role;

drop trigger if exists physiotherapists_00_enforce_platform_persona
  on public.physiotherapists;

create trigger physiotherapists_00_enforce_platform_persona
before insert or update of user_id on public.physiotherapists
for each row execute function private.enforce_physiotherapist_platform_persona();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_type text;
  persisted_role text;
  new_physio_id uuid;
begin
  account_type := private.resolve_initial_auth_account_type(new.raw_user_meta_data);

  if account_type = 'patient' then
    insert into private.patient_auth_provisioning_intents (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    -- OTP request alone normally leaves both confirmation timestamps null.
    -- Do not create app_users, platform_patients or consume a PAT here.
    if new.phone_confirmed_at is null then
      return new;
    end if;

    perform private.provision_confirmed_patient(new.id);
    return new;
  end if;

  -- Preserve the accepted physiotherapist signup path.
  insert into public.app_users (id, role)
  values (new.id, account_type)
  on conflict (id) do nothing;

  select au.role
  into persisted_role
  from public.app_users au
  where au.id = new.id
  for update;

  if persisted_role is distinct from account_type then
    raise exception 'Persisted platform role conflicts with requested account_type.'
      using errcode = '23514';
  end if;

  if account_type = 'physio' then
    if exists (
      select 1
      from public.platform_patients pp
      where pp.user_id = new.id
    ) then
      raise exception 'Patient and physiotherapist identities cannot coexist.'
        using errcode = '23514';
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
  end if;

  raise exception 'Unsupported persisted role for Auth provisioning.'
    using errcode = '23514';
end;
$$;

revoke all privileges on function public.handle_new_auth_user()
  from public, anon, authenticated;
grant execute on function public.handle_new_auth_user()
  to service_role;

create or replace function private.handle_patient_auth_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from private.patient_auth_provisioning_intents intent
    where intent.user_id = new.id
  ) then
    return new;
  end if;

  if old.phone_confirmed_at is null and new.phone_confirmed_at is not null then
    perform private.provision_confirmed_patient(new.id);
  end if;

  return new;
end;
$$;

revoke all privileges on function private.handle_patient_auth_confirmation()
  from public, anon, authenticated, service_role;

drop trigger if exists on_auth_patient_identity_confirmed on auth.users;

create trigger on_auth_patient_identity_confirmed
after update of email_confirmed_at, phone_confirmed_at on auth.users
for each row execute function private.handle_patient_auth_confirmation();

commit;
