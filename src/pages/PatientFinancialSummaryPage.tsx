import { useEffect, useMemo, useState } from 'react';
import { ReceiptIndianRupee, WalletCards } from 'lucide-react';
import { PatientInvoicePaymentInstructions } from '@/Components/PatientInvoicePaymentInstructions';
import { loadMyFinancialSummary, type PatientFinancialSummary } from '@/lib/patient-financial-access';
import { loadMyLinkedCreditSummary, type LinkedPatientCreditSummary } from '@/lib/patient-credit-ledger';

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;
const dateLabel = (value: string) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export function PatientFinancialSummaryPage() {
  const [items, setItems] = useState<PatientFinancialSummary[]>([]);
  const [credits, setCredits] = useState<LinkedPatientCreditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([loadMyFinancialSummary(), loadMyLinkedCreditSummary()])
      .then(([financialRows, creditRows]) => { if (active) { setItems(financialRows); setCredits(creditRows); } })
      .catch(() => { if (active) setError('Your financial summary could not be loaded safely.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totals = useMemo(() => items.reduce((sum, item) => ({
    invoiced: sum.invoiced + item.totals.finalizedInvoiced,
    paid: sum.paid + item.totals.effectivePaid,
    outstanding: sum.outstanding + item.totals.outstanding,
  }), { invoiced: 0, paid: 0, outstanding: 0 }), [items]);
  const totalCredit = useMemo(() => credits.reduce((sum, item) => sum + item.balance, 0), [credits]);

  if (loading) return <div className="rounded-2xl border bg-card p-6 text-sm font-medium text-muted-foreground">Loading your finalized billing history…</div>;
  if (error) return <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>;

  return <div className="space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Patient billing</p><h1 className="mt-1 text-3xl font-bold tracking-[-.035em]">My financial summary</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Only finalized invoices, effective payment history and explicitly recorded advance/credit entries from actively linked physiotherapist charts are shown here. Draft billing, payment-provider identifiers and therapist-private notes are not exposed.</p></div>
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="rounded-2xl border bg-card p-5"><p className="text-xs text-muted-foreground">Finalized invoiced</p><p className="mt-1 text-xl font-bold">{money(totals.invoiced)}</p></div>
      <div className="rounded-2xl border bg-card p-5"><p className="text-xs text-muted-foreground">Effective paid</p><p className="mt-1 text-xl font-bold">{money(totals.paid)}</p></div>
      <div className="rounded-2xl border bg-card p-5"><p className="text-xs text-muted-foreground">Outstanding</p><p className="mt-1 text-xl font-bold">{money(totals.outstanding)}</p></div>
      <div className="rounded-2xl border bg-card p-5"><p className="text-xs text-muted-foreground">Available advance / credit</p><p className="mt-1 text-xl font-bold">{money(totalCredit)}</p></div>
    </div>
    {credits.length > 0 && <section className="overflow-hidden rounded-2xl border bg-card"><div className="border-b p-5"><div className="flex items-center gap-2"><WalletCards size={17} className="text-primary" /><h2 className="font-bold">Advance / credit ledger</h2></div><p className="mt-1 text-sm text-muted-foreground">This balance is separate from invoice payment status. Credit is not treated as an external payment until a separate controlled application step exists.</p></div><div className="divide-y">{credits.map((credit) => <article key={credit.linkId} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Physiotherapist</p><p className="mt-1 font-mono text-sm font-semibold">{credit.physiotherapistPublicId}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Current balance</p><p className="font-bold">{money(credit.balance)}</p></div></div>{credit.entries.length > 0 && <div className="mt-4 space-y-2 rounded-xl bg-secondary/45 p-4">{credit.entries.map((entry) => <div key={entry.entryId} className="flex flex-wrap items-start justify-between gap-2 text-sm"><div><p className="font-medium">{entry.entryType.replace(/_/g, ' ')}</p><p className="text-xs text-muted-foreground">{dateLabel(entry.occurredAt)}{entry.reason ? ` · ${entry.reason}` : ''}</p></div><strong>{entry.amount >= 0 ? '+' : ''}{money(entry.amount)}</strong></div>)}</div>}</article>)}</div></section>}
    {!items.length && <div className="rounded-2xl border bg-card p-8 text-center"><WalletCards className="mx-auto text-primary" size={24} /><h2 className="mt-3 font-bold">No linked finalized billing yet</h2><p className="mt-2 text-sm text-muted-foreground">Booking alone does not grant financial access. Billing appears only after an active clinical-chart connection and a finalized invoice.</p></div>}
    {items.map((item) => <section key={item.linkId} className="overflow-hidden rounded-2xl border bg-card"><div className="border-b p-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Physiotherapist</p><p className="mt-1 font-mono text-sm font-semibold">{item.physiotherapistPublicId}</p></div><div className="divide-y">{item.invoices.map((invoice) => <article key={invoice.invoiceId} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><ReceiptIndianRupee size={17} className="text-primary" /><h3 className="font-bold">{invoice.invoiceNumber}</h3></div><p className="mt-1 text-sm text-muted-foreground">{invoice.description || 'Physiotherapy services'} · finalized {dateLabel(invoice.finalizedAt)}</p></div><div className="text-right"><p className="font-bold">{money(invoice.total)}</p><p className="text-xs text-muted-foreground">{invoice.status}</p></div></div><div className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><p>Paid: <strong>{money(invoice.paid)}</strong></p><p>Outstanding: <strong>{money(invoice.outstanding)}</strong></p><p>Sessions: <strong>{invoice.sessions || '—'}</strong></p></div>{invoice.payments.length > 0 && <div className="mt-4 rounded-xl bg-secondary/45 p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Payments</p><div className="mt-2 space-y-2">{invoice.payments.map((payment) => <div key={payment.paymentId} className="flex flex-wrap justify-between gap-2 text-sm"><span>{dateLabel(payment.recordedAt)} · {payment.method}</span><strong>{money(payment.amount)}</strong></div>)}</div></div>}<PatientInvoicePaymentInstructions invoiceId={invoice.invoiceId} outstanding={invoice.outstanding} /></article>)}</div></section>)}
  </div>;
}
