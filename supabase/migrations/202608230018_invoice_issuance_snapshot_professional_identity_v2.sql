begin;

alter table public.invoice_issuance_snapshots
  add column if not exists therapist_registration_authority text,
  add column if not exists professional_verification_status text,
  add column if not exists verified_qualification text,
  add column if not exists verified_registration_number text,
  add column if not exists verified_registration_authority text,
  add column if not exists professional_verified_at timestamptz,
  add column if not exists professional_verification_method text;

alter table public.invoice_issuance_snapshots
  drop constraint if exists invoice_issuance_snapshots_verification_status_check,
  add constraint invoice_issuance_snapshots_verification_status_check check (
    professional_verification_status is null
    or professional_verification_status in ('unverified', 'pending', 'verified', 'rejected')
  ),
  drop constraint if exists invoice_issuance_snapshots_v2_verification_presence_check,
  add constraint invoice_issuance_snapshots_v2_verification_presence_check check (
    snapshot_schema_version < 2
    or professional_verification_status is not null
  ),
  drop constraint if exists invoice_issuance_snapshots_verified_credentials_check,
  add constraint invoice_issuance_snapshots_verified_credentials_check check (
    professional_verification_status <> 'verified'
    or (
      professional_verified_at is not null
      and length(trim(coalesce(verified_qualification, ''))) > 0
      and length(trim(coalesce(verified_registration_number, ''))) > 0
      and length(trim(coalesce(verified_registration_authority, ''))) > 0
    )
  ),
  drop constraint if exists invoice_issuance_snapshots_nonverified_credentials_check,
  add constraint invoice_issuance_snapshots_nonverified_credentials_check check (
    professional_verification_status = 'verified'
    or (
      verified_qualification is null
      and verified_registration_number is null
      and verified_registration_authority is null
      and professional_verified_at is null
      and professional_verification_method is null
    )
  );

create or replace function private.capture_invoice_issuance_snapshot()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  if not new.finalized then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.finalized then
    return new;
  end if;

  insert into public.invoice_issuance_snapshots (
    invoice_id,
    physio_id,
    patient_id,
    invoice_number,
    snapshot_schema_version,
    issued_at,
    captured_at,
    provenance,
    therapist_full_name,
    therapist_title,
    practice_name,
    therapist_qualification,
    therapist_registration,
    therapist_registration_authority,
    therapist_phone,
    therapist_email,
    practice_address,
    therapist_pan,
    therapist_gstin,
    therapist_logo_url,
    professional_verification_status,
    verified_qualification,
    verified_registration_number,
    verified_registration_authority,
    professional_verified_at,
    professional_verification_method,
    patient_name,
    patient_number,
    patient_phone,
    patient_email,
    patient_address,
    description,
    sessions,
    service_start_date,
    service_end_date,
    fee,
    additional,
    additional_description,
    discount,
    gst_rate,
    total,
    payment_method
  )
  select
    new.id,
    new.physio_id,
    new.patient_id,
    new.invoice_number,
    2,
    new.finalized_at,
    now(),
    'issued',
    coalesce(pp.full_name, ''),
    coalesce(pp.title, ''),
    coalesce(ps.practice_name, ''),
    coalesce(pp.qualification, ''),
    coalesce(pp.registration, ''),
    coalesce(pp.registration_authority, ''),
    coalesce(pp.phone, ''),
    coalesce(pp.email, ''),
    coalesce(pp.address, ''),
    coalesce(pp.pan, ''),
    coalesce(pp.gstin, ''),
    coalesce(pp.logo_url, ''),
    coalesce(pv.verification_status, 'unverified'),
    case when pv.verification_status = 'verified' then nullif(trim(pv.verified_qualification), '') else null end,
    case when pv.verification_status = 'verified' then nullif(trim(pv.verified_registration_number), '') else null end,
    case when pv.verification_status = 'verified' then nullif(trim(pv.verified_registration_authority), '') else null end,
    case when pv.verification_status = 'verified' then pv.verified_at else null end,
    case when pv.verification_status = 'verified' then nullif(trim(pv.verification_method), '') else null end,
    p.name,
    p.patient_number,
    coalesce(p.phone, ''),
    coalesce(p.email, ''),
    coalesce(p.address, ''),
    new.description,
    new.sessions,
    new.start_date,
    new.end_date,
    new.fee,
    new.additional,
    new.additional_description,
    new.discount,
    new.gst_rate,
    new.total,
    new.payment_method
  from public.patients p
  left join public.physiotherapist_profiles pp
    on pp.physio_id = new.physio_id
  left join public.physiotherapist_settings ps
    on ps.physio_id = new.physio_id
  left join public.physiotherapist_professional_verifications pv
    on pv.physio_id = new.physio_id
  where p.id = new.patient_id
    and p.physio_id = new.physio_id;

  if not found then
    raise exception 'Unable to capture invoice issuance snapshot.' using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all privileges on function private.capture_invoice_issuance_snapshot()
  from public, anon, authenticated;

commit;
