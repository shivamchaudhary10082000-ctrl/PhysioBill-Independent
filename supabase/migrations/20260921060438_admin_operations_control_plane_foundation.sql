begin;

-- Admin operations control-plane foundation.
--
-- This migration deliberately exposes purpose-built, masked operational reads
-- rather than granting browser roles access to source tables. Clinical records,
-- diagnoses, private patient charts, contact details, OTPs, secrets and payment
-- credentials are outside this authority.

create table public.platform_admin_capability_grants (
  user_id uuid not null references auth.users(id) on delete restrict,
  capability text not null check (
    capability in (
      'platform_owner',
      'operations_admin',
      'verification_reviewer',
      'support_agent',
      'privacy_officer',
      'security_auditor',
      'content_moderator',
      'finance_reviewer'
    )
  ),
  is_active boolean not null default true,
  granted_by_user_id uuid references auth.users(id) on delete restrict,
  grant_reason text not null default '' check (char_length(grant_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, capability)
);

alter table public.platform_admin_capability_grants enable row level security;

revoke all privileges on table public.platform_admin_capability_grants
  from public, anon, authenticated, service_role;
grant select, insert, update on table public.platform_admin_capability_grants
  to service_role;

create trigger platform_admin_capability_grants_set_updated_at
before update on public.platform_admin_capability_grants
for each row execute function public.set_updated_at();

-- Preserve existing verification-reviewer authority without widening it.
insert into public.platform_admin_capability_grants (
  user_id,
  capability,
  is_active,
  grant_reason,
  created_at,
  updated_at
)
select
  membership.user_id,
  'verification_reviewer',
  membership.is_active,
  'Migrated from the original verification-only Admin membership.',
  membership.created_at,
  membership.updated_at
from public.platform_admin_memberships membership
on conflict (user_id, capability) do nothing;

-- Bootstrap the existing active platform owner into the composable capability
-- model. Without this grant, the first owner could not administer capabilities.
insert into public.platform_admin_capability_grants (
  user_id,
  capability,
  is_active,
  grant_reason,
  created_at,
  updated_at
)
select
  membership.user_id,
  'platform_owner',
  membership.is_active,
  'Migrated from the original platform-owner Admin membership.',
  membership.created_at,
  membership.updated_at
from public.platform_admin_memberships membership
where membership.admin_role = 'owner'
on conflict (user_id, capability) do nothing;

create table public.platform_admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  capability_used text not null,
  action text not null check (char_length(btrim(action)) between 1 and 120),
  target_type text not null check (char_length(btrim(target_type)) between 1 and 120),
  target_id uuid,
  reason text not null default '' check (char_length(reason) <= 1000),
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint platform_admin_audit_details_object_check
    check (jsonb_typeof(details) = 'object')
);

create index platform_admin_audit_events_actor_time_idx
  on public.platform_admin_audit_events (actor_user_id, occurred_at desc);
create index platform_admin_audit_events_target_time_idx
  on public.platform_admin_audit_events (target_type, target_id, occurred_at desc);

alter table public.platform_admin_audit_events enable row level security;

revoke all privileges on table public.platform_admin_audit_events
  from public, anon, authenticated, service_role;
grant select on table public.platform_admin_audit_events to service_role;

create function private.reject_platform_admin_audit_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Platform Admin audit events are append-only.'
    using errcode = '55000';
end;
$$;

create trigger platform_admin_audit_events_append_only
before update or delete on public.platform_admin_audit_events
for each row execute function private.reject_platform_admin_audit_event_mutation();

revoke all privileges on function private.reject_platform_admin_audit_event_mutation()
  from public, anon, authenticated, service_role;

create function private.has_active_platform_admin_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.platform_admin_capability_grants grant_row
     where grant_row.user_id = (select auth.uid())
       and grant_row.capability = p_capability
       and grant_row.is_active
  ) or (
    p_capability = 'verification_reviewer'
    and exists (
      select 1
        from public.platform_admin_memberships legacy
       where legacy.user_id = (select auth.uid())
         and legacy.capability = 'verification_reviewer'
         and legacy.is_active
    )
  );
$$;

revoke all privileges on function private.has_active_platform_admin_capability(text)
  from public, anon, authenticated, service_role;

create function private.require_any_platform_admin_capability(p_capabilities text[])
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_capability text;
begin
  if v_user_id is null then
    raise exception 'Authenticated Admin authority is required.'
      using errcode = '42501';
  end if;

  if private.current_admin_aal() <> 'aal2' then
    raise exception 'Admin multi-factor authentication is required.'
      using errcode = '42501';
  end if;

  if p_capabilities is null or cardinality(p_capabilities) = 0 then
    raise exception 'At least one Admin capability is required.'
      using errcode = '22023';
  end if;

  select requested.capability
    into v_capability
    from unnest(p_capabilities) with ordinality requested(capability, position)
   where private.has_active_platform_admin_capability(requested.capability)
   order by requested.position
   limit 1;

  if v_capability is null then
    raise exception 'The required active Admin capability is not assigned.'
      using errcode = '42501';
  end if;

  return v_capability;
end;
$$;

revoke all privileges on function private.require_any_platform_admin_capability(text[])
  from public, anon, authenticated, service_role;

create function private.write_platform_admin_audit_event(
  p_capability_used text,
  p_action text,
  p_target_type text,
  p_target_id uuid default null,
  p_reason text default '',
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_event_id uuid;
begin
  if v_actor_user_id is null then
    raise exception 'Authenticated Admin authority is required.'
      using errcode = '42501';
  end if;

  if not private.has_active_platform_admin_capability(p_capability_used) then
    raise exception 'The claimed Admin capability is not active.'
      using errcode = '42501';
  end if;

  insert into public.platform_admin_audit_events (
    actor_user_id,
    capability_used,
    action,
    target_type,
    target_id,
    reason,
    details
  ) values (
    v_actor_user_id,
    p_capability_used,
    btrim(p_action),
    btrim(p_target_type),
    p_target_id,
    btrim(coalesce(p_reason, '')),
    coalesce(p_details, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all privileges on function private.write_platform_admin_audit_event(text, text, text, uuid, text, jsonb)
  from public, anon, authenticated, service_role;

create or replace function private.is_active_verification_reviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_active_platform_admin_capability('verification_reviewer');
$$;

revoke all privileges on function private.is_active_verification_reviewer()
  from public, anon, authenticated, service_role;

create function public.get_my_platform_admin_capabilities()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(capability order by capability), array[]::text[])
  from (
    select grant_row.capability
      from public.platform_admin_capability_grants grant_row
     where grant_row.user_id = (select auth.uid())
       and grant_row.is_active
    union
    select legacy.capability
      from public.platform_admin_memberships legacy
     where legacy.user_id = (select auth.uid())
       and legacy.capability = 'verification_reviewer'
       and legacy.is_active
  ) capabilities;
$$;

revoke all privileges on function public.get_my_platform_admin_capabilities()
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_platform_admin_capabilities()
  to authenticated;

-- Reconcile the owner/MFA gateway with composable capabilities. Capability
-- grants may authorize new Admin users who do not have a legacy membership.
create or replace function public.get_my_admin_access()
returns table (
  capability text,
  admin_role text,
  current_aal text,
  mfa_required boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    access.capability,
    case
      when private.has_active_platform_admin_capability('platform_owner') then 'owner'
      else 'reviewer'
    end,
    private.current_admin_aal(),
    true
  from (
    select grant_row.capability, 1 as priority
      from public.platform_admin_capability_grants grant_row
     where grant_row.user_id = (select auth.uid())
       and grant_row.is_active
    union all
    select membership.capability, 2 as priority
      from public.platform_admin_memberships membership
     where membership.user_id = (select auth.uid())
       and membership.is_active
  ) access
  order by
    case when access.capability = 'platform_owner' then 0 else access.priority end,
    access.capability
  limit 1;
$$;

revoke all privileges on function public.get_my_admin_access()
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_admin_access()
  to authenticated;

create or replace function public.get_my_pending_admin_totp_factor()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select factor.id
    from auth.mfa_factors factor
   where factor.user_id = (select auth.uid())
     and factor.factor_type = 'totp'
     and factor.status = 'unverified'
     and (
       exists (
         select 1
           from public.platform_admin_capability_grants grant_row
          where grant_row.user_id = factor.user_id
            and grant_row.is_active
       )
       or exists (
         select 1
           from public.platform_admin_memberships membership
          where membership.user_id = factor.user_id
            and membership.is_active
       )
     )
   order by factor.created_at desc
   limit 1;
$$;

revoke all privileges on function public.get_my_pending_admin_totp_factor()
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_pending_admin_totp_factor()
  to authenticated;

create function public.get_admin_operations_overview(
  p_from date default current_date - 29,
  p_to date default current_date
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_capability text;
  v_result jsonb;
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception 'Admin overview date range must be between 1 and 367 days.'
      using errcode = '22023';
  end if;

  v_capability := private.require_any_platform_admin_capability(
    array['platform_owner', 'operations_admin']
  );

  select jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'traffic', jsonb_build_object(
      'measurement_status', 'external_configuration_required',
      'unique_visitors', null,
      'page_views', null
    ),
    'appointments', jsonb_build_object(
      'total', count(*) filter (where true),
      'requested', count(*) filter (where request_row.status = 'requested'),
      'accepted', count(*) filter (where request_row.status = 'accepted'),
      'rejected', count(*) filter (where request_row.status = 'rejected'),
      'cancelled', count(*) filter (where request_row.status = 'cancelled')
    ),
    'patients', jsonb_build_object(
      'registered_total', (select count(*) from public.platform_patients)
    ),
    'therapists', jsonb_build_object(
      'registered_total', (select count(*) from public.physiotherapists),
      'verified_total', (
        select count(*)
          from public.physiotherapist_professional_verifications verification
         where verification.verification_status = 'verified'
      ),
      'discoverable_total', (
        select count(*)
          from public.physiotherapist_discovery_profiles discovery
         where discovery.is_discoverable
      ),
      'pending_verification_total', (
        select count(*)
          from public.professional_verification_requests verification_request
         where verification_request.request_status = 'pending'
      )
    )
  )
  into v_result
  from public.patient_appointment_requests request_row
  where request_row.requested_at >= p_from::timestamptz
    and request_row.requested_at < (p_to + 1)::timestamptz;

  perform private.write_platform_admin_audit_event(
    v_capability,
    'read_operations_overview',
    'operations_overview',
    null,
    '',
    jsonb_build_object('from', p_from, 'to', p_to)
  );

  return v_result;
end;
$$;

revoke all privileges on function public.get_admin_operations_overview(date, date)
  from public, anon, authenticated, service_role;
grant execute on function public.get_admin_operations_overview(date, date)
  to authenticated;

create function public.list_admin_appointment_operations(
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now() + interval '180 days',
  p_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  appointment_request_id uuid,
  public_patient_id text,
  public_physio_id text,
  therapist_display_name text,
  service_mode text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone_name text,
  request_status text,
  requested_at timestamptz,
  responded_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text,
  reschedules_request_id uuid
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_capability text;
  v_status text := nullif(lower(btrim(coalesce(p_status, ''))), '');
begin
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '2 years' then
    raise exception 'Admin appointment range must be positive and no longer than two years.'
      using errcode = '22023';
  end if;

  if v_status is not null and v_status not in ('requested', 'accepted', 'rejected', 'cancelled') then
    raise exception 'Unsupported appointment status filter.'
      using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 200 or p_offset is null or p_offset < 0 or p_offset > 10000 then
    raise exception 'Admin appointment pagination is outside the allowed range.'
      using errcode = '22023';
  end if;

  v_capability := private.require_any_platform_admin_capability(
    array['platform_owner', 'operations_admin', 'support_agent']
  );

  perform private.write_platform_admin_audit_event(
    v_capability,
    'list_appointment_operations',
    'appointment_request',
    null,
    '',
    jsonb_build_object(
      'from', p_from,
      'to', p_to,
      'status', v_status,
      'limit', p_limit,
      'offset', p_offset
    )
  );

  return query
  select
    request_row.id,
    patient.public_patient_id,
    therapist.public_physio_id,
    coalesce(
      nullif(btrim(discovery.display_name), ''),
      nullif(btrim(profile.full_name), ''),
      'Physiotherapist'
    ),
    request_row.service_mode,
    request_row.starts_at,
    request_row.ends_at,
    request_row.timezone_name,
    request_row.status,
    request_row.requested_at,
    request_row.responded_at,
    request_row.cancelled_at,
    request_row.cancelled_by,
    request_row.reschedules_request_id
  from public.patient_appointment_requests request_row
  join public.platform_patients patient
    on patient.id = request_row.platform_patient_id
  join public.physiotherapists therapist
    on therapist.id = request_row.physio_id
  left join public.physiotherapist_profiles profile
    on profile.physio_id = therapist.id
  left join public.physiotherapist_discovery_profiles discovery
    on discovery.physio_id = therapist.id
  where request_row.requested_at >= p_from
    and request_row.requested_at < p_to
    and (v_status is null or request_row.status = v_status)
  order by request_row.requested_at desc, request_row.id desc
  limit p_limit
  offset p_offset;
end;
$$;

revoke all privileges on function public.list_admin_appointment_operations(timestamptz, timestamptz, text, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_admin_appointment_operations(timestamptz, timestamptz, text, integer, integer)
  to authenticated;

create function public.list_admin_patient_operations(
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  platform_patient_id uuid,
  public_patient_id text,
  registered_at timestamptz,
  appointment_requests_30d bigint,
  accepted_appointments_30d bigint,
  last_appointment_request_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_capability text;
begin
  if p_limit is null or p_limit < 1 or p_limit > 200 or p_offset is null or p_offset < 0 or p_offset > 10000 then
    raise exception 'Admin patient pagination is outside the allowed range.' using errcode = '22023';
  end if;

  v_capability := private.require_any_platform_admin_capability(
    array['platform_owner', 'operations_admin', 'support_agent', 'privacy_officer']
  );

  perform private.write_platform_admin_audit_event(
    v_capability,
    'list_patient_operations',
    'platform_patient',
    null,
    '',
    jsonb_build_object('limit', p_limit, 'offset', p_offset)
  );

  return query
  select
    patient.id,
    patient.public_patient_id,
    patient.created_at,
    count(request_row.id) filter (where request_row.requested_at >= now() - interval '30 days'),
    count(request_row.id) filter (
      where request_row.requested_at >= now() - interval '30 days'
        and request_row.status = 'accepted'
    ),
    max(request_row.requested_at)
  from public.platform_patients patient
  left join public.patient_appointment_requests request_row
    on request_row.platform_patient_id = patient.id
   and request_row.requested_at >= now() - interval '30 days'
  group by patient.id, patient.public_patient_id, patient.created_at
  order by patient.created_at desc, patient.id desc
  limit p_limit
  offset p_offset;
end;
$$;

revoke all privileges on function public.list_admin_patient_operations(integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_admin_patient_operations(integer, integer)
  to authenticated;

create function public.list_admin_therapist_operations(
  p_verification_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  physio_id uuid,
  public_physio_id text,
  therapist_display_name text,
  qualification text,
  verification_status text,
  is_discoverable boolean,
  registered_at timestamptz,
  appointment_requests_30d bigint,
  accepted_appointments_30d bigint
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_capability text;
  v_verification_status text := nullif(lower(btrim(coalesce(p_verification_status, ''))), '');
begin
  if v_verification_status is not null
     and v_verification_status not in ('unverified', 'pending', 'verified', 'rejected') then
    raise exception 'Unsupported therapist verification filter.'
      using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 200 or p_offset is null or p_offset < 0 or p_offset > 10000 then
    raise exception 'Admin therapist pagination is outside the allowed range.'
      using errcode = '22023';
  end if;

  v_capability := private.require_any_platform_admin_capability(
    array['platform_owner', 'operations_admin', 'verification_reviewer', 'support_agent']
  );

  perform private.write_platform_admin_audit_event(
    v_capability,
    'list_therapist_operations',
    'physiotherapist',
    null,
    '',
    jsonb_build_object(
      'verification_status', v_verification_status,
      'limit', p_limit,
      'offset', p_offset
    )
  );

  return query
  select
    therapist.id,
    therapist.public_physio_id,
    coalesce(
      nullif(btrim(discovery.display_name), ''),
      nullif(btrim(profile.full_name), ''),
      'Physiotherapist'
    ),
    profile.qualification,
    coalesce(verification.verification_status, 'unverified'),
    coalesce(discovery.is_discoverable, false),
    therapist.created_at,
    count(request_row.id) filter (
      where request_row.requested_at >= now() - interval '30 days'
    ),
    count(request_row.id) filter (
      where request_row.requested_at >= now() - interval '30 days'
        and request_row.status = 'accepted'
    )
  from public.physiotherapists therapist
  left join public.physiotherapist_profiles profile
    on profile.physio_id = therapist.id
  left join public.physiotherapist_discovery_profiles discovery
    on discovery.physio_id = therapist.id
  left join public.physiotherapist_professional_verifications verification
    on verification.physio_id = therapist.id
  left join public.patient_appointment_requests request_row
    on request_row.physio_id = therapist.id
   and request_row.requested_at >= now() - interval '30 days'
  where v_verification_status is null
     or coalesce(verification.verification_status, 'unverified') = v_verification_status
  group by
    therapist.id,
    therapist.public_physio_id,
    discovery.display_name,
    profile.full_name,
    profile.qualification,
    verification.verification_status,
    discovery.is_discoverable,
    therapist.created_at
  order by therapist.created_at desc, therapist.id desc
  limit p_limit
  offset p_offset;
end;
$$;

revoke all privileges on function public.list_admin_therapist_operations(text, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_admin_therapist_operations(text, integer, integer)
  to authenticated;

create function public.list_admin_billing_consistency(
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  invoice_id uuid,
  invoice_number text,
  public_physio_id text,
  invoice_status text,
  finalized boolean,
  invoice_total numeric,
  paid_total numeric,
  snapshot_total numeric,
  reimbursement_total numeric,
  pdf_generation_status text,
  consistency_status text,
  created_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_capability text;
begin
  if p_limit is null or p_limit < 1 or p_limit > 200 or p_offset is null or p_offset < 0 or p_offset > 10000 then
    raise exception 'Admin billing pagination is outside the allowed range.'
      using errcode = '22023';
  end if;

  v_capability := private.require_any_platform_admin_capability(
    array['platform_owner', 'finance_reviewer']
  );

  perform private.write_platform_admin_audit_event(
    v_capability,
    'list_billing_consistency',
    'invoice',
    null,
    '',
    jsonb_build_object('limit', p_limit, 'offset', p_offset)
  );

  return query
  select
    invoice.id,
    invoice.invoice_number,
    therapist.public_physio_id,
    invoice.status,
    invoice.finalized,
    invoice.total,
    invoice.paid,
    snapshot.total,
    reimbursement.invoice_total,
    artifact.generation_status,
    case
      when not invoice.finalized then 'draft'
      when snapshot.invoice_id is null then 'snapshot_missing'
      when invoice.total is distinct from snapshot.total then 'amount_mismatch'
      when reimbursement.invoice_id is not null
        and reimbursement.invoice_total is distinct from snapshot.total then 'amount_mismatch'
      when artifact.invoice_id is null then 'pdf_not_generated'
      when artifact.generation_status = 'failed' then 'pdf_failed'
      when artifact.generation_status = 'pending' then 'pdf_pending'
      else 'consistent'
    end,
    invoice.created_at
  from public.invoices invoice
  join public.physiotherapists therapist
    on therapist.id = invoice.physio_id
  left join public.invoice_issuance_snapshots snapshot
    on snapshot.invoice_id = invoice.id
  left join public.professional_reimbursement_documents reimbursement
    on reimbursement.invoice_id = invoice.id
  left join lateral (
    select document.invoice_id, document.generation_status
      from public.invoice_document_artifacts document
     where document.invoice_id = invoice.id
     order by document.document_version desc, document.created_at desc
     limit 1
  ) artifact on true
  order by invoice.created_at desc, invoice.id desc
  limit p_limit
  offset p_offset;
end;
$$;

revoke all privileges on function public.list_admin_billing_consistency(integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_admin_billing_consistency(integer, integer)
  to authenticated;

create function public.get_admin_communication_health(
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_capability text;
  v_result jsonb;
begin
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '1 year' then
    raise exception 'Communication health range must be positive and no longer than one year.' using errcode = '22023';
  end if;

  v_capability := private.require_any_platform_admin_capability(
    array['platform_owner', 'operations_admin', 'support_agent', 'security_auditor']
  );

  with latest_delivery as (
    select distinct on (transition.communication_event_id, transition.channel)
      transition.communication_event_id,
      transition.channel,
      transition.state,
      transition.outcome_class,
      transition.recorded_at
    from public.communication_delivery_transitions transition
    join public.communication_events event
      on event.id = transition.communication_event_id
    where event.created_at >= p_from
      and event.created_at < p_to
    order by
      transition.communication_event_id,
      transition.channel,
      transition.transition_sequence desc
  )
  select jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'provider_configuration', 'external_configuration_required',
    'intents_total', (
      select count(*) from public.communication_events event
       where event.created_at >= p_from and event.created_at < p_to
    ),
    'scheduled_due', (
      select count(*) from public.communication_events event
       where event.created_at >= p_from and event.created_at < p_to and event.scheduled_for <= now()
    ),
    'delivery_activity', count(*),
    'delivered', count(*) filter (where latest_delivery.state = 'delivered'),
    'failed', count(*) filter (where latest_delivery.state = 'failed'),
    'suppressed', count(*) filter (where latest_delivery.state = 'suppressed'),
    'last_transition_at', max(latest_delivery.recorded_at)
  ) into v_result
  from latest_delivery;

  perform private.write_platform_admin_audit_event(
    v_capability,
    'read_communication_health',
    'communication_delivery',
    null,
    '',
    jsonb_build_object('from', p_from, 'to', p_to)
  );

  return v_result;
end;
$$;

revoke all privileges on function public.get_admin_communication_health(timestamptz, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.get_admin_communication_health(timestamptz, timestamptz)
  to authenticated;

create function public.list_admin_legal_acknowledgement_summary()
returns table (
  account_role text,
  notice_version text,
  acknowledgement_count bigint,
  professional_standards_count bigint,
  latest_acknowledged_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_capability text;
begin
  v_capability := private.require_any_platform_admin_capability(
    array['platform_owner', 'privacy_officer', 'content_moderator']
  );

  perform private.write_platform_admin_audit_event(
    v_capability,
    'list_legal_acknowledgement_summary',
    'legal_acknowledgement',
    null,
    '',
    '{}'::jsonb
  );

  return query
  select
    acknowledgement.account_role,
    acknowledgement.notice_version,
    count(*),
    count(*) filter (where acknowledgement.professional_standards_acknowledged),
    max(acknowledgement.acknowledged_at)
  from public.account_legal_acknowledgements acknowledgement
  group by acknowledgement.account_role, acknowledgement.notice_version
  order by max(acknowledgement.acknowledged_at) desc, acknowledgement.account_role;
end;
$$;

revoke all privileges on function public.list_admin_legal_acknowledgement_summary()
  from public, anon, authenticated, service_role;
grant execute on function public.list_admin_legal_acknowledgement_summary()
  to authenticated;

create table public.platform_admin_cases (
  id uuid primary key default gen_random_uuid(),
  case_number bigint generated always as identity unique,
  category text not null check (
    category in (
      'complaint',
      'safety_incident',
      'privacy_access',
      'privacy_correction',
      'privacy_deletion',
      'privacy_grievance',
      'billing',
      'technical'
    )
  ),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  case_status text not null default 'open' check (
    case_status in ('open', 'triaged', 'in_progress', 'waiting', 'closed')
  ),
  safe_summary text not null check (char_length(btrim(safe_summary)) between 8 and 500),
  related_appointment_request_id uuid references public.patient_appointment_requests(id) on delete restrict,
  related_physio_id uuid references public.physiotherapists(id) on delete restrict,
  related_platform_patient_id uuid references public.platform_patients(id) on delete restrict,
  assigned_admin_user_id uuid references auth.users(id) on delete restrict,
  due_at timestamptz,
  legal_hold boolean not null default false,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_admin_cases_closed_state_check check (
    (case_status = 'closed' and closed_at is not null)
    or (case_status <> 'closed' and closed_at is null)
  )
);

create index platform_admin_cases_status_due_idx
  on public.platform_admin_cases (case_status, due_at, created_at desc);
create index platform_admin_cases_appointment_idx
  on public.platform_admin_cases (related_appointment_request_id)
  where related_appointment_request_id is not null;

alter table public.platform_admin_cases enable row level security;
revoke all privileges on table public.platform_admin_cases
  from public, anon, authenticated, service_role;
grant select, insert, update on table public.platform_admin_cases to service_role;

create trigger platform_admin_cases_set_updated_at
before update on public.platform_admin_cases
for each row execute function public.set_updated_at();

create table public.platform_admin_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.platform_admin_cases(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('created', 'status_changed')),
  from_status text,
  to_status text not null,
  reason text not null check (char_length(btrim(reason)) between 8 and 1000),
  occurred_at timestamptz not null default now()
);

create index platform_admin_case_events_case_time_idx
  on public.platform_admin_case_events (case_id, occurred_at, id);

alter table public.platform_admin_case_events enable row level security;
revoke all privileges on table public.platform_admin_case_events
  from public, anon, authenticated, service_role;
grant select on table public.platform_admin_case_events to service_role;

create function private.reject_platform_admin_case_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Platform Admin case events are append-only.'
    using errcode = '55000';
end;
$$;

create trigger platform_admin_case_events_append_only
before update or delete on public.platform_admin_case_events
for each row execute function private.reject_platform_admin_case_event_mutation();

revoke all privileges on function private.reject_platform_admin_case_event_mutation()
  from public, anon, authenticated, service_role;

create function private.can_access_platform_admin_case_category(p_category text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_active_platform_admin_capability('platform_owner')
    or (
      p_category in ('privacy_access', 'privacy_correction', 'privacy_deletion', 'privacy_grievance')
      and private.has_active_platform_admin_capability('privacy_officer')
    )
    or (
      p_category in ('complaint', 'safety_incident', 'billing', 'technical')
      and (
        private.has_active_platform_admin_capability('operations_admin')
        or private.has_active_platform_admin_capability('support_agent')
      )
    )
    or (
      p_category = 'billing'
      and private.has_active_platform_admin_capability('finance_reviewer')
    )
    or (
      p_category in ('safety_incident', 'technical')
      and private.has_active_platform_admin_capability('security_auditor')
    );
$$;

revoke all privileges on function private.can_access_platform_admin_case_category(text)
  from public, anon, authenticated, service_role;

create function public.list_platform_admin_cases(
  p_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  case_id uuid,
  case_number bigint,
  category text,
  severity text,
  case_status text,
  safe_summary text,
  related_appointment_request_id uuid,
  related_public_physio_id text,
  related_public_patient_id text,
  assigned_admin_user_id uuid,
  due_at timestamptz,
  legal_hold boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_capability text;
  v_status text := nullif(lower(btrim(coalesce(p_status, ''))), '');
begin
  if v_status is not null and v_status not in ('open', 'triaged', 'in_progress', 'waiting', 'closed') then
    raise exception 'Unsupported Admin case status filter.' using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 200 or p_offset is null or p_offset < 0 or p_offset > 10000 then
    raise exception 'Admin case pagination is outside the allowed range.' using errcode = '22023';
  end if;

  v_capability := private.require_any_platform_admin_capability(
    array['platform_owner', 'operations_admin', 'support_agent', 'privacy_officer', 'finance_reviewer', 'security_auditor']
  );

  perform private.write_platform_admin_audit_event(
    v_capability,
    'list_admin_cases',
    'platform_admin_case',
    null,
    '',
    jsonb_build_object('status', v_status, 'limit', p_limit, 'offset', p_offset)
  );

  return query
  select
    case_row.id,
    case_row.case_number,
    case_row.category,
    case_row.severity,
    case_row.case_status,
    case_row.safe_summary,
    case_row.related_appointment_request_id,
    therapist.public_physio_id,
    patient.public_patient_id,
    case_row.assigned_admin_user_id,
    case_row.due_at,
    case_row.legal_hold,
    case_row.created_at,
    case_row.updated_at
  from public.platform_admin_cases case_row
  left join public.physiotherapists therapist
    on therapist.id = case_row.related_physio_id
  left join public.platform_patients patient
    on patient.id = case_row.related_platform_patient_id
  where private.can_access_platform_admin_case_category(case_row.category)
    and (v_status is null or case_row.case_status = v_status)
  order by
    case case_row.severity when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
    case_row.due_at nulls last,
    case_row.created_at desc,
    case_row.id desc
  limit p_limit
  offset p_offset;
end;
$$;

revoke all privileges on function public.list_platform_admin_cases(text, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_platform_admin_cases(text, integer, integer)
  to authenticated;

create function public.create_platform_admin_case(
  p_category text,
  p_severity text,
  p_safe_summary text,
  p_related_appointment_request_id uuid default null,
  p_related_physio_id uuid default null,
  p_related_platform_patient_id uuid default null,
  p_due_at timestamptz default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_capability text;
  v_category text := lower(btrim(coalesce(p_category, '')));
  v_severity text := lower(btrim(coalesce(p_severity, '')));
  v_summary text := btrim(coalesce(p_safe_summary, ''));
  v_case_id uuid;
  v_related_physio_id uuid := p_related_physio_id;
  v_related_platform_patient_id uuid := p_related_platform_patient_id;
begin
  if v_category not in (
    'complaint', 'safety_incident', 'privacy_access', 'privacy_correction',
    'privacy_deletion', 'privacy_grievance', 'billing', 'technical'
  ) or v_severity not in ('low', 'medium', 'high', 'critical')
    or char_length(v_summary) < 8 or char_length(v_summary) > 500 then
    raise exception 'A supported category, severity and safe summary are required.' using errcode = '22023';
  end if;

  v_capability := private.require_any_platform_admin_capability(
    case
      when v_category like 'privacy_%' then array['platform_owner', 'privacy_officer']
      when v_category = 'billing' then array['platform_owner', 'finance_reviewer', 'operations_admin', 'support_agent']
      when v_category in ('safety_incident', 'technical') then array['platform_owner', 'operations_admin', 'support_agent', 'security_auditor']
      else array['platform_owner', 'operations_admin', 'support_agent']
    end
  );

  if p_related_appointment_request_id is not null then
    select appointment.physio_id, appointment.platform_patient_id
      into v_related_physio_id, v_related_platform_patient_id
      from public.patient_appointment_requests appointment
     where appointment.id = p_related_appointment_request_id;

    if not found then
      raise exception 'Related appointment request was not found.' using errcode = 'P0002';
    end if;

    if (p_related_physio_id is not null and p_related_physio_id <> v_related_physio_id)
       or (p_related_platform_patient_id is not null and p_related_platform_patient_id <> v_related_platform_patient_id) then
      raise exception 'Related case identities do not match the appointment.' using errcode = '23514';
    end if;
  end if;

  insert into public.platform_admin_cases (
    category,
    severity,
    safe_summary,
    related_appointment_request_id,
    related_physio_id,
    related_platform_patient_id,
    due_at,
    created_by_user_id
  ) values (
    v_category,
    v_severity,
    v_summary,
    p_related_appointment_request_id,
    v_related_physio_id,
    v_related_platform_patient_id,
    p_due_at,
    auth.uid()
  ) returning id into v_case_id;

  insert into public.platform_admin_case_events (
    case_id, actor_user_id, event_type, from_status, to_status, reason
  ) values (
    v_case_id, auth.uid(), 'created', null, 'open', v_summary
  );

  perform private.write_platform_admin_audit_event(
    v_capability,
    'create_admin_case',
    'platform_admin_case',
    v_case_id,
    v_summary,
    jsonb_build_object('category', v_category, 'severity', v_severity)
  );

  return v_case_id;
end;
$$;

revoke all privileges on function public.create_platform_admin_case(text, text, text, uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.create_platform_admin_case(text, text, text, uuid, uuid, uuid, timestamptz)
  to authenticated;

create function public.transition_platform_admin_case(
  p_case_id uuid,
  p_to_status text,
  p_reason text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_case public.platform_admin_cases%rowtype;
  v_capability text;
  v_to_status text := lower(btrim(coalesce(p_to_status, '')));
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if p_case_id is null
     or v_to_status not in ('triaged', 'in_progress', 'waiting', 'closed')
     or char_length(v_reason) < 8
     or char_length(v_reason) > 1000 then
    raise exception 'A case, supported next status and specific reason are required.' using errcode = '22023';
  end if;

  select * into v_case
    from public.platform_admin_cases
   where id = p_case_id
   for update;

  if not found or not private.can_access_platform_admin_case_category(v_case.category) then
    raise exception 'Admin case is unavailable.' using errcode = '42501';
  end if;

  v_capability := private.require_any_platform_admin_capability(
    case
      when v_case.category like 'privacy_%' then array['platform_owner', 'privacy_officer']
      when v_case.category = 'billing' then array['platform_owner', 'finance_reviewer', 'operations_admin', 'support_agent']
      when v_case.category in ('safety_incident', 'technical') then array['platform_owner', 'operations_admin', 'support_agent', 'security_auditor']
      else array['platform_owner', 'operations_admin', 'support_agent']
    end
  );

  if v_case.case_status = 'closed'
     or v_case.case_status = v_to_status
     or (v_case.case_status = 'open' and v_to_status not in ('triaged', 'closed'))
     or (v_case.case_status = 'triaged' and v_to_status not in ('in_progress', 'waiting', 'closed'))
     or (v_case.case_status = 'in_progress' and v_to_status not in ('waiting', 'closed'))
     or (v_case.case_status = 'waiting' and v_to_status not in ('in_progress', 'closed')) then
    raise exception 'The requested Admin case transition is not allowed.' using errcode = '23514';
  end if;

  update public.platform_admin_cases
     set case_status = v_to_status,
         closed_at = case when v_to_status = 'closed' then now() else null end
   where id = v_case.id;

  insert into public.platform_admin_case_events (
    case_id, actor_user_id, event_type, from_status, to_status, reason
  ) values (
    v_case.id, auth.uid(), 'status_changed', v_case.case_status, v_to_status, v_reason
  );

  perform private.write_platform_admin_audit_event(
    v_capability,
    'transition_admin_case',
    'platform_admin_case',
    v_case.id,
    v_reason,
    jsonb_build_object('from_status', v_case.case_status, 'to_status', v_to_status)
  );
end;
$$;

revoke all privileges on function public.transition_platform_admin_case(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.transition_platform_admin_case(uuid, text, text)
  to authenticated;

create function public.list_platform_admin_audit_events(
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  event_id uuid,
  actor_user_id uuid,
  capability_used text,
  action text,
  target_type text,
  target_id uuid,
  reason text,
  details jsonb,
  occurred_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_capability text;
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 or p_offset is null or p_offset < 0 or p_offset > 10000 then
    raise exception 'Admin audit pagination is outside the allowed range.'
      using errcode = '22023';
  end if;

  v_capability := private.require_any_platform_admin_capability(
    array['platform_owner', 'security_auditor']
  );

  perform private.write_platform_admin_audit_event(
    v_capability,
    'list_admin_audit_events',
    'platform_admin_audit_event',
    null,
    '',
    jsonb_build_object('limit', p_limit, 'offset', p_offset)
  );

  return query
  select
    audit.id,
    audit.actor_user_id,
    audit.capability_used,
    audit.action,
    audit.target_type,
    audit.target_id,
    audit.reason,
    audit.details,
    audit.occurred_at
  from public.platform_admin_audit_events audit
  order by audit.occurred_at desc, audit.id desc
  limit p_limit
  offset p_offset;
end;
$$;

revoke all privileges on function public.list_platform_admin_audit_events(integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_platform_admin_audit_events(integer, integer)
  to authenticated;

create function public.list_platform_admin_capability_grants()
returns table (
  user_id uuid,
  capability text,
  is_active boolean,
  granted_by_user_id uuid,
  grant_reason text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_capability text;
begin
  v_capability := private.require_any_platform_admin_capability(
    array['platform_owner', 'security_auditor']
  );

  perform private.write_platform_admin_audit_event(
    v_capability,
    'list_admin_capability_grants',
    'platform_admin_capability',
    null,
    '',
    '{}'::jsonb
  );

  return query
  select
    grant_row.user_id,
    grant_row.capability,
    grant_row.is_active,
    grant_row.granted_by_user_id,
    grant_row.grant_reason,
    grant_row.created_at,
    grant_row.updated_at
  from public.platform_admin_capability_grants grant_row
  order by grant_row.user_id, grant_row.capability;
end;
$$;

revoke all privileges on function public.list_platform_admin_capability_grants()
  from public, anon, authenticated, service_role;
grant execute on function public.list_platform_admin_capability_grants()
  to authenticated;

create function public.set_platform_admin_capability(
  p_user_id uuid,
  p_capability text,
  p_is_active boolean,
  p_reason text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  perform private.require_any_platform_admin_capability(array['platform_owner']);

  if p_user_id is null
     or p_capability not in (
       'platform_owner',
       'operations_admin',
       'verification_reviewer',
       'support_agent',
       'privacy_officer',
       'security_auditor',
       'content_moderator',
       'finance_reviewer'
     )
     or p_is_active is null
     or char_length(v_reason) < 8
     or char_length(v_reason) > 1000 then
    raise exception 'A valid user, capability, state, and specific reason are required.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
      from public.app_users app_user
     where app_user.id = p_user_id
       and app_user.role = 'physio'
  ) then
    raise exception 'Admin capabilities may be granted only to a professional persona.'
      using errcode = '23514';
  end if;

  -- Serialize capability mutations so two concurrent requests cannot both
  -- observe another owner and deactivate the last two owners together.
  lock table public.platform_admin_capability_grants in share row exclusive mode;

  if p_capability = 'platform_owner'
     and not p_is_active
     and exists (
       select 1
         from public.platform_admin_capability_grants owner_grant
        where owner_grant.user_id = p_user_id
          and owner_grant.capability = 'platform_owner'
          and owner_grant.is_active
     )
     and (
       select count(*)
         from public.platform_admin_capability_grants active_owner
        where active_owner.capability = 'platform_owner'
          and active_owner.is_active
     ) <= 1 then
    raise exception 'The final active platform owner cannot be deactivated.'
      using errcode = '23514';
  end if;

  insert into public.platform_admin_capability_grants (
    user_id,
    capability,
    is_active,
    granted_by_user_id,
    grant_reason
  ) values (
    p_user_id,
    p_capability,
    p_is_active,
    v_actor_user_id,
    v_reason
  )
  on conflict (user_id, capability) do update
     set is_active = excluded.is_active,
         granted_by_user_id = excluded.granted_by_user_id,
         grant_reason = excluded.grant_reason,
         updated_at = now();

  perform private.write_platform_admin_audit_event(
    'platform_owner',
    case when p_is_active then 'activate_admin_capability' else 'deactivate_admin_capability' end,
    'platform_admin_capability',
    p_user_id,
    v_reason,
    jsonb_build_object('capability', p_capability, 'is_active', p_is_active)
  );
end;
$$;

revoke all privileges on function public.set_platform_admin_capability(uuid, text, boolean, text)
  from public, anon, authenticated, service_role;
grant execute on function public.set_platform_admin_capability(uuid, text, boolean, text)
  to authenticated;

comment on table public.platform_admin_capability_grants is
  'Composable, service-controlled platform Admin capabilities. Admin authority is additional to, not a replacement for, the immutable patient/physio persona.';
comment on table public.platform_admin_audit_events is
  'Append-only application audit evidence for privileged Admin reads and writes. Never store clinical text, OTPs, secrets or full payment credentials here.';
comment on table public.platform_admin_cases is
  'Operational case registry for complaints, privacy requests, incidents, billing and technical support. safe_summary must never contain diagnosis, treatment notes, OTPs, secrets or payment credentials.';
comment on table public.platform_admin_case_events is
  'Append-only status history for platform Admin cases.';
comment on function public.list_admin_appointment_operations(timestamptz, timestamptz, text, integer, integer) is
  'Returns masked operational appointment state for authorized Admin work. It exposes platform IDs, not patient contact or clinical data.';

commit;
