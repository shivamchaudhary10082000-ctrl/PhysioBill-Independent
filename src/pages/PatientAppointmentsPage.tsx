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
import { DEFAULT_LOCALE, loadPreferredLocale, type SupportedLocale } from '@/lib/locale';
import { patientAppointmentsMessage as msg } from '@/lib/patient-appointments-locale';
import {
  getVerifiedTherapistAvailability,
  type TherapistAvailabilityWindow,
} from '@/lib/therapist-availability';
import { THERAPIST_SERVICE_MODE_LABELS } from '@/lib/therapist-discovery';

function statusLabel(locale: SupportedLocale, status: PatientAppointmentRequest['status']) {
  const key = status === 'requested' ? 'statusRequested' : status === 'accepted' ? 'statusAccepted' : status === 'rejected' ? 'statusRejected' : 'statusCancelled';
  return msg(locale, key);
}

function formatWindow(request: PatientAppointmentRequest, locale: SupportedLocale) {
  const start = new Date(request.startsAt);
  const end = new Date(request.endsAt);
  try {
    const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: request.timezoneName }).format(start);
    const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: request.timezoneName });
    return `${date} · ${time.format(start)}–${time.format(end)}`;
  } catch {
    return `${start.toLocaleString(locale)}–${end.toLocaleTimeString(locale)}`;
  }
}

function formatAvailability(option: TherapistAvailabilityWindow, locale: SupportedLocale) {
  const start = new Date(option.startsAt);
  const end = new Date(option.endsAt);
  try {
    const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: option.timezoneName }).format(start);
    const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: option.timezoneName });
    return `${date} · ${time.format(start)}–${time.format(end)}`;
  } catch {
    return `${start.toLocaleString(locale)}–${end.toLocaleTimeString(locale)}`;
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
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
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
    void loadPreferredLocale().then((preferred) => { if (active) setLocale(preferred); }).catch(() => {});
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
      .catch(() => { if (active) setError(msg(locale, 'loadError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const cancel = async (request: PatientAppointmentRequest) => {
    if (request.status === 'accepted') {
      const confirmed = window.confirm(msg(locale, 'cancelConfirm'));
      if (!confirmed) return;
    }
    setBusyId(request.id);
    setError(null);
    setNotice(null);
    try {
      await cancelMyAppointmentRequest(request.id);
      await reload();
      setNotice(msg(locale, request.status === 'accepted' ? 'cancelledAcceptedNotice' : 'cancelledRequestNotice'));
    } catch {
      setError(msg(locale, 'cancelError'));
    } finally {
      setBusyId(null);
    }
  };

  const requestClinicalConnection = async (request: PatientAppointmentRequest) => {
    const confirmed = window.confirm(msg(locale, 'clinicalConfirm'));
    if (!confirmed) return;
    setBusyId(request.id);
    setError(null);
    setNotice(null);
    try {
      await requestClinicalLinkFromAcceptedAppointment(request.id);
      await reload();
      setNotice(msg(locale, 'clinicalRequestedNotice'));
    } catch {
      setError(msg(locale, 'clinicalError'));
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
      const differentTimes = options.filter((option) => option.startsAt !== request.startsAt || option.endsAt !== request.endsAt);
      setRescheduleOptions((current) => ({ ...current, [request.id]: differentTimes }));
    } catch {
      setRescheduleOptions((current) => ({ ...current, [request.id]: [] }));
      setError(msg(locale, 'replacementLoadError'));
    } finally {
      setRescheduleLoadingId(null);
    }
  };

  const reschedule = async (request: PatientAppointmentRequest, option: TherapistAvailabilityWindow) => {
    const homeVisit = request.serviceMode === 'home_visit';
    const confirmed = window.confirm(msg(locale, homeVisit ? 'homeRescheduleConfirm' : 'rescheduleConfirm', { time: formatAvailability(option, locale) }));
    if (!confirmed) return;
    setBusyId(request.id);
    setError(null);
    setNotice(null);
    try {
      if (homeVisit) await requestHomeVisitAppointmentReschedule(request.id, option.id);
      else await requestPatientAppointmentReschedule(request.id, option.id);
      await reload();
      setRescheduleForId(null);
      setNotice(msg(locale, homeVisit ? 'homeRescheduleNotice' : 'rescheduleNotice'));
    } catch {
      setError(msg(locale, homeVisit ? 'homeRescheduleError' : 'rescheduleError'));
    } finally {
      setBusyId(null);
    }
  };

  const pageBusy = loading || busyId !== null || rescheduleLoadingId !== null;

  return (
    <div className="space-y-6" aria-busy={pageBusy}>
      <section className="rounded-[26px] border border-primary/14 bg-[hsl(var(--primary-soft))] px-5 py-7 sm:px-7 sm:py-8">
        <p className="workspace-section-kicker">{msg(locale, 'eyebrow')}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">{msg(locale, 'title')}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{msg(locale, 'description')}</p>
      </section>
      {error && <div role="alert" aria-live="assertive" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {notice && <div role="status" aria-live="polite" className="rounded-xl border border-success/15 bg-success/7 p-3 text-sm text-success">{notice}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href="/find-physio" className={`inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground ${actionFocusClass}`}>{msg(locale, 'findPhysio')}</a>
        <button type="button" onClick={() => void reload()} disabled={pageBusy} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${actionFocusClass}`}><RefreshCw size={15} aria-hidden="true" /> {msg(locale, 'refresh')}</button>
      </div>
      {loading ? (
        <div role="status" aria-live="polite" className="space-y-3"><span className="sr-only">{msg(locale, 'loading')}</span><div className="skeleton h-36 rounded-2xl" /><div className="skeleton h-36 rounded-2xl" /></div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">{msg(locale, 'empty')}</div>
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
                  <div className="min-w-0"><p className="text-xs font-semibold text-primary">{statusLabel(locale, request.status)}</p><h2 className="mt-1 break-words text-lg font-bold">{request.therapistDisplayName}</h2>{request.therapistClinicName && <p className="mt-0.5 break-words text-sm text-muted-foreground">{request.therapistClinicName}</p>}</div>
                  <span className="w-fit rounded-full border bg-secondary/55 px-3 py-1 text-xs font-semibold">{THERAPIST_SERVICE_MODE_LABELS[request.serviceMode]}</span>
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/45 px-3 py-3 text-sm font-medium"><CalendarClock size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" /><span>{formatWindow(request, locale)}</span></div>
                {request.serviceMode === 'home_visit' && <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-3 text-sm"><MapPin size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" /><div className="min-w-0"><p className="font-semibold">{msg(locale, 'homeAreaTitle')}</p><p className="mt-1 break-words text-muted-foreground">{serviceLocation ? `${serviceLocation.locality}, ${serviceLocation.city}, ${serviceLocation.state} · ${serviceLocation.countryCode}` : msg(locale, 'homeAreaMissing')}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{msg(locale, 'homeAreaDisclaimer')}</p></div></div>}
                {request.status === 'accepted' && <div className="mt-4 rounded-xl border border-primary/10 bg-primary/5 p-3"><p className="text-sm font-semibold">{msg(locale, 'clinicalTitle')}</p>{linkage?.linkStatus === 'linked' ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{msg(locale, 'clinicalLinked')}</p> : linkage?.requestStatus === 'pending' ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{msg(locale, 'clinicalPending')}</p> : <p className="mt-1 text-xs leading-5 text-muted-foreground">{msg(locale, 'clinicalAvailable')}</p>}{canRequestClinicalConnection && <button type="button" disabled={busyId === request.id} aria-busy={busyId === request.id} onClick={() => void requestClinicalConnection(request)} className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/15 px-3 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60 ${actionFocusClass}`}><Link2 size={15} aria-hidden="true" /> {busyId === request.id ? msg(locale, 'working') : msg(locale, 'clinicalRequest')}</button>}</div>}
                {(canCancel || canReschedule) && <div className="mt-4 flex flex-wrap gap-2">{canCancel && <button type="button" disabled={busyId === request.id} aria-busy={busyId === request.id} onClick={() => void cancel(request)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-destructive/15 px-3 py-2 text-sm font-semibold text-destructive disabled:cursor-not-allowed disabled:opacity-60 ${actionFocusClass}`}><X size={15} aria-hidden="true" /> {busyId === request.id ? msg(locale, 'working') : msg(locale, request.status === 'accepted' ? 'cancelAppointment' : 'cancelRequest')}</button>}{canReschedule && <button type="button" disabled={busyId === request.id || rescheduleLoadingId === request.id} aria-expanded={rescheduleForId === request.id} aria-controls={reschedulePanelId} aria-busy={rescheduleLoadingId === request.id} onClick={() => void openReschedule(request)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/15 px-3 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60 ${actionFocusClass}`}><CalendarPlus size={15} aria-hidden="true" /> {rescheduleLoadingId === request.id ? msg(locale, 'loadingTimes') : rescheduleForId === request.id ? msg(locale, 'hideTimes') : msg(locale, 'reschedule')}</button>}</div>}
                {rescheduleForId === request.id && <div id={reschedulePanelId} className="mt-4 rounded-xl border border-primary/10 bg-primary/5 p-3"><p className="text-sm font-semibold">{msg(locale, 'chooseTime')}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{msg(locale, request.serviceMode === 'home_visit' ? 'homeRescheduleRule' : 'rescheduleRule')}</p>{rescheduleLoadingId === request.id ? <div role="status" aria-live="polite" className="mt-3 space-y-2"><span className="sr-only">{msg(locale, 'loadingTimes')}</span><div className="skeleton h-11 rounded-xl" /><div className="skeleton h-11 rounded-xl" /></div> : options.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{msg(locale, 'noTimes')}</p> : <div className="mt-3 space-y-2">{options.map((option) => <button key={option.id} type="button" disabled={busyId === request.id} onClick={() => void reschedule(request, option)} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2 text-left text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 ${actionFocusClass}`}><span className="min-w-0 break-words">{formatAvailability(option, locale)}</span><span className="shrink-0 text-xs text-primary">{msg(locale, 'request')}</span></button>)}</div>}</div>}
                {request.status === 'cancelled' && request.respondedAt === null && future && <div className="mt-4 rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground"><p>{msg(locale, 'freshRequest')}</p><a href="/find-physio" className={`mt-2 inline-flex min-h-11 items-center rounded-lg px-1 font-semibold text-primary ${actionFocusClass}`}>{msg(locale, 'findAnotherTime')}</a></div>}
              </article>
            );
          })}
        </div>
      )}
      <div className="flex items-start gap-3 rounded-2xl border border-warning/15 bg-warning/5 p-4 text-sm leading-6 text-muted-foreground"><CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" /><p>{msg(locale, 'safetyNotice')}</p></div>
    </div>
  );
}
