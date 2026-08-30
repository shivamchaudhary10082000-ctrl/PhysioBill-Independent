import { getSupabaseClient } from '@/lib/supabase';

export type ReimbursementVerification = {
  valid: boolean;
  documentId: string;
  documentType: string;
  documentVersion: number;
  invoiceNumber: string;
  invoiceIssuedAt: string | null;
  invoiceTotal: number;
  therapistFullName: string;
  practiceName: string;
  verifiedQualification: string;
  verifiedRegistrationNumber: string;
  verifiedRegistrationAuthority: string;
  professionalVerifiedAt: string;
  documentIssuedAt: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unexpected verification response.');
  return value as Record<string, unknown>;
}

function requiredText(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== 'string' || !value) throw new Error(`Missing ${key} in verification response.`);
  return value;
}

export async function verifyReimbursementDocument(token: string): Promise<ReimbursementVerification | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('verify_reimbursement_document', { p_verification_token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  const record = asRecord(row);
  return {
    valid: record.valid === true,
    documentId: requiredText(record, 'document_id'),
    documentType: requiredText(record, 'document_type'),
    documentVersion: Number(record.document_version),
    invoiceNumber: requiredText(record, 'invoice_number'),
    invoiceIssuedAt: typeof record.invoice_issued_at === 'string' ? record.invoice_issued_at : null,
    invoiceTotal: Number(record.invoice_total),
    therapistFullName: requiredText(record, 'therapist_full_name'),
    practiceName: typeof record.practice_name === 'string' ? record.practice_name : '',
    verifiedQualification: requiredText(record, 'verified_qualification'),
    verifiedRegistrationNumber: requiredText(record, 'verified_registration_number'),
    verifiedRegistrationAuthority: requiredText(record, 'verified_registration_authority'),
    professionalVerifiedAt: requiredText(record, 'professional_verified_at'),
    documentIssuedAt: requiredText(record, 'document_issued_at'),
  };
}
