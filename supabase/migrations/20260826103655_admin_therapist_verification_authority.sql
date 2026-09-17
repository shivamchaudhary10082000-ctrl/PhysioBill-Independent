begin;

-- Phase 5 Slice 3B: server-authoritative therapist verification review.
-- Browser roles never receive direct mutation access to admin membership,
-- request snapshots, current verification authority, or audit events.

alter table public.physiotherapist_profiles
  add column registration_jurisdiction text not null default '',
  add column registration_region_code text not null default '';

alter table public.physiotherapist_profiles
  add constraint physiotherapist_profiles_registration_region_code_check
  check (
    registration_region_code = ''
    or registration_region_code ~ '^[A-Z0-9-]{2,16}$'
  );

revoke update on table public.physiotherapist_profiles from authenticated;
grant update (
  full_name,
  title,
  qualification,
  registration,
  registration_authority,
  registration_jurisdiction,
  registration_region_code,
  pan,
  gstin,
  phone,
  email,
  address,
  invoice_prefix
) on table public.physiotherapist_profiles to authenticated;

create table public.platform_admin_memberships (
  user_id uuid primary key references auth.users(id) on delete restrict,
  capability text not null
    check (capability = 'verification_reviewer'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_admin_memberships enable row level security;
revoke all privileges on table public.platform_admin_memberships
  from public, anon, authenticated;
grant select, insert, update, delete on table public.platform_admin_memberships
  to service_role;

create or replace function private.normalize_professional_credential(p_value text)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select lower(regexp_replace(btrim(p_value), '[[:space:]]+', ' ', 'g'));
$$;

create or replace function private.normalize_registration_number(p_value text)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select upper(regexp_replace(btrim(p_value), '[^[:alnum:]]+', '', 'g'));
$$;

create or replace function private.professional_credential_fingerprint(
  p_full_name text,
  p_qualification text,
  p_registration_number text,
  p_registration_authority text,
  p_registration_jurisdiction text,
  p_registration_region_code text
)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select encode(
    extensions.digest(
      convert_to(
        concat_ws(
          E'\x1f',
          private.normalize_professional_credential(coalesce(p_full_name, '')),
          private.normalize_professional_credential(coalesce(p_qualification, '')),
          private.normalize_registration_number(coalesce(p_registration_number, '')),
          private.normalize_professional_credential(coalesce(p_registration_authority, '')),
          private.normalize_professional_credential(coalesce(p_registration_jurisdiction, '')),
          upper(btrim(coalesce(p_registration_region_code, '')))
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all privileges on function private.normalize_professional_credential(text)
  from public, anon, authenticated;
revoke all privileges on function private.normalize_registration_number(text)
  from public, anon, authenticated;
revoke all privileges on function private.professional_credential_fingerprint(text, text, text, text, text, text)
  from public, anon, authenticated;

create table public.professional_verification_requests (
  id uuid primary key default gen_random_uuid(),
  physio_id uuid not null references public.physiotherapists(id) on delete restrict,
  request_version integer not null check (request_version > 0),
  request_status text not null
    check (request_status in ('pending', 'approved', 'rejected', 'superseded', 'revoked')),
  submitted_full_name text not null,
  submitted_qualification text not null,
  submitted_registration_number text not null,
  submitted_registration_authority text not null,
  submitted_registration_jurisdiction text not null default '',
  submitted_registration_region_code text not null default '',
  normalized_registration_number text not null,
  normalized_registration_authority text not null,
  normalized_registration_jurisdiction text not null,
  normalized_registration_region_code text not null,
  canonical_registration_identity text not null,
  credential_fingerprint text not null
    check (credential_fingerprint ~ '^[0-9a-f]{64}$'),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete restrict,
  decision_reason text not null default '',
  verification_method text not null default '',
  verification_reference text not null default '',
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint professional_verification_requests_physio_version_key
    unique (physio_id, request_version),
  constraint professional_verification_requests_decision_check check (
    (request_status = 'pending' and decided_at is null and decided_by is null)
    or
    (request_status in ('approved', 'rejected', 'revoked')
      and decided_at is not null and decided_by is not null)
    or
    (request_status = 'superseded' and superseded_at is not null)
  ),
  constraint professional_verification_requests_region_code_check check (
    submitted_registration_region_code = ''
    or submitted_registration_region_code ~ '^[A-Z0-9-]{2,16}$'
  )
);

create unique index professional_verification_requests_one_pending_idx
  on public.professional_verification_requests (physio_id)
  where request_status = 'pending';
create index professional_verification_requests_pending_queue_idx
  on public.professional_verification_requests (requested_at, id)
  where request_status = 'pending';
create index professional_verification_requests_registration_idx
  on public.professional_verification_requests (canonical_registration_identity);

alter table public.professional_verification_requests enable row level security;
revoke all privileges on table public.professional_verification_requests
  from public, anon, authenticated;
grant select, insert, update, delete on table public.professional_verification_requests
  to service_role;

create table public.professional_verification_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.professional_verification_requests(id) on delete restrict,
  request_version integer,
  physio_id uuid not null references public.physiotherapists(id) on delete restrict,
  credential_fingerprint text not null default '',
  previous_state text not null,
  resulting_state text not null,
  event_type text not null check (
    event_type in (
      'requested',
      'approved',
      'rejected',
      'revoked',
      'invalidated_by_credential_change',
      'resubmission_required',
      'superseded'
    )
  ),
  reviewer_user_id uuid references auth.users(id) on delete restrict,
  reason text not null default '',
  verification_method text not null default '',
  verification_reference text not null default '',
  created_at timestamptz not null default now()
);

create index professional_verification_events_physio_created_idx
  on public.professional_verification_events (physio_id, created_at desc, id desc);
create index professional_verification_events_request_idx
  on public.professional_verification_events (request_id, created_at, id);

alter table public.professional_verification_events enable row level security;
revoke all privileges on table public.professional_verification_events
  from public, anon, authenticated;
grant select, insert on table public.professional_verification_events
  to service_role;

alter table public.physiotherapist_professional_verifications
  add column current_request_id uuid
    references public.professional_verification_requests(id) on delete restrict,
  add column approved_request_id uuid
    references public.professional_verification_requests(id) on delete restrict,
  add column credential_fingerprint text,
  add column canonical_registration_identity text,
  add column verification_reference text not null default '';

create unique index professional_verifications_active_registration_unique_idx
  on public.physiotherapist_professional_verifications (canonical_registration_identity)
  where verification_status = 'verified';

create or replace function private.reject_verification_request_snapshot_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Professional verification requests cannot be deleted.'
      using errcode = '55000';
  end if;

  if old.physio_id is distinct from new.physio_id
     or old.request_version is distinct from new.request_version
     or old.submitted_full_name is distinct from new.submitted_full_name
     or old.submitted_qualification is distinct from new.submitted_qualification
     or old.submitted_registration_number is distinct from new.submitted_registration_number
     or old.submitted_registration_authority is distinct from new.submitted_registration_authority
     or old.submitted_registration_jurisdiction is distinct from new.submitted_registration_jurisdiction
     or old.submitted_registration_region_code is distinct from new.submitted_registration_region_code
     or old.normalized_registration_number is distinct from new.normalized_registration_number
     or old.normalized_registration_authority is distinct from new.normalized_registration_authority
     or old.normalized_registration_jurisdiction is distinct from new.normalized_registration_jurisdiction
     or old.normalized_registration_region_code is distinct from new.normalized_registration_region_code
     or old.canonical_registration_identity is distinct from new.canonical_registration_identity
     or old.credential_fingerprint is distinct from new.credential_fingerprint
     or old.requested_at is distinct from new.requested_at
     or old.created_at is distinct from new.created_at then
    raise exception 'Professional verification request snapshots are immutable.'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

create trigger professional_verification_requests_preserve_snapshot
before update or delete on public.professional_verification_requests
for each row execute function private.reject_verification_request_snapshot_mutation();

create or replace function private.reject_professional_verification_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Professional verification audit events are append-only.'
    using errcode = '55000';
end;
$$;

create trigger professional_verification_events_append_only
before update or delete on public.professional_verification_events
for each row execute function private.reject_professional_verification_event_mutation();

revoke all privileges on function private.reject_verification_request_snapshot_mutation()
  from public, anon, authenticated;
revoke all privileges on function private.reject_professional_verification_event_mutation()
  from public, anon, authenticated;

create or replace function private.is_active_verification_reviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.platform_admin_memberships pam
     where pam.user_id = (select auth.uid())
       and pam.capability = 'verification_reviewer'
       and pam.is_active
  );
$$;

revoke all privileges on function private.is_active_verification_reviewer()
  from public, anon, authenticated;

create or replace function private.require_active_verification_reviewer()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not private.is_active_verification_reviewer() then
    raise exception 'Active verification-reviewer authority is required.'
      using errcode = '42501';
  end if;
  return v_user_id;
end;
$$;

revoke all privileges on function private.require_active_verification_reviewer()
  from public, anon, authenticated;

create or replace function public.request_my_professional_verification()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_physio_id uuid;
  v_profile public.physiotherapist_profiles%rowtype;
  v_verification public.physiotherapist_professional_verifications%rowtype;
  v_pending public.professional_verification_requests%rowtype;
  v_request public.professional_verification_requests%rowtype;
  v_version integer;
  v_number text;
  v_authority text;
  v_jurisdiction text;
  v_region text;
  v_identity text;
  v_fingerprint text;
begin
  if v_user_id is null then
    raise exception 'Professional verification requires an authenticated physiotherapist.'
      using errcode = '42501';
  end if;

  select p.id
    into v_physio_id
    from public.app_users au
    join public.physiotherapists p on p.user_id = au.id
   where au.id = v_user_id
     and au.role = 'physio';

  if v_physio_id is null then
    raise exception 'Professional verification is available only to physiotherapist accounts.'
      using errcode = '42501';
  end if;

  select *
    into v_profile
    from public.physiotherapist_profiles pp
   where pp.physio_id = v_physio_id
   for update;

  if nullif(btrim(v_profile.full_name), '') is null
     or nullif(btrim(v_profile.qualification), '') is null
     or nullif(btrim(v_profile.registration), '') is null
     or nullif(btrim(v_profile.registration_authority), '') is null
     or nullif(btrim(v_profile.registration_jurisdiction), '') is null then
    raise exception 'Complete professional name, qualification, registration number, authority, and jurisdiction before requesting verification.'
      using errcode = '22023';
  end if;

  v_number := private.normalize_registration_number(v_profile.registration);
  v_authority := private.normalize_professional_credential(v_profile.registration_authority);
  v_jurisdiction := private.normalize_professional_credential(v_profile.registration_jurisdiction);
  v_region := upper(btrim(v_profile.registration_region_code));

  if v_number = '' or v_authority = '' or v_jurisdiction = '' then
    raise exception 'Professional registration identity is invalid.'
      using errcode = '22023';
  end if;

  v_identity := concat_ws('|', v_jurisdiction, v_authority, v_region, v_number);
  v_fingerprint := private.professional_credential_fingerprint(
    v_profile.full_name,
    v_profile.qualification,
    v_profile.registration,
    v_profile.registration_authority,
    v_profile.registration_jurisdiction,
    v_profile.registration_region_code
  );

  insert into public.physiotherapist_professional_verifications (physio_id)
  values (v_physio_id)
  on conflict (physio_id) do nothing;

  select *
    into v_verification
    from public.physiotherapist_professional_verifications pv
   where pv.physio_id = v_physio_id
   for update;

  select *
    into v_pending
    from public.professional_verification_requests pvr
   where pvr.physio_id = v_physio_id
     and pvr.request_status = 'pending'
   for update;

  if v_pending.id is not null and v_pending.credential_fingerprint = v_fingerprint then
    return jsonb_build_object(
      'request_id', v_pending.id,
      'request_version', v_pending.request_version,
      'verification_status', 'pending',
      'requested_at', v_pending.requested_at,
      'credential_fingerprint', v_pending.credential_fingerprint
    );
  end if;

  if v_pending.id is not null then
    update public.professional_verification_requests
       set request_status = 'superseded',
           superseded_at = now(),
           decision_reason = 'Credentials changed before review.'
     where id = v_pending.id;

    insert into public.professional_verification_events (
      request_id, request_version, physio_id, credential_fingerprint,
      previous_state, resulting_state, event_type, reason
    ) values (
      v_pending.id, v_pending.request_version, v_physio_id, v_pending.credential_fingerprint,
      'pending', 'superseded', 'superseded', 'Credentials changed before review.'
    );
  end if;

  select coalesce(max(pvr.request_version), 0) + 1
    into v_version
    from public.professional_verification_requests pvr
   where pvr.physio_id = v_physio_id;

  insert into public.professional_verification_requests (
    physio_id, request_version, request_status,
    submitted_full_name, submitted_qualification,
    submitted_registration_number, submitted_registration_authority,
    submitted_registration_jurisdiction, submitted_registration_region_code,
    normalized_registration_number, normalized_registration_authority,
    normalized_registration_jurisdiction, normalized_registration_region_code,
    canonical_registration_identity, credential_fingerprint
  ) values (
    v_physio_id, v_version, 'pending',
    btrim(v_profile.full_name), btrim(v_profile.qualification),
    btrim(v_profile.registration), btrim(v_profile.registration_authority),
    btrim(v_profile.registration_jurisdiction), v_region,
    v_number, v_authority, v_jurisdiction, v_region,
    v_identity, v_fingerprint
  )
  returning * into v_request;

  update public.physiotherapist_professional_verifications
     set verification_status = 'pending',
         requested_at = v_request.requested_at,
         current_request_id = v_request.id,
         approved_request_id = null,
         credential_fingerprint = v_fingerprint,
         canonical_registration_identity = null,
         verified_at = null,
         verification_method = '',
         verification_reference = '',
         reviewed_at = null,
         reviewed_by = null,
         rejection_reason = '',
         verified_qualification = '',
         verified_registration_number = '',
         verified_registration_authority = ''
   where physio_id = v_physio_id;

  insert into public.professional_verification_events (
    request_id, request_version, physio_id, credential_fingerprint,
    previous_state, resulting_state, event_type
  ) values (
    v_request.id, v_request.request_version, v_physio_id, v_fingerprint,
    v_verification.verification_status, 'pending', 'requested'
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'request_version', v_request.request_version,
    'verification_status', 'pending',
    'requested_at', v_request.requested_at,
    'credential_fingerprint', v_request.credential_fingerprint
  );
end;
$$;

revoke all privileges on function public.request_my_professional_verification()
  from public, anon, authenticated, service_role;
grant execute on function public.request_my_professional_verification()
  to authenticated;

create or replace function public.list_pending_professional_verifications()
returns table (
  request_id uuid,
  physio_id uuid,
  request_version integer,
  submitted_full_name text,
  submitted_qualification text,
  submitted_registration_number text,
  submitted_registration_authority text,
  submitted_registration_jurisdiction text,
  submitted_registration_region_code text,
  credential_fingerprint text,
  requested_at timestamptz,
  registration_conflict boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_active_verification_reviewer();

  return query
  select
    r.id,
    r.physio_id,
    r.request_version,
    r.submitted_full_name,
    r.submitted_qualification,
    r.submitted_registration_number,
    r.submitted_registration_authority,
    r.submitted_registration_jurisdiction,
    r.submitted_registration_region_code,
    r.credential_fingerprint,
    r.requested_at,
    exists (
      select 1
        from public.physiotherapist_professional_verifications pv
       where pv.verification_status = 'verified'
         and pv.physio_id <> r.physio_id
         and pv.canonical_registration_identity = r.canonical_registration_identity
    )
  from public.professional_verification_requests r
  where r.request_status = 'pending'
  order by r.requested_at, r.id;
end;
$$;

create or replace function public.get_professional_verification_review(p_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_request jsonb;
  v_events jsonb;
begin
  perform private.require_active_verification_reviewer();

  select jsonb_build_object(
    'request_id', r.id,
    'physio_id', r.physio_id,
    'request_version', r.request_version,
    'request_status', r.request_status,
    'submitted_full_name', r.submitted_full_name,
    'submitted_qualification', r.submitted_qualification,
    'submitted_registration_number', r.submitted_registration_number,
    'submitted_registration_authority', r.submitted_registration_authority,
    'submitted_registration_jurisdiction', r.submitted_registration_jurisdiction,
    'submitted_registration_region_code', r.submitted_registration_region_code,
    'credential_fingerprint', r.credential_fingerprint,
    'requested_at', r.requested_at,
    'decided_at', r.decided_at,
    'decision_reason', r.decision_reason,
    'verification_method', r.verification_method,
    'verification_reference', r.verification_reference,
    'registration_conflict', exists (
      select 1
        from public.physiotherapist_professional_verifications pv
       where pv.verification_status = 'verified'
         and pv.physio_id <> r.physio_id
         and pv.canonical_registration_identity = r.canonical_registration_identity
    )
  )
  into v_request
  from public.professional_verification_requests r
  where r.id = p_request_id;

  if v_request is null then
    raise exception 'Professional verification request was not found.'
      using errcode = 'P0002';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'request_id', e.request_id,
        'request_version', e.request_version,
        'event_type', e.event_type,
        'previous_state', e.previous_state,
        'resulting_state', e.resulting_state,
        'reason', e.reason,
        'verification_method', e.verification_method,
        'verification_reference', e.verification_reference,
        'created_at', e.created_at
      )
      order by e.created_at, e.id
    ),
    '[]'::jsonb
  )
  into v_events
  from public.professional_verification_events e
  where e.physio_id = (v_request ->> 'physio_id')::uuid;

  return v_request || jsonb_build_object('events', v_events);
end;
$$;

create or replace function public.decide_professional_verification(
  p_request_id uuid,
  p_expected_request_version integer,
  p_expected_credential_fingerprint text,
  p_decision text,
  p_reason text default '',
  p_verification_method text default '',
  p_verification_reference text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer uuid := private.require_active_verification_reviewer();
  v_request public.professional_verification_requests%rowtype;
  v_verification public.physiotherapist_professional_verifications%rowtype;
  v_profile public.physiotherapist_profiles%rowtype;
  v_current_fingerprint text;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_method text := btrim(coalesce(p_verification_method, ''));
  v_reference text := btrim(coalesce(p_verification_reference, ''));
begin
  if p_decision not in ('approve', 'reject') then
    raise exception 'Unsupported professional verification decision.'
      using errcode = '22023';
  end if;
  if p_decision = 'reject' and v_reason = '' then
    raise exception 'A rejection reason is required.'
      using errcode = '22023';
  end if;
  if p_decision = 'approve' and v_method = '' then
    raise exception 'A verification method is required for approval.'
      using errcode = '22023';
  end if;
  if char_length(v_reason) > 1000
     or char_length(v_method) > 160
     or char_length(v_reference) > 240 then
    raise exception 'Verification review input exceeds the permitted length.'
      using errcode = '22023';
  end if;

  select *
    into v_request
    from public.professional_verification_requests r
   where r.id = p_request_id
   for update;

  if v_request.id is null then
    raise exception 'Professional verification request was not found.'
      using errcode = 'P0002';
  end if;

  if v_request.request_version <> p_expected_request_version
     or v_request.credential_fingerprint <> p_expected_credential_fingerprint then
    raise exception 'Professional verification review is stale.'
      using errcode = '40001';
  end if;

  if v_request.request_status <> 'pending' then
    if (p_decision = 'approve' and v_request.request_status = 'approved')
       or (p_decision = 'reject' and v_request.request_status = 'rejected') then
      return jsonb_build_object(
        'request_id', v_request.id,
        'request_status', v_request.request_status,
        'idempotent', true
      );
    end if;
    raise exception 'Professional verification request has already been decided.'
      using errcode = '55000';
  end if;

  select *
    into v_verification
    from public.physiotherapist_professional_verifications pv
   where pv.physio_id = v_request.physio_id
   for update;

  select *
    into v_profile
    from public.physiotherapist_profiles pp
   where pp.physio_id = v_request.physio_id
   for update;

  v_current_fingerprint := private.professional_credential_fingerprint(
    v_profile.full_name,
    v_profile.qualification,
    v_profile.registration,
    v_profile.registration_authority,
    v_profile.registration_jurisdiction,
    v_profile.registration_region_code
  );

  if v_current_fingerprint <> v_request.credential_fingerprint
     or v_verification.current_request_id is distinct from v_request.id
     or v_verification.verification_status <> 'pending' then
    raise exception 'Professional credentials or verification state changed after submission.'
      using errcode = '40001';
  end if;

  if p_decision = 'approve' and exists (
    select 1
      from public.physiotherapist_professional_verifications conflict
     where conflict.verification_status = 'verified'
       and conflict.physio_id <> v_request.physio_id
       and conflict.canonical_registration_identity = v_request.canonical_registration_identity
  ) then
    raise exception 'This canonical professional registration is already actively verified.'
      using errcode = '23505';
  end if;

  update public.professional_verification_requests
     set request_status = case when p_decision = 'approve' then 'approved' else 'rejected' end,
         decided_at = now(),
         decided_by = v_reviewer,
         decision_reason = v_reason,
         verification_method = case when p_decision = 'approve' then v_method else '' end,
         verification_reference = case when p_decision = 'approve' then v_reference else '' end
   where id = v_request.id;

  if p_decision = 'approve' then
    update public.physiotherapist_professional_verifications
       set verification_status = 'verified',
           requested_at = v_request.requested_at,
           current_request_id = v_request.id,
           approved_request_id = v_request.id,
           credential_fingerprint = v_request.credential_fingerprint,
           canonical_registration_identity = v_request.canonical_registration_identity,
           verified_at = now(),
           verification_method = v_method,
           verification_reference = v_reference,
           reviewed_at = now(),
           reviewed_by = v_reviewer,
           rejection_reason = '',
           verified_qualification = v_request.submitted_qualification,
           verified_registration_number = v_request.submitted_registration_number,
           verified_registration_authority = v_request.submitted_registration_authority
     where physio_id = v_request.physio_id;
  else
    update public.physiotherapist_professional_verifications
       set verification_status = 'rejected',
           current_request_id = v_request.id,
           approved_request_id = null,
           credential_fingerprint = v_request.credential_fingerprint,
           canonical_registration_identity = null,
           verified_at = null,
           verification_method = '',
           verification_reference = '',
           reviewed_at = now(),
           reviewed_by = v_reviewer,
           rejection_reason = v_reason,
           verified_qualification = '',
           verified_registration_number = '',
           verified_registration_authority = ''
     where physio_id = v_request.physio_id;
  end if;

  insert into public.professional_verification_events (
    request_id, request_version, physio_id, credential_fingerprint,
    previous_state, resulting_state, event_type, reviewer_user_id,
    reason, verification_method, verification_reference
  ) values (
    v_request.id, v_request.request_version, v_request.physio_id,
    v_request.credential_fingerprint, 'pending',
    case when p_decision = 'approve' then 'verified' else 'rejected' end,
    case when p_decision = 'approve' then 'approved' else 'rejected' end,
    v_reviewer, v_reason,
    case when p_decision = 'approve' then v_method else '' end,
    case when p_decision = 'approve' then v_reference else '' end
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'request_status', case when p_decision = 'approve' then 'approved' else 'rejected' end,
    'idempotent', false
  );
end;
$$;

create or replace function public.revoke_professional_verification(
  p_physio_id uuid,
  p_expected_credential_fingerprint text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer uuid := private.require_active_verification_reviewer();
  v_verification public.physiotherapist_professional_verifications%rowtype;
  v_request public.professional_verification_requests%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_reason = '' or char_length(v_reason) > 1000 then
    raise exception 'A valid revocation reason is required.'
      using errcode = '22023';
  end if;

  select *
    into v_verification
    from public.physiotherapist_professional_verifications pv
   where pv.physio_id = p_physio_id
   for update;

  if v_verification.verification_status <> 'verified'
     or v_verification.credential_fingerprint <> p_expected_credential_fingerprint then
    raise exception 'Verified professional state is stale or unavailable.'
      using errcode = '40001';
  end if;

  select *
    into v_request
    from public.professional_verification_requests r
   where r.id = v_verification.approved_request_id
   for update;

  update public.professional_verification_requests
     set request_status = 'revoked',
         decided_at = now(),
         decided_by = v_reviewer,
         decision_reason = v_reason
   where id = v_request.id;

  update public.physiotherapist_professional_verifications
     set verification_status = 'unverified',
         current_request_id = null,
         approved_request_id = null,
         canonical_registration_identity = null,
         verified_at = null,
         verification_method = '',
         verification_reference = '',
         reviewed_at = now(),
         reviewed_by = v_reviewer,
         rejection_reason = '',
         verified_qualification = '',
         verified_registration_number = '',
         verified_registration_authority = ''
   where physio_id = p_physio_id;

  insert into public.professional_verification_events (
    request_id, request_version, physio_id, credential_fingerprint,
    previous_state, resulting_state, event_type, reviewer_user_id, reason
  ) values (
    v_request.id, v_request.request_version, p_physio_id,
    v_request.credential_fingerprint, 'verified', 'unverified',
    'revoked', v_reviewer, v_reason
  );

  return jsonb_build_object('physio_id', p_physio_id, 'verification_status', 'unverified');
end;
$$;

create or replace function public.require_professional_verification_resubmission(
  p_request_id uuid,
  p_expected_request_version integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer uuid := private.require_active_verification_reviewer();
  v_request public.professional_verification_requests%rowtype;
  v_verification public.physiotherapist_professional_verifications%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_reason = '' or char_length(v_reason) > 1000 then
    raise exception 'A valid resubmission reason is required.'
      using errcode = '22023';
  end if;

  select *
    into v_request
    from public.professional_verification_requests r
   where r.id = p_request_id
   for update;

  if v_request.id is null or v_request.request_version <> p_expected_request_version then
    raise exception 'Professional verification request is stale or unavailable.'
      using errcode = '40001';
  end if;

  if v_request.request_status <> 'pending' then
    raise exception 'Only a pending request can require resubmission.'
      using errcode = '55000';
  end if;

  select *
    into v_verification
    from public.physiotherapist_professional_verifications pv
   where pv.physio_id = v_request.physio_id
   for update;

  update public.professional_verification_requests
     set request_status = 'superseded',
         superseded_at = now(),
         decided_by = v_reviewer,
         decision_reason = v_reason
   where id = v_request.id;

  update public.physiotherapist_professional_verifications
     set verification_status = 'unverified',
         current_request_id = null,
         approved_request_id = null,
         canonical_registration_identity = null,
         verified_at = null,
         verification_method = '',
         verification_reference = '',
         reviewed_at = now(),
         reviewed_by = v_reviewer,
         rejection_reason = v_reason,
         verified_qualification = '',
         verified_registration_number = '',
         verified_registration_authority = ''
   where physio_id = v_request.physio_id;

  insert into public.professional_verification_events (
    request_id, request_version, physio_id, credential_fingerprint,
    previous_state, resulting_state, event_type, reviewer_user_id, reason
  ) values (
    v_request.id, v_request.request_version, v_request.physio_id,
    v_request.credential_fingerprint, 'pending', 'unverified',
    'resubmission_required', v_reviewer, v_reason
  );

  return jsonb_build_object('request_id', v_request.id, 'verification_status', 'unverified');
end;
$$;

revoke all privileges on function public.list_pending_professional_verifications()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.get_professional_verification_review(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.decide_professional_verification(uuid, integer, text, text, text, text, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.revoke_professional_verification(uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.require_professional_verification_resubmission(uuid, integer, text)
  from public, anon, authenticated, service_role;

grant execute on function public.list_pending_professional_verifications()
  to authenticated;
grant execute on function public.get_professional_verification_review(uuid)
  to authenticated;
grant execute on function public.decide_professional_verification(uuid, integer, text, text, text, text, text)
  to authenticated;
grant execute on function public.revoke_professional_verification(uuid, text, text)
  to authenticated;
grant execute on function public.require_professional_verification_resubmission(uuid, integer, text)
  to authenticated;

create or replace function private.invalidate_professional_verification_on_credential_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verification public.physiotherapist_professional_verifications%rowtype;
  v_request public.professional_verification_requests%rowtype;
begin
  if old.full_name is not distinct from new.full_name
     and old.qualification is not distinct from new.qualification
     and old.registration is not distinct from new.registration
     and old.registration_authority is not distinct from new.registration_authority
     and old.registration_jurisdiction is not distinct from new.registration_jurisdiction
     and old.registration_region_code is not distinct from new.registration_region_code then
    return new;
  end if;

  select *
    into v_verification
    from public.physiotherapist_professional_verifications pv
   where pv.physio_id = new.physio_id
   for update;

  if v_verification.current_request_id is not null then
    select *
      into v_request
      from public.professional_verification_requests r
     where r.id = v_verification.current_request_id
     for update;
  end if;

  if v_request.id is not null and v_request.request_status = 'pending' then
    update public.professional_verification_requests
       set request_status = 'superseded',
           superseded_at = now(),
           decision_reason = 'Professional credentials changed after submission.'
     where id = v_request.id;
  end if;

  if v_verification.verification_status in ('pending', 'verified', 'rejected') then
    insert into public.professional_verification_events (
      request_id, request_version, physio_id, credential_fingerprint,
      previous_state, resulting_state, event_type, reason
    ) values (
      v_request.id,
      v_request.request_version,
      new.physio_id,
      coalesce(v_verification.credential_fingerprint, ''),
      v_verification.verification_status,
      'unverified',
      'invalidated_by_credential_change',
      'Professional credentials changed.'
    );
  end if;

  update public.physiotherapist_professional_verifications
     set verification_status = 'unverified',
         requested_at = null,
         current_request_id = null,
         approved_request_id = null,
         credential_fingerprint = null,
         canonical_registration_identity = null,
         verified_at = null,
         verification_method = '',
         verification_reference = '',
         reviewed_at = null,
         reviewed_by = null,
         rejection_reason = '',
         verified_qualification = '',
         verified_registration_number = '',
         verified_registration_authority = ''
   where physio_id = new.physio_id;

  return new;
end;
$$;

revoke all privileges on function private.invalidate_professional_verification_on_credential_change()
  from public, anon, authenticated;

drop trigger if exists physiotherapist_profiles_invalidate_verification
  on public.physiotherapist_profiles;
create trigger physiotherapist_profiles_invalidate_verification
after update of
  full_name,
  qualification,
  registration,
  registration_authority,
  registration_jurisdiction,
  registration_region_code
on public.physiotherapist_profiles
for each row execute function private.invalidate_professional_verification_on_credential_change();

commit;
