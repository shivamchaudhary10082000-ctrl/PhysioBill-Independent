begin;

-- Phase 5 Slice 5C corrective hardening before staging acceptance.
-- Re-checks verification, discoverability and service-mode authority at the
-- exact moment a therapist accepts a patient appointment request.
create or replace function public.respond_to_appointment_request(
  p_request_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_physio_id uuid;
  v_decision text := lower(btrim(coalesce(p_decision, '')));
  v_platform_patient_id uuid;
  v_availability_window_id uuid;
  v_service_mode text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_timezone_name text;
  v_status text;
  v_window_requestable boolean;
begin
  if p_request_id is null then
    raise exception 'Appointment request is required.'
      using errcode = '22023';
  end if;

  if v_decision not in ('accepted', 'rejected') then
    raise exception 'Appointment request decision must be accepted or rejected.'
      using errcode = '22023';
  end if;

  -- Serializes decisions for the same professional before overlap checks.
  v_physio_id := private.resolve_authenticated_appointment_physio();

  select
    r.platform_patient_id,
    r.availability_window_id,
    r.service_mode,
    r.starts_at,
    r.ends_at,
    r.timezone_name,
    r.status
  into
    v_platform_patient_id,
    v_availability_window_id,
    v_service_mode,
    v_starts_at,
    v_ends_at,
    v_timezone_name,
    v_status
  from public.patient_appointment_requests r
  where r.id = p_request_id
    and r.physio_id = v_physio_id
  for update;

  if v_status is null then
    raise exception 'Appointment request was not found.'
      using errcode = 'P0002';
  end if;

  if v_status <> 'requested' then
    raise exception 'This appointment request has already been resolved.'
      using errcode = '23514';
  end if;

  if v_decision = 'rejected' then
    update public.patient_appointment_requests
       set status = 'rejected',
           responded_at = now()
     where id = p_request_id;
    return;
  end if;

  -- Serializes accepted scheduling for this patient across professionals.
  perform 1
    from public.platform_patients pp
   where pp.id = v_platform_patient_id
   for update;

  -- Acceptance must fail closed if the originally requestable professional,
  -- profile, service mode or availability has ceased to be valid.
  select true
    into v_window_requestable
    from public.physiotherapist_availability_windows aw
    join public.physiotherapist_discovery_profiles dp
      on dp.physio_id = aw.physio_id
     and dp.is_discoverable
    join public.physiotherapist_professional_verifications pv
      on pv.physio_id = aw.physio_id
     and pv.verification_status = 'verified'
    join public.physiotherapist_service_modes sm
      on sm.physio_id = aw.physio_id
     and sm.service_mode = aw.service_mode
     and sm.is_enabled
   where aw.id = v_availability_window_id
     and aw.physio_id = v_physio_id
     and aw.service_mode = v_service_mode
     and aw.starts_at = v_starts_at
     and aw.ends_at = v_ends_at
     and aw.timezone_name = v_timezone_name
     and aw.is_active
     and aw.starts_at > now()
   for update of aw;

  if v_window_requestable is distinct from true then
    raise exception 'This appointment request no longer points to verified, discoverable, active future availability.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
      from public.patient_appointment_requests accepted
     where accepted.id <> p_request_id
       and accepted.status = 'accepted'
       and accepted.physio_id = v_physio_id
       and tstzrange(accepted.starts_at, accepted.ends_at, '[)')
           && tstzrange(v_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'The physiotherapist already has an accepted appointment that overlaps this time.'
      using errcode = '23P01';
  end if;

  if exists (
    select 1
      from public.patient_appointment_requests accepted
     where accepted.id <> p_request_id
       and accepted.status = 'accepted'
       and accepted.platform_patient_id = v_platform_patient_id
       and tstzrange(accepted.starts_at, accepted.ends_at, '[)')
           && tstzrange(v_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'The patient already has an accepted appointment that overlaps this time.'
      using errcode = '23P01';
  end if;

  update public.patient_appointment_requests
     set status = 'accepted',
         responded_at = now()
   where id = p_request_id;

  update public.physiotherapist_availability_windows
     set is_active = false
   where id = v_availability_window_id;

  update public.patient_appointment_requests
     set status = 'rejected',
         responded_at = now()
   where availability_window_id = v_availability_window_id
     and id <> p_request_id
     and status = 'requested';
end;
$$;

revoke all privileges on function public.respond_to_appointment_request(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.respond_to_appointment_request(uuid, text)
  to authenticated;

commit;
