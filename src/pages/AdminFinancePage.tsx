import { useEffect, useMemo, useState } from 'react';
import { CircleCheckBig, CircleDollarSign, FileWarning } from 'lucide-react';
import {
  listAdminBillingConsistency,
  type AdminBillingConsistency,
} from '@/lib/admin-operations';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });
const label = (value: string) => value.split('_').join(' ');

const tone: Record<AdminBillingConsistency['consistency_status'], string> = {
  consistent: 'bg-success/10 text-success',
  draft: 'bg-secondary text-muted-foreground',
  snapshot_missing: 'bg-destructive/8 text-destructive',
  amount_mismatch: 'bg-destructive/8 text-destructive',
  pdf_not_generated: 'bg-warning/10 text-warning',
  pdf_failed: 'bg-destructive/8 text-destructive',
  pdf_pending: 'bg-warning/10 text-warning',
};

export function AdminFinancePage() {
  const [items, setItems] = useState<AdminBillingConsistency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminBillingConsistency({ limit: 100 })
      .then(setItems)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load billing consistency.'))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => ({
    consistent: items.filter((item) => item.consistency_status === 'consistent').length,
    exceptions: items.filter((item) => !['consistent', 'draft'].includes(item.consistency_status)).length,
    finalizedTotal: items.filter((item) => item.finalized).reduce((sum, item) => sum + Number(item.invoice_total), 0),
  }), [items]);

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border bg-card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Financial supervision</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">Billing consistency</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Read-only comparison of invoice authority, immutable issuance snapshot, reimbursement document amount and latest PDF generation state. This does not authorize settlement or editing finalized records.</p>
      </section>

      {loading && <div className="h-52 rounded-2xl skeleton" />}
      {error && <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>}

      {!loading && !error && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-card p-5"><CircleDollarSign className="text-primary" size={19} /><p className="mt-4 text-xs text-muted-foreground">Finalized invoice value</p><p className="mt-1 text-2xl font-bold">{money.format(summary.finalizedTotal)}</p></div>
            <div className="rounded-2xl border bg-card p-5"><CircleCheckBig className="text-success" size={19} /><p className="mt-4 text-xs text-muted-foreground">Fully consistent</p><p className="mt-1 text-2xl font-bold">{summary.consistent}</p></div>
            <div className="rounded-2xl border bg-card p-5"><FileWarning className="text-warning" size={19} /><p className="mt-4 text-xs text-muted-foreground">Exceptions requiring review</p><p className="mt-1 text-2xl font-bold">{summary.exceptions}</p></div>
          </section>

          {!items.length ? <section className="rounded-2xl border bg-card p-10 text-center"><CircleCheckBig className="mx-auto text-success" /><h2 className="mt-3 font-bold">No invoices found</h2></section> : (
            <div className="space-y-3">
              {items.map((item) => (
                <article key={item.invoice_id} className="rounded-2xl border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{item.invoice_number}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${tone[item.consistency_status]}`}>{label(item.consistency_status)}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.public_physio_id} · {item.invoice_status} · {date.format(new Date(item.created_at))}</p></div>
                    <p className="text-lg font-bold">{money.format(Number(item.invoice_total))}</p>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-xl bg-secondary/45 p-3"><span className="text-muted-foreground">Invoice</span><strong className="mt-1 block">{money.format(Number(item.invoice_total))}</strong></div>
                    <div className="rounded-xl bg-secondary/45 p-3"><span className="text-muted-foreground">Paid/ledger</span><strong className="mt-1 block">{money.format(Number(item.paid_total))}</strong></div>
                    <div className="rounded-xl bg-secondary/45 p-3"><span className="text-muted-foreground">Issued snapshot</span><strong className="mt-1 block">{item.snapshot_total === null ? 'Missing' : money.format(Number(item.snapshot_total))}</strong></div>
                    <div className="rounded-xl bg-secondary/45 p-3"><span className="text-muted-foreground">Mediclaim document</span><strong className="mt-1 block">{item.reimbursement_total === null ? 'Not issued' : money.format(Number(item.reimbursement_total))}</strong></div>
                    <div className="rounded-xl bg-secondary/45 p-3"><span className="text-muted-foreground">PDF</span><strong className="mt-1 block capitalize">{item.pdf_generation_status ?? 'Not generated'}</strong></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
