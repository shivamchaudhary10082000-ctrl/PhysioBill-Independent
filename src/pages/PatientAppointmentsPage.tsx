import { useEffect, useState } from 'react';
import { CalendarClock, CalendarPlus, CircleAlert, RefreshCw, X } from 'lucide-react';
import {
  cancelMyAppointmentRequest,
  loadMyPatientAppointmentRequests,
  requestPatientAppointmentReschedule,
  type PatientAppointmentRequest,
} from '@/lib/appointments';
import {
  getVerifiedTherapistAvailability,
  type TherapistAvailabilityWindow,
} from '@/lib/therapist-availability';
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

function formatAvailability(option: TherapistAvailabilityWindow) {
  const start = new Date(option.startsAt);
  const end = new Date(option.endsAt);
  try {
    const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: option.timezoneName }).format(start);
    const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: option.timezoneName });
    return `${date} · ${time.format(start)}–${time.format(end)}`;
  } catch {
    return `${start.toLocaleString()}–${end.toLocaleTimeString()}`;
  }
}

function isFuture(request: PatientAppointmentRequest) {
  return new Date(request.startsAt).getTime() > Date.now();
}

export function PatientAppointmentsPage() {
  const [requests, setRequests] = useState<PatientAppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rescheduleForId, setRescheduleForId] = useState<string | null>(null);
  const [rescheduleLoadingId, setRescheduleLoadingId] = useState<string | null>(null);
  const [rescheduleOptions, setRescheduleOptions] = useState<Record<string, TherapistAvailabilityWindow[]>>({});

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

  const cancel = async (request: PatientAppointmentRequest) => {
    if (request.status === 'accepted') {
      const confirmed = window.confirm('Cancel this accepted appointment? The original appointment will remain in scheduling history, and the slot will not reopen automatically.');
      if (!confirmed) return;
    }

    setBusyId(request.id);
    setError(null);
    setNotice(null);
    try {
      await cancelMyAppointmentRequest(request.id);
      await reload();
      setNotice(request.status === 'accepted' ? 'Appointment cancelled. Its original scheduling record remains in your history.' : 'Appointment request cancelled.');
    } catch {
      setError('This appointment could not be cancelled. It may already be resolved, cancelled, or past its scheduled start time.');
    } finally {
      setBusyId(null);
    }
  };

  const openReschedule = async (request: PatientAppointmentRequest) => {
    if (rescheduleForId === request.id) {
      setRescheduleForId(null);
      return;
    }

    setError(null);
    setNotice(null);
    setRescheduleForId(request.id);
    setRescheduleLoadingId(request.id);
    try {
      const options = await getVerifiedTherapistAvailability(request.physioId, request.serviceMode, 6);
      const differentTimes = options.filter(
        (option) => option.startsAt !== request.startsAt || option.endsAt !== request.endsAt,
      );
      setRescheduleOptions((current) => ({ ...current, [request.id]: differentTimes }));
    } catch {
      setRescheduleOptions((current) => ({ ...current, [request.id]: [] }));
      setError('Replacement times could not be loaded right now. Your existing appointment has not been changed.');
    } finally {
      setRescheduleLoadingId(null);
    }
  };

  const reschedule = async (request: PatientAppointmentRequest, option: TherapistAvailabilityWindow) => {
    const confirmed = window.confirm(`Request ${formatAvailability(option)} instead? Your current accepted appointment will be cancelled only if this replacement request is created successfully.`);
    if (!confirmed) return;

    setBusyId(request.id);
    setError(null);
    setNotice(null);
    try {
      await requestPatientAppointmentReschedule(request.id, option.id);
      await reload();
      setRescheduleForId(null);
      setNotice('Reschedule request sent. The original accepted appointment was preserved in history and cancelled; the new time now awaits therapist acceptance.');
    } catch {
      setError('This replacement time could not be requested. Your existing appointment was not changed unless it had already been cancelled earlier.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border border-primary/14 bg-[hsl(var(--primary-soft))] px-5 py-7 sm:px-7 sm:py-8">
        <p className="workspace-section-kicker">Patient scheduling</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Your appointment requests</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Accepted future appointments can be cancelled or rescheduled here. Rescheduling creates a new linked request and never rewrites the original accepted time.</p>
      </section>

      {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-success/15 bg-success/7 p-3 text-sm text-success">{notice}</div>}

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
          {requests.map((request) => {
            const future = isFuture(request);
            const canCancel = request.status === 'requested' || (request.status === 'accepted' && future);
            const canReschedule = future && (request.status === 'accepted' || (request.status === 'cancelled' && request.respondedAt !== null));
            const options = rescheduleOptions[request.id] ?? [];

            return (
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

                {(canCancel || canReschedule) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canCancel && (
                      <button type="button" disabled={busyId === request.id} onClick={() => void cancel(request)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-destructive/15 px-3 text-sm font-semibold text-destructive disabled:opacity-60"><X size={15} /> {busyId === request.id ? 'Working…' : request.status === 'accepted' ? 'Cancel appointment' : 'Cancel request'}</button>
                    )}
                    {canReschedule && (
                      <button type="button" disabled={busyId === request.id || rescheduleLoadingId === request.id} onClick={() => void openReschedule(request)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/15 px-3 text-sm font-semibold text-primary disabled:opacity-60"><CalendarPlus size={15} /> {rescheduleLoadingId === request.id ? 'Loading times…' : rescheduleForId === request.id ? 'Hide times' : 'Reschedule'}</button>
                    )}
                  </div>
                )}

                {rescheduleForId === request.id && (
                  <div className="mt-4 rounded-xl border border-primary/10 bg-primary/5 p-3">
                    <p className="text-sm font-semibold">Choose another published time</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Only the same verified physiotherapist and service type can replace this appointment. Your current accepted appointment is cancelled only when a valid replacement request is created.</p>
                    {rescheduleLoadingId === request.id ? (
                      <div className="mt-3 space-y-2"><div className="skeleton h-10 rounded-xl" /><div className="skeleton h-10 rounded-xl" /></div>
                    ) : options.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">No different future times are currently published. Your existing scheduling record has not been changed.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {options.map((option) => (
                          <button key={option.id} type="button" disabled={busyId === request.id} onClick={() => void reschedule(request, option)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2 text-left text-sm font-semibold hover:bg-secondary disabled:opacity-60">
                            <span>{formatAvailability(option)}</span>
                            <span className="shrink-0 text-xs text-primary">Request</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {request.status === 'cancelled' && request.respondedAt === null && future && (
                  <div className="mt-4 rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground">
                    <p>This pending request was cancelled before acceptance. Choose any new published time as a fresh request.</p>
                    <a href="/find-physio" className="mt-2 inline-flex font-semibold text-primary">Find another time</a>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-warning/15 bg-warning/5 p-4 text-sm leading-6 text-muted-foreground"><CircleAlert size={18} className="mt-0.5 shrink-0 text-warning" /><p>Scheduling cancellation or rescheduling grants no therapist chart, clinical, invoice, payment or account-linkage access. Those remain separate database-controlled workflows.</p></div>
    </div>
  );
}
