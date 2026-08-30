create table public.telephysiotherapy_sessions (
  id uuid primary key default gen_random_uuid(),
  appointment_request_id uuid not null unique references public.patient_appointment_requests(id) on delete restrict,
  platform_patient_id uuid not null references public.platform_patients(id) on delete restrict,
  physio_id uuid not null references public.physiotherapists(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone_name text not null,
  provider_state text not null default 'external_activation_pending' check (provider_state = 'external_activation_pending'),
  created_at timestamptz not null default now(),
  constraint telephysiotherapy_sessions_time_order_check check (ends_at > starts_at)
);

alter table public.telephysiotherapy_sessions enable row level security;
revoke all on public.telephysiotherapy_sessions from anon, authenticated;

create or replace function private.reject_telephysiotherapy_session_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  raise exception 'Telephysiotherapy session foundation rows are immutable' using errcode = '42501';
end;
$$;

revoke all on function private.reject_telephysiotherapy_session_mutation() from public, anon, authenticated;

create trigger reject_telephysiotherapy_session_update_delete
before update or delete on public.telephysiotherapy_sessions
for each row execute function private.reject_telephysiotherapy_session_mutation();

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
set search_path = pg_catalog, public, private
as $$
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
  on conflict (appointment_request_id) do nothing;

  return query
  select s.id, s.appointment_request_id, s.starts_at, s.ends_at, s.timezone_name, s.provider_state
  from public.telephysiotherapy_sessions s
  where s.appointment_request_id = v_appt.id
    and s.physio_id = v_physio_id;
end;
$$;

revoke all on function public.ensure_my_telephysiotherapy_session(uuid) from public, anon;
grant execute on function public.ensure_my_telephysiotherapy_session(uuid) to authenticated;

create or replace function public.get_my_patient_telephysiotherapy_sessions()
returns table(
  session_id uuid,
  appointment_request_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone_name text,
  provider_state text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_patient_id uuid;
begin
  v_patient_id := private.resolve_authenticated_appointment_patient();
  if v_patient_id is null then
    raise exception 'Authenticated patient required' using errcode = '42501';
  end if;

  return query
  select s.id, s.appointment_request_id, s.starts_at, s.ends_at, s.timezone_name, s.provider_state
  from public.telephysiotherapy_sessions s
  where s.platform_patient_id = v_patient_id
  order by s.starts_at desc;
end;
$$;

revoke all on function public.get_my_patient_telephysiotherapy_sessions() from public, anon;
grant execute on function public.get_my_patient_telephysiotherapy_sessions() to authenticated;

create or replace function public.get_my_professional_telephysiotherapy_sessions()
returns table(
  session_id uuid,
  appointment_request_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone_name text,
  provider_state text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_physio_id uuid;
begin
  v_physio_id := private.resolve_authenticated_appointment_physio();
  if v_physio_id is null then
    raise exception 'Authenticated physiotherapist required' using errcode = '42501';
  end if;

  return query
  select s.id, s.appointment_request_id, s.starts_at, s.ends_at, s.timezone_name, s.provider_state
  from public.telephysiotherapy_sessions s
  where s.physio_id = v_physio_id
  order by s.starts_at desc;
end;
$$;

revoke all on function public.get_my_professional_telephysiotherapy_sessions() from public, anon;
grant execute on function public.get_my_professional_telephysiotherapy_sessions() to authenticated;
