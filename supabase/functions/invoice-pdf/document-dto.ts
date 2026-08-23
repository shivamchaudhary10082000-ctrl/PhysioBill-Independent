export const SNAPSHOT_COLUMNS = 'invoice_id,physio_id,patient_id,invoice_number,snapshot_schema_version,issued_at,provenance,therapist_full_name,therapist_title,practice_name,therapist_qualification,therapist_registration,therapist_registration_authority,therapist_phone,therapist_email,practice_address,therapist_pan,therapist_gstin,professional_verification_status,verified_qualification,verified_registration_number,verified_registration_authority,professional_verified_at,professional_verification_method,patient_name,patient_number,patient_phone,patient_email,patient_address,description,sessions,service_start_date,service_end_date,fee,additional,additional_description,discount,gst_rate,total' as const;

type SnapshotRow = Record<string, unknown>;

export type InvoicePdfDto = {
  invoiceId: string;
  physioId: string;
  invoiceNumber: string;
  snapshotSchemaVersion: number;
  issuedAt: string | null;
  provenance: string;
  provider: {
    fullName: string;
    title: string;
    practiceName: string;
    qualification: string;
    registration: string;
    registrationAuthority: string;
    phone: string;
    email: string;
    address: string;
    pan: string;
    gstin: string;
    professionalVerificationStatus: string | null;
  };
  patient: { name: string; number: string; phone: string; email: string; address: string };
  service: {
    description: string;
    sessions: string;
    startDate: string;
    endDate: string;
    fee: number;
    additional: number;
    additionalDescription: string;
    discount: number;
    gstRate: number;
    total: number;
  };
};

const text = (value: unknown) => typeof value === 'string' ? value : '';
const nullableText = (value: unknown) => typeof value === 'string' && value.length ? value : null;
const number = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('INVALID_SNAPSHOT_NUMBER');
  return parsed;
};

export function normalizeSnapshot(row: SnapshotRow): InvoicePdfDto {
  return {
    invoiceId: text(row.invoice_id),
    physioId: text(row.physio_id),
    invoiceNumber: text(row.invoice_number),
    snapshotSchemaVersion: number(row.snapshot_schema_version),
    issuedAt: nullableText(row.issued_at),
    provenance: text(row.provenance),
    provider: {
      fullName: text(row.therapist_full_name),
      title: text(row.therapist_title),
      practiceName: text(row.practice_name),
      qualification: text(row.therapist_qualification),
      registration: text(row.therapist_registration),
      registrationAuthority: text(row.therapist_registration_authority),
      phone: text(row.therapist_phone),
      email: text(row.therapist_email),
      address: text(row.practice_address),
      pan: text(row.therapist_pan),
      gstin: text(row.therapist_gstin),
      professionalVerificationStatus: nullableText(row.professional_verification_status),
    },
    patient: {
      name: text(row.patient_name),
      number: text(row.patient_number),
      phone: text(row.patient_phone),
      email: text(row.patient_email),
      address: text(row.patient_address),
    },
    service: {
      description: text(row.description),
      sessions: text(row.sessions),
      startDate: text(row.service_start_date),
      endDate: text(row.service_end_date),
      fee: number(row.fee),
      additional: number(row.additional),
      additionalDescription: text(row.additional_description),
      discount: number(row.discount),
      gstRate: number(row.gst_rate),
      total: number(row.total),
    },
  };
}
