begin;

-- Phase 5 Slice 5D read models. These expose only the minimum identity labels
-- needed by each authenticated persona. They do not grant table access.
create function public.get_my_patient_appointment_requests_v2()
returns table (
  appointment_request_id uuid,
  physio_id uuid,
  therapist_display_name text,
  therapist_clinic_name text,
  availability_window_id uuid,
  service_mode text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone_name text,
  status text,
  requested_at timestamptz,
  responded_at timestamptz,
  cancelled_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_platform_patient_id uuid;
begin
  v_platform_patient_id := private.resolve_authenticated_appointment_patient();

  return query
  select
    r.id,
    r.physio_id,
    coalesce(nullif(btrim(dp.display_name), ''), 'Physiotherapist'),
    coalesce(btrim(dp.clinic_name), ''),
    r.availability_window_id,
    r.service_mode,
    r.starts_at,
    r.ends_at,
    r.timezone_name,
    r.status,
    r.requested_at,
    r.responded_at,
    r.cancelled_at
  from public.patient_appointment_requests r
  left join public.physiotherapist_discovery_profiles dp
    on dp.physio_id = r.physio_id
  where r.platform_patient_id = v_platform_patient_id
  order by r.requested_at desc, r.id desc;
end;
$$;

revoke all privileges on function public.get_my_patient_appointment_requests_v2()
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_patient_appointment_requests_v2()
  to authenticated;

create function public.get_my_professional_appointment_requests_v2()
returns table (
  appointment_request_id uuid,
  public_patient_id text,
  availability_window_id uuid,
  service_mode text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone_name text,
  status text,
  requested_at timestamptz,
  responded_at timestamptz,
  cancelled_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_physio_id uuid;
begin
  v_physio_id := private.resolve_authenticated_appointment_physio();

  return query
  select
    r.id,
    pp.public_patient_id,
    r.availability_window_id,
    r.service_mode,
    r.starts_at,
    r.ends_at,
    r.timezone_name,
    r.status,
    r.requested_at,
    r.responded_at,
    r.cancelled_at
  from public.patient_appointment_requests r
  join public.platform_patients pp
    on pp.id = r.platform_patient_id
  where r.physio_id = v_physio_id
  order by
    case r.status when 'requested' then 0 else 1 end,
    r.starts_at,
    r.requested_at,
    r.id;
end;
$$;

revoke all privileges on function public.get_my_professional_appointment_requests_v2()
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_professional_appointment_requests_v2()
  to authenticated;

commit;
