-- Fix telephysiotherapy session materialization on PostgreSQL PL/pgSQL.
--
-- ensure_my_telephysiotherapy_session() RETURNS TABLE with an output parameter
-- named appointment_request_id. The prior ON CONFLICT (appointment_request_id)
-- target is therefore ambiguous between the output parameter and the table
-- column and prevents legitimate owner materialization. Bind conflict handling
-- to the existing one-session-per-appointment unique constraint instead.
-- Authorization, appointment ownership, accepted telephysiotherapy provenance,
-- session immutability and provider-neutral semantics remain unchanged.

create or replace function public.ensure_my_telephysiotherapy_session(p_appointment_request_id uuid)
returns table(
  session_id uuid,
  appointment_request_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone_name text,
  provider_state text
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_physio_id uuid;
  v_appt public.patient_appointment_requests%rowtype;
begin
  v_physio_id := private.resolve_authenticated_appointment_physio();
  if v_physio_id is null then
    raise exception 'Authenticated physiotherapist required' using errcode = '42501';
  end if;

  select *
    into v_appt
  from public.patient_appointment_requests
  where id = p_appointment_request_id
    and physio_id = v_physio_id
  for update;

  if not found then
    raise exception 'Appointment not found' using errcode = 'P0002';
  end if;

  if v_appt.status <> 'accepted' or v_appt.service_mode <> 'telephysiotherapy' then
    raise exception 'Accepted telephysiotherapy appointment required' using errcode = '22023';
  end if;

  insert into public.telephysiotherapy_sessions (
    appointment_request_id,
    platform_patient_id,
    physio_id,
    starts_at,
    ends_at,
    timezone_name
  )
  values (
    v_appt.id,
    v_appt.platform_patient_id,
    v_appt.physio_id,
    v_appt.starts_at,
    v_appt.ends_at,
    v_appt.timezone_name
  )
  on conflict on constraint telephysiotherapy_sessions_appointment_request_id_key do nothing;

  return query
  select s.id, s.appointment_request_id, s.starts_at, s.ends_at, s.timezone_name, s.provider_state
  from public.telephysiotherapy_sessions s
  where s.appointment_request_id = v_appt.id
    and s.physio_id = v_physio_id;
end;
$function$;
