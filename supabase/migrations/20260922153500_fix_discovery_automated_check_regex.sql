begin;

-- Keep each rule as a separate expression. This avoids a malformed combined
-- alternation from blocking every discovery-profile update.
create or replace function private.reject_misleading_discovery_claims()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_copy text := lower(
    coalesce(new.display_name, '') || ' ' ||
    coalesce(new.headline, '') || ' ' ||
    coalesce(new.bio, '') || ' ' ||
    coalesce(new.clinic_name, '')
  );
begin
  if v_copy ~ '100[[:space:]]*%[[:space:]]*(cure|relief|recovery|success)'
     or v_copy ~ 'guarantee(d)?[[:space:]]+(cure|relief|recovery|result|results|success)'
     or v_copy ~ '(permanent|miracle|instant)[[:space:]]+(cure|relief|recovery)'
     or v_copy ~ '(^|[^a-z0-9])(best|no[.]?[[:space:]]*1|number[[:space:]]*one)[[:space:]]+(physio|physiotherapist|physiotherapy)($|[^a-z0-9])'
     or v_copy ~ 'cure(d)?[[:space:]]+(in|within)[[:space:]]+[0-9]+[[:space:]]*(day|days|week|weeks|session|sessions)' then
    raise exception 'Public discovery copy contains a prohibited guaranteed or unsupported comparative claim.'
      using errcode = '22023';
  end if;

  if v_copy ~ '(^|[^a-z0-9])[a-z0-9._%+-]+@[a-z0-9.-]+[.][a-z]{2,}([^a-z0-9]|$)'
     or v_copy ~ '(^|[^a-z0-9])(https?://|www[.])'
     or v_copy ~ '(^|[^0-9])[0-9]{10,13}([^0-9]|$)' then
    raise exception 'Public discovery copy must not contain an email address, website, or phone number.'
      using errcode = '22023';
  end if;

  new.automated_check_status := 'passed';
  new.automated_checked_at := now();
  new.automated_check_version := 2;
  return new;
end;
$$;

revoke all privileges on function private.reject_misleading_discovery_claims()
  from public, anon, authenticated, service_role;

create index therapist_discovery_admin_controls_updated_by_idx
  on public.therapist_discovery_admin_controls (updated_by_user_id)
  where updated_by_user_id is not null;

commit;
