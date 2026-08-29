begin;

-- Phase 5: accepted appointment lifecycle and safe cancellation boundary.
-- Accepted scheduling remains separate from clinical, chart-linkage and financial
-- authority. Cancellation preserves the immutable scheduling snapshot and does
-- not automatically reopen availability. Rescheduling is a new request against
-- newly/currently published availability rather than mutation of history.

alter table public.patient_appointment_requests
  add column cancelled_by text;

-- Existing cancelled rows could only have been cancelled by the patient under
-- the previously frozen workflow, so this backfill is deterministic.
update public.patient_appointment_requests
   set cancelled_by = 'patient'
 where status = 'cancelled'
   and cancelled_by is null;

alter table public.patient_appointment_requests
  drop constraint patient_appointment_requests_lifecycle_check;

alter table public.patient_appointment_requests
  add constraint patient_appointment_requests_cancelled_by_check
  check (cancelled_by is null or cancelled_by in ('patient', 'physio'));

alter table public.patient_appointment_requests
  add constraint patient_appointment_requests_lifecycle_check
  check (
    (
      status = 'requested'
      and responded_at is null
      and cancelled_at is null
      and cancelled_by is null
    )
    or
    (
      status in ('accepted', 'rejected')
      and responded_at is not null
      and cancelled_at is null
      and cancelled_by is null
    )
    or
    (
      status = 'cancelled'
      and cancelled_at is not null
      and cancelled_by in ('patient', 'physio')
    )
  );

-- Keep scheduling identity immutable and make terminal-state transitions explicit.
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
     or new.created_at is distinct from old.created_at then
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

-- Patient authority: a patient may cancel their own pending request, or their own
-- accepted appointment while it is still in the future. Accepted cancellation
-- preserves responded_at and never reactivates the consumed availability row.
create or replace function public.cancel_my_appointment_request(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_platform_patient_id uuid;
  v_status text;
  v_starts_at timestamptz;
begin
  if p_request_id is null then
    raise exception 'Appointment request is required.' using errcode = '22023';
  end if;

  v_platform_patient_id := private.resolve_authenticated_appointment_patient();

  select r.status, r.starts_at
    into v_status, v_starts_at
    from public.patient_appointment_requests r
   where r.id = p_request_id
     and r.platform_patient_id = v_platform_patient_id
   for update;

  if v_status is null then
    raise exception 'Appointment request was not found.' using errcode = 'P0002';
  end if;

  if v_status = 'requested' then
    update public.patient_appointment_requests
       set status = 'cancelled',
           cancelled_at = now(),
           cancelled_by = 'patient'
     where id = p_request_id;
    return;
  end if;

  if v_status = 'accepted' then
    if v_starts_at <= now() then
      raise exception 'An appointment cannot be cancelled through this workflow after its scheduled start time.'
        using errcode = '23514';
    end if;

    update public.patient_appointment_requests
       set status = 'cancelled',
           cancelled_at = now(),
           cancelled_by = 'patient'
     where id = p_request_id;
    return;
  end if;

  raise exception 'Only a pending request or future accepted appointment can be cancelled.'
    using errcode = '23514';
end;
$$;

revoke all privileges on function public.cancel_my_appointment_request(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.cancel_my_appointment_request(uuid)
  to authenticated;

-- Professional authority: only the owning physiotherapist may cancel an accepted
-- future appointment. The patient request record remains immutable history and
-- the slot is not reopened automatically.
create function public.cancel_my_professional_appointment(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_physio_id uuid;
  v_status text;
  v_starts_at timestamptz;
begin
  if p_request_id is null then
    raise exception 'Appointment request is required.' using errcode = '22023';
  end if;

  v_physio_id := private.resolve_authenticated_appointment_physio();

  select r.status, r.starts_at
    into v_status, v_starts_at
    from public.patient_appointment_requests r
   where r.id = p_request_id
     and r.physio_id = v_physio_id
   for update;

  if v_status is null then
    raise exception 'Appointment request was not found.' using errcode = 'P0002';
  end if;

  if v_status <> 'accepted' then
    raise exception 'Only a future accepted appointment can be cancelled by the physiotherapist.'
      using errcode = '23514';
  end if;

  if v_starts_at <= now() then
    raise exception 'An appointment cannot be cancelled through this workflow after its scheduled start time.'
      using errcode = '23514';
  end if;

  update public.patient_appointment_requests
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = 'physio'
   where id = p_request_id;
end;
$$;

revoke all privileges on function public.cancel_my_professional_appointment(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.cancel_my_professional_appointment(uuid)
  to authenticated;

commit;
