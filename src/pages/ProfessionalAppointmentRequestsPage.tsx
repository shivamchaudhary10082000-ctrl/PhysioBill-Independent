import { useEffect, useState } from 'react';
import { CalendarClock, Check, RefreshCw, X } from 'lucide-react';
import {
  loadMyProfessionalAppointmentRequests,
  respondToAppointmentRequest,
  type ProfessionalAppointmentRequest,
} from '@/lib/appointments';
import { THERAPIST_SERVICE_MODE_LABELS } from '@/lib/therapist-discovery';

const STATUS_LABELS = {
  requested: 'Awaiting your response',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled by patient',
} as const;

function formatWindow(request: ProfessionalAppointmentRequest) {
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

export function ProfessionalAppointmentRequestsPage() {
  const [requests, setRequests] = useState<ProfessionalAppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setError(null);
    const loaded = await loadMyProfessionalAppointmentRequests();
    setRequests(loaded);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadMyProfessionalAppointmentRequests()
      .then((loaded) => { if (active) setRequests(loaded); })
      .catch(() => { if (active) setError('Unable to load appointment requests right now.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const respond = async (requestId: string, decision: 'accepted' | 'rejected') => {
    setBusyId(requestId);
    setError(null);
    try {
      await respondToAppointmentRequest(requestId, decision);
      await reload();
    } catch {
      setError('This request could not be resolved. Refresh the page; the slot or request state may have changed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border border-primary/14 bg-[hsl(var(--primary-soft))] px-5 py-7 sm:px-7 sm:py-8">
        <p className="workspace-section-kicker">Scheduling requests</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Patient appointment requests</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Accept or reject patient requests against the availability you published. Acceptance reserves scheduling state only and does not create a clinical chart, treatment episode, invoice or payment.</p>
      </section>

      {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

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
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
