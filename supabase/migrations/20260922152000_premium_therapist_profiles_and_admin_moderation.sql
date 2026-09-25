begin;

-- Premium public therapist profiles and a narrow, audited Admin moderation
-- boundary. Patient-facing reads remain allow-listed projections: no contact,
-- account, patient, clinical, billing, or exact-location data is exposed.

alter table public.physiotherapist_discovery_profiles
  add column automated_check_status text not null default 'pending'
    check (automated_check_status in ('pending', 'passed', 'review_required')),
  add column automated_checked_at timestamptz,
  add column automated_check_version integer not null default 0
    check (automated_check_version >= 0);

create table public.therapist_discovery_admin_controls (
  physio_id uuid primary key references public.physiotherapists(id) on delete cascade,
  visibility_status text not null default 'active'
    check (visibility_status in ('active', 'paused')),
  reason text not null default '' check (char_length(reason) <= 1000),
  updated_by_user_id uuid references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);

alter table public.therapist_discovery_admin_controls enable row level security;

revoke all privileges on table public.therapist_discovery_admin_controls
  from public, anon, authenticated, service_role;
grant select, insert, update on table public.therapist_discovery_admin_controls
  to service_role;

create or replace function private.reject_misleading_discovery_claims()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_copy text := lower(
    coalesce(new.display_name, '') || ' ' ||
    coalesce(new.headline, '') || ' ' ||
    coalesce(new.bio, '') || ' ' ||
    coalesce(new.clinic_name, '')
  );
begin
  if v_copy ~
    '(100[[:space:]]*%[[:space:]]*(cure|relief|recovery|success)' ||
    '|guarantee(d)?[[:space:]]+(cure|relief|recovery|result|results|success)' ||
    '|(permanent|miracle|instant)[[:space:]]+(cure|relief|recovery)' ||
    '|(^|[^a-z0-9])(best|no[.]?[[:space:]]*1|number[[:space:]]*one)[[:space:]]+(physio|physiotherapist|physiotherapy)($|[^a-z0-9])' ||
    '|cure(d)?[[:space:]]+(in|within)[[:space:]]+[0-9]+[[:space:]]*(day|days|week|weeks|session|sessions))'
  then
    raise exception 'Public discovery copy contains a prohibited guaranteed or unsupported comparative claim.'
      using errcode = '22023';
  end if;

  if v_copy ~ '(^|[^a-z0-9])[a-z0-9._%+-]+@[a-z0-9.-]+[.][a-z]{2,}([^a-z0-9]|$)'
     or v_copy ~ '(^|[^a-z0-9])(https?://|www[.])'
     or v_copy ~ '(^|[^0-9])[0-9]{10,13}([^0-9]|$)' then
    raise exception 'Public discovery copy must not contain an email address, website, or phone number.'
      using errcode = '22023';
  end if;

  new.automated_check_status := 'passed';
  new.automated_checked_at := now();
  new.automated_check_version := 2;
  return new;
end;
$$;

revoke all privileges on function private.reject_misleading_discovery_claims()
  from public, anon, authenticated, service_role;

drop trigger if exists physiotherapist_discovery_profiles_claim_guard
  on public.physiotherapist_discovery_profiles;

create trigger physiotherapist_discovery_profiles_claim_guard
before insert or update of display_name, headline, bio, clinic_name
on public.physiotherapist_discovery_profiles
for each row execute function private.reject_misleading_discovery_claims();

-- Existing records are conservatively classified before they are eligible for
-- the new public projection. Any suspicious legacy copy is held for review.
update public.physiotherapist_discovery_profiles
set automated_check_status = case
      when lower(coalesce(display_name, '') || ' ' || coalesce(headline, '') || ' ' || coalesce(bio, '') || ' ' || coalesce(clinic_name, '')) ~
        '(100[[:space:]]*%[[:space:]]*(cure|relief|recovery|success)|guarantee(d)?[[:space:]]+(cure|relief|recovery|result|results|success)|(permanent|miracle|instant)[[:space:]]+(cure|relief|recovery)|(^|[^a-z0-9])(best|no[.]?[[:space:]]*1|number[[:space:]]*one)[[:space:]]+(physio|physiotherapist|physiotherapy)($|[^a-z0-9])|cure(d)?[[:space:]]+(in|within)[[:space:]]+[0-9]+[[:space:]]*(day|days|week|weeks|session|sessions)|(^|[^a-z0-9])[a-z0-9._%+-]+@[a-z0-9.-]+[.][a-z]{2,}([^a-z0-9]|$)|(^|[^a-z0-9])(https?://|www[.])|(^|[^0-9])[0-9]{10,13}([^0-9]|$))'
        then 'review_required'
      else 'passed'
    end,
    automated_checked_at = now(),
    automated_check_version = 2;

create or replace function public.search_verified_therapists(
  p_city text default null,
  p_locality text default null,
  p_service_mode text default null
)
returns table (
  physio_id uuid,
  display_name text,
  headline text,
  bio text,
  clinic_name text,
  verified_qualification text,
  verified_registration_authority text,
  verified_registration_number text,
  service_modes text[],
  service_areas jsonb,
  is_verified boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  requested_city text := nullif(btrim(p_city), '');
  requested_locality text := nullif(btrim(p_locality), '');
  requested_service_mode text := nullif(lower(btrim(p_service_mode)), '');
begin
  if requested_service_mode is not null
     and requested_service_mode not in ('home_visit', 'clinic_visit', 'telephysiotherapy') then
    raise exception 'Unsupported therapist discovery service mode.' using errcode = '22023';
  end if;

  return query
  select
    dp.physio_id,
    dp.display_name,
    dp.headline,
    dp.bio,
    dp.clinic_name,
    pv.verified_qualification,
    pv.verified_registration_authority,
    pv.verified_registration_number,
    array(
      select sm.service_mode
      from public.physiotherapist_service_modes sm
      where sm.physio_id = dp.physio_id and sm.is_enabled
      order by sm.service_mode
    )::text[],
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sa.id,
        'locality', sa.locality,
        'city', sa.city,
        'state', sa.state,
        'country_code', sa.country_code
      ) order by lower(btrim(sa.city)), lower(btrim(sa.locality)), sa.id)
      from public.physiotherapist_service_areas sa
      where sa.physio_id = dp.physio_id and sa.is_active
    ), '[]'::jsonb),
    true
  from public.physiotherapist_discovery_profiles dp
  join public.physiotherapist_professional_verifications pv on pv.physio_id = dp.physio_id
  left join public.therapist_discovery_admin_controls control on control.physio_id = dp.physio_id
  where dp.is_discoverable
    and dp.automated_check_status = 'passed'
    and pv.verification_status = 'verified'
    and coalesce(control.visibility_status, 'active') = 'active'
    and (
      (requested_city is null and requested_locality is null)
      or exists (
        select 1 from public.physiotherapist_service_areas location_area
        where location_area.physio_id = dp.physio_id
          and location_area.is_active
          and (requested_city is null or lower(btrim(location_area.city)) = lower(requested_city))
          and (requested_locality is null or lower(btrim(location_area.locality)) = lower(requested_locality))
      )
    )
    and (
      requested_service_mode is null
      or exists (
        select 1 from public.physiotherapist_service_modes requested_mode
        where requested_mode.physio_id = dp.physio_id
          and requested_mode.is_enabled
          and requested_mode.service_mode = requested_service_mode
      )
    )
  order by lower(dp.display_name), dp.physio_id;
end;
$$;

revoke all privileges on function public.search_verified_therapists(text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.search_verified_therapists(text, text, text)
  to anon, authenticated;

create function public.get_verified_therapist_public_profile(p_physio_id uuid)
returns table (
  physio_id uuid,
  display_name text,
  headline text,
  bio text,
  clinic_name text,
  verified_qualification text,
  verified_registration_authority text,
  verified_registration_number text,
  service_modes text[],
  service_areas jsonb,
  is_verified boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    dp.physio_id,
    dp.display_name,
    dp.headline,
    dp.bio,
    dp.clinic_name,
    pv.verified_qualification,
    pv.verified_registration_authority,
    pv.verified_registration_number,
    array(
      select sm.service_mode
      from public.physiotherapist_service_modes sm
      where sm.physio_id = dp.physio_id and sm.is_enabled
      order by sm.service_mode
    )::text[],
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sa.id,
        'locality', sa.locality,
        'city', sa.city,
        'state', sa.state,
        'country_code', sa.country_code
      ) order by lower(btrim(sa.city)), lower(btrim(sa.locality)), sa.id)
      from public.physiotherapist_service_areas sa
      where sa.physio_id = dp.physio_id and sa.is_active
    ), '[]'::jsonb),
    true
  from public.physiotherapist_discovery_profiles dp
  join public.physiotherapist_professional_verifications pv on pv.physio_id = dp.physio_id
  left join public.therapist_discovery_admin_controls control on control.physio_id = dp.physio_id
  where dp.physio_id = p_physio_id
    and dp.is_discoverable
    and dp.automated_check_status = 'passed'
    and pv.verification_status = 'verified'
    and coalesce(control.visibility_status, 'active') = 'active';
$$;

revoke all privileges on function public.get_verified_therapist_public_profile(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_verified_therapist_public_profile(uuid)
  to anon, authenticated;

create or replace function public.get_verified_therapist_availability(
  p_physio_id uuid,
  p_service_mode text default null,
  p_limit integer default 6
)
returns table (
  availability_window_id uuid,
  physio_id uuid,
  service_mode text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_service_mode text := nullif(lower(btrim(p_service_mode)), '');
  v_limit integer := coalesce(p_limit, 6);
begin
  if p_physio_id is null then return; end if;
  if v_service_mode is not null and v_service_mode not in ('home_visit', 'clinic_visit', 'telephysiotherapy') then
    raise exception 'Unsupported availability service mode.' using errcode = '22023';
  end if;
  if v_limit not between 1 and 20 then
    raise exception 'Availability result limit must be between 1 and 20.' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.physiotherapist_discovery_profiles dp
    join public.physiotherapist_professional_verifications pv on pv.physio_id = dp.physio_id
    left join public.therapist_discovery_admin_controls control on control.physio_id = dp.physio_id
    where dp.physio_id = p_physio_id
      and dp.is_discoverable
      and dp.automated_check_status = 'passed'
      and pv.verification_status = 'verified'
      and coalesce(control.visibility_status, 'active') = 'active'
  ) then return; end if;

  return query
  select aw.id, aw.physio_id, aw.service_mode, aw.starts_at, aw.ends_at, aw.timezone_name
  from public.physiotherapist_availability_windows aw
  join public.physiotherapist_service_modes sm
    on sm.physio_id = aw.physio_id and sm.service_mode = aw.service_mode and sm.is_enabled
  where aw.physio_id = p_physio_id
    and aw.is_active
    and aw.ends_at > now()
    and (v_service_mode is null or aw.service_mode = v_service_mode)
  order by aw.starts_at, aw.ends_at, aw.id
  limit v_limit;
end;
$$;

revoke all privileges on function public.get_verified_therapist_availability(uuid, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.get_verified_therapist_availability(uuid, text, integer)
  to anon, authenticated;

create or replace function public.get_verified_therapist_availability_batch(
  p_physio_ids uuid[],
  p_service_mode text default null,
  p_limit_per_therapist integer default 3
)
returns table (
  availability_window_id uuid,
  physio_id uuid,
  service_mode text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_physio_ids uuid[] := coalesce(p_physio_ids, '{}'::uuid[]);
  v_service_mode text := nullif(lower(btrim(p_service_mode)), '');
  v_limit integer := coalesce(p_limit_per_therapist, 3);
begin
  if cardinality(v_physio_ids) > 50 then raise exception 'Availability batch may contain at most 50 therapist identifiers.' using errcode = '22023'; end if;
  if exists (select 1 from unnest(v_physio_ids) requested_id(physio_id) where requested_id.physio_id is null) then
    raise exception 'Availability batch identifiers cannot be null.' using errcode = '22023';
  end if;
  if v_service_mode is not null and v_service_mode not in ('home_visit', 'clinic_visit', 'telephysiotherapy') then
    raise exception 'Unsupported availability service mode.' using errcode = '22023';
  end if;
  if v_limit not between 1 and 6 then raise exception 'Availability batch limit must be between 1 and 6 per therapist.' using errcode = '22023'; end if;
  if cardinality(v_physio_ids) = 0 then return; end if;

  return query
  with requested as (
    select distinct requested_id.physio_id from unnest(v_physio_ids) requested_id(physio_id)
  ), ranked as (
    select aw.id availability_window_id, aw.physio_id, aw.service_mode, aw.starts_at, aw.ends_at, aw.timezone_name,
      row_number() over (partition by aw.physio_id order by aw.starts_at, aw.ends_at, aw.id) availability_rank
    from requested r
    join public.physiotherapist_discovery_profiles dp on dp.physio_id = r.physio_id
      and dp.is_discoverable and dp.automated_check_status = 'passed'
    join public.physiotherapist_professional_verifications pv on pv.physio_id = r.physio_id
      and pv.verification_status = 'verified'
    left join public.therapist_discovery_admin_controls control on control.physio_id = r.physio_id
    join public.physiotherapist_availability_windows aw on aw.physio_id = r.physio_id
      and aw.is_active and aw.ends_at > now()
    join public.physiotherapist_service_modes sm on sm.physio_id = aw.physio_id
      and sm.service_mode = aw.service_mode and sm.is_enabled
    where coalesce(control.visibility_status, 'active') = 'active'
      and (v_service_mode is null or aw.service_mode = v_service_mode)
  )
  select ranked.availability_window_id, ranked.physio_id, ranked.service_mode,
    ranked.starts_at, ranked.ends_at, ranked.timezone_name
  from ranked
  where ranked.availability_rank <= v_limit
  order by ranked.physio_id, ranked.starts_at, ranked.ends_at, ranked.availability_window_id;
end;
$$;

revoke all privileges on function public.get_verified_therapist_availability_batch(uuid[], text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.get_verified_therapist_availability_batch(uuid[], text, integer)
  to anon, authenticated;

drop function public.list_admin_therapist_operations(text, integer, integer);

create function public.list_admin_therapist_operations(
  p_verification_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  physio_id uuid,
  public_physio_id text,
  therapist_display_name text,
  qualification text,
  verification_status text,
  is_discoverable boolean,
  automated_check_status text,
  admin_visibility_status text,
  admin_visibility_reason text,
  admin_visibility_updated_at timestamptz,
  registered_at timestamptz,
  appointment_requests_30d bigint,
  accepted_appointments_30d bigint
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_capability text;
  v_verification_status text := nullif(lower(btrim(coalesce(p_verification_status, ''))), '');
begin
  if v_verification_status is not null and v_verification_status not in ('unverified', 'pending', 'verified', 'rejected') then
    raise exception 'Unsupported therapist verification filter.' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 or p_offset is null or p_offset < 0 or p_offset > 10000 then
    raise exception 'Admin therapist pagination is outside the allowed range.' using errcode = '22023';
  end if;

  v_capability := private.require_any_platform_admin_capability(
    array['platform_owner', 'operations_admin', 'verification_reviewer', 'support_agent', 'content_moderator']
  );
  perform private.write_platform_admin_audit_event(
    v_capability, 'list_therapist_operations', 'physiotherapist', null, '',
    jsonb_build_object('verification_status', v_verification_status, 'limit', p_limit, 'offset', p_offset)
  );

  return query
  select therapist.id,
    therapist.public_physio_id,
    coalesce(nullif(btrim(discovery.display_name), ''), nullif(btrim(profile.full_name), ''), 'Physiotherapist'),
    profile.qualification,
    coalesce(verification.verification_status, 'unverified'),
    coalesce(discovery.is_discoverable, false),
    coalesce(discovery.automated_check_status, 'pending'),
    coalesce(control.visibility_status, 'active'),
    coalesce(control.reason, ''),
    control.updated_at,
    therapist.created_at,
    count(request_row.id) filter (where request_row.requested_at >= now() - interval '30 days'),
    count(request_row.id) filter (where request_row.requested_at >= now() - interval '30 days' and request_row.status = 'accepted')
  from public.physiotherapists therapist
  left join public.physiotherapist_profiles profile on profile.physio_id = therapist.id
  left join public.physiotherapist_discovery_profiles discovery on discovery.physio_id = therapist.id
  left join public.physiotherapist_professional_verifications verification on verification.physio_id = therapist.id
  left join public.therapist_discovery_admin_controls control on control.physio_id = therapist.id
  left join public.patient_appointment_requests request_row on request_row.physio_id = therapist.id
    and request_row.requested_at >= now() - interval '30 days'
  where v_verification_status is null or coalesce(verification.verification_status, 'unverified') = v_verification_status
  group by therapist.id, therapist.public_physio_id, discovery.display_name, profile.full_name,
    profile.qualification, verification.verification_status, discovery.is_discoverable,
    discovery.automated_check_status, control.visibility_status, control.reason, control.updated_at,
    therapist.created_at
  order by therapist.created_at desc, therapist.id desc
  limit p_limit offset p_offset;
end;
$$;

revoke all privileges on function public.list_admin_therapist_operations(text, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_admin_therapist_operations(text, integer, integer)
  to authenticated;

create function public.set_admin_therapist_discovery_visibility(
  p_physio_id uuid,
  p_visibility_status text,
  p_reason text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_capability text;
  v_status text := lower(btrim(coalesce(p_visibility_status, '')));
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if p_physio_id is null or not exists (select 1 from public.physiotherapists where id = p_physio_id) then
    raise exception 'Therapist not found.' using errcode = '22023';
  end if;
  if v_status not in ('active', 'paused') then
    raise exception 'Visibility status must be active or paused.' using errcode = '22023';
  end if;
  if v_status = 'paused' and char_length(v_reason) not between 10 and 1000 then
    raise exception 'A pause reason between 10 and 1000 characters is required.' using errcode = '22023';
  end if;
  if char_length(v_reason) > 1000 then
    raise exception 'Visibility reason is too long.' using errcode = '22023';
  end if;

  v_capability := private.require_any_platform_admin_capability(
    array['platform_owner', 'operations_admin', 'content_moderator']
  );

  insert into public.therapist_discovery_admin_controls (
    physio_id, visibility_status, reason, updated_by_user_id, updated_at
  ) values (
    p_physio_id, v_status, v_reason, auth.uid(), now()
  )
  on conflict (physio_id) do update
    set visibility_status = excluded.visibility_status,
        reason = excluded.reason,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = excluded.updated_at;

  perform private.write_platform_admin_audit_event(
    v_capability,
    case when v_status = 'paused' then 'pause_therapist_public_listing' else 'restore_therapist_public_listing' end,
    'physiotherapist',
    p_physio_id,
    v_reason,
    jsonb_build_object('visibility_status', v_status)
  );

  return jsonb_build_object('physio_id', p_physio_id, 'visibility_status', v_status, 'updated_at', now());
end;
$$;

revoke all privileges on function public.set_admin_therapist_discovery_visibility(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.set_admin_therapist_discovery_visibility(uuid, text, text)
  to authenticated;

comment on function public.set_admin_therapist_discovery_visibility(uuid, text, text) is
  'MFA- and capability-gated public-listing pause/restore control. Every change is written to the append-only platform Admin audit log.';

commit;
