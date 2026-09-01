-- Phase 5 production-candidate hardening:
-- retire the legacy free-form patient -> therapist linkage request path and require
-- accepted-appointment provenance when a therapist links an existing owned chart.
--
-- Security invariants:
--   * PAT != therapist-owned clinical chart.
--   * Linkage != clinical access.
--   * An appointment never creates a chart or link by itself.
--   * New clinical onboarding begins only from the patient's explicit request tied
--     to a currently accepted appointment.

revoke all on function public.request_my_clinical_chart_link(uuid) from public;
revoke all on function public.request_my_clinical_chart_link(uuid) from anon;
revoke all on function public.request_my_clinical_chart_link(uuid) from authenticated;
revoke all on function public.request_my_clinical_chart_link(uuid) from service_role;

create or replace function public.accept_clinical_chart_link_request(
  p_request_id uuid,
  p_patient_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_physio_id uuid;
  v_request public.platform_patient_clinical_chart_link_requests%rowtype;
  v_appointment public.patient_appointment_requests%rowtype;
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

  -- Preserve idempotent retries for links that were already validly accepted.
  -- Appointment state may legitimately change after onboarding has completed.
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

  if v_request.appointment_request_id is null then
    raise exception 'Clinical chart linkage acceptance requires accepted-appointment provenance.'
      using errcode = '23514';
  end if;

  select a.*
    into v_appointment
    from public.patient_appointment_requests a
   where a.id = v_request.appointment_request_id
   for update;

  if v_appointment.id is null
     or v_appointment.status <> 'accepted'
     or v_appointment.physio_id is distinct from v_physio_id
     or v_appointment.platform_patient_id is distinct from v_request.platform_patient_id then
    raise exception 'Clinical chart linkage acceptance requires the matching currently accepted appointment.'
      using errcode = '23514';
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
$function$;

revoke all on function public.accept_clinical_chart_link_request(uuid, uuid) from public;
revoke all on function public.accept_clinical_chart_link_request(uuid, uuid) from anon;
revoke all on function public.accept_clinical_chart_link_request(uuid, uuid) from service_role;
grant execute on function public.accept_clinical_chart_link_request(uuid, uuid) to authenticated;
