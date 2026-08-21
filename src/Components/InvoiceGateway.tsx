import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, FileText, Plus, Search, ShieldCheck } from 'lucide-react';
import { loadPatients, type ProductionPatient } from '@/lib/patients';
import {
  createInvoice,
  finalizeInvoice,
  loadInvoices,
  updateDraftInvoice,
  type ProductionInvoice,
  type ProductionInvoiceInput,
} from '@/lib/invoices';
import { loadPhysiotherapistSettings, resolveAuthenticatedPhysiotherapist } from '@/lib/workspace';

type Draft = ProductionInvoiceInput;

const today = () => new Date().toISOString().slice(0, 10);
const emptyDraft = (patientId = '', defaultPayment = 'Select payment method'): Draft => ({
  patientId,
  description: 'Physiotherapy treatment',
  sessions: '',
  startDate: today(),
  endDate: today(),
  fee: 0,
  additional: 0,
  additionalDescription: '',
  discount: 0,
  gstRate: 0,
  paymentMethod: defaultPayment,
  finalized: false,
});

const toDraft = (invoice: ProductionInvoice): Draft => ({
  patientId: invoice.patientId,
  description: invoice.description,
  sessions: invoice.sessions,
  startDate: invoice.startDate,
  endDate: invoice.endDate,
  fee: invoice.fee,
  additional: invoice.additional,
  additionalDescription: invoice.additionalDescription,
  discount: invoice.discount,
  gstRate: invoice.gstRate,
  paymentMethod: invoice.paymentMethod,
  finalized: invoice.finalized,
});

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;
const calculatePreview = (draft: Draft) => Math.max(0, Math.round((draft.fee + draft.additional - draft.discount) * (1 + draft.gstRate / 100) * 100) / 100);

function Field({ label, value, onChange, type = 'text', disabled = false }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span><input disabled={disabled} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-muted/40 disabled:opacity-100" /></label>;
}

function InvoiceEditor({ invoice, patients, defaultPayment, onSaved, onBack }: { invoice: ProductionInvoice | null; patients: ProductionPatient[]; defaultPayment: string; onSaved: (invoice: ProductionInvoice) => void; onBack: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => invoice ? toDraft(invoice) : emptyDraft(patients[0]?.id ?? '', defaultPayment));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const readOnly = Boolean(invoice?.finalized);

  useEffect(() => {
    setDraft(invoice ? toDraft(invoice) : emptyDraft(patients[0]?.id ?? '', defaultPayment));
    setError(null);
    setMessage(null);
  }, [invoice?.id, defaultPayment, patients]);

  const update = <K extends keyof Draft>(field: K, value: Draft[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const persist = async (finalize: boolean) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      let saved: ProductionInvoice;
      if (!invoice) {
        saved = await createInvoice({ ...draft, finalized: finalize });
      } else if (finalize) {
        saved = await finalizeInvoice(invoice.id, draft);
      } else {
        saved = await updateDraftInvoice(invoice.id, draft);
      }
      onSaved(saved);
      setDraft(toDraft(saved));
      setMessage(finalize ? 'Invoice finalized.' : 'Draft saved.');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to save invoice.');
    } finally {
      setBusy(false);
    }
  };

  const previewTotal = calculatePreview(draft);
  return <div className="space-y-5">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"><ArrowLeft size={16} /> Back to invoices</button>
    <div className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">Real invoice</p><h2 className="mt-1 text-xl font-extrabold">{invoice?.number ?? 'New invoice'}</h2><p className="text-sm text-muted-foreground">{invoice?.status ?? 'Not saved yet'}</p></div>{invoice?.finalized && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">Finalized · read-only</span>}</div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Patient</span><select disabled={Boolean(invoice) || readOnly} value={draft.patientId} onChange={(event) => update('patientId', event.target.value)} className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm disabled:bg-muted/40 disabled:opacity-100">{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.patientNumber}</option>)}</select></label>
        <Field disabled label="Invoice number" value={invoice?.number ?? 'Assigned by server on save'} onChange={() => undefined} />
        <Field disabled={readOnly} label="Description" value={draft.description} onChange={(value) => update('description', value)} />
        <Field disabled={readOnly} label="Sessions" value={draft.sessions} onChange={(value) => update('sessions', value)} />
        <Field disabled={readOnly} type="date" label="Start date" value={draft.startDate} onChange={(value) => update('startDate', value)} />
        <Field disabled={readOnly} type="date" label="End date" value={draft.endDate} onChange={(value) => update('endDate', value)} />
        <Field disabled={readOnly} type="number" label="Fee" value={draft.fee} onChange={(value) => update('fee', Number(value) || 0)} />
        <Field disabled={readOnly} type="number" label="Additional" value={draft.additional} onChange={(value) => update('additional', Number(value) || 0)} />
        <Field disabled={readOnly} label="Additional description" value={draft.additionalDescription} onChange={(value) => update('additionalDescription', value)} />
        <Field disabled={readOnly} type="number" label="Discount" value={draft.discount} onChange={(value) => update('discount', Number(value) || 0)} />
        <Field disabled={readOnly} type="number" label="GST rate" value={draft.gstRate} onChange={(value) => update('gstRate', Number(value) || 0)} />
        <Field disabled label="Payment" value="Payments begin in a later Phase 4 slice" onChange={() => undefined} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-secondary/60 p-4"><p className="text-xs text-muted-foreground">Total</p><p className="mt-1 text-lg font-extrabold">{money(invoice?.total ?? previewTotal)}</p></div><div className="rounded-xl bg-secondary/60 p-4"><p className="text-xs text-muted-foreground">Paid</p><p className="mt-1 text-lg font-extrabold">{money(invoice?.paid ?? 0)}</p></div><div className="rounded-xl bg-secondary/60 p-4"><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 text-lg font-extrabold">{invoice?.status ?? 'Draft'}</p></div></div>
      {error && <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {message && <div className="mt-4 rounded-xl bg-secondary p-3 text-sm font-semibold">{message}</div>}
      {!readOnly && <div className="mt-6 flex flex-wrap justify-end gap-2"><button disabled={busy || !draft.patientId} onClick={() => void persist(false)} className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy ? 'Saving…' : 'Save draft'}</button><button disabled={busy || !draft.patientId} onClick={() => void persist(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><ShieldCheck size={16} /> {busy ? 'Saving…' : 'Finalize invoice'}</button></div>}
    </div>
  </div>;
}

export function InvoiceGateway({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname);
  const [patients, setPatients] = useState<ProductionPatient[]>([]);
  const [invoices, setInvoices] = useState<ProductionInvoice[]>([]);
  const [defaultPayment, setDefaultPayment] = useState('Select payment method');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProductionInvoice | null | 'new'>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const onLocation = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onLocation);
    return () => window.removeEventListener('popstate', onLocation);
  }, []);

  const isInvoiceRoute = path === '/app/invoices';
  useEffect(() => {
    if (!isInvoiceRoute) return;
    let active = true;
    setLoading(true);
    setError(null);
    resolveAuthenticatedPhysiotherapist()
      .then(async (bootstrap) => Promise.all([loadPatients(), loadInvoices(), loadPhysiotherapistSettings(bootstrap.physioId)]))
      .then(([loadedPatients, loadedInvoices, settings]) => {
        if (!active) return;
        setPatients(loadedPatients);
        setInvoices(loadedInvoices);
        setDefaultPayment(settings.default_payment);
      })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load invoices.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isInvoiceRoute]);

  const filtered = useMemo(() => invoices.filter((invoice) => {
    const patient = patients.find((item) => item.id === invoice.patientId);
    return [invoice.number, invoice.description, invoice.status, patient?.name ?? ''].join(' ').toLowerCase().includes(search.toLowerCase());
  }), [invoices, patients, search]);

  if (!isInvoiceRoute) return <>{children}</>;
  if (loading) return <div className="min-h-screen bg-background p-6"><div className="mx-auto max-w-6xl rounded-2xl border bg-card p-6 text-sm font-semibold text-muted-foreground">Loading invoices…</div></div>;
  if (error) return <div className="min-h-screen bg-background p-6"><div className="mx-auto max-w-6xl rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div></div>;

  if (selected) {
    const invoice = selected === 'new' ? null : invoices.find((item) => item.id === selected.id) ?? selected;
    return <div className="min-h-screen bg-background"><main className="mx-auto max-w-[1420px] px-4 py-6 sm:px-7 lg:px-10"><InvoiceEditor invoice={invoice} patients={patients} defaultPayment={defaultPayment} onBack={() => setSelected(null)} onSaved={(saved) => { setInvoices((current) => [saved, ...current.filter((item) => item.id !== saved.id)]); setSelected(saved); }} /></main></div>;
  }

  return <div className="min-h-screen bg-background"><main className="mx-auto max-w-[1420px] px-4 py-6 sm:px-7 lg:px-10">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">Phase 4 · Real invoices</p><h1 className="mt-1 text-3xl font-extrabold">Invoices</h1><p className="mt-2 text-sm text-muted-foreground">Supabase-backed drafts and finalized invoices. Payments and corrections are intentionally not enabled in this slice.</p></div><button disabled={!patients.length} onClick={() => setSelected('new')} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Plus size={16} /> New invoice</button></div>
    <div className="relative mb-4"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoices…" className="h-11 w-full rounded-xl border bg-card pl-10 pr-4 text-sm" /></div>
    <div className="overflow-hidden rounded-2xl border bg-card divide-y">{filtered.map((invoice) => { const patient = patients.find((item) => item.id === invoice.patientId); return <button key={invoice.id} onClick={() => setSelected(invoice)} className="grid w-full gap-3 p-5 text-left hover:bg-secondary/40 md:grid-cols-[1fr_1.3fr_.8fr_.8fr_auto] md:items-center"><div><p className="font-extrabold">{invoice.number}</p><p className="text-xs text-muted-foreground">{invoice.description}</p></div><p>{patient?.name ?? 'Patient'}</p><p className="font-bold">{money(invoice.total)}</p><p className="text-sm">{invoice.status}</p><span className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><FileText size={15} /> Open</span></button>; })}{!filtered.length && <div className="p-6 text-sm text-muted-foreground">{patients.length ? 'No real invoices yet.' : 'Create a Patient before creating an invoice.'}</div>}</div>
  </main></div>;
}
