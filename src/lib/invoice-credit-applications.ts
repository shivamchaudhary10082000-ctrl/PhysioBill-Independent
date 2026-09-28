import { getSupabaseClient } from '@/lib/supabase';

export type InvoiceCreditApplication = {
  applicationId: string;
  invoiceId: string;
  patientId: string;
  amount: number;
  creditLedgerEntryId: string;
  createdAt: string;
};

export type InvoiceCreditApplicationReversal = {
  reversalId: string;
  applicationId: string;
  invoiceId: string;
  patientId: string;
  amount: number;
  restoringCreditLedgerEntryId: string;
  reason: string;
  createdAt: string;
};

export type ApplyPatientCreditResult = {
  applicationId: string;
  invoiceId: string;
  patientId: string;
  amount: number;
  remainingCreditBalance: number;
  remainingInvoiceOutstanding: number;
  creditLedgerEntryId: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Unexpected credit application response.');
  }
  return value as Record<string, unknown>;
}

function text(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== 'string' || !value) throw new Error(`Missing ${key} in credit application response.`);
  return value;
}

function numeric(record: Record<string, unknown>, key: string) {
  const value = Number(record[key]);
  if (!Number.isFinite(value)) throw new Error(`Invalid ${key} in credit application response.`);
  return value;
}

function mapApplication(value: unknown): InvoiceCreditApplication {
  const record = asRecord(value);
  return {
    applicationId: text(record, 'applicationId'),
    invoiceId: text(record, 'invoiceId'),
    patientId: text(record, 'patientId'),
    amount: numeric(record, 'amount'),
    creditLedgerEntryId: text(record, 'creditLedgerEntryId'),
    createdAt: text(record, 'createdAt'),
  };
}

function mapReversal(value: unknown): InvoiceCreditApplicationReversal {
  const record = asRecord(value);
  return {
    reversalId: text(record, 'reversalId'),
    applicationId: text(record, 'applicationId'),
    invoiceId: text(record, 'invoiceId'),
    patientId: text(record, 'patientId'),
    amount: numeric(record, 'amount'),
    restoringCreditLedgerEntryId: text(record, 'restoringCreditLedgerEntryId'),
    reason: text(record, 'reason'),
    createdAt: text(record, 'createdAt'),
  };
}

export async function loadInvoiceCreditApplications(invoiceId: string): Promise<InvoiceCreditApplication[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('list_invoice_credit_applications', { p_invoice_id: invoiceId });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Unexpected invoice credit application list response.');
  return data.map(mapApplication);
}

export async function loadInvoiceCreditApplicationReversals(invoiceId: string): Promise<InvoiceCreditApplicationReversal[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('list_invoice_credit_application_reversals', { p_invoice_id: invoiceId });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Unexpected invoice credit reversal list response.');
  return data.map(mapReversal);
}

export async function applyPatientCreditToInvoice(invoiceId: string, amount: number): Promise<ApplyPatientCreditResult> {
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
    throw new Error('Enter a positive credit amount with at most two decimal places.');
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('apply_patient_credit_to_invoice', {
    p_invoice_id: invoiceId,
    p_amount: amount,
  });
  if (error) throw error;
  const record = asRecord(data);
  return {
    applicationId: text(record, 'applicationId'),
    invoiceId: text(record, 'invoiceId'),
    patientId: text(record, 'patientId'),
    amount: numeric(record, 'amount'),
    remainingCreditBalance: numeric(record, 'remainingCreditBalance'),
    remainingInvoiceOutstanding: numeric(record, 'remainingInvoiceOutstanding'),
    creditLedgerEntryId: text(record, 'creditLedgerEntryId'),
  };
}

export async function reverseInvoiceCreditApplication(applicationId: string, reason: string): Promise<InvoiceCreditApplicationReversal> {
  const cleanReason = reason.trim();
  if (!cleanReason) throw new Error('A reversal reason is required.');
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('reverse_invoice_credit_application', {
    p_application_id: applicationId,
    p_reason: cleanReason,
  });
  if (error) throw error;
  return mapReversal(data);
}
