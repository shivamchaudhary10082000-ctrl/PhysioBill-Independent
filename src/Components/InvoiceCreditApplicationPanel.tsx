import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, WalletCards } from 'lucide-react';
import { loadInvoices, type ProductionInvoice } from '@/lib/invoices';
import {
  applyPatientCreditToInvoice,
  loadInvoiceCreditApplicationReversals,
  loadInvoiceCreditApplications,
  reverseInvoiceCreditApplication,
  type InvoiceCreditApplication,
  type InvoiceCreditApplicationReversal,
} from '@/lib/invoice-credit-applications';
import { loadPatientCreditLedger, type PatientCreditLedger } from '@/lib/patient-credit-ledger';
import { loadPatientFinancialLedger, type PatientFinancialLedger } from '@/lib/financial-ledger';

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;
const dateTime = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

type InvoiceHistory = {
  applications: InvoiceCreditApplication[];
  reversals: InvoiceCreditApplicationReversal[];
};

export function InvoiceCreditApplicationPanel({
  patientId,
  credit,
  onCreditChanged,
  onFinancialChanged,
}: {
  patientId: string;
  credit: PatientCreditLedger;
  onCreditChanged: (next: PatientCreditLedger) => void;
  onFinancialChanged: (next: PatientFinancialLedger) => void;
}) {
  const [invoices, setInvoices] = useState<ProductionInvoice[]>([]);
  const [history, setHistory] = useState<Record<string, InvoiceHistory>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [reversalReasons, setReversalReasons] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const finalized = useMemo(
    () => invoices.filter((invoice) => invoice.patientId === patientId && invoice.finalized),
    [invoices, patientId],
  );

  const refresh = async () => {
    const allInvoices = await loadInvoices();
    const patientInvoices = allInvoices.filter((invoice) => invoice.patientId === patientId && invoice.finalized);
    const histories = await Promise.all(patientInvoices.map(async (invoice) => {
      const [applications, reversals] = await Promise.all([
        loadInvoiceCreditApplications(invoice.id),
        loadInvoiceCreditApplicationReversals(invoice.id),
      ]);
      return [invoice.id, { applications, reversals }] as const;
    }));
    setInvoices(allInvoices);
    setHistory(Object.fromEntries(histories));
    const [nextCredit, nextFinancial] = await Promise.all([
      loadPatientCreditLedger(patientId),
      loadPatientFinancialLedger(patientId),
    ]);
    onCreditChanged(nextCredit);
    onFinancialChanged(nextFinancial);
  };

  useEffect(() => {
    let active = true;
    loadInvoices()
      .then(async (allInvoices) => {
        if (!active) return;
        setInvoices(allInvoices);
        const patientInvoices = allInvoices.filter((invoice) => invoice.patientId === patientId && invoice.finalized);
        const histories = await Promise.all(patientInvoices.map(async (invoice) => {
          const [applications, reversals] = await Promise.all([
            loadInvoiceCreditApplications(invoice.id),
            loadInvoiceCreditApplicationReversals(invoice.id),
          ]);
          return [invoice.id, { applications, reversals }] as const;
        }));
        if (active) setHistory(Object.fromEntries(histories));
      })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load invoice credit history.'); });
    return () => { active = false; };
  }, [patientId]);

  const applyCredit = async (invoice: ProductionInvoice) => {
    const parsed = Number(amounts[invoice.id] ?? '');
    if (!Number.isFinite(parsed) || parsed <= 0 || Math.round(parsed * 100) !== parsed * 100) {
      setError('Enter a positive credit amount with at most two decimal places.');
      return;
    }
    const outstanding = Math.max(invoice.total - invoice.paid, 0);
    if (parsed > credit.balance) { setError('Credit application exceeds the current patient credit balance.'); return; }
    if (parsed > outstanding) { setError('Credit application exceeds the invoice outstanding amount.'); return; }
    setBusyKey(`apply:${invoice.id}`);
    setError(null);
    setNotice(null);
    try {
      await applyPatientCreditToInvoice(invoice.id, parsed);
      setAmounts((current) => ({ ...current, [invoice.id]: '' }));
      await refresh();
      setNotice(`Applied ${money(parsed)} of patient credit to ${invoice.number}. No external payment was created.`);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to apply patient credit safely.');
    } finally {
      setBusyKey(null);
    }
  };

  const reverseCredit = async (application: InvoiceCreditApplication) => {
    const reason = (reversalReasons[application.applicationId] ?? '').trim();
    if (!reason) { setError('Enter a reason before reversing a credit application.'); return; }
    setBusyKey(`reverse:${application.applicationId}`);
    setError(null);
    setNotice(null);
    try {
      await reverseInvoiceCreditApplication(application.applicationId, reason);
      setReversalReasons((current) => ({ ...current, [application.applicationId]: '' }));
      await refresh();
      setNotice(`Reversed ${money(application.amount)} of applied credit. The original application remains in append-only history.`);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to reverse the credit application safely.');
    } finally {
      setBusyKey(null);
    }
  };

  return <section className="overflow-hidden rounded-2xl border bg-card">
    <div className="border-b p-5">
      <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-primary/6 text-primary"><WalletCards size={17} /></span><h3 className="text-lg font-bold">Apply credit to finalized invoices</h3></div>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">This moves value from the patient advance/credit ledger into invoice settlement. It does not create a cash, UPI, bank or provider payment. Reversals restore credit through a separate append-only entry.</p>
      <p className="mt-2 text-sm font-semibold">Available credit: {money(credit.balance)}</p>
    </div>
    {error && <div className="border-b border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
    {notice && <div className="border-b bg-primary/5 p-4 text-sm text-primary">{notice}</div>}
    <div className="divide-y">
      {finalized.map((invoice) => {
        const outstanding = Math.max(invoice.total - invoice.paid, 0);
        const invoiceHistory = history[invoice.id] ?? { applications: [], reversals: [] };
        const reversed = new Set(invoiceHistory.reversals.map((item) => item.applicationId));
        return <div key={invoice.id} className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-bold">{invoice.number}</p><p className="mt-1 text-xs text-muted-foreground">{invoice.status} · Total {money(invoice.total)} · Settled {money(invoice.paid)}</p></div>
            <div className="text-right"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-bold">{money(outstanding)}</p></div>
          </div>
          {outstanding > 0 && credit.balance > 0 && <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium">Credit amount<input inputMode="decimal" value={amounts[invoice.id] ?? ''} onChange={(event) => setAmounts((current) => ({ ...current, [invoice.id]: event.target.value }))} className="mt-2 h-10 w-44 rounded-xl border bg-background px-3 text-sm" placeholder="0" /></label>
            <button type="button" disabled={busyKey !== null} onClick={() => applyCredit(invoice)} className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busyKey === `apply:${invoice.id}` ? 'Applying…' : 'Apply credit'}</button>
          </div>}
          {outstanding <= 0 && <p className="text-sm text-muted-foreground">This invoice is fully settled. No additional credit can be applied.</p>}
          {outstanding > 0 && credit.balance <= 0 && <p className="text-sm text-muted-foreground">No patient credit is currently available to apply.</p>}
          {!!invoiceHistory.applications.length && <div className="rounded-xl border border-border/70">
            <div className="border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credit application history</div>
            <div className="divide-y">{invoiceHistory.applications.map((application) => {
              const reversal = invoiceHistory.reversals.find((item) => item.applicationId === application.applicationId);
              return <div key={application.applicationId} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{money(application.amount)} applied</p><p className="mt-1 text-xs text-muted-foreground">{dateTime(application.createdAt)}</p></div><span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">{reversal ? 'Reversed' : 'Effective'}</span></div>
                {reversal ? <p className="mt-2 text-sm text-muted-foreground">Restored {money(reversal.amount)} to credit on {dateTime(reversal.createdAt)} · {reversal.reason}</p> : <div className="mt-3 flex flex-wrap items-end gap-3"><label className="min-w-56 flex-1 text-sm font-medium">Reversal reason<input value={reversalReasons[application.applicationId] ?? ''} onChange={(event) => setReversalReasons((current) => ({ ...current, [application.applicationId]: event.target.value }))} className="mt-2 h-10 w-full rounded-xl border bg-background px-3 text-sm" placeholder="Required reason" /></label><button type="button" disabled={busyKey !== null || reversed.has(application.applicationId)} onClick={() => reverseCredit(application)} className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold disabled:opacity-60"><RotateCcw size={15} />{busyKey === `reverse:${application.applicationId}` ? 'Reversing…' : 'Reverse credit'}</button></div>}
              </div>;
            })}</div>
          </div>}
        </div>;
      })}
      {!finalized.length && <div className="p-6 text-center text-sm text-muted-foreground">No finalized invoices exist for this patient yet.</div>}
    </div>
  </section>;
}
