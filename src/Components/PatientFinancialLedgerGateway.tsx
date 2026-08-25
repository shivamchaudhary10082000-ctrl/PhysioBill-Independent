import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Search, WalletCards, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { loadPatients, type ProductionPatient } from '@/lib/patients';
import { loadVisits, type ProductionVisit } from '@/lib/visits';
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
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}).format(new Date(`${value}T00:00:00`));

function therapyStartByPatient(visits: ProductionVisit[]) {
  const earliest = new Map<string, string>();
  visits.forEach((visit) => {
    const current = earliest.get(visit.patientId);
    if (!current || visit.date < current) earliest.set(visit.patientId, visit.date);
  });
  return earliest;
}

function PatientContext({ patient, therapyStart }: { patient: ProductionPatient; therapyStart?: string }) {
  const clinical = [patient.condition, patient.clinicalCategory].filter(Boolean).join(' · ');
  return <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
    <p>{clinical || 'No condition/category recorded'}</p>
    <p>{therapyStart ? `Therapy started: ${dateLabel(therapyStart)}` : 'Therapy not started · No visits yet'}</p>
    <p>{patient.patientNumber}</p>
  </div>;
}

function EventCard({ event, navigate }: { event: FinancialLedgerEvent; navigate: (path: string) => void }) {
  if (event.type === 'invoice') {
    return <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">Invoice</span><p className="font-bold">{event.invoiceNumber}</p></div>
        <p className="mt-1 text-xs text-muted-foreground">Finalized invoice · invoice record created {dateTime(event.occurredAt)} · {event.status}</p>
        <button type="button" onClick={() => navigate('/app/invoices')} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">Open invoices <ArrowRight size={13} /></button>
      </div>
      <div className="text-left sm:text-right"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billed</p><p className="text-lg font-bold">{money(event.amount)}</p></div>
    </div>;
  }
  if (event.type === 'payment') {
    return <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">Payment</span><p className="font-bold">{event.method}</p></div><p className="mt-1 text-xs text-muted-foreground">{event.invoiceNumber} · {dateTime(event.occurredAt)}</p></div>
      <p className="text-lg font-bold">+{money(event.amount)}</p>
    </div>;
  }
  const label = event.type === 'correction' ? 'Correction' : 'Reversal';
  return <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
    <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">{label}</span><p className="font-bold">Corrects {money(event.originalPaymentAmount)} {event.originalPaymentMethod} payment</p></div><p className="mt-1 text-xs text-muted-foreground">{event.invoiceNumber} · {dateTime(event.occurredAt)}</p><p className="mt-2 text-sm"><span className="font-semibold">Reason:</span> {event.reason}</p></div>
    <p className="text-lg font-bold">−{money(event.amount)}</p>
  </div>;
}

function LedgerView({ patient, ledger, therapyStart, navigate }: { patient: ProductionPatient; ledger: PatientFinancialLedger; therapyStart?: string; navigate: (path: string) => void }) {
  return <div className="space-y-5">
    <button type="button" onClick={() => navigate('/app/financial-ledger')} className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} /> Back to Financial Ledger</button>
    <div className="rounded-2xl border bg-card p-5 sm:p-6">
      <p className="workspace-section-kicker">Patient financial ledger</p><h2 className="mt-1 text-xl font-bold">{patient.name}</h2><PatientContext patient={patient} therapyStart={therapyStart} />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-secondary/45 p-4"><p className="text-xs text-muted-foreground">Total Finalized Invoiced</p><p className="mt-1 text-xl font-bold">{money(ledger.totalFinalizedInvoiced)}</p></div>
        <div className="rounded-xl border border-border/70 bg-secondary/45 p-4"><p className="text-xs text-muted-foreground">Effective Paid</p><p className="mt-1 text-xl font-bold">{money(ledger.effectivePaid)}</p></div>
        <div className="rounded-xl border border-border/70 bg-secondary/45 p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="mt-1 text-xl font-bold">{money(ledger.outstanding)}</p></div>
      </div>
    </div>
    <section className="overflow-hidden rounded-2xl border bg-card"><div className="border-b p-5"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-primary/6 text-primary"><WalletCards size={17} /></span><h3 className="text-lg font-bold">Financial chronology</h3></div><p className="mt-2 text-sm text-muted-foreground">A complete history of invoices, payments and adjustments.</p></div><div className="divide-y">{ledger.events.map((event) => <EventCard key={event.id} event={event} navigate={navigate} />)}{!ledger.events.length && <div className="workspace-empty-state m-4 rounded-2xl p-6 text-center"><span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary/6 text-primary"><WalletCards size={20} /></span><h4 className="mt-4 text-base font-bold">No finalized financial history yet</h4><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Finalized invoices, effective payments and future adjustments for this patient will appear here when they exist.</p></div>}</div></section>
  </div>;
}

export function PatientFinancialLedgerPage() {
  const [location, setLocation] = useLocation();
  const patientId = location.startsWith('/app/financial-ledger/') ? decodeURIComponent(location.slice('/app/financial-ledger/'.length)) : '';
  const [patients, setPatients] = useState<ProductionPatient[]>([]);
  const [visits, setVisits] = useState<ProductionVisit[]>([]);
  const [search, setSearch] = useState('');
  const [ledger, setLedger] = useState<PatientFinancialLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([loadPatients(), loadVisits()])
      .then(([patientRows, visitRows]) => { if (active) { setPatients(patientRows); setVisits(visitRows); } })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load Patient directory.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!patientId) { setLedger(null); return; }
    let active = true;
    setLedger(null);
    setError(null);
    loadPatientFinancialLedger(patientId)
      .then((result) => { if (active) setLedger(result); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load financial ledger.'); });
    return () => { active = false; };
  }, [patientId]);

  const starts = useMemo(() => therapyStartByPatient(visits), [visits]);
  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    const source = term ? patients : patients.slice(0, 8);
    return source.filter((patient) => !term || [patient.name, patient.patientNumber].join(' ').toLowerCase().includes(term));
  }, [patients, search]);
  const patient = patientId ? patients.find((item) => item.id === patientId) ?? null : null;

  if (patientId) {
    return <div className="space-y-5">
      {error && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
      {!patient && !loading && !error && <div className="rounded-2xl border bg-card p-6"><button type="button" onClick={() => setLocation('/app/financial-ledger')} className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} /> Back to Financial Ledger</button><p className="mt-4 text-sm text-muted-foreground">Patient not found in this workspace.</p></div>}
      {patient && !ledger && !error && <div className="rounded-2xl border bg-card p-6 text-sm font-medium text-muted-foreground">Loading financial history…</div>}
      {patient && ledger && <LedgerView patient={patient} ledger={ledger} therapyStart={starts.get(patient.id)} navigate={setLocation} />}
    </div>;
  }

  return <div>
    <div className="mb-6"><p className="workspace-section-kicker">Patient billing</p><h1 className="mt-1 text-3xl font-bold tracking-[-.035em]">Financial Ledger</h1><p className="mt-2 text-sm text-muted-foreground">Choose a patient to review invoices, payments and adjustments in one place.</p></div>
    <div className="relative mb-4"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border bg-card pl-10 pr-10 text-sm" placeholder="Search by Patient name or record number…" />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={16} /></button>}</div>
    {error && <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
    {loading ? <div className="rounded-2xl border bg-card p-6 text-sm font-medium text-muted-foreground">Loading Patients…</div> : filteredPatients.length ? <div className="overflow-hidden rounded-2xl border bg-card divide-y">{filteredPatients.map((item) => <button key={item.id} type="button" onClick={() => setLocation(`/app/financial-ledger/${encodeURIComponent(item.id)}`)} className="w-full p-4 text-left transition hover:bg-secondary/50"><p className="font-bold">{item.name}</p><PatientContext patient={item} therapyStart={starts.get(item.id)} /></button>)}</div> : <div className="workspace-empty-state rounded-2xl p-7 text-center sm:p-9"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/6 text-primary"><WalletCards size={22} /></span><h2 className="mt-4 text-lg font-bold">{search.trim() ? 'No matching patients found' : 'No patients available for financial review yet'}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{search.trim() ? 'Try another patient name or record number.' : 'Patient financial histories will become available here when patient records and finalized financial activity exist.'}</p></div>}
    {!search.trim() && patients.length > 8 && <p className="mt-3 text-xs text-muted-foreground">Showing the first 8 Patients. Search by name or record number to find others.</p>}
  </div>;
}
