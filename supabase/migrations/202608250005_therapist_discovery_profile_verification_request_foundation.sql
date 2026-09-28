begin;

-- Phase 5 Slice 3A: therapist-owned discovery management and professional
-- verification-request foundation. Reviewer approve/reject authority is not
-- introduced here.

alter table public.physiotherapist_professional_verifications
  add column requested_at timestamptz;

alter table public.physiotherapist_professional_verifications
  add constraint professional_verification_pending_requested_at_check
  check (verification_status <> 'pending' or requested_at is not null);

-- Broad service areas are unique after normalization so equivalent casing
-- cannot produce duplicate public geography entries for one therapist.
create unique index physiotherapist_service_areas_physio_normalized_unique_idx
  on public.physiotherapist_service_areas (
    physio_id,
    lower(btrim(locality)),
    lower(btrim(city)),
    lower(btrim(state)),
    upper(btrim(country_code))
  );

-- Preserve the established credential-change invalidation behavior and also
-- clear the submission timestamp so a stale pending request cannot survive a
-- credential change.
create or replace function private.invalidate_professional_verification_on_credential_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.qualification is distinct from new.qualification
     or old.registration is distinct from new.registration
     or old.registration_authority is distinct from new.registration_authority then
    update public.physiotherapist_professional_verifications
       set verification_status = 'unverified',
           requested_at = null,
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

-- Browser callers never supply a physiotherapist id. The persisted app role
-- and physiotherapist ownership mapping are the authorization authority.
create function public.request_my_professional_verification()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_physio_id uuid;
  v_qualification text;
  v_registration text;
  v_registration_authority text;
  v_status text;
  v_requested_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Professional verification requires an authenticated physiotherapist.'
      using errcode = '42501';
  end if;

  select p.id
    into v_physio_id
    from public.app_users au
    join public.physiotherapists p on p.user_id = au.id
   where au.id = v_user_id
     and au.role = 'physio';

  if v_physio_id is null then
    raise exception 'Professional verification is available only to physiotherapist accounts.'
      using errcode = '42501';
  end if;

  select pp.qualification, pp.registration, pp.registration_authority
    into v_qualification, v_registration, v_registration_authority
    from public.physiotherapist_profiles pp
   where pp.physio_id = v_physio_id;

  if nullif(btrim(coalesce(v_qualification, '')), '') is null
     or nullif(btrim(coalesce(v_registration, '')), '') is null
     or nullif(btrim(coalesce(v_registration_authority, '')), '') is null then
    raise exception 'Complete qualification, registration number, and registration authority before requesting verification.'
      using errcode = '22023';
  end if;

  insert into public.physiotherapist_professional_verifications (physio_id)
  values (v_physio_id)
  on conflict (physio_id) do nothing;

  select pv.verification_status, pv.requested_at
    into v_status, v_requested_at
    from public.physiotherapist_professional_verifications pv
   where pv.physio_id = v_physio_id
   for update;

  if v_status = 'verified' then
    raise exception 'Professional verification is already complete.'
      using errcode = '22023';
  end if;

  if v_status = 'pending' then
    return jsonb_build_object(
      'verification_status', v_status,
      'requested_at', v_requested_at
    );
  end if;

  if v_status not in ('unverified', 'rejected') then
    raise exception 'Professional verification request state is invalid.'
      using errcode = '22023';
  end if;

  update public.physiotherapist_professional_verifications
     set verification_status = 'pending',
         requested_at = now(),
         verification_method = '',
         reviewed_at = null,
         reviewed_by = null,
         rejection_reason = ''
   where physio_id = v_physio_id
  returning verification_status, requested_at
       into v_status, v_requested_at;

  return jsonb_build_object(
    'verification_status', v_status,
    'requested_at', v_requested_at
  );
end;
$$;

revoke all privileges on function public.request_my_professional_verification()
  from public, anon, authenticated, service_role;
grant execute on function public.request_my_professional_verification()
  to authenticated;

-- Transactionally replaces the current therapist's patient-safe discovery
-- draft. The browser cannot choose another physio_id and cannot submit any
-- professional-verification, contact, billing, payment or clinical fields.
create function public.save_my_therapist_discovery_profile(
  p_display_name text,
  p_headline text,
  p_bio text,
  p_clinic_name text,
  p_is_discoverable boolean,
  p_service_modes text[],
  p_service_areas jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_physio_id uuid;
  v_display_name text := btrim(coalesce(p_display_name, ''));
  v_headline text := btrim(coalesce(p_headline, ''));
  v_bio text := btrim(coalesce(p_bio, ''));
  v_clinic_name text := btrim(coalesce(p_clinic_name, ''));
  v_is_discoverable boolean := coalesce(p_is_discoverable, false);
  v_service_modes text[] := coalesce(p_service_modes, '{}'::text[]);
  v_service_areas jsonb := coalesce(p_service_areas, '[]'::jsonb);
  v_area jsonb;
  v_locality text;
  v_city text;
  v_state text;
  v_country_code text;
begin
  if v_user_id is null then
    raise exception 'Discovery profile management requires an authenticated physiotherapist.'
      using errcode = '42501';
  end if;

  select p.id
    into v_physio_id
    from public.app_users au
    join public.physiotherapists p on p.user_id = au.id
   where au.id = v_user_id
     and au.role = 'physio';

  if v_physio_id is null then
    raise exception 'Discovery profile management is available only to physiotherapist accounts.'
      using errcode = '42501';
  end if;

  if char_length(v_display_name) > 120
     or char_length(v_headline) > 200
     or char_length(v_bio) > 2000
     or char_length(v_clinic_name) > 160 then
    raise exception 'Discovery profile text exceeds the permitted length.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from unnest(v_service_modes) as requested_mode(service_mode)
     where requested_mode.service_mode is null
        or requested_mode.service_mode not in ('home_visit', 'clinic_visit', 'telephysiotherapy')
  ) then
    raise exception 'Unsupported therapist service mode.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_service_areas) <> 'array' then
    raise exception 'Service areas must be supplied as an array.'
      using errcode = '22023';
  end if;

  for v_area in select value from jsonb_array_elements(v_service_areas)
  loop
    if jsonb_typeof(v_area) <> 'object' then
      raise exception 'Each service area must be an object.'
        using errcode = '22023';
    end if;

    if exists (
      select 1
        from jsonb_object_keys(v_area) as area_key(key)
       where area_key.key not in ('locality', 'city', 'state', 'country_code')
    ) then
      raise exception 'Service area contains unsupported fields.'
        using errcode = '22023';
    end if;

    v_locality := btrim(coalesce(v_area ->> 'locality', ''));
    v_city := btrim(coalesce(v_area ->> 'city', ''));
    v_state := btrim(coalesce(v_area ->> 'state', ''));
    v_country_code := upper(coalesce(nullif(btrim(v_area ->> 'country_code'), ''), 'IN'));

    if char_length(v_locality) not between 1 and 120
       or char_length(v_city) not between 1 and 100
       or char_length(v_state) not between 1 and 100
       or v_country_code !~ '^[A-Z]{2}$' then
      raise exception 'Service area contains invalid locality, city, state, or country.'
        using errcode = '22023';
    end if;
  end loop;

  if exists (
    select 1
      from (
        select
          lower(btrim(area.value ->> 'locality')) as locality,
          lower(btrim(area.value ->> 'city')) as city,
          lower(btrim(area.value ->> 'state')) as state,
          upper(coalesce(nullif(btrim(area.value ->> 'country_code'), ''), 'IN')) as country_code,
          count(*) as duplicate_count
        from jsonb_array_elements(v_service_areas) as area(value)
        group by 1, 2, 3, 4
        having count(*) > 1
      ) duplicates
  ) then
    raise exception 'Duplicate service areas are not allowed.'
      using errcode = '22023';
  end if;

  if v_is_discoverable and v_display_name = '' then
    raise exception 'A display name is required before enabling public discovery.'
      using errcode = '22023';
  end if;

  if v_is_discoverable and not exists (select 1 from unnest(v_service_modes)) then
    raise exception 'At least one service mode is required before enabling public discovery.'
      using errcode = '22023';
  end if;

  if v_is_discoverable and jsonb_array_length(v_service_areas) = 0 then
    raise exception 'At least one service area is required before enabling public discovery.'
      using errcode = '22023';
  end if;

  delete from public.physiotherapist_service_modes
   where physio_id = v_physio_id;

  insert into public.physiotherapist_service_modes (physio_id, service_mode, is_enabled)
  select v_physio_id, requested_mode.service_mode, true
    from (
      select distinct service_mode
        from unnest(v_service_modes) as service_mode
    ) requested_mode;

  delete from public.physiotherapist_service_areas
   where physio_id = v_physio_id;

  insert into public.physiotherapist_service_areas (
    physio_id,
    locality,
    city,
    state,
    country_code,
    is_active
  )
  select
    v_physio_id,
    btrim(area.value ->> 'locality'),
    btrim(area.value ->> 'city'),
    btrim(area.value ->> 'state'),
    upper(coalesce(nullif(btrim(area.value ->> 'country_code'), ''), 'IN')),
    true
  from jsonb_array_elements(v_service_areas) as area(value);

  insert into public.physiotherapist_discovery_profiles (
    physio_id,
    is_discoverable,
    display_name,
    headline,
    bio,
    clinic_name
  ) values (
    v_physio_id,
    v_is_discoverable,
    v_display_name,
    v_headline,
    v_bio,
    v_clinic_name
  )
  on conflict (physio_id) do update
    set is_discoverable = excluded.is_discoverable,
        display_name = excluded.display_name,
        headline = excluded.headline,
        bio = excluded.bio,
        clinic_name = excluded.clinic_name;
end;
$$;

revoke all privileges on function public.save_my_therapist_discovery_profile(text, text, text, text, boolean, text[], jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.save_my_therapist_discovery_profile(text, text, text, text, boolean, text[], jsonb)
  to authenticated;

-- Keep owner-scoped reads for the professional workspace, but make the two
-- RPCs above the only authenticated browser mutation surface for discovery.
revoke insert, update, delete on table
  public.physiotherapist_discovery_profiles,
  public.physiotherapist_service_modes,
  public.physiotherapist_service_areas
from authenticated;

grant select on table
  public.physiotherapist_discovery_profiles,
  public.physiotherapist_service_modes,
  public.physiotherapist_service_areas
to authenticated;

revoke all privileges on table
  public.physiotherapist_discovery_profiles,
  public.physiotherapist_service_modes,
  public.physiotherapist_service_areas
from public, anon;

drop policy if exists discovery_profiles_owner_all
  on public.physiotherapist_discovery_profiles;
drop policy if exists discovery_profiles_owner_select
  on public.physiotherapist_discovery_profiles;
create policy discovery_profiles_owner_select
on public.physiotherapist_discovery_profiles
for select
to authenticated
using (private.owns_physio(physio_id));

drop policy if exists service_modes_owner_all
  on public.physiotherapist_service_modes;
drop policy if exists service_modes_owner_select
  on public.physiotherapist_service_modes;
create policy service_modes_owner_select
on public.physiotherapist_service_modes
for select
to authenticated
using (private.owns_physio(physio_id));

drop policy if exists service_areas_owner_all
  on public.physiotherapist_service_areas;
drop policy if exists service_areas_owner_select
  on public.physiotherapist_service_areas;
create policy service_areas_owner_select
on public.physiotherapist_service_areas
for select
to authenticated
using (private.owns_physio(physio_id));

commit;
