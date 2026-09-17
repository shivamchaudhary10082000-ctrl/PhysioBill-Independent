import { getSupabaseClient } from '@/lib/supabase';

export type ProfessionalVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type InvoiceIssuanceSnapshot = {
  invoiceId: string;
  physioId: string;
  patientId: string;
  invoiceNumber: string;
  snapshotSchemaVersion: number;
  issuedAt: string | null;
  provenance: 'issued' | 'legacy_backfill';
  therapistFullName: string;
  therapistTitle: string;
  practiceName: string;
  therapistQualification: string;
  therapistRegistration: string;
  therapistRegistrationAuthority: string;
  therapistPhone: string;
  therapistEmail: string;
  practiceAddress: string;
  therapistPan: string;
  therapistGstin: string;
  therapistLogoUrl: string;
  professionalVerificationStatus: ProfessionalVerificationStatus | null;
  verifiedQualification: string;
  verifiedRegistrationNumber: string;
  verifiedRegistrationAuthority: string;
  professionalVerifiedAt: string | null;
  professionalVerificationMethod: string;
  patientName: string;
  patientNumber: string;
  patientPhone: string;
  patientEmail: string;
  patientAddress: string;
  description: string;
  sessions: string;
  serviceStartDate: string;
  serviceEndDate: string;
  fee: number;
  additional: number;
  additionalDescription: string;
  discount: number;
  gstRate: number;
  total: number;
};

type SnapshotRow = {
  invoice_id: string;
  physio_id: string;
  patient_id: string;
  invoice_number: string;
  snapshot_schema_version: number;
  issued_at: string | null;
  provenance: 'issued' | 'legacy_backfill';
  therapist_full_name: string;
  therapist_title: string;
  practice_name: string;
  therapist_qualification: string;
  therapist_registration: string;
  therapist_registration_authority: string | null;
  therapist_phone: string;
  therapist_email: string;
  practice_address: string;
  therapist_pan: string;
  therapist_gstin: string;
  therapist_logo_url: string;
  professional_verification_status: ProfessionalVerificationStatus | null;
  verified_qualification: string | null;
  verified_registration_number: string | null;
  verified_registration_authority: string | null;
  professional_verified_at: string | null;
  professional_verification_method: string | null;
  patient_name: string;
  patient_number: string;
  patient_phone: string;
  patient_email: string;
  patient_address: string;
  description: string;
  sessions: string;
  service_start_date: string | null;
  service_end_date: string | null;
  fee: number | string;
  additional: number | string;
  additional_description: string;
  discount: number | string;
  gst_rate: number | string;
  total: number | string;
};

const snapshotColumns = 'invoice_id,physio_id,patient_id,invoice_number,snapshot_schema_version,issued_at,provenance,therapist_full_name,therapist_title,practice_name,therapist_qualification,therapist_registration,therapist_registration_authority,therapist_phone,therapist_email,practice_address,therapist_pan,therapist_gstin,therapist_logo_url,professional_verification_status,verified_qualification,verified_registration_number,verified_registration_authority,professional_verified_at,professional_verification_method,patient_name,patient_number,patient_phone,patient_email,patient_address,description,sessions,service_start_date,service_end_date,fee,additional,additional_description,discount,gst_rate,total' as const;

function mapSnapshot(row: SnapshotRow): InvoiceIssuanceSnapshot {
  return {
    invoiceId: row.invoice_id,
    physioId: row.physio_id,
    patientId: row.patient_id,
    invoiceNumber: row.invoice_number,
    snapshotSchemaVersion: row.snapshot_schema_version,
    issuedAt: row.issued_at,
    provenance: row.provenance,
    therapistFullName: row.therapist_full_name,
    therapistTitle: row.therapist_title,
    practiceName: row.practice_name,
    therapistQualification: row.therapist_qualification,
    therapistRegistration: row.therapist_registration,
    therapistRegistrationAuthority: row.therapist_registration_authority ?? '',
    therapistPhone: row.therapist_phone,
    therapistEmail: row.therapist_email,
    practiceAddress: row.practice_address,
    therapistPan: row.therapist_pan,
    therapistGstin: row.therapist_gstin,
    therapistLogoUrl: row.therapist_logo_url,
    professionalVerificationStatus: row.professional_verification_status,
    verifiedQualification: row.verified_qualification ?? '',
    verifiedRegistrationNumber: row.verified_registration_number ?? '',
    verifiedRegistrationAuthority: row.verified_registration_authority ?? '',
    professionalVerifiedAt: row.professional_verified_at,
    professionalVerificationMethod: row.professional_verification_method ?? '',
    patientName: row.patient_name,
    patientNumber: row.patient_number,
    patientPhone: row.patient_phone,
    patientEmail: row.patient_email,
    patientAddress: row.patient_address,
    description: row.description,
    sessions: row.sessions,
    serviceStartDate: row.service_start_date ?? '',
    serviceEndDate: row.service_end_date ?? '',
    fee: Number(row.fee),
    additional: Number(row.additional),
    additionalDescription: row.additional_description,
    discount: Number(row.discount),
    gstRate: Number(row.gst_rate),
    total: Number(row.total),
  };
}

export async function loadInvoiceIssuanceSnapshot(invoiceId: string): Promise<InvoiceIssuanceSnapshot | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('invoice_issuance_snapshots')
    .select(snapshotColumns)
    .eq('invoice_id', invoiceId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSnapshot(data as unknown as SnapshotRow) : null;
}
