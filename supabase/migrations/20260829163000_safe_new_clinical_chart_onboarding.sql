-- Safe new therapist-owned clinical chart creation from an explicit patient-requested linkage.
-- This keeps PAT identity, scheduling, therapist chart ownership and clinical access as distinct authorities.

create or replace function public.create_and_accept_clinical_chart_link_request(
  p_request_id uuid,
  p_name text,
  p_phone text default '',
  p_email text default '',
  p_address text default '',
  p_age text default '',
  p_sex text default '',
  p_occupation text default '',
  p_clinical_category text default '',
  p_condition text default '',
  p_notes text default ''
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
  v_existing_link public.platform_patient_clinical_chart_links%rowtype;
  v_link public.platform_patient_clinical_chart_links%rowtype;
  v_patient public.patients%rowtype;
  v_now timestamptz := clock_timestamp();
  v_year text := to_char(current_date, 'YYYY');
  v_next integer;
  v_patient_number text;
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_address text := btrim(coalesce(p_address, ''));
  v_age text := btrim(coalesce(p_age, ''));
  v_sex text := btrim(coalesce(p_sex, ''));
  v_occupation text := btrim(coalesce(p_occupation, ''));
  v_category text := btrim(coalesce(p_clinical_category, ''));
  v_condition text := btrim(coalesce(p_condition, ''));
  v_notes text := btrim(coalesce(p_notes, ''));
begin
  if v_user_id is null then
    raise exception 'Clinical chart creation requires authentication.' using errcode = '42501';
  end if;

  if p_request_id is null then
    raise exception 'Clinical connection request is required.' using errcode = '22023';
  end if;

  if v_name = '' then
    raise exception 'Patient name is required to create a clinical chart.' using errcode = '22023';
  end if;

  if char_length(v_name) > 160
     or char_length(v_phone) > 40
     or char_length(v_email) > 254
     or char_length(v_address) > 500
     or char_length(v_age) > 40
     or char_length(v_sex) > 40
     or char_length(v_occupation) > 160
     or char_length(v_category) > 120
     or char_length(v_condition) > 500
     or char_length(v_notes) > 2000 then
    raise exception 'Clinical chart demographic field exceeds the permitted length.' using errcode = '22023';
  end if;

  select p.id
    into v_physio_id
    from public.app_users au
    join public.physiotherapists p on p.user_id = au.id
   where au.id = v_user_id
     and au.role = 'physio';

  if v_physio_id is null then
    raise exception 'Only physiotherapist accounts may create therapist-owned clinical charts.' using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.physiotherapist_professional_verifications pv
     where pv.physio_id = v_physio_id
       and pv.verification_status = 'verified'
  ) then
    raise exception 'Current professional verification is required for clinical onboarding.' using errcode = '42501';
  end if;

  select r.*
    into v_request
    from public.platform_patient_clinical_chart_link_requests r
   where r.id = p_request_id
   for update;

  if v_request.id is null then
    raise exception 'Clinical connection request was not found.' using errcode = 'P0002';
  end if;

  if v_request.physio_id is distinct from v_physio_id then
    raise exception 'Clinical connection request does not target this physiotherapist.' using errcode = '42501';
  end if;

  if v_request.request_status = 'accepted' then
    select l.* into v_link
      from public.platform_patient_clinical_chart_links l
     where l.id = v_request.link_id;
    if v_link.id is not null and v_link.physio_id = v_physio_id then
      return jsonb_build_object(
        'request_id', v_request.id,
        'request_status', 'accepted',
        'patient_id', v_link.patient_id,
        'link_id', v_link.id,
        'created', false,
        'idempotent', true
      );
    end if;
    raise exception 'Accepted clinical connection is not internally consistent.' using errcode = '55000';
  end if;

  if v_request.request_status <> 'pending' then
    raise exception 'Only a pending clinical connection request may create a new chart.' using errcode = '55000';
  end if;

  if v_request.expires_at <= v_now then
    raise exception 'Clinical connection request has expired.' using errcode = '55000';
  end if;

  if v_request.appointment_request_id is null then
    raise exception 'New-chart onboarding requires an accepted appointment provenance.' using errcode = '23514';
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
    raise exception 'New-chart onboarding requires the matching currently accepted appointment.' using errcode = '23514';
  end if;

  -- Serialize all chart creation/link acceptance for this therapist-platform-patient pair.
  perform pg_advisory_xact_lock(hashtextextended(v_physio_id::text || ':' || v_request.platform_patient_id::text, 0));

  select l.*
    into v_existing_link
    from public.platform_patient_clinical_chart_links l
   where l.platform_patient_id = v_request.platform_patient_id
     and l.physio_id = v_physio_id
     and l.revoked_at is null
   for update;

  if v_existing_link.id is not null then
    raise exception 'This platform patient already has an active clinical chart link with this physiotherapist.' using errcode = '23505';
  end if;

  -- Serialize therapist/year chart-number allocation. Existing PT numbers remain local chart identifiers;
  -- they are deliberately not PAT identifiers.
  perform pg_advisory_xact_lock(hashtextextended(v_physio_id::text || ':patient-number:' || v_year, 0));

  select coalesce(max((regexp_match(p.patient_number, '^PT-' || v_year || '-([0-9]+)$'))[1]::integer), 0) + 1
    into v_next
    from public.patients p
   where p.physio_id = v_physio_id
     and p.patient_number like 'PT-' || v_year || '-%';

  v_patient_number := 'PT-' || v_year || '-' || lpad(v_next::text, 6, '0');

  insert into public.patients (
    physio_id,
    user_id,
    patient_number,
    name,
    phone,
    email,
    address,
    age,
    sex,
    occupation,
    referred,
    clinical_category,
    condition,
    referring_doctor,
    referral_date,
    insurance_tpa,
    policy_member_id,
    notes
  ) values (
    v_physio_id,
    null,
    v_patient_number,
    v_name,
    v_phone,
    v_email,
    v_address,
    v_age,
    v_sex,
    v_occupation,
    false,
    v_category,
    v_condition,
    '',
    null,
    '',
    '',
    v_notes
  ) returning * into v_patient;

  insert into public.platform_patient_clinical_chart_links (
    platform_patient_id,
    patient_id,
    physio_id,
    linked_at
  ) values (
    v_request.platform_patient_id,
    v_patient.id,
    v_physio_id,
    v_now
  ) returning * into v_link;

  update public.platform_patient_clinical_chart_link_requests
     set request_status = 'accepted',
         resolved_at = v_now,
         link_id = v_link.id
   where id = v_request.id;

  insert into public.platform_patient_clinical_chart_link_events (
    request_id,
    link_id,
    event_type,
    actor_user_id,
    actor_role,
    reason,
    created_at
  ) values (
    v_request.id,
    v_link.id,
    'accepted',
    v_user_id,
    'physio',
    'Therapist explicitly created a new owned clinical chart and accepted the patient-requested connection.',
    v_now
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'request_status', 'accepted',
    'patient_id', v_patient.id,
    'patient_number', v_patient.patient_number,
    'link_id', v_link.id,
    'created', true,
    'idempotent', false
  );
end;
$function$;

revoke all on function public.create_and_accept_clinical_chart_link_request(uuid,text,text,text,text,text,text,text,text,text,text) from public;
revoke all on function public.create_and_accept_clinical_chart_link_request(uuid,text,text,text,text,text,text,text,text,text,text) from anon;
grant execute on function public.create_and_accept_clinical_chart_link_request(uuid,text,text,text,text,text,text,text,text,text,text) to authenticated;
