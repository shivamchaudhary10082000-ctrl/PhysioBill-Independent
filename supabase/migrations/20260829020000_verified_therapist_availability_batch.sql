begin;

-- Phase 5 Slice 5B: scalable public availability projection for verified
-- therapist discovery. This remains read-only scheduling information and does
-- not reserve a window or create booking, clinical, financial or linkage state.
create function public.get_verified_therapist_availability_batch(
  p_physio_ids uuid[],
  p_service_mode text default null,
  p_limit_per_therapist integer default 3
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
  v_physio_ids uuid[] := coalesce(p_physio_ids, '{}'::uuid[]);
  v_service_mode text := nullif(lower(btrim(p_service_mode)), '');
  v_limit integer := coalesce(p_limit_per_therapist, 3);
begin
  if cardinality(v_physio_ids) > 50 then
    raise exception 'Availability batch may contain at most 50 therapist identifiers.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(v_physio_ids) as requested_id(physio_id)
    where requested_id.physio_id is null
  ) then
    raise exception 'Availability batch identifiers cannot be null.'
      using errcode = '22023';
  end if;

  if v_service_mode is not null
     and v_service_mode not in ('home_visit', 'clinic_visit', 'telephysiotherapy') then
    raise exception 'Unsupported availability service mode.'
      using errcode = '22023';
  end if;

  if v_limit not between 1 and 6 then
    raise exception 'Availability batch limit must be between 1 and 6 per therapist.'
      using errcode = '22023';
  end if;

  if cardinality(v_physio_ids) = 0 then
    return;
  end if;

  return query
  with requested as (
    select distinct requested_id.physio_id
    from unnest(v_physio_ids) as requested_id(physio_id)
  ),
  ranked as (
    select
      aw.id as availability_window_id,
      aw.physio_id,
      aw.service_mode,
      aw.starts_at,
      aw.ends_at,
      aw.timezone_name,
      row_number() over (
        partition by aw.physio_id
        order by aw.starts_at, aw.ends_at, aw.id
      ) as availability_rank
    from requested r
    join public.physiotherapist_discovery_profiles dp
      on dp.physio_id = r.physio_id
     and dp.is_discoverable
    join public.physiotherapist_professional_verifications pv
      on pv.physio_id = r.physio_id
     and pv.verification_status = 'verified'
    join public.physiotherapist_availability_windows aw
      on aw.physio_id = r.physio_id
     and aw.is_active
     and aw.ends_at > now()
    join public.physiotherapist_service_modes sm
      on sm.physio_id = aw.physio_id
     and sm.service_mode = aw.service_mode
     and sm.is_enabled
    where v_service_mode is null or aw.service_mode = v_service_mode
  )
  select
    ranked.availability_window_id,
    ranked.physio_id,
    ranked.service_mode,
    ranked.starts_at,
    ranked.ends_at,
    ranked.timezone_name
  from ranked
  where ranked.availability_rank <= v_limit
  order by ranked.physio_id, ranked.starts_at, ranked.ends_at, ranked.availability_window_id;
end;
$$;

revoke all privileges on function public.get_verified_therapist_availability_batch(uuid[], text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.get_verified_therapist_availability_batch(uuid[], text, integer)
  to anon, authenticated;

commit;
