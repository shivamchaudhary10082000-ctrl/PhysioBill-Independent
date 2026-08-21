import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileText, Search, WalletCards } from 'lucide-react';
import { loadPatients, type ProductionPatient } from '@/lib/patients';
import {
  loadPatientFinancialLedger,
  type FinancialLedgerEvent,
  type PatientFinancialLedger,
} from '@/lib/financial-ledger';

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;
const dateTime = (value: string) => new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('pushState'));
}

function EventCard({ event }: { event: FinancialLedgerEvent }) {
  if (event.type === 'invoice') {
    return <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide">Invoice</span><p className="font-extrabold">{event.invoiceNumber}</p></div>
        <p className="mt-1 text-xs text-muted-foreground">Finalized invoice · invoice record created {dateTime(event.occurredAt)} · {event.status}</p>
        <button type="button" onClick={() => navigate('/app/invoices')} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary">Open invoices <ArrowRight size={13} /></button>
      </div>
      <div className="text-left sm:text-right"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Billed</p><p className="text-lg font-extrabold">{money(event.amount)}</p></div>
    </div>;
  }

  if (event.type === 'payment') {
    return <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide">Payment</span><p className="font-extrabold">{event.method}</p></div>
        <p className="mt-1 text-xs text-muted-foreground">{event.invoiceNumber} · {dateTime(event.occurredAt)}</p>
      </div>
      <p className="text-lg font-extrabold">+{money(event.amount)}</p>
    </div>;
  }

  const label = event.type === 'correction' ? 'Correction' : 'Reversal';
  return <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
    <div>
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide">{label}</span><p className="font-extrabold">Corrects {money(event.originalPaymentAmount)} {event.originalPaymentMethod} payment</p></div>
      <p className="mt-1 text-xs text-muted-foreground">{event.invoiceNumber} · {dateTime(event.occurredAt)}</p>
      <p className="mt-2 text-sm"><span className="font-bold">Reason:</span> {event.reason}</p>
    </div>
    <p className="text-lg font-extrabold">−{money(event.amount)}</p>
  </div>;
}

function LedgerView({ patient, ledger }: { patient: ProductionPatient; ledger: PatientFinancialLedger }) {
  return <div className="space-y-5">
    <div className="rounded-2xl border bg-card p-5 sm:p-6">
      <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">Selected patient</p>
      <h2 className="mt-1 text-xl font-extrabold">{patient.name}</h2>
      <p className="text-sm text-muted-foreground">{patient.patientNumber}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-secondary/60 p-4"><p className="text-xs text-muted-foreground">Total Finalized Invoiced</p><p className="mt-1 text-xl font-extrabold">{money(ledger.totalFinalizedInvoiced)}</p></div>
        <div className="rounded-xl bg-secondary/60 p-4"><p className="text-xs text-muted-foreground">Effective Paid</p><p className="mt-1 text-xl font-extrabold">{money(ledger.effectivePaid)}</p></div>
        <div className="rounded-xl bg-secondary/60 p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="mt-1 text-xl font-extrabold">{money(ledger.outstanding)}</p></div>
      </div>
    </div>

    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b p-5"><div className="flex items-center gap-2"><WalletCards size={18} className="text-primary" /><h3 className="font-extrabold">Financial chronology</h3></div><p className="mt-1 text-sm text-muted-foreground">Read-only history from finalized invoices, original payments and audited corrections/reversals. Visits are not treated as financial events.</p></div>
      <div className="divide-y">{ledger.events.map((event) => <EventCard key={event.id} event={event} />)}{!ledger.events.length && <div className="p-5 text-sm text-muted-foreground">No finalized financial history for this Patient yet.</div>}</div>
    </section>
  </div>;
}

export function PatientFinancialLedgerGateway({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname);
  const [patients, setPatients] = useState<ProductionPatient[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [ledger, setLedger] = useState<PatientFinancialLedger | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onLocation = () => setPath(window.location.pathname);
    const events = ['popstate', 'pushState', 'replaceState'] as const;
    events.forEach((eventName) => window.addEventListener(eventName, onLocation));
    onLocation();
    return () => events.forEach((eventName) => window.removeEventListener(eventName, onLocation));
  }, []);

  const isLedgerRoute = path === '/app/financial-ledger';

  useEffect(() => {
    if (!isLedgerRoute) return;
    let active = true;
    setLoadingPatients(true);
    setError(null);
    loadPatients()
      .then((rows) => { if (active) setPatients(rows); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load Patients.'); })
      .finally(() => { if (active) setLoadingPatients(false); });
    return () => { active = false; };
  }, [isLedgerRoute]);

  useEffect(() => {
    if (!isLedgerRoute || !selectedPatientId) { setLedger(null); return; }
    let active = true;
    setLoadingLedger(true);
    setError(null);
    loadPatientFinancialLedger(selectedPatientId)
      .then((result) => { if (active) setLedger(result); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load financial ledger.'); })
      .finally(() => { if (active) setLoadingLedger(false); });
    return () => { active = false; };
  }, [isLedgerRoute, selectedPatientId]);

  const filteredPatients = useMemo(() => patients.filter((patient) => [patient.name, patient.patientNumber, patient.phone].join(' ').toLowerCase().includes(search.toLowerCase())), [patients, search]);
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? null;

  if (!isLedgerRoute) return <>{children}</>;

  return <div className="min-h-screen bg-background"><main className="mx-auto max-w-[1420px] px-4 py-6 sm:px-7 lg:px-10">
    <div className="mb-6"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">Phase 4 · Read-only financial ledger</p><h1 className="mt-1 text-3xl font-extrabold">Patient Financial Ledger</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Authoritative Patient-level history from Supabase invoices, payments and audited payment corrections. This screen cannot record, edit, reverse or delete financial transactions.</p></div>

    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border bg-card p-4 lg:self-start">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Patients…" className="h-11 w-full rounded-xl border bg-background pl-9 pr-3 text-sm" /></div>
        <div className="mt-3 max-h-[60vh] divide-y overflow-auto rounded-xl border">{filteredPatients.map((patient) => <button key={patient.id} type="button" onClick={() => setSelectedPatientId(patient.id)} className={`w-full p-3 text-left ${selectedPatientId === patient.id ? 'bg-secondary' : 'hover:bg-secondary/50'}`}><p className="font-bold">{patient.name}</p><p className="text-xs text-muted-foreground">{patient.patientNumber}</p></button>)}{!loadingPatients && !filteredPatients.length && <div className="p-4 text-sm text-muted-foreground">No Patients found.</div>}</div>
      </aside>

      <section>
        {error && <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
        {loadingPatients && <div className="rounded-2xl border bg-card p-6 text-sm font-semibold text-muted-foreground">Loading Patients…</div>}
        {!loadingPatients && !selectedPatient && <div className="rounded-2xl border bg-card p-8 text-center"><FileText size={28} className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-extrabold">Select a Patient</h2><p className="mt-1 text-sm text-muted-foreground">Choose a Patient to view only that Patient's authoritative financial history.</p></div>}
        {selectedPatient && loadingLedger && <div className="rounded-2xl border bg-card p-6 text-sm font-semibold text-muted-foreground">Loading financial history…</div>}
        {selectedPatient && ledger && !loadingLedger && <LedgerView patient={selectedPatient} ledger={ledger} />}
      </section>
    </div>
  </main></div>;
}
