import { getSupabaseClient } from '@/lib/supabase';
import { resolveAuthenticatedPhysiotherapist } from '@/lib/workspace';
import { loadInvoice, type ProductionInvoice } from '@/lib/invoices';
import { loadPaymentsForInvoice, type ProductionPayment } from '@/lib/payments';

export type PaymentCorrectionType = 'correction' | 'reversal';

export type ProductionPaymentCorrection = {
  id: string;
  physioId: string;
  invoiceId: string;
  patientId: string;
  originalPaymentId: string;
  transactionType: PaymentCorrectionType;
  amount: number;
  reason: string;
  recordedByUserId: string;
  createdAt: string;
};

export type PaymentCorrectionInput = {
  originalPaymentId: string;
  transactionType: PaymentCorrectionType;
  amount: number;
  reason: string;
};

type PaymentCorrectionRow = {
  id: string;
  physio_id: string;
  invoice_id: string;
  patient_id: string;
  original_payment_id: string;
  transaction_type: PaymentCorrectionType;
  amount: number | string;
  reason: string;
  recorded_by_user_id: string;
  created_at: string;
};

const correctionColumns = 'id,physio_id,invoice_id,patient_id,original_payment_id,transaction_type,amount,reason,recorded_by_user_id,created_at' as const;

function mapCorrection(row: PaymentCorrectionRow): ProductionPaymentCorrection {
  return {
    id: row.id,
    physioId: row.physio_id,
    invoiceId: row.invoice_id,
    patientId: row.patient_id,
    originalPaymentId: row.original_payment_id,
    transactionType: row.transaction_type,
    amount: Number(row.amount),
    reason: row.reason,
    recordedByUserId: row.recorded_by_user_id,
    createdAt: row.created_at,
  };
}

export async function loadPaymentCorrectionsForInvoice(invoiceId: string): Promise<ProductionPaymentCorrection[]> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('payment_corrections')
    .select(correctionColumns)
    .eq('invoice_id', invoiceId)
    .eq('physio_id', bootstrap.physioId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapCorrection(row as unknown as PaymentCorrectionRow));
}

export function remainingReversibleAmount(
  payment: ProductionPayment,
  corrections: ProductionPaymentCorrection[],
): number {
  const corrected = corrections
    .filter((item) => item.originalPaymentId === payment.id)
    .reduce((sum, item) => sum + item.amount, 0);
  return Math.max(0, payment.amount - corrected);
}

export async function recordPaymentCorrection(
  invoiceId: string,
  input: PaymentCorrectionInput,
): Promise<{
  correction: ProductionPaymentCorrection;
  invoice: ProductionInvoice;
  payments: ProductionPayment[];
  corrections: ProductionPaymentCorrection[];
}> {
  await resolveAuthenticatedPhysiotherapist();
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Correction amount must be greater than zero.');
  }
  if (!input.reason.trim()) {
    throw new Error('A reason is required.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('payment_corrections')
    .insert({
      original_payment_id: input.originalPaymentId,
      transaction_type: input.transactionType,
      amount: input.amount,
      reason: input.reason.trim(),
    })
    .select(correctionColumns)
    .single();

  if (error) throw error;
  const correction = mapCorrection(data as unknown as PaymentCorrectionRow);

  const [payments, corrections, invoice] = await Promise.all([
    loadPaymentsForInvoice(invoiceId),
    loadPaymentCorrectionsForInvoice(invoiceId),
    loadInvoice(invoiceId),
  ]);

  if (!corrections.some((item) => item.id === correction.id)) {
    throw new Error('Payment correction was not readable after recording.');
  }
  if (!invoice) {
    throw new Error('Invoice was not readable after correction reconciliation.');
  }

  return { correction, invoice, payments, corrections };
}
