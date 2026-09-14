begin;

-- Atomic home-visit booking boundary.
-- Compose the existing appointment-request and service-area snapshot authorities
-- in one database transaction so a failed service-area bind cannot leave a
-- pending home-visit request behind.

create function public.request_home_visit_appointment(
  p_availability_window_id uuid,
  p_service_area_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_snapshot_id uuid;
begin
  if p_availability_window_id is null or p_service_area_id is null then
    raise exception 'Availability window and service area are required.'
      using errcode = '22023';
  end if;

  -- This existing authority performs patient-persona resolution, rate limiting,
  -- verified/discoverable therapist checks, enabled service-mode checks, active
  -- future-availability validation, row locking, and the immutable request insert.
  v_request_id := public.request_patient_appointment(p_availability_window_id);

  -- This existing authority proves that the just-created request belongs to the
  -- authenticated patient, is still pending and is specifically a home visit,
  -- then validates and snapshots an active service area owned by that therapist.
  -- Any exception here aborts this statement and rolls back the request insert.
  v_snapshot_id := public.set_my_home_visit_service_area(
    v_request_id,
    p_service_area_id
  );

  if v_snapshot_id is null then
    raise exception 'Home-visit service-area snapshot was not created.'
      using errcode = '23514';
  end if;

  return v_request_id;
end;
$$;

revoke all privileges on function public.request_home_visit_appointment(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.request_home_visit_appointment(uuid, uuid)
  to authenticated;

comment on function public.request_home_visit_appointment(uuid, uuid) is
  'Atomically creates a patient home-visit appointment request and its immutable coarse therapist service-area snapshot. Scheduling evidence only; not identity, GPS, attendance, clinical, invoice, or payment authority.';

commit;
