begin;

-- Phase 5 Slice 2: verified therapist discovery data boundary.
-- Backing tables remain therapist-owned/private. Anonymous and patient-facing
-- discovery is exposed only through the allow-listed RPC below.

create table public.physiotherapist_discovery_profiles (
  physio_id uuid primary key references public.physiotherapists(id) on delete cascade,
  is_discoverable boolean not null default false,
  display_name text not null default '',
  headline text not null default '',
  bio text not null default '',
  clinic_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint physiotherapist_discovery_profiles_display_name_length_check
    check (char_length(display_name) <= 120),
  constraint physiotherapist_discovery_profiles_discoverable_name_check
    check (not is_discoverable or char_length(btrim(display_name)) between 1 and 120),
  constraint physiotherapist_discovery_profiles_headline_length_check
    check (char_length(headline) <= 200),
  constraint physiotherapist_discovery_profiles_bio_length_check
    check (char_length(bio) <= 2000),
  constraint physiotherapist_discovery_profiles_clinic_name_length_check
    check (char_length(clinic_name) <= 160)
);

create table public.physiotherapist_service_modes (
  physio_id uuid not null references public.physiotherapists(id) on delete cascade,
  service_mode text not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (physio_id, service_mode),
  constraint physiotherapist_service_modes_service_mode_check
    check (service_mode in ('home_visit', 'clinic_visit', 'telephysiotherapy'))
);

create table public.physiotherapist_service_areas (
  id uuid primary key default gen_random_uuid(),
  physio_id uuid not null references public.physiotherapists(id) on delete cascade,
  locality text not null,
  city text not null,
  state text not null,
  country_code text not null default 'IN',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint physiotherapist_service_areas_locality_check
    check (char_length(btrim(locality)) between 1 and 120),
  constraint physiotherapist_service_areas_city_check
    check (char_length(btrim(city)) between 1 and 100),
  constraint physiotherapist_service_areas_state_check
    check (char_length(btrim(state)) between 1 and 100),
  constraint physiotherapist_service_areas_country_code_check
    check (country_code ~ '^[A-Z]{2}$')
);

create index physiotherapist_service_areas_physio_id_idx
  on public.physiotherapist_service_areas (physio_id);
create index physiotherapist_service_areas_active_city_normalized_idx
  on public.physiotherapist_service_areas (lower(btrim(city)))
  where is_active;
create index physiotherapist_service_areas_active_locality_normalized_idx
  on public.physiotherapist_service_areas (lower(btrim(locality)))
  where is_active;

alter table public.physiotherapist_discovery_profiles enable row level security;
alter table public.physiotherapist_service_modes enable row level security;
alter table public.physiotherapist_service_areas enable row level security;

create policy discovery_profiles_owner_all
on public.physiotherapist_discovery_profiles
for all
to authenticated
using (private.owns_physio(physio_id))
with check (private.owns_physio(physio_id));

create policy service_modes_owner_all
on public.physiotherapist_service_modes
for all
to authenticated
using (private.owns_physio(physio_id))
with check (private.owns_physio(physio_id));

create policy service_areas_owner_all
on public.physiotherapist_service_areas
for all
to authenticated
using (private.owns_physio(physio_id))
with check (private.owns_physio(physio_id));

-- Phase 4 least-privilege defaults are already hardened, but explicitly revoke
-- browser access here so this migration remains safe if defaults differ.
revoke all privileges on table
  public.physiotherapist_discovery_profiles,
  public.physiotherapist_service_modes,
  public.physiotherapist_service_areas
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.physiotherapist_discovery_profiles,
  public.physiotherapist_service_modes,
  public.physiotherapist_service_areas
to authenticated;

-- Reuse the established trigger-only updated_at helper.
create trigger discovery_profiles_set_updated_at
before update on public.physiotherapist_discovery_profiles
for each row execute function public.set_updated_at();

create trigger service_modes_set_updated_at
before update on public.physiotherapist_service_modes
for each row execute function public.set_updated_at();

create trigger service_areas_set_updated_at
before update on public.physiotherapist_service_areas
for each row execute function public.set_updated_at();

-- SECURITY DEFINER is required because anonymous callers deliberately have no
-- SELECT privileges on any backing/private verification table. The function is
-- a fixed, schema-qualified allow-list and exposes no generic query surface.
create function public.search_verified_therapists(
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
      requested_city is null
      or exists (
        select 1
        from public.physiotherapist_service_areas city_area
        where city_area.physio_id = dp.physio_id
          and city_area.is_active
          and lower(btrim(city_area.city)) = lower(requested_city)
      )
    )
    and (
      requested_locality is null
      or exists (
        select 1
        from public.physiotherapist_service_areas locality_area
        where locality_area.physio_id = dp.physio_id
          and locality_area.is_active
          and lower(btrim(locality_area.locality)) = lower(requested_locality)
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
