begin;

-- Phase 5 Slice 5A: therapist availability authority and public read boundary.
-- Availability is a scheduling/discovery concern only. It creates no booking,
-- patient-chart, clinical, invoice, payment or linkage authority.

create table public.physiotherapist_availability_windows (
  id uuid primary key default gen_random_uuid(),
  physio_id uuid not null references public.physiotherapists(id) on delete cascade,
  service_mode text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint physiotherapist_availability_windows_service_mode_check
    check (service_mode in ('home_visit', 'clinic_visit', 'telephysiotherapy')),
  constraint physiotherapist_availability_windows_time_order_check
    check (ends_at > starts_at),
  constraint physiotherapist_availability_windows_duration_check
    check (ends_at - starts_at <= interval '8 hours'),
  constraint physiotherapist_availability_windows_timezone_length_check
    check (char_length(btrim(timezone_name)) between 1 and 64)
);

create index physiotherapist_availability_windows_physio_future_idx
  on public.physiotherapist_availability_windows (physio_id, starts_at)
  where is_active;

create index physiotherapist_availability_windows_public_mode_future_idx
  on public.physiotherapist_availability_windows (physio_id, service_mode, starts_at)
  where is_active;

create unique index physiotherapist_availability_windows_active_exact_unique_idx
  on public.physiotherapist_availability_windows (
    physio_id,
    service_mode,
    starts_at,
    ends_at
  )
  where is_active;

alter table public.physiotherapist_availability_windows enable row level security;

revoke all privileges on table public.physiotherapist_availability_windows
  from public, anon, authenticated;

grant select on table public.physiotherapist_availability_windows
  to authenticated;

create policy availability_windows_owner_select
on public.physiotherapist_availability_windows
for select
to authenticated
using (private.owns_physio(physio_id));

create trigger availability_windows_set_updated_at
before update on public.physiotherapist_availability_windows
for each row execute function public.set_updated_at();

-- Replaces only the authenticated physiotherapist's active future/current
-- availability. Superseded rows are retained as inactive history so later
-- booking work can preserve a stable audit trail instead of mutating history.
create function public.save_my_therapist_availability(
  p_windows jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_physio_id uuid;
  v_windows jsonb := coalesce(p_windows, '[]'::jsonb);
  v_window jsonb;
  v_service_mode text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_timezone_name text;
begin
  if v_user_id is null then
    raise exception 'Availability management requires an authenticated physiotherapist.'
      using errcode = '42501';
  end if;

  select p.id
    into v_physio_id
    from public.app_users au
    join public.physiotherapists p on p.user_id = au.id
   where au.id = v_user_id
     and au.role = 'physio';

  if v_physio_id is null then
    raise exception 'Availability management is available only to physiotherapist accounts.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_windows) <> 'array' then
    raise exception 'Availability windows must be supplied as an array.'
      using errcode = '22023';
  end if;

  if jsonb_array_length(v_windows) > 128 then
    raise exception 'Too many availability windows were supplied.'
      using errcode = '22023';
  end if;

  for v_window in select value from jsonb_array_elements(v_windows)
  loop
    if jsonb_typeof(v_window) <> 'object' then
      raise exception 'Each availability window must be an object.'
        using errcode = '22023';
    end if;

    if exists (
      select 1
        from jsonb_object_keys(v_window) as window_key(key)
       where window_key.key not in ('service_mode', 'starts_at', 'ends_at', 'timezone_name')
    ) then
      raise exception 'Availability window contains unsupported fields.'
        using errcode = '22023';
    end if;

    v_service_mode := lower(btrim(coalesce(v_window ->> 'service_mode', '')));
    v_timezone_name := btrim(coalesce(v_window ->> 'timezone_name', ''));
    v_starts_at := nullif(btrim(coalesce(v_window ->> 'starts_at', '')), '')::timestamptz;
    v_ends_at := nullif(btrim(coalesce(v_window ->> 'ends_at', '')), '')::timestamptz;

    if v_service_mode not in ('home_visit', 'clinic_visit', 'telephysiotherapy') then
      raise exception 'Unsupported availability service mode.'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
        from public.physiotherapist_service_modes sm
       where sm.physio_id = v_physio_id
         and sm.service_mode = v_service_mode
         and sm.is_enabled
    ) then
      raise exception 'Availability can be published only for an enabled therapist service mode.'
        using errcode = '22023';
    end if;

    if v_starts_at is null or v_ends_at is null or v_ends_at <= v_starts_at then
      raise exception 'Availability requires a valid start and end time.'
        using errcode = '22023';
    end if;

    if v_ends_at - v_starts_at > interval '8 hours' then
      raise exception 'An availability window cannot exceed eight hours.'
        using errcode = '22023';
    end if;

    if v_ends_at <= now() then
      raise exception 'Availability must end in the future.'
        using errcode = '22023';
    end if;

    if v_starts_at > now() + interval '180 days'
       or v_ends_at > now() + interval '180 days 8 hours' then
      raise exception 'Availability cannot be published more than 180 days ahead.'
        using errcode = '22023';
    end if;

    if char_length(v_timezone_name) not between 1 and 64
       or not exists (
         select 1
           from pg_catalog.pg_timezone_names tz
          where tz.name = v_timezone_name
       ) then
      raise exception 'Availability requires a valid IANA timezone.'
        using errcode = '22023';
    end if;
  end loop;

  update public.physiotherapist_availability_windows
     set is_active = false
   where physio_id = v_physio_id
     and is_active
     and ends_at > now();

  insert into public.physiotherapist_availability_windows (
    physio_id,
    service_mode,
    starts_at,
    ends_at,
    timezone_name,
    is_active
  )
  select
    v_physio_id,
    lower(btrim(window.value ->> 'service_mode')),
    (window.value ->> 'starts_at')::timestamptz,
    (window.value ->> 'ends_at')::timestamptz,
    btrim(window.value ->> 'timezone_name'),
    true
  from jsonb_array_elements(v_windows) as window(value);
end;
$$;

revoke all privileges on function public.save_my_therapist_availability(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.save_my_therapist_availability(jsonb)
  to authenticated;

-- Public callers may inspect only future windows belonging to a therapist who
-- is both verified and currently discoverable. Backing tables remain private.
create function public.get_verified_therapist_availability(
  p_physio_id uuid,
  p_service_mode text default null,
  p_limit integer default 6
)
returns table (
  availability_window_id uuid,
  physio_id uuid,
  service_mode text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_service_mode text := nullif(lower(btrim(p_service_mode)), '');
  v_limit integer := coalesce(p_limit, 6);
begin
  if p_physio_id is null then
    return;
  end if;

  if v_service_mode is not null
     and v_service_mode not in ('home_visit', 'clinic_visit', 'telephysiotherapy') then
    raise exception 'Unsupported availability service mode.'
      using errcode = '22023';
  end if;

  if v_limit not between 1 and 20 then
    raise exception 'Availability result limit must be between 1 and 20.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
      from public.physiotherapist_discovery_profiles dp
      join public.physiotherapist_professional_verifications pv
        on pv.physio_id = dp.physio_id
     where dp.physio_id = p_physio_id
       and dp.is_discoverable
       and pv.verification_status = 'verified'
  ) then
    return;
  end if;

  return query
  select
    aw.id,
    aw.physio_id,
    aw.service_mode,
    aw.starts_at,
    aw.ends_at,
    aw.timezone_name
  from public.physiotherapist_availability_windows aw
  join public.physiotherapist_service_modes sm
    on sm.physio_id = aw.physio_id
   and sm.service_mode = aw.service_mode
   and sm.is_enabled
  where aw.physio_id = p_physio_id
    and aw.is_active
    and aw.ends_at > now()
    and (v_service_mode is null or aw.service_mode = v_service_mode)
  order by aw.starts_at, aw.ends_at, aw.id
  limit v_limit;
end;
$$;

revoke all privileges on function public.get_verified_therapist_availability(uuid, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.get_verified_therapist_availability(uuid, text, integer)
  to anon, authenticated;

commit;
