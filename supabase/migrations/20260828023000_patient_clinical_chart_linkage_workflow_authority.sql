begin;

-- Phase 5 Slice 4A.3: patient-initiated PAT <-> therapist-owned chart workflow authority.
-- The workflow is database-authoritative and grants no patient clinical/financial access.

create table public.platform_patient_clinical_chart_link_requests (
  id uuid primary key default gen_random_uuid(),
  platform_patient_id uuid not null
    references public.platform_patients(id) on delete restrict,
  physio_id uuid not null
    references public.physiotherapists(id) on delete restrict,
  request_status text not null
    check (request_status in ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  requested_at timestamptz not null,
  expires_at timestamptz not null,
  resolved_at timestamptz,
  link_id uuid
    references public.platform_patient_clinical_chart_links(id) on delete restrict,
  constraint platform_patient_clinical_chart_link_requests_expiry_check
    check (expires_at > requested_at),
  constraint platform_patient_clinical_chart_link_requests_state_check check (
    (request_status = 'pending' and resolved_at is null and link_id is null)
    or
    (request_status = 'accepted' and resolved_at is not null and link_id is not null)
    or
    (request_status in ('rejected', 'cancelled', 'expired')
      and resolved_at is not null and link_id is null)
  )
);

create unique index platform_patient_clinical_chart_link_requests_one_pending_idx
  on public.platform_patient_clinical_chart_link_requests (platform_patient_id, physio_id)
  where request_status = 'pending';

create index platform_patient_clinical_chart_link_requests_patient_recent_idx
  on public.platform_patient_clinical_chart_link_requests
    (platform_patient_id, requested_at desc, id desc);

create index platform_patient_clinical_chart_link_requests_physio_pending_idx
  on public.platform_patient_clinical_chart_link_requests
    (physio_id, expires_at, requested_at, id)
  where request_status = 'pending';

create table public.platform_patient_clinical_chart_link_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid
    references public.platform_patient_clinical_chart_link_requests(id) on delete restrict,
  link_id uuid
    references public.platform_patient_clinical_chart_links(id) on delete restrict,
  event_type text not null
    check (event_type in (
      'requested', 'accepted', 'rejected', 'cancelled', 'expired', 'link_revoked'
    )),
  actor_user_id uuid references auth.users(id) on delete restrict,
  actor_role text not null check (actor_role in ('patient', 'physio', 'system')),
  reason text not null default '' check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  constraint platform_patient_clinical_chart_link_events_actor_check check (
    (event_type = 'requested'
      and request_id is not null and link_id is null
      and actor_role = 'patient' and actor_user_id is not null)
    or
    (event_type = 'accepted'
      and request_id is not null and link_id is not null
      and actor_role = 'physio' and actor_user_id is not null)
    or
    (event_type = 'rejected'
      and request_id is not null and link_id is null
      and actor_role = 'physio' and actor_user_id is not null)
    or
    (event_type = 'cancelled'
      and request_id is not null and link_id is null
      and actor_role = 'patient' and actor_user_id is not null)
    or
    (event_type = 'expired'
      and request_id is not null and link_id is null
      and actor_role = 'system' and actor_user_id is null)
    or
    (event_type = 'link_revoked'
      and link_id is not null
      and actor_role in ('patient', 'physio') and actor_user_id is not null)
  )
);

create index platform_patient_clinical_chart_link_events_request_idx
  on public.platform_patient_clinical_chart_link_events (request_id, created_at, id);

create index platform_patient_clinical_chart_link_events_link_idx
  on public.platform_patient_clinical_chart_link_events (link_id, created_at, id);

create or replace function private.enforce_platform_patient_clinical_chart_link_request_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_link public.platform_patient_clinical_chart_links%rowtype;
begin
  if tg_op = 'DELETE' then
    raise exception 'Clinical chart linkage requests cannot be deleted.'
      using errcode = '55000';
  end if;

  if old.id is distinct from new.id
     or old.platform_patient_id is distinct from new.platform_patient_id
     or old.physio_id is distinct from new.physio_id
     or old.requested_at is distinct from new.requested_at
     or old.expires_at is distinct from new.expires_at then
    raise exception 'Clinical chart linkage request origin is immutable.'
      using errcode = '55000';
  end if;

  if old.request_status is distinct from 'pending' then
    raise exception 'Terminal clinical chart linkage requests are immutable.'
      using errcode = '55000';
  end if;

  if new.request_status not in ('accepted', 'rejected', 'cancelled', 'expired') then
    raise exception 'Only pending to terminal request transitions are permitted.'
      using errcode = '55000';
  end if;

  if new.request_status = 'accepted' then
    select l.*
      into v_link
      from public.platform_patient_clinical_chart_links l
     where l.id = new.link_id;

    if v_link.id is null
       or v_link.platform_patient_id is distinct from new.platform_patient_id
       or v_link.physio_id is distinct from new.physio_id
       or v_link.revoked_at is not null then
      raise exception 'Accepted request must reference a matching active clinical chart link.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger platform_patient_clinical_chart_link_requests_lifecycle_guard
before update or delete on public.platform_patient_clinical_chart_link_requests
for each row
execute function private.enforce_platform_patient_clinical_chart_link_request_lifecycle();

create or replace function private.reject_platform_patient_clinical_chart_link_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Clinical chart linkage events are append-only.'
    using errcode = '55000';
end;
$$;

create trigger platform_patient_clinical_chart_link_events_append_only
before update or delete on public.platform_patient_clinical_chart_link_events
for each row
execute function private.reject_platform_patient_clinical_chart_link_event_mutation();

alter table public.platform_patient_clinical_chart_link_requests enable row level security;
alter table public.platform_patient_clinical_chart_link_events enable row level security;

revoke all privileges on table public.platform_patient_clinical_chart_link_requests
  from public, anon, authenticated, service_role;
revoke all privileges on table public.platform_patient_clinical_chart_link_events
  from public, anon, authenticated, service_role;

revoke all privileges on function
  private.enforce_platform_patient_clinical_chart_link_request_lifecycle()
from public, anon, authenticated, service_role;
revoke all privileges on function
  private.reject_platform_patient_clinical_chart_link_event_mutation()
from public, anon, authenticated, service_role;

create or replace function public.request_my_clinical_chart_link(p_physio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_platform_patient public.platform_patients%rowtype;
  v_pending public.platform_patient_clinical_chart_link_requests%rowtype;
  v_request public.platform_patient_clinical_chart_link_requests%rowtype;
  v_now timestamptz := clock_timestamp();
  v_total_24h integer;
  v_pair_24h integer;
  v_expired_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'Clinical chart linkage requests require authentication.'
      using errcode = '42501';
  end if;

  select pp.*
    into v_platform_patient
    from public.app_users au
    join public.platform_patients pp on pp.user_id = au.id
   where au.id = v_user_id
     and au.role = 'patient'
   for update of pp;

  if v_platform_patient.id is null then
    raise exception 'Clinical chart linkage requests are available only to patient accounts.'
      using errcode = '42501';
  end if;

  if p_physio_id is null then
    raise exception 'A target physiotherapist is required.'
      using errcode = '22023';
  end if;

  select r.*
    into v_pending
    from public.platform_patient_clinical_chart_link_requests r
   where r.platform_patient_id = v_platform_patient.id
     and r.physio_id = p_physio_id
     and r.request_status = 'pending'
   for update;

  if v_pending.id is not null and v_pending.expires_at <= v_now then
    update public.platform_patient_clinical_chart_link_requests
       set request_status = 'expired',
           resolved_at = v_now
     where id = v_pending.id;

    insert into public.platform_patient_clinical_chart_link_events (
      request_id, event_type, actor_role, reason, created_at
    ) values (
      v_pending.id, 'expired', 'system', 'Request expired.', v_now
    );

    v_expired_request_id := v_pending.id;
    v_pending.id := null;
  end if;

  if v_pending.id is not null then
    return jsonb_build_object(
      'request_id', v_pending.id,
      'request_status', 'pending',
      'requested_at', v_pending.requested_at,
      'expires_at', v_pending.expires_at,
      'created', false
    );
  end if;

  if not exists (
    select 1
      from public.physiotherapists p
      join public.physiotherapist_professional_verifications pv
        on pv.physio_id = p.id
     where p.id = p_physio_id
       and pv.verification_status = 'verified'
  ) then
    if v_expired_request_id is not null then
      return jsonb_build_object(
        'request_id', v_expired_request_id,
        'request_status', 'expired',
        'created', false,
        'blocked_reason', 'target_not_verified'
      );
    end if;

    raise exception 'Target physiotherapist is not currently professionally verified.'
      using errcode = '42501';
  end if;

  select count(*)::integer
    into v_total_24h
    from public.platform_patient_clinical_chart_link_requests r
   where r.platform_patient_id = v_platform_patient.id
     and r.requested_at >= v_now - interval '24 hours';

  select count(*)::integer
    into v_pair_24h
    from public.platform_patient_clinical_chart_link_requests r
   where r.platform_patient_id = v_platform_patient.id
     and r.physio_id = p_physio_id
     and r.requested_at >= v_now - interval '24 hours';

  if v_total_24h >= 10 or v_pair_24h >= 3 then
    if v_expired_request_id is not null then
      return jsonb_build_object(
        'request_id', v_expired_request_id,
        'request_status', 'expired',
        'created', false,
        'blocked_reason', case when v_total_24h >= 10 then 'patient_rate_limit' else 'pair_rate_limit' end
      );
    end if;

    raise exception 'Clinical chart linkage request rate limit exceeded.'
      using errcode = '54000';
  end if;

  insert into public.platform_patient_clinical_chart_link_requests (
    platform_patient_id,
    physio_id,
    request_status,
    requested_at,
    expires_at
  ) values (
    v_platform_patient.id,
    p_physio_id,
    'pending',
    v_now,
    v_now + interval '7 days'
  )
  returning * into v_request;

  insert into public.platform_patient_clinical_chart_link_events (
    request_id, event_type, actor_user_id, actor_role, created_at
  ) values (
    v_request.id, 'requested', v_user_id, 'patient', v_now
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'request_status', v_request.request_status,
    'requested_at', v_request.requested_at,
    'expires_at', v_request.expires_at,
    'created', true
  );
end;
$$;

create or replace function public.accept_clinical_chart_link_request(
  p_request_id uuid,
  p_patient_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_physio_id uuid;
  v_request public.platform_patient_clinical_chart_link_requests%rowtype;
  v_link public.platform_patient_clinical_chart_links%rowtype;
  v_now timestamptz := clock_timestamp();
  v_owned_patient_id uuid;
begin
  if v_user_id is null then
    raise exception 'Clinical chart linkage acceptance requires authentication.'
      using errcode = '42501';
  end if;

  select p.id
    into v_physio_id
    from public.app_users au
    join public.physiotherapists p on p.user_id = au.id
   where au.id = v_user_id
     and au.role = 'physio';

  if v_physio_id is null then
    raise exception 'Only physiotherapist accounts may accept linkage requests.'
      using errcode = '42501';
  end if;

  select r.*
    into v_request
    from public.platform_patient_clinical_chart_link_requests r
   where r.id = p_request_id
   for update;

  if v_request.id is null then
    raise exception 'Clinical chart linkage request was not found.'
      using errcode = 'P0002';
  end if;

  if v_request.physio_id is distinct from v_physio_id then
    raise exception 'Clinical chart linkage request does not target this physiotherapist.'
      using errcode = '42501';
  end if;

  if v_request.request_status = 'accepted' then
    select l.*
      into v_link
      from public.platform_patient_clinical_chart_links l
     where l.id = v_request.link_id;

    if v_link.id is not null and v_link.patient_id = p_patient_id then
      return jsonb_build_object(
        'request_id', v_request.id,
        'request_status', 'accepted',
        'link_id', v_link.id,
        'accepted', true,
        'idempotent', true
      );
    end if;

    raise exception 'Accepted request retry targets a different clinical chart.'
      using errcode = '55000';
  end if;

  if v_request.request_status <> 'pending' then
    raise exception 'Clinical chart linkage request is already terminal.'
      using errcode = '55000';
  end if;

  if v_request.expires_at <= v_now then
    update public.platform_patient_clinical_chart_link_requests
       set request_status = 'expired',
           resolved_at = v_now
     where id = v_request.id;

    insert into public.platform_patient_clinical_chart_link_events (
      request_id, event_type, actor_role, reason, created_at
    ) values (
      v_request.id, 'expired', 'system', 'Request expired.', v_now
    );

    return jsonb_build_object(
      'request_id', v_request.id,
      'request_status', 'expired',
      'accepted', false
    );
  end if;

  if not exists (
    select 1
      from public.physiotherapist_professional_verifications pv
     where pv.physio_id = v_physio_id
       and pv.verification_status = 'verified'
  ) then
    raise exception 'Current professional verification is required to accept linkage.'
      using errcode = '42501';
  end if;

  select p.id
    into v_owned_patient_id
    from public.patients p
   where p.id = p_patient_id
     and p.physio_id = v_physio_id
   for update;

  if v_owned_patient_id is null then
    raise exception 'Selected clinical chart is not owned by this physiotherapist.'
      using errcode = '42501';
  end if;

  select l.*
    into v_link
    from public.platform_patient_clinical_chart_links l
   where l.patient_id = p_patient_id
     and l.physio_id = v_physio_id
     and l.revoked_at is null
   for update;

  if v_link.id is not null and v_link.platform_patient_id is distinct from v_request.platform_patient_id then
    raise exception 'Selected clinical chart is already actively linked to another platform patient.'
      using errcode = '23505';
  end if;

  if v_link.id is null then
    insert into public.platform_patient_clinical_chart_links (
      platform_patient_id, patient_id, physio_id, linked_at
    ) values (
      v_request.platform_patient_id, p_patient_id, v_physio_id, v_now
    )
    returning * into v_link;
  end if;

  update public.platform_patient_clinical_chart_link_requests
     set request_status = 'accepted',
         resolved_at = v_now,
         link_id = v_link.id
   where id = v_request.id;

  insert into public.platform_patient_clinical_chart_link_events (
    request_id, link_id, event_type, actor_user_id, actor_role, created_at
  ) values (
    v_request.id, v_link.id, 'accepted', v_user_id, 'physio', v_now
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'request_status', 'accepted',
    'link_id', v_link.id,
    'accepted', true,
    'idempotent', false
  );
end;
$$;

create or replace function public.reject_clinical_chart_link_request(
  p_request_id uuid,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_physio_id uuid;
  v_request public.platform_patient_clinical_chart_link_requests%rowtype;
  v_now timestamptz := clock_timestamp();
  v_reason text := coalesce(p_reason, '');
begin
  if v_user_id is null then
    raise exception 'Clinical chart linkage rejection requires authentication.'
      using errcode = '42501';
  end if;

  if char_length(v_reason) > 500 then
    raise exception 'Rejection reason must be at most 500 characters.'
      using errcode = '22023';
  end if;

  select p.id
    into v_physio_id
    from public.app_users au
    join public.physiotherapists p on p.user_id = au.id
   where au.id = v_user_id
     and au.role = 'physio';

  if v_physio_id is null then
    raise exception 'Only physiotherapist accounts may reject linkage requests.'
      using errcode = '42501';
  end if;

  select r.*
    into v_request
    from public.platform_patient_clinical_chart_link_requests r
   where r.id = p_request_id
   for update;

  if v_request.id is null then
    raise exception 'Clinical chart linkage request was not found.'
      using errcode = 'P0002';
  end if;

  if v_request.physio_id is distinct from v_physio_id then
    raise exception 'Clinical chart linkage request does not target this physiotherapist.'
      using errcode = '42501';
  end if;

  if v_request.request_status = 'rejected' then
    return jsonb_build_object(
      'request_id', v_request.id,
      'request_status', 'rejected',
      'idempotent', true
    );
  end if;

  if v_request.request_status <> 'pending' then
    raise exception 'Only pending linkage requests may be rejected.'
      using errcode = '55000';
  end if;

  if v_request.expires_at <= v_now then
    update public.platform_patient_clinical_chart_link_requests
       set request_status = 'expired',
           resolved_at = v_now
     where id = v_request.id;

    insert into public.platform_patient_clinical_chart_link_events (
      request_id, event_type, actor_role, reason, created_at
    ) values (
      v_request.id, 'expired', 'system', 'Request expired.', v_now
    );

    return jsonb_build_object(
      'request_id', v_request.id,
      'request_status', 'expired',
      'idempotent', false
    );
  end if;

  update public.platform_patient_clinical_chart_link_requests
     set request_status = 'rejected',
         resolved_at = v_now
   where id = v_request.id;

  insert into public.platform_patient_clinical_chart_link_events (
    request_id, event_type, actor_user_id, actor_role, reason, created_at
  ) values (
    v_request.id, 'rejected', v_user_id, 'physio', v_reason, v_now
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'request_status', 'rejected',
    'idempotent', false
  );
end;
$$;

create or replace function public.cancel_my_clinical_chart_link_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_platform_patient_id uuid;
  v_request public.platform_patient_clinical_chart_link_requests%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception 'Clinical chart linkage cancellation requires authentication.'
      using errcode = '42501';
  end if;

  select pp.id
    into v_platform_patient_id
    from public.app_users au
    join public.platform_patients pp on pp.user_id = au.id
   where au.id = v_user_id
     and au.role = 'patient';

  if v_platform_patient_id is null then
    raise exception 'Only patient accounts may cancel linkage requests.'
      using errcode = '42501';
  end if;

  select r.*
    into v_request
    from public.platform_patient_clinical_chart_link_requests r
   where r.id = p_request_id
   for update;

  if v_request.id is null then
    raise exception 'Clinical chart linkage request was not found.'
      using errcode = 'P0002';
  end if;

  if v_request.platform_patient_id is distinct from v_platform_patient_id then
    raise exception 'Clinical chart linkage request does not belong to this patient.'
      using errcode = '42501';
  end if;

  if v_request.request_status = 'cancelled' then
    return jsonb_build_object(
      'request_id', v_request.id,
      'request_status', 'cancelled',
      'idempotent', true
    );
  end if;

  if v_request.request_status <> 'pending' then
    raise exception 'Only pending linkage requests may be cancelled.'
      using errcode = '55000';
  end if;

  if v_request.expires_at <= v_now then
    update public.platform_patient_clinical_chart_link_requests
       set request_status = 'expired',
           resolved_at = v_now
     where id = v_request.id;

    insert into public.platform_patient_clinical_chart_link_events (
      request_id, event_type, actor_role, reason, created_at
    ) values (
      v_request.id, 'expired', 'system', 'Request expired.', v_now
    );

    return jsonb_build_object(
      'request_id', v_request.id,
      'request_status', 'expired',
      'idempotent', false
    );
  end if;

  update public.platform_patient_clinical_chart_link_requests
     set request_status = 'cancelled',
         resolved_at = v_now
   where id = v_request.id;

  insert into public.platform_patient_clinical_chart_link_events (
    request_id, event_type, actor_user_id, actor_role, created_at
  ) values (
    v_request.id, 'cancelled', v_user_id, 'patient', v_now
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'request_status', 'cancelled',
    'idempotent', false
  );
end;
$$;

create or replace function public.revoke_my_clinical_chart_link(
  p_link_id uuid,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_platform_patient_id uuid;
  v_physio_id uuid;
  v_link public.platform_patient_clinical_chart_links%rowtype;
  v_now timestamptz := clock_timestamp();
  v_reason text := coalesce(p_reason, '');
begin
  if v_user_id is null then
    raise exception 'Clinical chart linkage revocation requires authentication.'
      using errcode = '42501';
  end if;

  if char_length(v_reason) > 500 then
    raise exception 'Revocation reason must be at most 500 characters.'
      using errcode = '22023';
  end if;

  select au.role
    into v_role
    from public.app_users au
   where au.id = v_user_id;

  if v_role = 'patient' then
    select pp.id
      into v_platform_patient_id
      from public.platform_patients pp
     where pp.user_id = v_user_id;
  elsif v_role = 'physio' then
    select p.id
      into v_physio_id
      from public.physiotherapists p
     where p.user_id = v_user_id;
  else
    raise exception 'Only linked patients or physiotherapists may revoke clinical chart links.'
      using errcode = '42501';
  end if;

  select l.*
    into v_link
    from public.platform_patient_clinical_chart_links l
   where l.id = p_link_id
   for update;

  if v_link.id is null then
    raise exception 'Clinical chart link was not found.'
      using errcode = 'P0002';
  end if;

  if v_role = 'patient'
     and v_link.platform_patient_id is distinct from v_platform_patient_id then
    raise exception 'Patient does not own this clinical chart link.'
      using errcode = '42501';
  end if;

  if v_role = 'physio'
     and v_link.physio_id is distinct from v_physio_id then
    raise exception 'Physiotherapist does not own this clinical chart link.'
      using errcode = '42501';
  end if;

  if v_link.revoked_at is not null then
    return jsonb_build_object(
      'link_id', v_link.id,
      'revoked_at', v_link.revoked_at,
      'revoked', true,
      'idempotent', true
    );
  end if;

  update public.platform_patient_clinical_chart_links
     set revoked_at = v_now
   where id = v_link.id;

  insert into public.platform_patient_clinical_chart_link_events (
    link_id, event_type, actor_user_id, actor_role, reason, created_at
  ) values (
    v_link.id, 'link_revoked', v_user_id, v_role, v_reason, v_now
  );

  return jsonb_build_object(
    'link_id', v_link.id,
    'revoked_at', v_now,
    'revoked', true,
    'idempotent', false
  );
end;
$$;

revoke all privileges on function public.request_my_clinical_chart_link(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.accept_clinical_chart_link_request(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.reject_clinical_chart_link_request(uuid, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.cancel_my_clinical_chart_link_request(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.revoke_my_clinical_chart_link(uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.request_my_clinical_chart_link(uuid)
  to authenticated;
grant execute on function public.accept_clinical_chart_link_request(uuid, uuid)
  to authenticated;
grant execute on function public.reject_clinical_chart_link_request(uuid, text)
  to authenticated;
grant execute on function public.cancel_my_clinical_chart_link_request(uuid)
  to authenticated;
grant execute on function public.revoke_my_clinical_chart_link(uuid, text)
  to authenticated;

commit;
