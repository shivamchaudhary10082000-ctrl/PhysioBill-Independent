-- Fix professional reimbursement document issuance on PostgreSQL PL/pgSQL.
--
-- issue_my_reimbursement_document() RETURNS TABLE with an output parameter
-- named invoice_id. The prior ON CONFLICT (invoice_id) target is therefore
-- ambiguous between the output parameter and the table column and prevents
-- legitimate owner issuance. Bind conflict handling to the existing unique
-- constraint instead. Authorization, ownership, verification and advisory-lock
-- semantics remain unchanged.

create or replace function public.issue_my_reimbursement_document(p_invoice_id uuid)
returns table(
  document_id uuid,
  verification_token uuid,
  invoice_id uuid,
  invoice_number text,
  issued_at timestamptz
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'pg_temp'
as $function$
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
  on conflict on constraint professional_reimbursement_documents_invoice_id_key do nothing;

  return query
  select d.id, d.verification_token, d.invoice_id, d.invoice_number, d.issued_at
    from public.professional_reimbursement_documents d
   where d.invoice_id = p_invoice_id
     and d.physio_id = resolved_physio_id;
end;
$function$;
