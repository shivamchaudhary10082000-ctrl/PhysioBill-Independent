import { useEffect, useState } from 'react';
import { CalendarClock, Check, Link2, MapPin, Plus, RefreshCw, X } from 'lucide-react';
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
import { createAndAcceptClinicalChartLinkRequest, type NewClinicalChartInput } from '@/lib/clinical-onboarding';
import { loadMyHomeVisitServiceLocations, type HomeVisitServiceLocationSnapshot } from '@/lib/home-visit-service-location';
import { DEFAULT_LOCALE, loadPreferredLocale, type SupportedLocale } from '@/lib/locale';
import { loadPatients, type ProductionPatient } from '@/lib/patients';
import { professionalAppointmentsMessage as msg } from '@/lib/professional-appointments-locale';

const EMPTY_NEW_CHART: NewClinicalChartInput = {
  name: '', phone: '', email: '', address: '', age: '', sex: '', occupation: '', clinicalCategory: '', condition: '', notes: '',
};

const ACTION_CLASS = 'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function statusLabel(locale: SupportedLocale, status: ProfessionalAppointmentRequest['status']) {
  const key = status === 'requested' ? 'statusRequested' : status === 'accepted' ? 'statusAccepted' : status === 'rejected' ? 'statusRejected' : 'statusCancelled';
  return msg(locale, key);
}

function serviceModeLabel(locale: SupportedLocale, mode: ProfessionalAppointmentRequest['serviceMode']) {
  if (locale === 'hi-IN') return mode === 'home_visit' ? 'होम विज़िट' : mode === 'telephysiotherapy' ? 'टेलीफिजियोथेरेपी' : 'क्लिनिक विज़िट';
  if (locale === 'gu-IN') return mode === 'home_visit' ? 'હોમ વિઝિટ' : mode === 'telephysiotherapy' ? 'ટેલિફિઝિયોથેરાપી' : 'ક્લિનિક વિઝિટ';
  return mode === 'home_visit' ? 'Home visit' : mode === 'telephysiotherapy' ? 'Telephysiotherapy' : 'Clinic visit';
}

function formatWindow(request: Pick<ProfessionalAppointmentRequest, 'startsAt' | 'endsAt' | 'timezoneName'>, locale: SupportedLocale) {
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

function isFuture(request: ProfessionalAppointmentRequest) {
  return new Date(request.startsAt).getTime() > Date.now();
}

function indexServiceLocations(items: HomeVisitServiceLocationSnapshot[]) {
  return Object.fromEntries(items.map((item) => [item.appointmentRequestId, item]));
}

export function ProfessionalAppointmentRequestsPage() {
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const [requests, setRequests] = useState<ProfessionalAppointmentRequest[]>([]);
  const [onboarding, setOnboarding] = useState<ProfessionalClinicalOnboardingRequest[]>([]);
  const [patients, setPatients] = useState<ProductionPatient[]>([]);
  const [serviceLocations, setServiceLocations] = useState<Record<string, HomeVisitServiceLocationSnapshot>>({});
  const [selectedChart, setSelectedChart] = useState<Record<string, string>>({});
  const [newChartFor, setNewChartFor] = useState<string | null>(null);
  const [newChart, setNewChart] = useState<NewClinicalChartInput>(EMPTY_NEW_CHART);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = async () => {
    setError(null);
    const [loaded, clinicalRequests, ownedPatients, locations] = await Promise.all([
      loadMyProfessionalAppointmentRequests(), loadMyProfessionalClinicalOnboardingRequests(), loadPatients(), loadMyHomeVisitServiceLocations(),
    ]);
    setRequests(loaded);
    setOnboarding(clinicalRequests);
    setPatients(ownedPatients);
    setServiceLocations(indexServiceLocations(locations));
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadPreferredLocale().then((preferred) => { if (active) setLocale(preferred); }).catch(() => {});
    Promise.all([
      loadMyProfessionalAppointmentRequests(), loadMyProfessionalClinicalOnboardingRequests(), loadPatients(), loadMyHomeVisitServiceLocations(),
    ])
      .then(([loaded, clinicalRequests, ownedPatients, locations]) => {
        if (!active) return;
        setRequests(loaded);
        setOnboarding(clinicalRequests);
        setPatients(ownedPatients);
        setServiceLocations(indexServiceLocations(locations));
      })
      .catch(() => { if (active) setError(msg(locale, 'loadError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const respond = async (requestId: string, decision: 'accepted' | 'rejected') => {
    setBusyId(requestId); setError(null); setNotice(null);
    try { await respondToAppointmentRequest(requestId, decision); await reload(); }
    catch { setError(msg(locale, 'resolveError')); }
    finally { setBusyId(null); }
  };

  const cancelAccepted = async (request: ProfessionalAppointmentRequest) => {
    if (!window.confirm(msg(locale, 'cancelConfirm'))) return;
    setBusyId(request.id); setError(null); setNotice(null);
    try { await cancelMyProfessionalAppointment(request.id); await reload(); }
    catch { setError(msg(locale, 'cancelError')); }
    finally { setBusyId(null); }
  };

  const acceptClinical = async (request: ProfessionalClinicalOnboardingRequest) => {
    const patientId = selectedChart[request.requestId];
    if (!patientId) { setError(msg(locale, 'chooseChartError')); return; }
    const chart = patients.find((patient) => patient.id === patientId);
    if (!chart) { setError(msg(locale, 'chartGoneError')); return; }
    if (!window.confirm(`${msg(locale, 'linkConfirmPrefix')} ${request.publicPatientId} → ${chart.patientNumber} — ${chart.name}? ${msg(locale, 'linkConfirmSuffix')}`)) return;
    setBusyId(request.requestId); setError(null); setNotice(null);
    try {
      await acceptClinicalChartLinkRequest(request.requestId, patientId); await reload();
      setNotice(msg(locale, 'linkSuccess'));
    } catch { setError(msg(locale, 'linkError')); }
    finally { setBusyId(null); }
  };

  const createNewClinicalChart = async (request: ProfessionalClinicalOnboardingRequest) => {
    if (!newChart.name?.trim()) { setError(msg(locale, 'nameRequired')); return; }
    if (!window.confirm(`${msg(locale, 'createConfirmPrefix')} ${request.publicPatientId} ${msg(locale, 'createConfirmSuffix')}`)) return;
    setBusyId(request.requestId); setError(null); setNotice(null);
    try {
      await createAndAcceptClinicalChartLinkRequest(request.requestId, newChart);
      setNewChartFor(null); setNewChart(EMPTY_NEW_CHART); await reload();
      setNotice(msg(locale, 'createSuccess'));
    } catch { setError(msg(locale, 'createError')); }
    finally { setBusyId(null); }
  };

  const rejectClinical = async (request: ProfessionalClinicalOnboardingRequest) => {
    setBusyId(request.requestId); setError(null); setNotice(null);
    try {
      await rejectClinicalChartLinkRequest(request.requestId, 'Therapist declined clinical-chart linkage.'); await reload();
      setNotice(msg(locale, 'rejectSuccess'));
    } catch { setError(msg(locale, 'rejectError')); }
    finally { setBusyId(null); }
  };

  const pendingOnboarding = onboarding.filter((item) => item.requestStatus === 'pending');
  const field = (key: 'patientName' | 'phone' | 'email' | 'age' | 'sex' | 'occupation' | 'clinicalCategory' | 'condition') => msg(locale, key);

  return (
    <div className="space-y-6" aria-busy={loading || busyId !== null}>
      <section className="rounded-[26px] border border-primary/14 bg-[hsl(var(--primary-soft))] px-5 py-7 sm:px-7 sm:py-8">
        <p className="workspace-section-kicker">{msg(locale, 'kicker')}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">{msg(locale, 'title')}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{msg(locale, 'intro')}</p>
      </section>

      {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {notice && <div role="status" aria-live="polite" className="rounded-xl border border-success/15 bg-success/7 p-3 text-sm text-success">{notice}</div>}
      <span className="sr-only" role="status" aria-live="polite">{loading ? msg(locale, 'loading') : busyId ? msg(locale, 'saving') : ''}</span>

      {!loading && pendingOnboarding.length > 0 && (
        <section className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <Link2 size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
            <div><h2 className="font-bold">{msg(locale, 'clinicalTitle')}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{msg(locale, 'clinicalIntro')}</p></div>
          </div>
          <div className="mt-4 space-y-3">
            {pendingOnboarding.map((request) => (
              <article key={request.requestId} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-bold break-all">{request.publicPatientId}</p><p className="mt-1 text-xs text-muted-foreground">{msg(locale, 'patientRequestedConnection')} · {formatWindow(request, locale)}</p></div>
                  <span className="rounded-full border bg-secondary/55 px-3 py-1 text-xs font-semibold">{serviceModeLabel(locale, request.serviceMode)}</span>
                </div>
                <label htmlFor={`chart-${request.requestId}`} className="mt-4 block text-xs font-semibold text-muted-foreground">{msg(locale, 'selectChart')}</label>
                <select id={`chart-${request.requestId}`} value={selectedChart[request.requestId] ?? ''} onChange={(event) => setSelectedChart((current) => ({ ...current, [request.requestId]: event.target.value }))} className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">{msg(locale, 'chooseDeliberately')}</option>
                  {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.patientNumber} — {patient.name}</option>)}
                </select>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={busyId === request.requestId || !selectedChart[request.requestId]} onClick={() => void acceptClinical(request)} className={`${ACTION_CLASS} bg-primary text-primary-foreground`}><Check size={15} aria-hidden="true" /> {msg(locale, 'linkSelected')}</button>
                  <button type="button" disabled={busyId === request.requestId} aria-expanded={newChartFor === request.requestId} aria-controls={`new-chart-${request.requestId}`} onClick={() => { setNewChartFor((current) => current === request.requestId ? null : request.requestId); setNewChart(EMPTY_NEW_CHART); setError(null); }} className={`${ACTION_CLASS} border`}><Plus size={15} aria-hidden="true" /> {msg(locale, 'createNewChart')}</button>
                  <button type="button" disabled={busyId === request.requestId} onClick={() => void rejectClinical(request)} className={`${ACTION_CLASS} border border-destructive/15 text-destructive`}><X size={15} aria-hidden="true" /> {msg(locale, 'rejectConnection')}</button>
                </div>
                {newChartFor === request.requestId && (
                  <div id={`new-chart-${request.requestId}`} className="mt-4 rounded-xl border bg-secondary/25 p-4">
                    <p className="text-sm font-bold">{msg(locale, 'newChartTitle')}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{msg(locale, 'newChartIntro')}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input aria-label={field('patientName')} placeholder={`${field('patientName')} *`} value={newChart.name ?? ''} onChange={(e) => setNewChart((v) => ({ ...v, name: e.target.value }))} className="min-h-11 rounded-xl border bg-background px-3 text-sm" />
                      <input aria-label={field('phone')} placeholder={field('phone')} value={newChart.phone ?? ''} onChange={(e) => setNewChart((v) => ({ ...v, phone: e.target.value }))} className="min-h-11 rounded-xl border bg-background px-3 text-sm" />
                      <input aria-label={field('email')} placeholder={field('email')} value={newChart.email ?? ''} onChange={(e) => setNewChart((v) => ({ ...v, email: e.target.value }))} className="min-h-11 rounded-xl border bg-background px-3 text-sm" />
                      <input aria-label={field('age')} placeholder={field('age')} value={newChart.age ?? ''} onChange={(e) => setNewChart((v) => ({ ...v, age: e.target.value }))} className="min-h-11 rounded-xl border bg-background px-3 text-sm" />
                      <input aria-label={field('sex')} placeholder={field('sex')} value={newChart.sex ?? ''} onChange={(e) => setNewChart((v) => ({ ...v, sex: e.target.value }))} className="min-h-11 rounded-xl border bg-background px-3 text-sm" />
                      <input aria-label={field('occupation')} placeholder={field('occupation')} value={newChart.occupation ?? ''} onChange={(e) => setNewChart((v) => ({ ...v, occupation: e.target.value }))} className="min-h-11 rounded-xl border bg-background px-3 text-sm" />
                      <input aria-label={field('clinicalCategory')} placeholder={field('clinicalCategory')} value={newChart.clinicalCategory ?? ''} onChange={(e) => setNewChart((v) => ({ ...v, clinicalCategory: e.target.value }))} className="min-h-11 rounded-xl border bg-background px-3 text-sm" />
                      <input aria-label={field('condition')} placeholder={field('condition')} value={newChart.condition ?? ''} onChange={(e) => setNewChart((v) => ({ ...v, condition: e.target.value }))} className="min-h-11 rounded-xl border bg-background px-3 text-sm" />
                    </div>
                    <textarea aria-label={msg(locale, 'address')} placeholder={msg(locale, 'address')} value={newChart.address ?? ''} onChange={(e) => setNewChart((v) => ({ ...v, address: e.target.value }))} className="mt-3 min-h-20 w-full rounded-xl border bg-background p-3 text-sm" />
                    <textarea aria-label={msg(locale, 'notes')} placeholder={msg(locale, 'notes')} value={newChart.notes ?? ''} onChange={(e) => setNewChart((v) => ({ ...v, notes: e.target.value }))} className="mt-3 min-h-20 w-full rounded-xl border bg-background p-3 text-sm" />
                    <button type="button" disabled={busyId === request.requestId || !newChart.name?.trim()} onClick={() => void createNewClinicalChart(request)} className={`${ACTION_CLASS} mt-3 bg-primary text-primary-foreground`}><Plus size={15} aria-hidden="true" /> {msg(locale, 'createAndAccept')}</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href="/app/availability" className={`${ACTION_CLASS} border`}>{msg(locale, 'manageAvailability')}</a>
        <button type="button" disabled={loading || busyId !== null} onClick={() => void reload()} className={`${ACTION_CLASS} border`}><RefreshCw size={15} aria-hidden="true" /> {msg(locale, 'refresh')}</button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-hidden="true"><div className="skeleton h-36 rounded-2xl" /><div className="skeleton h-36 rounded-2xl" /></div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">{msg(locale, 'empty')}</div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const serviceLocation = serviceLocations[request.id];
            return (
              <article key={request.id} className="rounded-2xl border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/.03)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0"><p className="text-xs font-semibold text-primary">{statusLabel(locale, request.status)}</p><h2 className="mt-1 break-all text-lg font-bold">{request.publicPatientId}</h2><p className="mt-1 text-xs text-muted-foreground">{msg(locale, 'platformPatientNote')}</p></div>
                  <span className="self-start rounded-full border bg-secondary/55 px-3 py-1 text-xs font-semibold">{serviceModeLabel(locale, request.serviceMode)}</span>
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/45 px-3 py-3 text-sm font-medium"><CalendarClock size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" /><span>{formatWindow(request, locale)}</span></div>
                {request.serviceMode === 'home_visit' && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-3 text-sm">
                    <MapPin size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="font-semibold">{msg(locale, 'homeAreaTitle')}</p>
                      <p className="mt-1 break-words text-muted-foreground">{serviceLocation ? `${serviceLocation.locality}, ${serviceLocation.city}, ${serviceLocation.state} · ${serviceLocation.countryCode}` : msg(locale, 'homeAreaMissing')}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{msg(locale, 'homeAreaDisclaimer')}</p>
                    </div>
                  </div>
                )}
                {request.status === 'requested' && <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busyId === request.id} onClick={() => void respond(request.id, 'accepted')} className={`${ACTION_CLASS} bg-primary text-primary-foreground`}><Check size={15} aria-hidden="true" /> {busyId === request.id ? msg(locale, 'saving') : msg(locale, 'accept')}</button><button type="button" disabled={busyId === request.id} onClick={() => void respond(request.id, 'rejected')} className={`${ACTION_CLASS} border border-destructive/15 text-destructive`}><X size={15} aria-hidden="true" /> {msg(locale, 'reject')}</button></div>}
                {request.status === 'accepted' && isFuture(request) && <button type="button" disabled={busyId === request.id} onClick={() => void cancelAccepted(request)} className={`${ACTION_CLASS} mt-4 border border-destructive/15 text-destructive`}><X size={15} aria-hidden="true" /> {busyId === request.id ? msg(locale, 'cancelling') : msg(locale, 'cancelAppointment')}</button>}
                {request.status === 'cancelled' && isFuture(request) && <p className="mt-4 rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground">{msg(locale, 'cancelledFutureNote')}</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
