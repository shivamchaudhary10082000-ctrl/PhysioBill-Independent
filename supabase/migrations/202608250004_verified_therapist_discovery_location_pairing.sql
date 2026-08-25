begin;

-- Phase 5 Slice 2 correction: city and locality filters must match the same
-- active therapist service-area row to prevent false cross-area combinations.
create or replace function public.search_verified_therapists(
  p_city text default null,
  p_locality text default null,
  p_service_mode text default null
)
returns table (
  physio_id uuid,
  display_name text,
  headline text,
  bio text,
  clinic_name text,
  verified_qualification text,
  verified_registration_authority text,
  verified_registration_number text,
  service_modes text[],
  service_areas jsonb,
  is_verified boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  requested_city text := nullif(btrim(p_city), '');
  requested_locality text := nullif(btrim(p_locality), '');
  requested_service_mode text := nullif(lower(btrim(p_service_mode)), '');
begin
  if requested_service_mode is not null
     and requested_service_mode not in ('home_visit', 'clinic_visit', 'telephysiotherapy') then
    raise exception 'Unsupported therapist discovery service mode.'
      using errcode = '22023';
  end if;

  return query
  select
    dp.physio_id,
    dp.display_name,
    dp.headline,
    dp.bio,
    dp.clinic_name,
    pv.verified_qualification,
    pv.verified_registration_authority,
    pv.verified_registration_number,
    array(
      select sm.service_mode
      from public.physiotherapist_service_modes sm
      where sm.physio_id = dp.physio_id
        and sm.is_enabled
      order by sm.service_mode
    )::text[] as service_modes,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'locality', sa.locality,
            'city', sa.city,
            'state', sa.state,
            'country_code', sa.country_code
          )
          order by lower(btrim(sa.city)), lower(btrim(sa.locality)), sa.id
        )
        from public.physiotherapist_service_areas sa
        where sa.physio_id = dp.physio_id
          and sa.is_active
      ),
      '[]'::jsonb
    ) as service_areas,
    true as is_verified
  from public.physiotherapist_discovery_profiles dp
  join public.physiotherapist_professional_verifications pv
    on pv.physio_id = dp.physio_id
  where dp.is_discoverable
    and pv.verification_status = 'verified'
    and (
      (requested_city is null and requested_locality is null)
      or exists (
        select 1
        from public.physiotherapist_service_areas location_area
        where location_area.physio_id = dp.physio_id
          and location_area.is_active
          and (
            requested_city is null
            or lower(btrim(location_area.city)) = lower(requested_city)
          )
          and (
            requested_locality is null
            or lower(btrim(location_area.locality)) = lower(requested_locality)
          )
      )
    )
    and (
      requested_service_mode is null
      or exists (
        select 1
        from public.physiotherapist_service_modes requested_mode
        where requested_mode.physio_id = dp.physio_id
          and requested_mode.is_enabled
          and requested_mode.service_mode = requested_service_mode
      )
    )
  order by lower(dp.display_name), dp.physio_id;
end;
$$;

revoke all privileges on function public.search_verified_therapists(text, text, text)
  from public, anon, authenticated;
grant execute on function public.search_verified_therapists(text, text, text)
  to anon, authenticated;

commit;
