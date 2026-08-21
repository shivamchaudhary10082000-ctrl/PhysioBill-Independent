import { getSupabaseClient } from '@/lib/supabase';
import { resolveAuthenticatedPhysiotherapist } from '@/lib/workspace';

export type LedgerInvoice = {
  id: string;
  patientId: string;
  invoiceNumber: string;
  total: number;
  paid: number;
  status: 'Outstanding' | 'Partially Paid' | 'Paid';
  createdAt: string;
};

export type LedgerPayment = {
  id: string;
  patientId: string;
  invoiceId: string;
  amount: number;
  method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';
  recordedAt: string;
};

export type LedgerCorrection = {
  id: string;
  patientId: string;
  invoiceId: string;
  originalPaymentId: string;
  transactionType: 'correction' | 'reversal';
  amount: number;
  reason: string;
  createdAt: string;
};

export type FinancialLedgerEvent =
  | {
      id: string;
      type: 'invoice';
      occurredAt: string;
      invoiceId: string;
      invoiceNumber: string;
      amount: number;
      status: LedgerInvoice['status'];
    }
  | {
      id: string;
      type: 'payment';
      occurredAt: string;
      invoiceId: string;
      invoiceNumber: string;
      paymentId: string;
      amount: number;
      method: LedgerPayment['method'];
    }
  | {
      id: string;
      type: 'correction' | 'reversal';
      occurredAt: string;
      invoiceId: string;
      invoiceNumber: string;
      originalPaymentId: string;
      originalPaymentAmount: number;
      originalPaymentMethod: LedgerPayment['method'];
      amount: number;
      reason: string;
    };

export type PatientFinancialLedger = {
  patientId: string;
  totalFinalizedInvoiced: number;
  effectivePaid: number;
  outstanding: number;
  events: FinancialLedgerEvent[];
};

type InvoiceRow = {
  id: string;
  patient_id: string;
  invoice_number: string;
  total: number | string;
  paid: number | string;
  status: LedgerInvoice['status'];
  created_at: string;
};

type PaymentRow = {
  id: string;
  patient_id: string;
  invoice_id: string;
  amount: number | string;
  method: LedgerPayment['method'];
  recorded_at: string;
};

type CorrectionRow = {
  id: string;
  patient_id: string;
  invoice_id: string;
  original_payment_id: string;
  transaction_type: 'correction' | 'reversal';
  amount: number | string;
  reason: string;
  created_at: string;
};

const invoiceColumns = 'id,patient_id,invoice_number,total,paid,status,created_at' as const;
const paymentColumns = 'id,patient_id,invoice_id,amount,method,recorded_at' as const;
const correctionColumns = 'id,patient_id,invoice_id,original_payment_id,transaction_type,amount,reason,created_at' as const;

export async function loadPatientFinancialLedger(patientId: string): Promise<PatientFinancialLedger> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();

  const [invoiceResult, paymentResult, correctionResult] = await Promise.all([
    supabase
      .from('invoices')
      .select(invoiceColumns)
      .eq('physio_id', bootstrap.physioId)
      .eq('patient_id', patientId)
      .eq('finalized', true),
    supabase
      .from('payments')
      .select(paymentColumns)
      .eq('physio_id', bootstrap.physioId)
      .eq('patient_id', patientId),
    supabase
      .from('payment_corrections')
      .select(correctionColumns)
      .eq('physio_id', bootstrap.physioId)
      .eq('patient_id', patientId),
  ]);

  if (invoiceResult.error) throw invoiceResult.error;
  if (paymentResult.error) throw paymentResult.error;
  if (correctionResult.error) throw correctionResult.error;

  const invoices: LedgerInvoice[] = (invoiceResult.data ?? []).map((row) => {
    const item = row as unknown as InvoiceRow;
    return {
      id: item.id,
      patientId: item.patient_id,
      invoiceNumber: item.invoice_number,
      total: Number(item.total),
      paid: Number(item.paid),
      status: item.status,
      createdAt: item.created_at,
    };
  });

  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));

  const payments: LedgerPayment[] = (paymentResult.data ?? [])
    .map((row) => {
      const item = row as unknown as PaymentRow;
      return {
        id: item.id,
        patientId: item.patient_id,
        invoiceId: item.invoice_id,
        amount: Number(item.amount),
        method: item.method,
        recordedAt: item.recorded_at,
      };
    })
    .filter((payment) => invoiceById.has(payment.invoiceId));

  const paymentById = new Map(payments.map((payment) => [payment.id, payment]));

  const corrections: LedgerCorrection[] = (correctionResult.data ?? [])
    .map((row) => {
      const item = row as unknown as CorrectionRow;
      return {
        id: item.id,
        patientId: item.patient_id,
        invoiceId: item.invoice_id,
        originalPaymentId: item.original_payment_id,
        transactionType: item.transaction_type,
        amount: Number(item.amount),
        reason: item.reason,
        createdAt: item.created_at,
      };
    })
    .filter((correction) => invoiceById.has(correction.invoiceId) && paymentById.has(correction.originalPaymentId));

  const events: FinancialLedgerEvent[] = [
    ...invoices.map((invoice): FinancialLedgerEvent => ({
      id: `invoice:${invoice.id}`,
      type: 'invoice',
      occurredAt: invoice.createdAt,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total,
      status: invoice.status,
    })),
    ...payments.map((payment): FinancialLedgerEvent => ({
      id: `payment:${payment.id}`,
      type: 'payment',
      occurredAt: payment.recordedAt,
      invoiceId: payment.invoiceId,
      invoiceNumber: invoiceById.get(payment.invoiceId)!.invoiceNumber,
      paymentId: payment.id,
      amount: payment.amount,
      method: payment.method,
    })),
    ...corrections.map((correction): FinancialLedgerEvent => {
      const originalPayment = paymentById.get(correction.originalPaymentId)!;
      return {
        id: `${correction.transactionType}:${correction.id}`,
        type: correction.transactionType,
        occurredAt: correction.createdAt,
        invoiceId: correction.invoiceId,
        invoiceNumber: invoiceById.get(correction.invoiceId)!.invoiceNumber,
        originalPaymentId: originalPayment.id,
        originalPaymentAmount: originalPayment.amount,
        originalPaymentMethod: originalPayment.method,
        amount: correction.amount,
        reason: correction.reason,
      };
    }),
  ].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  const totalFinalizedInvoiced = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const effectivePaid = invoices.reduce((sum, invoice) => sum + invoice.paid, 0);
  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.total - invoice.paid), 0);

  return {
    patientId,
    totalFinalizedInvoiced,
    effectivePaid,
    outstanding,
    events,
  };
}
