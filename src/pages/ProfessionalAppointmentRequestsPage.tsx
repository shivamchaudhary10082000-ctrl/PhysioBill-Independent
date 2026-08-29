import { useEffect, useState } from 'react';
import { CalendarClock, Check, Link2, RefreshCw, X } from 'lucide-react';
import {
  acceptClinicalChartLinkRequest,
  cancelMyProfessionalAppointment,
  loadMyProfessionalAppointmentRequests,
  loadMyProfessionalClinicalOnboardingRequests,
  rejectClinicalChartLinkRequest,
  respondToAppointmentRequest,
  type ProfessionalAppointmentRequest,
  type ProfessionalClinicalOnboardingRequest,
} from '@/lib/appointments';
import { loadPatients, type ProductionPatient } from '@/lib/patients';
import { THERAPIST_SERVICE_MODE_LABELS } from '@/lib/therapist-discovery';

const STATUS_LABELS = {
  requested: 'Awaiting your response',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
} as const;

function formatWindow(request: Pick<ProfessionalAppointmentRequest, 'startsAt' | 'endsAt' | 'timezoneName'>) {
  const start = new Date(request.startsAt);
  const end = new Date(request.endsAt);
  try {
    const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: request.timezoneName }).format(start);
    const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: request.timezoneName });
    return `${date} · ${time.format(start)}–${time.format(end)}`;
  } catch {
    return `${start.toLocaleString()}–${end.toLocaleTimeString()}`;
  }
}

function isFuture(request: ProfessionalAppointmentRequest) {
  return new Date(request.startsAt).getTime() > Date.now();
}

export function ProfessionalAppointmentRequestsPage() {
  const [requests, setRequests] = useState<ProfessionalAppointmentRequest[]>([]);
  const [onboarding, setOnboarding] = useState<ProfessionalClinicalOnboardingRequest[]>([]);
  const [patients, setPatients] = useState<ProductionPatient[]>([]);
  const [selectedChart, setSelectedChart] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = async () => {
    setError(null);
    const [loaded, clinicalRequests, ownedPatients] = await Promise.all([
      loadMyProfessionalAppointmentRequests(),
      loadMyProfessionalClinicalOnboardingRequests(),
      loadPatients(),
    ]);
    setRequests(loaded);
    setOnboarding(clinicalRequests);
    setPatients(ownedPatients);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      loadMyProfessionalAppointmentRequests(),
      loadMyProfessionalClinicalOnboardingRequests(),
      loadPatients(),
    ])
      .then(([loaded, clinicalRequests, ownedPatients]) => {
        if (!active) return;
        setRequests(loaded);
        setOnboarding(clinicalRequests);
        setPatients(ownedPatients);
      })
      .catch(() => { if (active) setError('Unable to load scheduling or clinical connection requests right now.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const respond = async (requestId: string, decision: 'accepted' | 'rejected') => {
    setBusyId(requestId);
    setError(null);
    setNotice(null);
    try {
      await respondToAppointmentRequest(requestId, decision);
      await reload();
    } catch {
      setError('This request could not be resolved. Refresh the page; the slot or request state may have changed.');
    } finally {
      setBusyId(null);
    }
  };

  const cancelAccepted = async (request: ProfessionalAppointmentRequest) => {
    const confirmed = window.confirm('Cancel this accepted appointment? The original appointment will remain in scheduling history, and the slot will not be reopened automatically.');
    if (!confirmed) return;
    setBusyId(request.id);
    setError(null);
    setNotice(null);
    try {
      await cancelMyProfessionalAppointment(request.id);
      await reload();
    } catch {
      setError('This accepted appointment could not be cancelled. It may already be cancelled or past its scheduled start time.');
    } finally {
      setBusyId(null);
    }
  };

  const acceptClinical = async (request: ProfessionalClinicalOnboardingRequest) => {
    const patientId = selectedChart[request.requestId];
    if (!patientId) {
      setError('Choose the correct existing therapist-owned clinical chart first. Never guess or link by name alone.');
      return;
    }
    const chart = patients.find((patient) => patient.id === patientId);
    if (!chart) {
      setError('The selected clinical chart is no longer available. Refresh and choose again.');
      return;
    }
    const confirmed = window.confirm(`Link ${request.publicPatientId} to your clinical chart ${chart.patientNumber} — ${chart.name}? Only continue if you have verified that this is the same patient. This cannot be treated as an automatic identity match.`);
    if (!confirmed) return;

    setBusyId(request.requestId);
    setError(null);
    setNotice(null);
    try {
      await acceptClinicalChartLinkRequest(request.requestId, patientId);
      await reload();
      setNotice('Clinical connection accepted for the deliberately selected therapist-owned chart. Scheduling history remains separate.');
    } catch {
      setError('The clinical connection could not be accepted. No fallback or automatic chart match was performed.');
    } finally {
      setBusyId(null);
    }
  };

  const rejectClinical = async (request: ProfessionalClinicalOnboardingRequest) => {
    setBusyId(request.requestId);
    setError(null);
    setNotice(null);
    try {
      await rejectClinicalChartLinkRequest(request.requestId, 'Therapist declined clinical-chart linkage.');
      await reload();
      setNotice('Clinical connection request rejected. No chart or clinical access was created.');
    } catch {
      setError('The clinical connection request could not be rejected. Refresh and try again.');
    } finally {
      setBusyId(null);
    }
  };

  const pendingOnboarding = onboarding.filter((item) => item.requestStatus === 'pending');

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border border-primary/14 bg-[hsl(var(--primary-soft))] px-5 py-7 sm:px-7 sm:py-8">
        <p className="workspace-section-kicker">Scheduling requests</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Patient appointment requests</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Accept or reject scheduling independently. A separate patient-requested clinical connection may later be linked only to a deliberately selected chart that you own.</p>
      </section>

      {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-success/15 bg-success/7 p-3 text-sm text-success">{notice}</div>}

      {!loading && pendingOnboarding.length > 0 && (
        <section className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <Link2 size={19} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <h2 className="font-bold">Clinical connection requests</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">PAT identifies the platform patient, not your clinical chart. Link only after independently confirming the correct chart. If no correct chart exists, do not choose a different patient merely to proceed.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {pendingOnboarding.map((request) => (
              <article key={request.requestId} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{request.publicPatientId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Patient-requested connection · {formatWindow(request)}</p>
                  </div>
                  <span className="rounded-full border bg-secondary/55 px-3 py-1 text-xs font-semibold">{THERAPIST_SERVICE_MODE_LABELS[request.serviceMode]}</span>
                </div>
                <label className="mt-4 block text-xs font-semibold text-muted-foreground">Select the verified matching clinical chart</label>
                <select value={selectedChart[request.requestId] ?? ''} onChange={(event) => setSelectedChart((current) => ({ ...current, [request.requestId]: event.target.value }))} className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3 text-sm">
                  <option value="">Do not auto-match — choose deliberately</option>
                  {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.patientNumber} — {patient.name}</option>)}
                </select>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={busyId === request.requestId || !selectedChart[request.requestId]} onClick={() => void acceptClinical(request)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Check size={15} /> Link selected chart</button>
                  <button type="button" disabled={busyId === request.requestId} onClick={() => void rejectClinical(request)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-destructive/15 px-4 text-sm font-semibold text-destructive disabled:opacity-50"><X size={15} /> Reject connection</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between gap-3">
        <a href="/app/availability" className="inline-flex h-10 items-center rounded-xl border px-3 text-sm font-semibold">Manage availability</a>
        <button type="button" onClick={() => void reload()} className="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold"><RefreshCw size={15} /> Refresh</button>
      </div>

      {loading ? (
        <div className="space-y-3"><div className="skeleton h-36 rounded-2xl" /><div className="skeleton h-36 rounded-2xl" /></div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">No patient appointment requests are waiting here.</div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <article key={request.id} className="rounded-2xl border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/.03)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary">{STATUS_LABELS[request.status]}</p>
                  <h2 className="mt-1 text-lg font-bold">{request.publicPatientId}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Platform patient identifier · not a clinical chart identifier</p>
                </div>
                <span className="rounded-full border bg-secondary/55 px-3 py-1 text-xs font-semibold">{THERAPIST_SERVICE_MODE_LABELS[request.serviceMode]}</span>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/45 px-3 py-3 text-sm font-medium"><CalendarClock size={16} className="mt-0.5 shrink-0 text-primary" /><span>{formatWindow(request)}</span></div>
              {request.status === 'requested' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={busyId === request.id} onClick={() => void respond(request.id, 'accepted')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"><Check size={15} /> Accept</button>
                  <button type="button" disabled={busyId === request.id} onClick={() => void respond(request.id, 'rejected')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-destructive/15 px-4 text-sm font-semibold text-destructive disabled:opacity-60"><X size={15} /> Reject</button>
                </div>
              )}
              {request.status === 'accepted' && isFuture(request) && (
                <button type="button" disabled={busyId === request.id} onClick={() => void cancelAccepted(request)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-destructive/15 px-4 text-sm font-semibold text-destructive disabled:opacity-60"><X size={15} /> {busyId === request.id ? 'Cancelling…' : 'Cancel appointment'}</button>
              )}
              {request.status === 'cancelled' && isFuture(request) && (
                <p className="mt-4 rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground">This time remains cancelled. Publish availability deliberately if you want patients to request a replacement time.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
