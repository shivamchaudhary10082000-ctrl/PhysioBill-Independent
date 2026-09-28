begin;

-- Phase 5: service-location / anti-fraud foundation.
-- This records only the patient's coarse declared therapist service area for a
-- home-visit appointment request. It is not GPS evidence, proof of attendance,
-- proof of treatment, clinical access, or financial authority.

create table public.home_visit_service_location_snapshots (
  id uuid primary key default gen_random_uuid(),
  appointment_request_id uuid not null unique references public.patient_appointment_requests(id) on delete restrict,
  platform_patient_id uuid not null references public.platform_patients(id) on delete restrict,
  physio_id uuid not null references public.physiotherapists(id) on delete restrict,
  source_service_area_id uuid not null,
  locality text not null,
  city text not null,
  state text not null,
  country_code text not null,
  evidence_kind text not null default 'patient_declared_service_area',
  evidence_status text not null default 'coarse_declared',
  declared_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint home_visit_service_location_locality_check
    check (char_length(btrim(locality)) between 1 and 120),
  constraint home_visit_service_location_city_check
    check (char_length(btrim(city)) between 1 and 100),
  constraint home_visit_service_location_state_check
    check (char_length(btrim(state)) between 1 and 100),
  constraint home_visit_service_location_country_check
    check (country_code ~ '^[A-Z]{2}$'),
  constraint home_visit_service_location_evidence_kind_check
    check (evidence_kind = 'patient_declared_service_area'),
  constraint home_visit_service_location_evidence_status_check
    check (evidence_status = 'coarse_declared')
);

create index home_visit_service_location_patient_idx
  on public.home_visit_service_location_snapshots (platform_patient_id, declared_at desc);
create index home_visit_service_location_physio_idx
  on public.home_visit_service_location_snapshots (physio_id, declared_at desc);

alter table public.home_visit_service_location_snapshots enable row level security;

revoke all privileges on table public.home_visit_service_location_snapshots
  from public, anon, authenticated, service_role;

create function private.reject_home_visit_service_location_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Home-visit service-location snapshots are immutable.'
    using errcode = '23514';
end;
$$;

revoke all privileges on function private.reject_home_visit_service_location_mutation()
  from public, anon, authenticated, service_role;

create trigger home_visit_service_location_immutable_update
before update on public.home_visit_service_location_snapshots
for each row execute function private.reject_home_visit_service_location_mutation();

create trigger home_visit_service_location_immutable_delete
before delete on public.home_visit_service_location_snapshots
for each row execute function private.reject_home_visit_service_location_mutation();

create function public.set_my_home_visit_service_area(
  p_appointment_request_id uuid,
  p_service_area_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_platform_patient_id uuid;
  v_physio_id uuid;
  v_service_mode text;
  v_status text;
  v_existing_id uuid;
  v_existing_source uuid;
  v_locality text;
  v_city text;
  v_state text;
  v_country_code text;
  v_snapshot_id uuid;
begin
  if p_appointment_request_id is null or p_service_area_id is null then
    raise exception 'Appointment request and service area are required.'
      using errcode = '22023';
  end if;

  v_platform_patient_id := private.resolve_authenticated_appointment_patient();

  select r.physio_id, r.service_mode, r.status
    into v_physio_id, v_service_mode, v_status
    from public.patient_appointment_requests r
   where r.id = p_appointment_request_id
     and r.platform_patient_id = v_platform_patient_id
   for update;

  if v_physio_id is null then
    raise exception 'Appointment request was not found.' using errcode = 'P0002';
  end if;

  if v_service_mode <> 'home_visit' then
    raise exception 'Service-area binding is only valid for home-visit appointments.'
      using errcode = '23514';
  end if;

  if v_status <> 'requested' then
    raise exception 'Home-visit service area must be declared while the request is pending.'
      using errcode = '23514';
  end if;

  select s.id, s.source_service_area_id
    into v_existing_id, v_existing_source
    from public.home_visit_service_location_snapshots s
   where s.appointment_request_id = p_appointment_request_id;

  if v_existing_id is not null then
    if v_existing_source = p_service_area_id then
      return v_existing_id;
    end if;

    raise exception 'The service-area snapshot for this request is immutable.'
      using errcode = '23514';
  end if;

  select sa.locality, sa.city, sa.state, sa.country_code
    into v_locality, v_city, v_state, v_country_code
    from public.physiotherapist_service_areas sa
   where sa.id = p_service_area_id
     and sa.physio_id = v_physio_id
     and sa.is_active
   for share;

  if v_locality is null then
    raise exception 'The selected therapist service area is not active for this appointment.'
      using errcode = 'P0002';
  end if;

  insert into public.home_visit_service_location_snapshots (
    appointment_request_id,
    platform_patient_id,
    physio_id,
    source_service_area_id,
    locality,
    city,
    state,
    country_code
  ) values (
    p_appointment_request_id,
    v_platform_patient_id,
    v_physio_id,
    p_service_area_id,
    v_locality,
    v_city,
    v_state,
    v_country_code
  )
  returning id into v_snapshot_id;

  return v_snapshot_id;
end;
$$;

revoke all privileges on function public.set_my_home_visit_service_area(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.set_my_home_visit_service_area(uuid, uuid)
  to authenticated;

create function private.require_home_visit_service_location_before_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'requested'
     and new.status = 'accepted'
     and new.service_mode = 'home_visit'
     and not exists (
       select 1
         from public.home_visit_service_location_snapshots s
        where s.appointment_request_id = new.id
          and s.platform_patient_id = new.platform_patient_id
          and s.physio_id = new.physio_id
     ) then
    raise exception 'A home-visit appointment requires a declared therapist service area before acceptance.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function private.require_home_visit_service_location_before_acceptance()
  from public, anon, authenticated, service_role;

create trigger patient_appointment_requests_05_home_visit_service_location_gate
before update on public.patient_appointment_requests
for each row execute function private.require_home_visit_service_location_before_acceptance();

create function public.get_my_home_visit_service_locations()
returns table (
  appointment_request_id uuid,
  locality text,
  city text,
  state text,
  country_code text,
  evidence_kind text,
  evidence_status text,
  declared_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_platform_patient_id uuid;
  v_physio_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select pp.id
    into v_platform_patient_id
    from public.app_users au
    join public.platform_patients pp on pp.user_id = au.id
   where au.id = v_user_id
     and au.role = 'patient';

  if v_platform_patient_id is not null then
    return query
    select s.appointment_request_id, s.locality, s.city, s.state, s.country_code,
           s.evidence_kind, s.evidence_status, s.declared_at
      from public.home_visit_service_location_snapshots s
     where s.platform_patient_id = v_platform_patient_id
     order by s.declared_at desc, s.appointment_request_id;
    return;
  end if;

  select p.id
    into v_physio_id
    from public.app_users au
    join public.physiotherapists p on p.user_id = au.id
   where au.id = v_user_id
     and au.role = 'physio';

  if v_physio_id is null then
    raise exception 'Patient or physiotherapist persona required.' using errcode = '42501';
  end if;

  if exists (select 1 from public.platform_patients pp where pp.user_id = v_user_id) then
    raise exception 'Patient and physiotherapist personas cannot coexist.' using errcode = '23514';
  end if;

  return query
  select s.appointment_request_id, s.locality, s.city, s.state, s.country_code,
         s.evidence_kind, s.evidence_status, s.declared_at
    from public.home_visit_service_location_snapshots s
   where s.physio_id = v_physio_id
   order by s.declared_at desc, s.appointment_request_id;
end;
$$;

revoke all privileges on function public.get_my_home_visit_service_locations()
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_home_visit_service_locations()
  to authenticated;

comment on table public.home_visit_service_location_snapshots is
  'Immutable coarse patient-declared therapist service-area snapshots for home-visit scheduling. Not GPS, attendance, treatment, identity, clinical, or settlement evidence.';

commit;
