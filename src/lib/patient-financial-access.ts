import { getSupabaseClient } from '@/lib/supabase';

export type PatientFinancialSummary = {
  linkId: string;
  linkedAt: string;
  physiotherapistPublicId: string;
  totals: {
    finalizedInvoiced: number;
    effectivePaid: number;
    outstanding: number;
  };
  invoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    description: string;
    sessions: string;
    startDate: string;
    endDate: string;
    total: number;
    paid: number;
    outstanding: number;
    status: string;
    finalizedAt: string;
    payments: Array<{
      paymentId: string;
      amount: number;
      method: string;
      status: string;
      recordedAt: string;
      corrections: Array<{
        correctionId: string;
        transactionType: string;
        amount: number;
        reason: string;
        createdAt: string;
      }>;
    }>;
  }>;
};

function text(value: unknown, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function number(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(raw: unknown): PatientFinancialSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const linkId = text(row.linkId, 36);
    const linkedAt = text(row.linkedAt, 64);
    const physiotherapistPublicId = text(row.physiotherapistPublicId, 32);
    if (!linkId || !linkedAt || !physiotherapistPublicId) return [];

    const rawTotals = row.totals && typeof row.totals === 'object'
      ? row.totals as Record<string, unknown>
      : {};

    const invoices = Array.isArray(row.invoices) ? row.invoices.flatMap((invoice) => {
      if (!invoice || typeof invoice !== 'object') return [];
      const i = invoice as Record<string, unknown>;
      const invoiceId = text(i.invoiceId, 36);
      if (!invoiceId) return [];
      const payments = Array.isArray(i.payments) ? i.payments.flatMap((payment) => {
        if (!payment || typeof payment !== 'object') return [];
        const p = payment as Record<string, unknown>;
        const paymentId = text(p.paymentId, 36);
        if (!paymentId) return [];
        const corrections = Array.isArray(p.corrections) ? p.corrections.flatMap((correction) => {
          if (!correction || typeof correction !== 'object') return [];
          const c = correction as Record<string, unknown>;
          const correctionId = text(c.correctionId, 36);
          if (!correctionId) return [];
          return [{
            correctionId,
            transactionType: text(c.transactionType, 40),
            amount: number(c.amount),
            reason: text(c.reason, 1000),
            createdAt: text(c.createdAt, 64),
          }];
        }) : [];
        return [{
          paymentId,
          amount: number(p.amount),
          method: text(p.method, 60),
          status: text(p.status, 40),
          recordedAt: text(p.recordedAt, 64),
          corrections,
        }];
      }) : [];
      return [{
        invoiceId,
        invoiceNumber: text(i.invoiceNumber, 100),
        description: text(i.description, 1000),
        sessions: text(i.sessions, 200),
        startDate: text(i.startDate, 32),
        endDate: text(i.endDate, 32),
        total: number(i.total),
        paid: number(i.paid),
        outstanding: number(i.outstanding),
        status: text(i.status, 40),
        finalizedAt: text(i.finalizedAt, 64),
        payments,
      }];
    }) : [];

    return [{
      linkId,
      linkedAt,
      physiotherapistPublicId,
      totals: {
        finalizedInvoiced: number(rawTotals.finalizedInvoiced),
        effectivePaid: number(rawTotals.effectivePaid),
        outstanding: number(rawTotals.outstanding),
      },
      invoices,
    }];
  });
}

export async function loadMyFinancialSummary() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('list_my_financial_summary');
  if (error) throw error;
  return normalize(data);
}
