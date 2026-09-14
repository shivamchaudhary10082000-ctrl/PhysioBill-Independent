begin;

create table public.professional_reimbursement_documents (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null unique,
  physio_id uuid not null,
  patient_id uuid not null,
  verification_token uuid not null unique default gen_random_uuid(),
  document_type text not null default 'physiotherapy_reimbursement_statement'
    check (document_type = 'physiotherapy_reimbursement_statement'),
  document_version integer not null default 1 check (document_version > 0),
  snapshot_schema_version integer not null check (snapshot_schema_version > 0),
  invoice_number text not null,
  invoice_issued_at timestamptz,
  invoice_total numeric(12,2) not null check (invoice_total >= 0),
  therapist_full_name text not null,
  practice_name text not null default '',
  verified_qualification text not null,
  verified_registration_number text not null,
  verified_registration_authority text not null,
  professional_verified_at timestamptz not null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (invoice_id)
    references public.invoice_issuance_snapshots(invoice_id)
    on delete restrict,
  foreign key (invoice_id, physio_id)
    references public.invoices(id, physio_id)
    on delete restrict,
  foreign key (patient_id, physio_id)
    references public.patients(id, physio_id)
    on delete restrict
);

create index professional_reimbursement_documents_physio_idx
  on public.professional_reimbursement_documents(physio_id, issued_at desc);
create index professional_reimbursement_documents_patient_idx
  on public.professional_reimbursement_documents(patient_id, physio_id, issued_at desc);

alter table public.professional_reimbursement_documents enable row level security;

revoke all privileges on table public.professional_reimbursement_documents
  from public, anon, authenticated;

create or replace function private.reject_professional_reimbursement_document_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  raise exception 'Issued reimbursement documents are immutable.' using errcode = '55000';
end;
$$;

revoke all privileges on function private.reject_professional_reimbursement_document_mutation()
  from public, anon, authenticated;

drop trigger if exists professional_reimbursement_documents_immutable
  on public.professional_reimbursement_documents;
create trigger professional_reimbursement_documents_immutable
before update or delete on public.professional_reimbursement_documents
for each row execute function private.reject_professional_reimbursement_document_mutation();

create or replace function public.issue_my_reimbursement_document(p_invoice_id uuid)
returns table (
  document_id uuid,
  verification_token uuid,
  invoice_id uuid,
  invoice_number text,
  issued_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  resolved_physio_id uuid;
  source_snapshot public.invoice_issuance_snapshots%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  resolved_physio_id := private.current_physio_id();

  perform pg_advisory_xact_lock(hashtextextended('reimbursement:' || p_invoice_id::text, 0));

  select s.*
    into source_snapshot
    from public.invoice_issuance_snapshots s
   where s.invoice_id = p_invoice_id
     and s.physio_id = resolved_physio_id;

  if not found then
    raise exception 'Finalized invoice snapshot not found for this physiotherapist.' using errcode = '42501';
  end if;

  if source_snapshot.professional_verification_status is distinct from 'verified'
     or source_snapshot.professional_verified_at is null
     or length(trim(coalesce(source_snapshot.verified_qualification, ''))) = 0
     or length(trim(coalesce(source_snapshot.verified_registration_number, ''))) = 0
     or length(trim(coalesce(source_snapshot.verified_registration_authority, ''))) = 0 then
    raise exception 'Verified professional credentials are required for reimbursement document issuance.' using errcode = '55000';
  end if;

  insert into public.professional_reimbursement_documents (
    invoice_id,
    physio_id,
    patient_id,
    snapshot_schema_version,
    invoice_number,
    invoice_issued_at,
    invoice_total,
    therapist_full_name,
    practice_name,
    verified_qualification,
    verified_registration_number,
    verified_registration_authority,
    professional_verified_at
  ) values (
    source_snapshot.invoice_id,
    source_snapshot.physio_id,
    source_snapshot.patient_id,
    source_snapshot.snapshot_schema_version,
    source_snapshot.invoice_number,
    source_snapshot.issued_at,
    source_snapshot.total,
    source_snapshot.therapist_full_name,
    source_snapshot.practice_name,
    source_snapshot.verified_qualification,
    source_snapshot.verified_registration_number,
    source_snapshot.verified_registration_authority,
    source_snapshot.professional_verified_at
  )
  on conflict (invoice_id) do nothing;

  return query
  select d.id, d.verification_token, d.invoice_id, d.invoice_number, d.issued_at
    from public.professional_reimbursement_documents d
   where d.invoice_id = p_invoice_id
     and d.physio_id = resolved_physio_id;
end;
$$;

revoke all privileges on function public.issue_my_reimbursement_document(uuid)
  from public, anon, authenticated;
grant execute on function public.issue_my_reimbursement_document(uuid)
  to authenticated;

create or replace function public.list_my_reimbursement_documents()
returns table (
  document_id uuid,
  verification_token uuid,
  invoice_id uuid,
  invoice_number text,
  invoice_total numeric,
  therapist_full_name text,
  practice_name text,
  verified_qualification text,
  verified_registration_number text,
  verified_registration_authority text,
  issued_at timestamptz
)
language plpgsql
security definer
stable
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  resolved_physio_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  resolved_physio_id := private.current_physio_id();

  return query
  select
    d.id,
    d.verification_token,
    d.invoice_id,
    d.invoice_number,
    d.invoice_total,
    d.therapist_full_name,
    d.practice_name,
    d.verified_qualification,
    d.verified_registration_number,
    d.verified_registration_authority,
    d.issued_at
  from public.professional_reimbursement_documents d
  where d.physio_id = resolved_physio_id
  order by d.issued_at desc;
end;
$$;

revoke all privileges on function public.list_my_reimbursement_documents()
  from public, anon, authenticated;
grant execute on function public.list_my_reimbursement_documents()
  to authenticated;

create or replace function public.verify_reimbursement_document(p_verification_token uuid)
returns table (
  valid boolean,
  document_id uuid,
  document_type text,
  document_version integer,
  invoice_number text,
  invoice_issued_at timestamptz,
  invoice_total numeric,
  therapist_full_name text,
  practice_name text,
  verified_qualification text,
  verified_registration_number text,
  verified_registration_authority text,
  professional_verified_at timestamptz,
  document_issued_at timestamptz
)
language sql
security definer
stable
set search_path = pg_catalog, public, private, pg_temp
as $$
  select
    true,
    d.id,
    d.document_type,
    d.document_version,
    d.invoice_number,
    d.invoice_issued_at,
    d.invoice_total,
    d.therapist_full_name,
    d.practice_name,
    d.verified_qualification,
    d.verified_registration_number,
    d.verified_registration_authority,
    d.professional_verified_at,
    d.issued_at
  from public.professional_reimbursement_documents d
  where d.verification_token = p_verification_token
  limit 1;
$$;

revoke all privileges on function public.verify_reimbursement_document(uuid)
  from public, anon, authenticated;
grant execute on function public.verify_reimbursement_document(uuid)
  to anon, authenticated;

commit;
