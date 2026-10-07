begin;

-- Server-authoritative guard for a small set of obviously misleading public
-- marketing claims. This mirrors the frontend pre-check but is deliberately
-- enforced at the database boundary so a custom client cannot bypass it.
-- This is not a substitute for human credential/advertising review.

create or replace function private.reject_misleading_discovery_claims()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_copy text := lower(
    coalesce(new.headline, '') || ' ' ||
    coalesce(new.bio, '') || ' ' ||
    coalesce(new.clinic_name, '')
  );
begin
  if v_copy ~
    '(100[[:space:]]*%[[:space:]]*(cure|relief|recovery|success)' ||
    '|guarantee(d)?[[:space:]]+(cure|relief|recovery|result|results|success)' ||
    '|(permanent|miracle|instant)[[:space:]]+(cure|relief|recovery)' ||
    '|(^|[^a-z0-9])(best|no[.]?[[:space:]]*1|number[[:space:]]*one)[[:space:]]+(physio|physiotherapist|physiotherapy)($|[^a-z0-9])' ||
    '|cure(d)?[[:space:]]+(in|within)[[:space:]]+[0-9]+[[:space:]]*(day|days|week|weeks|session|sessions))'
  then
    raise exception 'Public discovery copy contains a prohibited guaranteed or unsupported comparative claim.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all privileges on function private.reject_misleading_discovery_claims()
  from public, anon, authenticated, service_role;

drop trigger if exists physiotherapist_discovery_profiles_claim_guard
  on public.physiotherapist_discovery_profiles;

create trigger physiotherapist_discovery_profiles_claim_guard
before insert or update of headline, bio, clinic_name
on public.physiotherapist_discovery_profiles
for each row execute function private.reject_misleading_discovery_claims();

commit;
