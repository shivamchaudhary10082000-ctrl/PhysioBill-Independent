begin;

-- Phase 5 Slice 4A.3 corrective: serialize linkage workflow decisions with
-- authoritative professional-verification state changes.

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
  v_verification public.physiotherapist_professional_verifications%rowtype;
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

  select pv.*
    into v_verification
    from public.physiotherapist_professional_verifications pv
   where pv.physio_id = p_physio_id
     and pv.verification_status = 'verified'
   for update;

  if v_verification.physio_id is null then
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
  v_verification public.physiotherapist_professional_verifications%rowtype;
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

  select pv.*
    into v_verification
    from public.physiotherapist_professional_verifications pv
   where pv.physio_id = v_physio_id
     and pv.verification_status = 'verified'
   for update;

  if v_verification.physio_id is null then
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

revoke all privileges on function public.request_my_clinical_chart_link(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.accept_clinical_chart_link_request(uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.request_my_clinical_chart_link(uuid)
  to authenticated;
grant execute on function public.accept_clinical_chart_link_request(uuid, uuid)
  to authenticated;

commit;
