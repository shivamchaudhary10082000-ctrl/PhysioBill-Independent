import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, FileText } from 'lucide-react';
import { ClinicalRecordPage } from '@/Components/ClinicalRecordPage';
import { loadPatients, type ProductionPatient } from '@/lib/patients';
import { loadVisits, type ProductionVisit } from '@/lib/visits';

function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

export function ClinicalRecordsGateway({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname);
  const [patients, setPatients] = useState<ProductionPatient[]>([]);
  const [visits, setVisits] = useState<ProductionVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onLocation = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onLocation);
    return () => window.removeEventListener('popstate', onLocation);
  }, []);

  const isClinicalRoute = path === '/app/clinical-records' || path.startsWith('/app/clinical-records/');

  useEffect(() => {
    if (!isClinicalRoute) return;
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([loadPatients(), loadVisits()])
      .then(([loadedPatients, loadedVisits]) => {
        if (!active) return;
        setPatients(loadedPatients);
        setVisits(loadedVisits);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load clinical records.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isClinicalRoute, path]);

  const visitId = path.startsWith('/app/clinical-records/') ? decodeURIComponent(path.slice('/app/clinical-records/'.length)) : '';
  const selectedVisit = visits.find((visit) => visit.id === visitId) ?? null;
  const selectedPatient = selectedVisit ? patients.find((patient) => patient.id === selectedVisit.patientId) ?? null : null;
  const patientVisits = useMemo(
    () => selectedPatient ? visits.filter((visit) => visit.patientId === selectedPatient.id) : [],
    [selectedPatient, visits],
  );

  if (!isClinicalRoute) {
    return <>
      {children}
      {path.startsWith('/app/visits') && <button type="button" onClick={() => navigate('/app/clinical-records')} className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-lg"><FileText size={17} /> Clinical records</button>}
    </>;
  }

  if (loading) return <div className="min-h-screen bg-background p-6"><div className="mx-auto max-w-6xl rounded-2xl border bg-card p-6 text-sm font-semibold text-muted-foreground">Loading clinical records…</div></div>;

  if (error) return <div className="min-h-screen bg-background p-6"><div className="mx-auto max-w-6xl"><button type="button" onClick={() => navigate('/app/visits')} className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"><ArrowLeft size={16} /> Back to visits</button><div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div></div></div>;

  if (selectedVisit && selectedPatient) {
    return <div className="min-h-screen bg-background"><main className="mx-auto max-w-[1420px] px-4 py-6 sm:px-7 lg:px-10"><ClinicalRecordPage patient={selectedPatient} visit={selectedVisit} patientVisits={patientVisits} onBack={() => navigate('/app/clinical-records')} /></main></div>;
  }

  return <div className="min-h-screen bg-background"><main className="mx-auto max-w-[1420px] px-4 py-6 sm:px-7 lg:px-10">
    <button type="button" onClick={() => navigate('/app/visits')} className="mb-5 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"><ArrowLeft size={16} /> Back to visits</button>
    <div className="mb-6 rounded-[24px] bg-primary px-6 py-7 text-primary-foreground"><p className="text-[10px] font-extrabold uppercase tracking-[.16em]">Phase 3 · Clinical records</p><h1 className="mt-2 text-3xl font-extrabold">Patient → Visit → Clinical Record</h1><p className="mt-2 max-w-2xl text-sm text-primary-foreground/75">Choose an existing real Visit. Each record is persisted in Supabase and remains linked to that Visit for longitudinal review.</p></div>
    <div className="overflow-hidden rounded-2xl border bg-card divide-y">
      {visits.slice().sort((a, b) => b.date.localeCompare(a.date)).map((visit) => {
        const patient = patients.find((item) => item.id === visit.patientId);
        return <div key={visit.id} className="grid gap-3 p-5 md:grid-cols-[1fr_1.3fr_1.5fr_.8fr_auto] md:items-center"><div><p className="font-extrabold">{visit.visitNumber}</p><p className="text-xs text-muted-foreground">{dateLabel(visit.date)}</p></div><div><p className="font-semibold">{patient?.name ?? 'Patient'}</p><p className="text-xs text-muted-foreground">{patient?.patientNumber ?? ''}</p></div><p className="text-sm">{visit.treatment}</p><p className="text-xs text-muted-foreground">{patient?.clinicalCategory || patient?.condition || '—'}</p><button type="button" onClick={() => navigate(`/app/clinical-records/${encodeURIComponent(visit.id)}`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-3.5 py-2.5 text-sm font-semibold text-secondary-foreground"><ClipboardList size={15} /> Open record</button></div>;
      })}
      {!visits.length && <div className="p-6 text-sm text-muted-foreground">No visits recorded yet. Create a Visit first.</div>}
    </div>
  </main></div>;
}
