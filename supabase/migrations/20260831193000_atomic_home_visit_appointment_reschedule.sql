begin;

-- Atomic home-visit appointment rescheduling boundary.
-- A home-visit replacement request must receive a fresh immutable coarse
-- service-area snapshot in the same transaction that creates the replacement.
-- The prior snapshot's authoritative source_service_area_id may be reused only
-- if that therapist service area is still active; otherwise the entire
-- reschedule fails and the source appointment remains unchanged.
-- This adds no identity, clinical, attendance, invoice, or payment authority.

create function public.request_home_visit_appointment_reschedule(
  p_request_id uuid,
  p_availability_window_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_platform_patient_id uuid;
  v_source_service_mode text;
  v_source_service_area_id uuid;
  v_new_request_id uuid;
begin
  if p_request_id is null or p_availability_window_id is null then
    raise exception 'Appointment request and replacement availability are required.'
      using errcode = '22023';
  end if;

  v_platform_patient_id := private.resolve_authenticated_appointment_patient();

  select r.service_mode
    into v_source_service_mode
    from public.patient_appointment_requests r
   where r.id = p_request_id
     and r.platform_patient_id = v_platform_patient_id
   for update;

  if v_source_service_mode is null then
    raise exception 'Appointment request was not found.' using errcode = 'P0002';
  end if;

  if v_source_service_mode <> 'home_visit' then
    raise exception 'This operation is only valid for home-visit appointments.'
      using errcode = '23514';
  end if;

  select s.source_service_area_id
    into v_source_service_area_id
    from public.home_visit_service_location_snapshots s
   where s.appointment_request_id = p_request_id
     and s.platform_patient_id = v_platform_patient_id;

  if v_source_service_area_id is null then
    raise exception 'The source home-visit appointment has no service-area snapshot.'
      using errcode = '23514';
  end if;

  -- The existing reschedule authority locks and validates the source request and
  -- replacement availability, enforces same therapist/service mode, rate limits,
  -- uniqueness/concurrency rules, and only cancels the accepted source after the
  -- replacement row can be created.
  v_new_request_id := public.request_patient_appointment_reschedule(
    p_request_id,
    p_availability_window_id
  );

  -- Revalidate the previously declared therapist service area against current
  -- therapist ownership/active state and write a fresh immutable snapshot for
  -- the replacement request. Any failure rolls back the replacement creation and
  -- any source cancellation performed above because this is one transaction.
  perform public.set_my_home_visit_service_area(
    v_new_request_id,
    v_source_service_area_id
  );

  return v_new_request_id;
end;
$$;

revoke all privileges on function public.request_home_visit_appointment_reschedule(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.request_home_visit_appointment_reschedule(uuid, uuid)
  to authenticated;

comment on function public.request_home_visit_appointment_reschedule(uuid, uuid) is
  'Atomically creates a same-therapist home-visit replacement request and fresh immutable coarse service-area snapshot. Service-area evidence is scheduling metadata only, not identity, GPS/attendance, clinical, invoice, or payment authority.';

commit;
