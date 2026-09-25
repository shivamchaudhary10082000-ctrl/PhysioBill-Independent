-- Phase 5: accepted appointment -> clinical linkage consent gate.
-- Scheduling remains separate from clinical chart authority. An accepted appointment
-- may permit a patient to request linkage, but never creates a chart or link itself.

alter table public.platform_patient_clinical_chart_link_requests
  add column if not exists appointment_request_id uuid null
    references public.patient_appointment_requests(id) on delete restrict;

create index if not exists platform_patient_clinical_chart_link_requests_appointment_idx
  on public.platform_patient_clinical_chart_link_requests (appointment_request_id)
  where appointment_request_id is not null;

create unique index if not exists platform_patient_clinical_chart_link_requests_one_pending_per_appointment_idx
  on public.platform_patient_clinical_chart_link_requests (appointment_request_id)
  where appointment_request_id is not null and request_status = 'pending';

create or replace function private.enforce_platform_patient_clinical_chart_link_request_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $function$
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
     or old.expires_at is distinct from new.expires_at
     or old.appointment_request_id is distinct from new.appointment_request_id then
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
$function$;

create or replace function public.request_clinical_link_from_accepted_appointment(
  p_appointment_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_platform_patient_id uuid;
  v_appointment public.patient_appointment_requests%rowtype;
  v_existing_link public.platform_patient_clinical_chart_links%rowtype;
  v_pending public.platform_patient_clinical_chart_link_requests%rowtype;
  v_request public.platform_patient_clinical_chart_link_requests%rowtype;
  v_now timestamptz := clock_timestamp();
  v_total_24h integer;
  v_pair_24h integer;
begin
  if p_appointment_request_id is null then
    raise exception 'Accepted appointment is required.' using errcode = '22023';
  end if;

  v_platform_patient_id := private.resolve_authenticated_appointment_patient();

  select r.*
    into v_appointment
    from public.patient_appointment_requests r
   where r.id = p_appointment_request_id
     and r.platform_patient_id = v_platform_patient_id
   for update;

  if v_appointment.id is null then
    raise exception 'Appointment was not found.' using errcode = 'P0002';
  end if;

  if v_appointment.status <> 'accepted' then
    raise exception 'Clinical linkage may be requested only from a currently accepted appointment.'
      using errcode = '23514';
  end if;

  select l.*
    into v_existing_link
    from public.platform_patient_clinical_chart_links l
   where l.platform_patient_id = v_platform_patient_id
     and l.physio_id = v_appointment.physio_id
     and l.revoked_at is null
   for update;

  if v_existing_link.id is not null then
    return jsonb_build_object(
      'appointment_request_id', v_appointment.id,
      'link_id', v_existing_link.id,
      'link_status', 'linked',
      'created', false
    );
  end if;

  select r.*
    into v_pending
    from public.platform_patient_clinical_chart_link_requests r
   where r.platform_patient_id = v_platform_patient_id
     and r.physio_id = v_appointment.physio_id
     and r.request_status = 'pending'
   order by r.requested_at desc, r.id desc
   limit 1
   for update;

  if v_pending.id is not null then
    if v_pending.expires_at > v_now then
      return jsonb_build_object(
        'appointment_request_id', v_appointment.id,
        'request_id', v_pending.id,
        'request_status', 'pending',
        'expires_at', v_pending.expires_at,
        'created', false
      );
    end if;

    update public.platform_patient_clinical_chart_link_requests
       set request_status = 'expired', resolved_at = v_now
     where id = v_pending.id;

    insert into public.platform_patient_clinical_chart_link_events (
      request_id, event_type, actor_role, reason, created_at
    ) values (
      v_pending.id, 'expired', 'system', 'Request expired before accepted-appointment onboarding retry.', v_now
    );
  end if;

  if not exists (
    select 1
      from public.physiotherapist_professional_verifications pv
     where pv.physio_id = v_appointment.physio_id
       and pv.verification_status = 'verified'
  ) then
    raise exception 'The physiotherapist is not currently professionally verified.'
      using errcode = '42501';
  end if;

  select count(*)::integer
    into v_total_24h
    from public.platform_patient_clinical_chart_link_requests r
   where r.platform_patient_id = v_platform_patient_id
     and r.requested_at >= v_now - interval '24 hours';

  select count(*)::integer
    into v_pair_24h
    from public.platform_patient_clinical_chart_link_requests r
   where r.platform_patient_id = v_platform_patient_id
     and r.physio_id = v_appointment.physio_id
     and r.requested_at >= v_now - interval '24 hours';

  if v_total_24h >= 10 or v_pair_24h >= 3 then
    raise exception 'Clinical chart linkage request rate limit exceeded.'
      using errcode = '54000';
  end if;

  insert into public.platform_patient_clinical_chart_link_requests (
    platform_patient_id,
    physio_id,
    request_status,
    requested_at,
    expires_at,
    appointment_request_id
  ) values (
    v_platform_patient_id,
    v_appointment.physio_id,
    'pending',
    v_now,
    v_now + interval '7 days',
    v_appointment.id
  )
  returning * into v_request;

  insert into public.platform_patient_clinical_chart_link_events (
    request_id, event_type, actor_user_id, actor_role, reason, created_at
  ) values (
    v_request.id,
    'requested',
    v_user_id,
    'patient',
    'Patient requested clinical-chart linkage from an accepted appointment.',
    v_now
  );

  return jsonb_build_object(
    'appointment_request_id', v_appointment.id,
    'request_id', v_request.id,
    'request_status', 'pending',
    'expires_at', v_request.expires_at,
    'created', true
  );
end;
$function$;

create or replace function public.get_my_appointment_clinical_linkage_status()
returns table (
  appointment_request_id uuid,
  physio_id uuid,
  request_id uuid,
  request_status text,
  request_expires_at timestamptz,
  link_id uuid,
  link_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_platform_patient_id uuid;
begin
  v_platform_patient_id := private.resolve_authenticated_appointment_patient();

  return query
  select
    a.id,
    a.physio_id,
    lr.id,
    lr.request_status,
    lr.expires_at,
    l.id,
    case when l.id is not null then 'linked'::text else null::text end
  from public.patient_appointment_requests a
  left join lateral (
    select r.*
      from public.platform_patient_clinical_chart_link_requests r
     where r.platform_patient_id = a.platform_patient_id
       and r.physio_id = a.physio_id
       and (r.appointment_request_id = a.id or r.appointment_request_id is null)
     order by
       case when r.request_status = 'pending' then 0 else 1 end,
       r.requested_at desc,
       r.id desc
     limit 1
  ) lr on true
  left join public.platform_patient_clinical_chart_links l
    on l.platform_patient_id = a.platform_patient_id
   and l.physio_id = a.physio_id
   and l.revoked_at is null
  where a.platform_patient_id = v_platform_patient_id
    and a.status = 'accepted'
  order by a.starts_at desc, a.id desc;
end;
$function$;

create or replace function public.get_my_professional_clinical_onboarding_requests()
returns table (
  request_id uuid,
  appointment_request_id uuid,
  public_patient_id text,
  service_mode text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone_name text,
  request_status text,
  requested_at timestamptz,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_physio_id uuid;
begin
  v_physio_id := private.resolve_authenticated_appointment_physio();

  return query
  select
    r.id,
    r.appointment_request_id,
    pp.public_patient_id,
    a.service_mode,
    a.starts_at,
    a.ends_at,
    a.timezone_name,
    r.request_status,
    r.requested_at,
    r.expires_at
  from public.platform_patient_clinical_chart_link_requests r
  join public.platform_patients pp on pp.id = r.platform_patient_id
  join public.patient_appointment_requests a
    on a.id = r.appointment_request_id
   and a.platform_patient_id = r.platform_patient_id
   and a.physio_id = r.physio_id
  where r.physio_id = v_physio_id
  order by
    case r.request_status when 'pending' then 0 else 1 end,
    r.requested_at desc,
    r.id desc;
end;
$function$;

revoke all on function public.request_clinical_link_from_accepted_appointment(uuid) from public;
revoke all on function public.get_my_appointment_clinical_linkage_status() from public;
revoke all on function public.get_my_professional_clinical_onboarding_requests() from public;

grant execute on function public.request_clinical_link_from_accepted_appointment(uuid) to authenticated;
grant execute on function public.get_my_appointment_clinical_linkage_status() to authenticated;
grant execute on function public.get_my_professional_clinical_onboarding_requests() to authenticated;
