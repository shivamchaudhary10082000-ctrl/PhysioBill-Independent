begin;

-- Phase 5 Slice 5C: patient appointment request authority.
-- This slice creates scheduling/request state only. It does not create a
-- therapist-owned patient chart, clinical record, treatment episode, invoice,
-- payment, linkage authority, or any clinical/financial access.

create table public.patient_appointment_requests (
  id uuid primary key default gen_random_uuid(),
  platform_patient_id uuid not null references public.platform_patients(id) on delete restrict,
  physio_id uuid not null references public.physiotherapists(id) on delete restrict,
  availability_window_id uuid not null references public.physiotherapist_availability_windows(id) on delete restrict,
  service_mode text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone_name text not null,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_appointment_requests_service_mode_check
    check (service_mode in ('home_visit', 'clinic_visit', 'telephysiotherapy')),
  constraint patient_appointment_requests_time_order_check
    check (ends_at > starts_at),
  constraint patient_appointment_requests_timezone_length_check
    check (char_length(btrim(timezone_name)) between 1 and 64),
  constraint patient_appointment_requests_status_check
    check (status in ('requested', 'accepted', 'rejected', 'cancelled')),
  constraint patient_appointment_requests_lifecycle_check
    check (
      (status = 'requested' and responded_at is null and cancelled_at is null)
      or
      (status in ('accepted', 'rejected') and responded_at is not null and cancelled_at is null)
      or
      (status = 'cancelled' and responded_at is null and cancelled_at is not null)
    )
);

create index patient_appointment_requests_patient_status_idx
  on public.patient_appointment_requests (platform_patient_id, status, requested_at desc);

create index patient_appointment_requests_physio_status_idx
  on public.patient_appointment_requests (physio_id, status, requested_at desc);

create index patient_appointment_requests_availability_idx
  on public.patient_appointment_requests (availability_window_id, status);

create unique index patient_appointment_requests_patient_window_active_unique_idx
  on public.patient_appointment_requests (platform_patient_id, availability_window_id)
  where status in ('requested', 'accepted');

create unique index patient_appointment_requests_accepted_window_unique_idx
  on public.patient_appointment_requests (availability_window_id)
  where status = 'accepted';

alter table public.patient_appointment_requests enable row level security;

revoke all privileges on table public.patient_appointment_requests
  from public, anon, authenticated, service_role;

create trigger patient_appointment_requests_set_updated_at
before update on public.patient_appointment_requests
for each row execute function public.set_updated_at();

create function private.enforce_patient_appointment_request_immutability()
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

  return new;
end;
$$;

revoke all privileges on function private.enforce_patient_appointment_request_immutability()
  from public, anon, authenticated, service_role;

create trigger patient_appointment_requests_00_immutable_snapshot
before update on public.patient_appointment_requests
for each row execute function private.enforce_patient_appointment_request_immutability();

create function private.resolve_authenticated_appointment_patient()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_platform_patient_id uuid;
begin
  if v_user_id is null then
    raise exception 'Appointment requests require an authenticated patient.'
      using errcode = '42501';
  end if;

  perform private.require_confirmed_patient_auth_identity(v_user_id);

  select pp.id
    into v_platform_patient_id
    from public.app_users au
    join public.platform_patients pp on pp.user_id = au.id
   where au.id = v_user_id
     and au.role = 'patient'
   for update of pp;

  if v_platform_patient_id is null then
    raise exception 'Appointment requests are available only to confirmed patient accounts.'
      using errcode = '42501';
  end if;

  if exists (
    select 1
      from public.physiotherapists p
     where p.user_id = v_user_id
  ) then
    raise exception 'Professional identities cannot use patient appointment request authority.'
      using errcode = '23514';
  end if;

  return v_platform_patient_id;
end;
$$;

revoke all privileges on function private.resolve_authenticated_appointment_patient()
  from public, anon, authenticated, service_role;

create function private.resolve_authenticated_appointment_physio()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_physio_id uuid;
begin
  if v_user_id is null then
    raise exception 'Appointment request review requires an authenticated physiotherapist.'
      using errcode = '42501';
  end if;

  select p.id
    into v_physio_id
    from public.app_users au
    join public.physiotherapists p on p.user_id = au.id
   where au.id = v_user_id
     and au.role = 'physio'
   for update of p;

  if v_physio_id is null then
    raise exception 'Appointment request review is available only to physiotherapist accounts.'
      using errcode = '42501';
  end if;

  if exists (
    select 1
      from public.platform_patients pp
     where pp.user_id = v_user_id
  ) then
    raise exception 'Patient and physiotherapist appointment personas cannot coexist.'
      using errcode = '23514';
  end if;

  return v_physio_id;
end;
$$;

revoke all privileges on function private.resolve_authenticated_appointment_physio()
  from public, anon, authenticated, service_role;

create function public.request_patient_appointment(
  p_availability_window_id uuid
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
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_timezone_name text;
  v_request_id uuid;
begin
  if p_availability_window_id is null then
    raise exception 'Availability window is required.'
      using errcode = '22023';
  end if;

  v_platform_patient_id := private.resolve_authenticated_appointment_patient();

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
    v_physio_id,
    v_service_mode,
    v_starts_at,
    v_ends_at,
    v_timezone_name
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

  if v_physio_id is null then
    raise exception 'This availability window is not currently requestable.'
      using errcode = 'P0002';
  end if;

  insert into public.patient_appointment_requests (
    platform_patient_id,
    physio_id,
    availability_window_id,
    service_mode,
    starts_at,
    ends_at,
    timezone_name,
    status
  )
  values (
    v_platform_patient_id,
    v_physio_id,
    p_availability_window_id,
    v_service_mode,
    v_starts_at,
    v_ends_at,
    v_timezone_name,
    'requested'
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all privileges on function public.request_patient_appointment(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.request_patient_appointment(uuid)
  to authenticated;

create function public.cancel_my_appointment_request(
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
begin
  if p_request_id is null then
    raise exception 'Appointment request is required.'
      using errcode = '22023';
  end if;

  v_platform_patient_id := private.resolve_authenticated_appointment_patient();

  select r.status
    into v_status
    from public.patient_appointment_requests r
   where r.id = p_request_id
     and r.platform_patient_id = v_platform_patient_id
   for update;

  if v_status is null then
    raise exception 'Appointment request was not found.'
      using errcode = 'P0002';
  end if;

  if v_status <> 'requested' then
    raise exception 'Only a pending appointment request can be cancelled in this workflow.'
      using errcode = '23514';
  end if;

  update public.patient_appointment_requests
     set status = 'cancelled',
         cancelled_at = now()
   where id = p_request_id;
end;
$$;

revoke all privileges on function public.cancel_my_appointment_request(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.cancel_my_appointment_request(uuid)
  to authenticated;

create function public.respond_to_appointment_request(
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
  v_window_active boolean;
begin
  if p_request_id is null then
    raise exception 'Appointment request is required.'
      using errcode = '22023';
  end if;

  if v_decision not in ('accepted', 'rejected') then
    raise exception 'Appointment request decision must be accepted or rejected.'
      using errcode = '22023';
  end if;

  -- Locks the physiotherapist row so concurrent decisions for overlapping
  -- windows of the same therapist serialize before overlap checks.
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

  -- Serialize accepted scheduling for this patient across therapists too.
  perform 1
    from public.platform_patients pp
   where pp.id = v_platform_patient_id
   for update;

  select aw.is_active
    into v_window_active
    from public.physiotherapist_availability_windows aw
   where aw.id = v_availability_window_id
     and aw.physio_id = v_physio_id
     and aw.service_mode = v_service_mode
     and aw.starts_at = v_starts_at
     and aw.ends_at = v_ends_at
     and aw.timezone_name = v_timezone_name
   for update;

  if v_window_active is distinct from true or v_starts_at <= now() then
    raise exception 'This appointment request no longer points to active future availability.'
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

  -- One published availability window represents one accepted appointment
  -- opportunity in this bounded slice. Retain the row as inactive history.
  update public.physiotherapist_availability_windows
     set is_active = false
   where id = v_availability_window_id;

  -- Competing pending requests for the exact same published window can no
  -- longer succeed after one request is accepted.
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

create function public.get_my_patient_appointment_requests()
returns table (
  appointment_request_id uuid,
  physio_id uuid,
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
  where r.platform_patient_id = v_platform_patient_id
  order by r.requested_at desc, r.id desc;
end;
$$;

revoke all privileges on function public.get_my_patient_appointment_requests()
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_patient_appointment_requests()
  to authenticated;

create function public.get_my_professional_appointment_requests()
returns table (
  appointment_request_id uuid,
  platform_patient_id uuid,
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
    r.platform_patient_id,
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
  where r.physio_id = v_physio_id
  order by
    case r.status when 'requested' then 0 else 1 end,
    r.starts_at,
    r.requested_at,
    r.id;
end;
$$;

revoke all privileges on function public.get_my_professional_appointment_requests()
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_professional_appointment_requests()
  to authenticated;

commit;
