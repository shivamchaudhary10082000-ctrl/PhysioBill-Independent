begin;

alter table public.physiotherapist_profiles
  add column if not exists registration_authority text not null default '';

create table if not exists public.physiotherapist_professional_verifications (
  physio_id uuid primary key references public.physiotherapists(id) on delete cascade,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  verified_at timestamptz,
  verification_method text not null default '',
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text not null default '',
  verified_qualification text not null default '',
  verified_registration_number text not null default '',
  verified_registration_authority text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professional_verification_verified_credentials_check check (
    verification_status <> 'verified'
    or (
      verified_at is not null
      and length(trim(verified_qualification)) > 0
      and length(trim(verified_registration_number)) > 0
      and length(trim(verified_registration_authority)) > 0
    )
  )
);

alter table public.physiotherapist_professional_verifications enable row level security;

revoke all privileges on table public.physiotherapist_professional_verifications
  from public, anon, authenticated;
grant select on table public.physiotherapist_professional_verifications to authenticated;

drop policy if exists professional_verifications_owner_select
  on public.physiotherapist_professional_verifications;
create policy professional_verifications_owner_select
on public.physiotherapist_professional_verifications
for select
to authenticated
using (private.owns_physio(physio_id));

insert into public.physiotherapist_professional_verifications (physio_id)
select p.id
from public.physiotherapists p
on conflict (physio_id) do nothing;

create or replace function private.ensure_professional_verification_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  insert into public.physiotherapist_professional_verifications (physio_id)
  values (new.id)
  on conflict (physio_id) do nothing;
  return new;
end;
$$;

revoke all privileges on function private.ensure_professional_verification_row()
  from public, anon, authenticated;

drop trigger if exists physiotherapists_ensure_professional_verification
  on public.physiotherapists;
create trigger physiotherapists_ensure_professional_verification
after insert on public.physiotherapists
for each row
execute function private.ensure_professional_verification_row();

create or replace function private.touch_professional_verification_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all privileges on function private.touch_professional_verification_updated_at()
  from public, anon, authenticated;

drop trigger if exists professional_verifications_touch_updated_at
  on public.physiotherapist_professional_verifications;
create trigger professional_verifications_touch_updated_at
before update on public.physiotherapist_professional_verifications
for each row
execute function private.touch_professional_verification_updated_at();

create or replace function private.invalidate_professional_verification_on_credential_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  if old.qualification is distinct from new.qualification
     or old.registration is distinct from new.registration
     or old.registration_authority is distinct from new.registration_authority then
    update public.physiotherapist_professional_verifications
       set verification_status = 'unverified',
           verified_at = null,
           verification_method = '',
           reviewed_at = null,
           reviewed_by = null,
           rejection_reason = '',
           verified_qualification = '',
           verified_registration_number = '',
           verified_registration_authority = ''
     where physio_id = new.physio_id;
  end if;
  return new;
end;
$$;

revoke all privileges on function private.invalidate_professional_verification_on_credential_change()
  from public, anon, authenticated;

drop trigger if exists physiotherapist_profiles_invalidate_verification
  on public.physiotherapist_profiles;
create trigger physiotherapist_profiles_invalidate_verification
after update of qualification, registration, registration_authority
on public.physiotherapist_profiles
for each row
execute function private.invalidate_professional_verification_on_credential_change();

revoke update on table public.physiotherapist_profiles from authenticated;
grant update (
  full_name,
  title,
  qualification,
  registration,
  registration_authority,
  pan,
  gstin,
  phone,
  email,
  address,
  invoice_prefix
) on table public.physiotherapist_profiles to authenticated;

commit;
