import { useEffect, useState } from 'react';
import { CalendarClock, CalendarPlus, CircleAlert, Link2, MapPin, RefreshCw, X } from 'lucide-react';
import {
  cancelMyAppointmentRequest,
  loadMyAppointmentClinicalLinkageStatus,
  loadMyPatientAppointmentRequests,
  requestClinicalLinkFromAcceptedAppointment,
  requestPatientAppointmentReschedule,
  type AppointmentClinicalLinkageStatus,
  type PatientAppointmentRequest,
} from '@/lib/appointments';
import {
  loadMyHomeVisitServiceLocations,
  requestHomeVisitAppointmentReschedule,
  type HomeVisitServiceLocationSnapshot,
} from '@/lib/home-visit-service-location';
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

function indexLinkage(items: AppointmentClinicalLinkageStatus[]) {
  return Object.fromEntries(items.map((item) => [item.appointmentRequestId, item]));
}

function indexServiceLocations(items: HomeVisitServiceLocationSnapshot[]) {
  return Object.fromEntries(items.map((item) => [item.appointmentRequestId, item]));
}

const actionFocusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function PatientAppointmentsPage() {
  const [requests, setRequests] = useState<PatientAppointmentRequest[]>([]);
  const [linkageByAppointment, setLinkageByAppointment] = useState<Record<string, AppointmentClinicalLinkageStatus>>({});
  const [serviceLocations, setServiceLocations] = useState<Record<string, HomeVisitServiceLocationSnapshot>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rescheduleForId, setRescheduleForId] = useState<string | null>(null);
  const [rescheduleLoadingId, setRescheduleLoadingId] = useState<string | null>(null);
  const [rescheduleOptions, setRescheduleOptions] = useState<Record<string, TherapistAvailabilityWindow[]>>({});

  const reload = async () => {
    setError(null);
    const [loaded, linkage, locations] = await Promise.all([
      loadMyPatientAppointmentRequests(),
      loadMyAppointmentClinicalLinkageStatus(),
      loadMyHomeVisitServiceLocations(),
    ]);
    setRequests(loaded);
    setLinkageByAppointment(indexLinkage(linkage));
    setServiceLocations(indexServiceLocations(locations));
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      loadMyPatientAppointmentRequests(),
      loadMyAppointmentClinicalLinkageStatus(),
      loadMyHomeVisitServiceLocations(),
    ])
      .then(([loaded, linkage, locations]) => {
        if (!active) return;
        setRequests(loaded);
        setLinkageByAppointment(indexLinkage(linkage));
        setServiceLocations(indexServiceLocations(locations));
      })
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

  const requestClinicalConnection = async (request: PatientAppointmentRequest) => {
    const confirmed = window.confirm('Request a clinical connection with this physiotherapist? This only asks the therapist to link your platform identity to a therapist-owned clinical chart. It does not itself create a chart, expose clinical records, or grant invoice/payment access.');
    if (!confirmed) return;

    setBusyId(request.id);
    setError(null);
    setNotice(null);
    try {
      await requestClinicalLinkFromAcceptedAppointment(request.id);
      await reload();
      setNotice('Clinical connection requested. No clinical chart or record is shared unless the physiotherapist deliberately accepts the separate linkage request.');
    } catch {
      setError('The clinical connection request could not be created. The appointment and all clinical/financial access remain unchanged.');
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
    const homeVisit = request.serviceMode === 'home_visit';
    const confirmed = window.confirm(
      homeVisit
        ? `Request ${formatAvailability(option)} instead? PhysioBill will revalidate the same therapist service area and create a fresh immutable coarse-area snapshot with the replacement. Your current accepted appointment is cancelled only if the whole replacement transaction succeeds.`
        : `Request ${formatAvailability(option)} instead? Your current accepted appointment will be cancelled only if this replacement request is created successfully.`,
    );
    if (!confirmed) return;

    setBusyId(request.id);
    setError(null);
    setNotice(null);
    try {
      if (homeVisit) {
        await requestHomeVisitAppointmentReschedule(request.id, option.id);
      } else {
        await requestPatientAppointmentReschedule(request.id, option.id);
      }
      await reload();
      setRescheduleForId(null);
      setNotice(
        homeVisit
          ? 'Home-visit reschedule requested. The replacement carries a fresh immutable coarse service-area snapshot; the original scheduling record remains in history and is cancelled only as part of the same successful transaction.'
          : 'Reschedule request sent. The original accepted appointment was preserved in history and cancelled; the new time now awaits therapist acceptance.',
      );
    } catch {
      setError(
        homeVisit
          ? 'This home-visit replacement could not be requested. If the previously declared therapist service area is no longer active, choose a fresh home-visit booking instead. The existing appointment remains unchanged unless it had already been cancelled earlier.'
          : 'This replacement time could not be requested. Your existing appointment was not changed unless it had already been cancelled earlier.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const pageBusy = loading || busyId !== null || rescheduleLoadingId !== null;

  return (
    <div className="space-y-6" aria-busy={pageBusy}>
      <section className="rounded-[26px] border border-primary/14 bg-[hsl(var(--primary-soft))] px-5 py-7 sm:px-7 sm:py-8">
        <p className="workspace-section-kicker">Patient scheduling</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Your appointment requests</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Accepted future appointments can be cancelled or rescheduled here. Rescheduling creates a new linked request and never rewrites the original accepted time.</p>
      </section>

      {error && <div role="alert" aria-live="assertive" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {notice && <div role="status" aria-live="polite" className="rounded-xl border border-success/15 bg-success/7 p-3 text-sm text-success">{notice}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href="/find-physio" className={`inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground ${actionFocusClass}`}>Find a physiotherapist</a>
        <button type="button" onClick={() => void reload()} disabled={pageBusy} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${actionFocusClass}`}><RefreshCw size={15} aria-hidden="true" /> Refresh</button>
      </div>

      {loading ? (
        <div role="status" aria-live="polite" className="space-y-3"><span className="sr-only">Loading appointment requests…</span><div className="skeleton h-36 rounded-2xl" /><div className="skeleton h-36 rounded-2xl" /></div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">You have no appointment requests yet.</div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const future = isFuture(request);
            const canCancel = request.status === 'requested' || (request.status === 'accepted' && future);
            const canReschedule = future && (request.status === 'accepted' || (request.status === 'cancelled' && request.respondedAt !== null));
            const options = rescheduleOptions[request.id] ?? [];
            const linkage = linkageByAppointment[request.id];
            const serviceLocation = serviceLocations[request.id];
            const canRequestClinicalConnection = request.status === 'accepted' && linkage?.linkStatus !== 'linked' && linkage?.requestStatus !== 'pending';
            const reschedulePanelId = `appointment-reschedule-${request.id}`;

            return (
              <article key={request.id} className="rounded-2xl border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/.03)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary">{STATUS_LABELS[request.status]}</p>
                    <h2 className="mt-1 break-words text-lg font-bold">{request.therapistDisplayName}</h2>
                    {request.therapistClinicName && <p className="mt-0.5 break-words text-sm text-muted-foreground">{request.therapistClinicName}</p>}
                  </div>
                  <span className="w-fit rounded-full border bg-secondary/55 px-3 py-1 text-xs font-semibold">{THERAPIST_SERVICE_MODE_LABELS[request.serviceMode]}</span>
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/45 px-3 py-3 text-sm font-medium"><CalendarClock size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" /><span>{formatWindow(request)}</span></div>

                {request.serviceMode === 'home_visit' && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-3 text-sm">
                    <MapPin size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="font-semibold">Declared home-visit service area</p>
                      <p className="mt-1 break-words text-muted-foreground">{serviceLocation ? `${serviceLocation.locality}, ${serviceLocation.city}, ${serviceLocation.state} · ${serviceLocation.countryCode}` : 'No coarse service-area snapshot is available for this scheduling record.'}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Scheduling evidence only. This is not an exact address, GPS/attendance proof, identity evidence, clinical access, treatment evidence, invoice authority, or payment proof.</p>
                    </div>
                  </div>
                )}

                {request.status === 'accepted' && (
                  <div className="mt-4 rounded-xl border border-primary/10 bg-primary/5 p-3">
                    <p className="text-sm font-semibold">Clinical connection</p>
                    {linkage?.linkStatus === 'linked' ? (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Connected to a therapist-owned clinical chart through the separate consent/linkage workflow.</p>
                    ) : linkage?.requestStatus === 'pending' ? (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Request sent. The therapist still has to deliberately accept linkage to one of their own clinical charts.</p>
                    ) : (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">An accepted appointment does not create a clinical chart. You may separately request a clinical connection with this therapist.</p>
                    )}
                    {canRequestClinicalConnection && (
                      <button type="button" disabled={busyId === request.id} aria-busy={busyId === request.id} onClick={() => void requestClinicalConnection(request)} className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/15 px-3 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60 ${actionFocusClass}`}><Link2 size={15} aria-hidden="true" /> {busyId === request.id ? 'Working…' : 'Request clinical connection'}</button>
                    )}
                  </div>
                )}

                {(canCancel || canReschedule) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canCancel && (
                      <button type="button" disabled={busyId === request.id} aria-busy={busyId === request.id} onClick={() => void cancel(request)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-destructive/15 px-3 py-2 text-sm font-semibold text-destructive disabled:cursor-not-allowed disabled:opacity-60 ${actionFocusClass}`}><X size={15} aria-hidden="true" /> {busyId === request.id ? 'Working…' : request.status === 'accepted' ? 'Cancel appointment' : 'Cancel request'}</button>
                    )}
                    {canReschedule && (
                      <button type="button" disabled={busyId === request.id || rescheduleLoadingId === request.id} aria-expanded={rescheduleForId === request.id} aria-controls={reschedulePanelId} aria-busy={rescheduleLoadingId === request.id} onClick={() => void openReschedule(request)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/15 px-3 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60 ${actionFocusClass}`}><CalendarPlus size={15} aria-hidden="true" /> {rescheduleLoadingId === request.id ? 'Loading times…' : rescheduleForId === request.id ? 'Hide times' : 'Reschedule'}</button>
                    )}
                  </div>
                )}

                {rescheduleForId === request.id && (
                  <div id={reschedulePanelId} className="mt-4 rounded-xl border border-primary/10 bg-primary/5 p-3">
                    <p className="text-sm font-semibold">Choose another published time</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {request.serviceMode === 'home_visit'
                        ? 'Only the same verified physiotherapist and home-visit service type can replace this appointment. The previously declared coarse therapist service area must still be active; PhysioBill creates a fresh immutable snapshot and cancels the current appointment only if the entire transaction succeeds.'
                        : 'Only the same verified physiotherapist and service type can replace this appointment. Your current accepted appointment is cancelled only when a valid replacement request is created.'}
                    </p>
                    {rescheduleLoadingId === request.id ? (
                      <div role="status" aria-live="polite" className="mt-3 space-y-2"><span className="sr-only">Loading replacement appointment times…</span><div className="skeleton h-11 rounded-xl" /><div className="skeleton h-11 rounded-xl" /></div>
                    ) : options.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">No different future times are currently published. Your existing scheduling record has not been changed.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {options.map((option) => (
                          <button key={option.id} type="button" disabled={busyId === request.id} onClick={() => void reschedule(request, option)} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2 text-left text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 ${actionFocusClass}`}>
                            <span className="min-w-0 break-words">{formatAvailability(option)}</span>
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
                    <a href="/find-physio" className={`mt-2 inline-flex min-h-11 items-center rounded-lg px-1 font-semibold text-primary ${actionFocusClass}`}>Find another time</a>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-warning/15 bg-warning/5 p-4 text-sm leading-6 text-muted-foreground"><CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" /><p>Scheduling cancellation or rescheduling grants no therapist chart, clinical, invoice, payment or account-linkage access. A patient-triggered clinical connection remains a separate database-controlled consent workflow.</p></div>
    </div>
  );
}
