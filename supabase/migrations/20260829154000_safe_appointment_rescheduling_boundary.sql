begin;

-- Phase 5: safe appointment rescheduling boundary.
-- Rescheduling never mutates an accepted scheduling snapshot into a new time.
-- A replacement is a new appointment request linked to the prior accepted/cancelled
-- appointment. If the prior appointment is still accepted, it is cancelled only
-- after the replacement request can be created successfully in the same transaction.
-- No clinical, chart-linkage, invoice, payment or patient-record authority is added.

alter table public.patient_appointment_requests
  add column reschedules_request_id uuid;

alter table public.patient_appointment_requests
  add constraint patient_appointment_requests_reschedules_request_id_fkey
  foreign key (reschedules_request_id)
  references public.patient_appointment_requests(id)
  on delete restrict;

alter table public.patient_appointment_requests
  add constraint patient_appointment_requests_reschedule_not_self_check
  check (reschedules_request_id is null or reschedules_request_id <> id);

create unique index patient_appointment_requests_active_reschedule_source_unique_idx
  on public.patient_appointment_requests (reschedules_request_id)
  where reschedules_request_id is not null
    and status in ('requested', 'accepted');

create index patient_appointment_requests_reschedule_source_idx
  on public.patient_appointment_requests (reschedules_request_id, requested_at desc)
  where reschedules_request_id is not null;

-- Extend the previously frozen immutability boundary so the reschedule relationship
-- itself is immutable after insert.
create or replace function private.enforce_patient_appointment_request_immutability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.platform_patient_id is distinct from old.platform_patient_id
     or new.physio_id is distinct from old.physio_id
     or new.availability_window_id is distinct from old.availability_window_id
     or new.service_mode is distinct from old.service_mode
     or new.starts_at is distinct from old.starts_at
     or new.ends_at is distinct from old.ends_at
     or new.timezone_name is distinct from old.timezone_name
     or new.requested_at is distinct from old.requested_at
     or new.created_at is distinct from old.created_at
     or new.reschedules_request_id is distinct from old.reschedules_request_id then
    raise exception 'Appointment request identity and scheduling snapshot are immutable.'
      using errcode = '23514';
  end if;

  if old.status = 'requested' then
    if new.status not in ('requested', 'accepted', 'rejected', 'cancelled') then
      raise exception 'Unsupported appointment request state transition.' using errcode = '23514';
    end if;
  elsif old.status = 'accepted' then
    if new.status not in ('accepted', 'cancelled') then
      raise exception 'An accepted appointment may only remain accepted or become cancelled.' using errcode = '23514';
    end if;
  elsif old.status = 'rejected' then
    if new.status <> 'rejected' then
      raise exception 'A rejected appointment request is terminal.' using errcode = '23514';
    end if;
  elsif old.status = 'cancelled' then
    if new.status <> 'cancelled' then
      raise exception 'A cancelled appointment request is terminal.' using errcode = '23514';
    end if;
  end if;

  if old.responded_at is not null
     and new.responded_at is distinct from old.responded_at then
    raise exception 'Appointment response timestamp is immutable once recorded.' using errcode = '23514';
  end if;

  if old.cancelled_at is not null
     and new.cancelled_at is distinct from old.cancelled_at then
    raise exception 'Appointment cancellation timestamp is immutable once recorded.' using errcode = '23514';
  end if;

  if old.cancelled_by is not null
     and new.cancelled_by is distinct from old.cancelled_by then
    raise exception 'Appointment cancellation authority is immutable once recorded.' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all privileges on function private.enforce_patient_appointment_request_immutability()
  from public, anon, authenticated, service_role;

create function public.request_patient_appointment_reschedule(
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
  v_source_physio_id uuid;
  v_source_service_mode text;
  v_source_starts_at timestamptz;
  v_source_ends_at timestamptz;
  v_source_status text;
  v_source_responded_at timestamptz;
  v_new_physio_id uuid;
  v_new_service_mode text;
  v_new_starts_at timestamptz;
  v_new_ends_at timestamptz;
  v_new_timezone_name text;
  v_new_request_id uuid;
begin
  if p_request_id is null or p_availability_window_id is null then
    raise exception 'Appointment request and replacement availability are required.'
      using errcode = '22023';
  end if;

  v_platform_patient_id := private.resolve_authenticated_appointment_patient();

  select
    r.physio_id,
    r.service_mode,
    r.starts_at,
    r.ends_at,
    r.status,
    r.responded_at
  into
    v_source_physio_id,
    v_source_service_mode,
    v_source_starts_at,
    v_source_ends_at,
    v_source_status,
    v_source_responded_at
  from public.patient_appointment_requests r
  where r.id = p_request_id
    and r.platform_patient_id = v_platform_patient_id
  for update;

  if v_source_physio_id is null then
    raise exception 'Appointment request was not found.' using errcode = 'P0002';
  end if;

  if v_source_responded_at is null
     or v_source_status not in ('accepted', 'cancelled') then
    raise exception 'Only a future accepted appointment, or its cancelled scheduling record, can be rescheduled.'
      using errcode = '23514';
  end if;

  if v_source_starts_at <= now() then
    raise exception 'An appointment cannot be rescheduled after its scheduled start time.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.patient_appointment_requests replacement
    where replacement.reschedules_request_id = p_request_id
      and replacement.status in ('requested', 'accepted')
  ) then
    raise exception 'This appointment already has an active replacement request.'
      using errcode = '23505';
  end if;

  if (
    select count(*)
    from public.patient_appointment_requests r
    where r.platform_patient_id = v_platform_patient_id
      and r.status = 'requested'
  ) >= 10 then
    raise exception 'Too many open appointment requests. Resolve an existing request before creating another.'
      using errcode = '54000';
  end if;

  if (
    select count(*)
    from public.patient_appointment_requests r
    where r.platform_patient_id = v_platform_patient_id
      and r.requested_at > now() - interval '24 hours'
  ) >= 30 then
    raise exception 'Appointment request rate limit reached. Try again later.'
      using errcode = '54000';
  end if;

  select
    aw.physio_id,
    aw.service_mode,
    aw.starts_at,
    aw.ends_at,
    aw.timezone_name
  into
    v_new_physio_id,
    v_new_service_mode,
    v_new_starts_at,
    v_new_ends_at,
    v_new_timezone_name
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
  where aw.id = p_availability_window_id
    and aw.is_active
    and aw.starts_at > now()
    and aw.ends_at > aw.starts_at
  for update of aw;

  if v_new_physio_id is null then
    raise exception 'This replacement availability window is not currently requestable.'
      using errcode = 'P0002';
  end if;

  if v_new_physio_id <> v_source_physio_id
     or v_new_service_mode <> v_source_service_mode then
    raise exception 'A reschedule must use the same physiotherapist and service type.'
      using errcode = '23514';
  end if;

  if v_new_starts_at = v_source_starts_at
     and v_new_ends_at = v_source_ends_at then
    raise exception 'Choose a different time when rescheduling.'
      using errcode = '23514';
  end if;

  insert into public.patient_appointment_requests (
    platform_patient_id,
    physio_id,
    availability_window_id,
    service_mode,
    starts_at,
    ends_at,
    timezone_name,
    status,
    reschedules_request_id
  )
  values (
    v_platform_patient_id,
    v_new_physio_id,
    p_availability_window_id,
    v_new_service_mode,
    v_new_starts_at,
    v_new_ends_at,
    v_new_timezone_name,
    'requested',
    p_request_id
  )
  returning id into v_new_request_id;

  if v_source_status = 'accepted' then
    update public.patient_appointment_requests
       set status = 'cancelled',
           cancelled_at = now(),
           cancelled_by = 'patient'
     where id = p_request_id;
  end if;

  return v_new_request_id;
end;
$$;

revoke all privileges on function public.request_patient_appointment_reschedule(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.request_patient_appointment_reschedule(uuid, uuid)
  to authenticated;

commit;
