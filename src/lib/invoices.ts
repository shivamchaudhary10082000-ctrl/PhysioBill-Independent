import { getSupabaseClient } from '@/lib/supabase';
import { resolveAuthenticatedPhysiotherapist } from '@/lib/workspace';

export type ProductionInvoiceStatus = 'Draft' | 'Outstanding' | 'Partially Paid' | 'Paid';

export type ProductionInvoice = {
  id: string;
  physioId: string;
  patientId: string;
  number: string;
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
  paid: number;
  paymentMethod: string;
  finalized: boolean;
  status: ProductionInvoiceStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProductionInvoiceInput = {
  patientId: string;
  description: string;
  sessions: string;
  startDate: string;
  endDate: string;
  fee: number;
  additional: number;
  additionalDescription: string;
  discount: number;
  gstRate: number;
  paymentMethod: string;
  finalized?: boolean;
};

type InvoiceRow = {
  id: string;
  physio_id: string;
  patient_id: string;
  invoice_number: string;
  description: string;
  sessions: string;
  start_date: string | null;
  end_date: string | null;
  fee: number | string;
  additional: number | string;
  additional_description: string;
  discount: number | string;
  gst_rate: number | string;
  total: number | string;
  paid: number | string;
  payment_method: string;
  finalized: boolean;
  status: ProductionInvoiceStatus;
  created_at: string;
  updated_at: string;
};

const invoiceColumns = 'id,physio_id,patient_id,invoice_number,description,sessions,start_date,end_date,fee,additional,additional_description,discount,gst_rate,total,paid,payment_method,finalized,status,created_at,updated_at' as const;

const clean = (value: string) => value.trim();
const amount = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

function normalizeInput(input: ProductionInvoiceInput) {
  return {
    patient_id: input.patientId,
    description: clean(input.description),
    sessions: clean(input.sessions),
    start_date: clean(input.startDate) || null,
    end_date: clean(input.endDate) || null,
    fee: amount(input.fee),
    additional: amount(input.additional),
    additional_description: clean(input.additionalDescription),
    discount: amount(input.discount),
    gst_rate: amount(input.gstRate),
    payment_method: clean(input.paymentMethod) || 'Select payment method',
    finalized: Boolean(input.finalized),
  };
}

function mapInvoice(row: InvoiceRow): ProductionInvoice {
  return {
    id: row.id,
    physioId: row.physio_id,
    patientId: row.patient_id,
    number: row.invoice_number,
    description: row.description,
    sessions: row.sessions,
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    fee: Number(row.fee),
    additional: Number(row.additional),
    additionalDescription: row.additional_description,
    discount: Number(row.discount),
    gstRate: Number(row.gst_rate),
    total: Number(row.total),
    paid: Number(row.paid),
    paymentMethod: row.payment_method,
    finalized: row.finalized,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadInvoices(): Promise<ProductionInvoice[]> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('invoices')
    .select(invoiceColumns)
    .eq('physio_id', bootstrap.physioId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapInvoice(row as unknown as InvoiceRow));
}

export async function createInvoice(input: ProductionInvoiceInput): Promise<ProductionInvoice> {
  await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('invoices')
    .insert(normalizeInput(input))
    .select(invoiceColumns)
    .single();

  if (error) throw error;
  const saved = mapInvoice(data as unknown as InvoiceRow);

  const verified = await loadInvoice(saved.id);
  if (!verified) throw new Error('Invoice was not readable after creation.');
  return verified;
}

export async function updateDraftInvoice(invoiceId: string, input: ProductionInvoiceInput): Promise<ProductionInvoice> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('invoices')
    .update(normalizeInput(input))
    .eq('id', invoiceId)
    .eq('physio_id', bootstrap.physioId)
    .select(invoiceColumns)
    .single();

  if (error) throw error;
  return mapInvoice(data as unknown as InvoiceRow);
}

export async function finalizeInvoice(invoiceId: string, input: ProductionInvoiceInput): Promise<ProductionInvoice> {
  return updateDraftInvoice(invoiceId, { ...input, finalized: true });
}

export async function loadInvoice(invoiceId: string): Promise<ProductionInvoice | null> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('invoices')
    .select(invoiceColumns)
    .eq('id', invoiceId)
    .eq('physio_id', bootstrap.physioId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapInvoice(data as unknown as InvoiceRow) : null;
}
