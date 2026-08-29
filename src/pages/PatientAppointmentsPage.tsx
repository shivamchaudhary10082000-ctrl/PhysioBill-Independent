import { useEffect, useState } from 'react';
import { CalendarClock, CircleAlert, RefreshCw, X } from 'lucide-react';
import {
  cancelMyAppointmentRequest,
  loadMyPatientAppointmentRequests,
  type PatientAppointmentRequest,
} from '@/lib/appointments';
import { THERAPIST_SERVICE_MODE_LABELS } from '@/lib/therapist-discovery';

const STATUS_LABELS = {
  requested: 'Awaiting therapist',
  accepted: 'Accepted',
  rejected: 'Not accepted',
  cancelled: 'Cancelled',
} as const;

function formatWindow(request: PatientAppointmentRequest) {
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

export function PatientAppointmentsPage() {
  const [requests, setRequests] = useState<PatientAppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setError(null);
    const loaded = await loadMyPatientAppointmentRequests();
    setRequests(loaded);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadMyPatientAppointmentRequests()
      .then((loaded) => { if (active) setRequests(loaded); })
      .catch(() => { if (active) setError('Unable to load your appointment requests right now.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const cancel = async (requestId: string) => {
    setBusyId(requestId);
    setError(null);
    try {
      await cancelMyAppointmentRequest(requestId);
      await reload();
    } catch {
      setError('This request could not be cancelled. It may already have been resolved.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border border-primary/14 bg-[hsl(var(--primary-soft))] px-5 py-7 sm:px-7 sm:py-8">
        <p className="workspace-section-kicker">Patient scheduling</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Your appointment requests</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">A request is not a clinical record or payment. The physiotherapist must accept it before the time is treated as scheduled.</p>
      </section>

      {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <div className="flex items-center justify-between gap-3">
        <a href="/find-physio" className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Find a physiotherapist</a>
        <button type="button" onClick={() => void reload()} className="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold"><RefreshCw size={15} /> Refresh</button>
      </div>

      {loading ? (
        <div className="space-y-3"><div className="skeleton h-36 rounded-2xl" /><div className="skeleton h-36 rounded-2xl" /></div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">You have no appointment requests yet.</div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <article key={request.id} className="rounded-2xl border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/.03)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary">{STATUS_LABELS[request.status]}</p>
                  <h2 className="mt-1 text-lg font-bold">{request.therapistDisplayName}</h2>
                  {request.therapistClinicName && <p className="mt-0.5 text-sm text-muted-foreground">{request.therapistClinicName}</p>}
                </div>
                <span className="rounded-full border bg-secondary/55 px-3 py-1 text-xs font-semibold">{THERAPIST_SERVICE_MODE_LABELS[request.serviceMode]}</span>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/45 px-3 py-3 text-sm font-medium"><CalendarClock size={16} className="mt-0.5 shrink-0 text-primary" /><span>{formatWindow(request)}</span></div>
              {request.status === 'requested' && (
                <button type="button" disabled={busyId === request.id} onClick={() => void cancel(request.id)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-destructive/15 px-3 text-sm font-semibold text-destructive disabled:opacity-60"><X size={15} /> {busyId === request.id ? 'Cancelling…' : 'Cancel request'}</button>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-warning/15 bg-warning/5 p-4 text-sm leading-6 text-muted-foreground"><CircleAlert size={18} className="mt-0.5 shrink-0 text-warning" /><p>Accepted scheduling still grants no therapist chart, clinical, invoice, payment or account-linkage access. Those remain separate database-controlled workflows.</p></div>
    </div>
  );
}
