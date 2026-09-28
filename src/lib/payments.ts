import { getSupabaseClient } from '@/lib/supabase';
import { resolveAuthenticatedPhysiotherapist } from '@/lib/workspace';
import { loadInvoice, type ProductionInvoice } from '@/lib/invoices';

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';

export type ProductionPayment = {
  id: string;
  physioId: string;
  invoiceId: string;
  patientId: string;
  amount: number;
  method: PaymentMethod;
  status: string;
  notes: string;
  recordedByUserId?: string;
  recordedAt: string;
  createdAt: string;
};

export type PaymentInput = {
  amount: number;
  method: PaymentMethod;
  recordedAt?: string;
  notes?: string;
};

type PaymentRow = {
  id: string;
  physio_id: string;
  invoice_id: string;
  patient_id: string;
  amount: number | string;
  method: PaymentMethod;
  status: string;
  notes: string;
  recorded_by_user_id: string | null;
  recorded_at: string;
  created_at: string;
};

const paymentColumns = 'id,physio_id,invoice_id,patient_id,amount,method,status,notes,recorded_by_user_id,recorded_at,created_at' as const;

function mapPayment(row: PaymentRow): ProductionPayment {
  return {
    id: row.id,
    physioId: row.physio_id,
    invoiceId: row.invoice_id,
    patientId: row.patient_id,
    amount: Number(row.amount),
    method: row.method,
    status: row.status,
    notes: row.notes,
    recordedByUserId: row.recorded_by_user_id ?? undefined,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
  };
}

export async function loadPaymentsForInvoice(invoiceId: string): Promise<ProductionPayment[]> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('payments')
    .select(paymentColumns)
    .eq('invoice_id', invoiceId)
    .eq('physio_id', bootstrap.physioId)
    .order('recorded_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapPayment(row as unknown as PaymentRow));
}

export async function recordPayment(
  invoiceId: string,
  input: PaymentInput,
): Promise<{ payment: ProductionPayment; invoice: ProductionInvoice }> {
  await resolveAuthenticatedPhysiotherapist();
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      amount: input.amount,
      method: input.method,
      recorded_at: input.recordedAt || undefined,
      notes: input.notes?.trim() ?? '',
    })
    .select(paymentColumns)
    .single();

  if (error) throw error;
  const payment = mapPayment(data as unknown as PaymentRow);

  const [verifiedPayments, reconciledInvoice] = await Promise.all([
    loadPaymentsForInvoice(invoiceId),
    loadInvoice(invoiceId),
  ]);

  if (!verifiedPayments.some((item) => item.id === payment.id)) {
    throw new Error('Payment was not readable after recording.');
  }
  if (!reconciledInvoice) {
    throw new Error('Invoice was not readable after payment reconciliation.');
  }

  return { payment, invoice: reconciledInvoice };
}
