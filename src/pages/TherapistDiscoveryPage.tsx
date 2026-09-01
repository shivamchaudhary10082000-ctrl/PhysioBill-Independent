import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { PublicFooter } from '@/Components/PublicFooter';
import { PublicTherapistSearch } from '@/Components/PublicTherapistSearch';
import { requestPatientAppointment } from '@/lib/appointments';
import { getAuthSession, resolveAuthenticatedSessionPersona } from '@/lib/auth';
import { requestHomeVisitAppointment } from '@/lib/home-visit-service-location';
import {
  detectPublicTherapistDiscoveryLocale,
  publicTherapistDiscoveryCopy,
  type PublicTherapistDiscoveryCopy,
} from '@/lib/public-therapist-discovery-locale';
import {
  getVerifiedTherapistAvailabilityBatch,
  type TherapistAvailabilityByPhysio,
  type TherapistAvailabilityWindow,
} from '@/lib/therapist-availability';
import {
  normalizeTherapistServiceMode,
  searchVerifiedTherapists,
  type TherapistServiceMode,
  type VerifiedTherapistDiscoveryResult,
} from '@/lib/therapist-discovery';

type DiscoveryQuery = {
  city: string;
  locality: string;
  mode: TherapistServiceMode;
};

type ZeroResultStage = 1 | 2 | 3;

type DiscoveryLocale = ReturnType<typeof detectPublicTherapistDiscoveryLocale>;

function readDiscoveryQuery(): DiscoveryQuery {
  const params = new URLSearchParams(window.location.search);
  return {
    city: (params.get('city') ?? '').trim(),
    locality: (params.get('locality') ?? '').trim(),
    mode: normalizeTherapistServiceMode(params.get('mode')),
  };
}

function therapistInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'PT'
  );
}

function formatAvailability(window: TherapistAvailabilityWindow, locale: DiscoveryLocale) {
  const start = new Date(window.startsAt);
  const end = new Date(window.endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';

  try {
    const date = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeZone: window.timezoneName,
    }).format(start);
    const time = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: window.timezoneName,
    });
    return `${date} · ${time.format(start)}–${time.format(end)}`;
  } catch {
    return '';
  }
}

function LoadingCards({ copy }: { copy: PublicTherapistDiscoveryCopy }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-label={copy.loadingVerifiedPhysiotherapists}>
      {[0, 1].map((item) => (
        <div key={item} className="rounded-[26px] border bg-card p-5 sm:p-6">
          <div className="flex gap-4">
            <div className="skeleton size-14 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-4 w-1/3 rounded-full" />
              <div className="skeleton h-6 w-2/3 rounded-full" />
              <div className="skeleton h-4 w-1/2 rounded-full" />
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="skeleton h-3 w-full rounded-full" />
            <div className="skeleton h-3 w-5/6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TherapistCard({
  therapist,
  availability,
  availabilityLoading,
  availabilityUnavailable,
  locale,
  copy,
}: {
  therapist: VerifiedTherapistDiscoveryResult;
  availability: TherapistAvailabilityWindow[];
  availabilityLoading: boolean;
  availabilityUnavailable: boolean;
  locale: DiscoveryLocale;
  copy: PublicTherapistDiscoveryCopy;
}) {
  const [requestingWindowId, setRequestingWindowId] = useState<string | null>(null);
  const [requestedWindowIds, setRequestedWindowIds] = useState<Set<string>>(() => new Set());
  const [selectedServiceAreaId, setSelectedServiceAreaId] = useState<string>('');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestNotice, setRequestNotice] = useState<string | null>(null);
  const registration = [
    therapist.verified_registration_authority,
    therapist.verified_registration_number,
  ].filter(Boolean);
  const hasHomeVisitAvailability = availability.some((window) => window.serviceMode === 'home_visit');

  const requestWindow = async (availabilityWindowId: string, serviceMode: TherapistServiceMode) => {
    if (serviceMode === 'home_visit' && !selectedServiceAreaId) {
      setRequestNotice(null);
      setRequestError(copy.chooseAreaError);
      return;
    }

    setRequestingWindowId(availabilityWindowId);
    setRequestError(null);
    setRequestNotice(null);
    try {
      const auth = await getAuthSession();
      if (!auth.user) {
        const returnTo = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/patient/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      const role = await resolveAuthenticatedSessionPersona();
      if (role !== 'patient') {
        setRequestError(copy.professionalPersonaError);
        return;
      }

      if (serviceMode === 'home_visit') {
        await requestHomeVisitAppointment(availabilityWindowId, selectedServiceAreaId);
      } else {
        await requestPatientAppointment(availabilityWindowId);
      }

      setRequestedWindowIds((current) => {
        const next = new Set(current);
        next.add(availabilityWindowId);
        return next;
      });
      setRequestNotice(
        serviceMode === 'home_visit' ? copy.homeVisitRequestSent : copy.appointmentRequestSent,
      );
    } catch {
      setRequestError(copy.requestFailed);
    } finally {
      setRequestingWindowId(null);
    }
  };

  return (
    <article className="page-enter rounded-[26px] border border-border bg-card p-5 shadow-[0_14px_38px_hsl(var(--foreground)/.04)] sm:p-6">
      <div className="flex items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-primary/12 bg-primary/7 text-sm font-semibold text-primary">
          {therapistInitials(therapist.display_name)}
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/15 bg-success/8 px-2.5 py-1 text-[11px] font-semibold text-success">
            <CheckCircle2 size={13} aria-hidden="true" /> {copy.verifiedProfessional}
          </span>
          <h2 className="mt-2 text-xl font-bold tracking-[-.025em] sm:text-2xl">{therapist.display_name}</h2>
          {therapist.verified_qualification && (
            <p className="mt-1 text-sm font-medium text-muted-foreground">{therapist.verified_qualification}</p>
          )}
        </div>
      </div>

      {(therapist.headline || therapist.clinic_name) && (
        <div className="mt-5 rounded-2xl border border-border/70 bg-secondary/55 p-4">
          {therapist.headline && <p className="font-semibold leading-6">{therapist.headline}</p>}
          {therapist.clinic_name && (
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 size={15} aria-hidden="true" /> {therapist.clinic_name}
            </p>
          )}
        </div>
      )}

      {therapist.bio && <p className="mt-5 text-sm leading-6 text-muted-foreground">{therapist.bio}</p>}

      {registration.length > 0 && (
        <div className="mt-5 flex items-start gap-3 border-t pt-5">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground">{copy.verifiedRegistration}</p>
            <p className="mt-1 text-sm font-medium">{registration.join(' · ')}</p>
          </div>
        </div>
      )}

      {therapist.service_modes.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-muted-foreground">{copy.services}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {therapist.service_modes.map((mode) => (
              <span key={mode} className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-foreground">
                {copy.serviceModeLabels[mode]}
              </span>
            ))}
          </div>
        </div>
      )}

      {therapist.service_areas.length > 0 && (
        <fieldset className="mt-5">
          <legend className="text-xs font-semibold text-muted-foreground">
            {hasHomeVisitAvailability ? copy.chooseHomeVisitServiceArea : copy.serviceAreas}
          </legend>
          {hasHomeVisitAvailability && (
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{copy.coarseLocationEvidence}</p>
          )}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {therapist.service_areas.map((area) => {
              const selected = selectedServiceAreaId === area.id;
              return hasHomeVisitAvailability ? (
                <label
                  key={area.id}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium outline-none transition focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${selected ? 'border-primary bg-primary/7' : 'border-border bg-secondary/55'}`}
                >
                  <input
                    type="radio"
                    name={`home-visit-service-area-${therapist.physio_id}`}
                    value={area.id}
                    checked={selected}
                    onChange={() => {
                      setSelectedServiceAreaId(area.id);
                      setRequestError(null);
                    }}
                    className="size-4"
                  />
                  <MapPin size={15} className="shrink-0 text-primary" aria-hidden="true" />
                  <span>{area.locality}, {area.city}</span>
                </label>
              ) : (
                <div key={area.id} className="flex min-h-11 items-center gap-2 rounded-xl bg-secondary/55 px-3 py-2.5 text-sm font-medium">
                  <MapPin size={15} className="shrink-0 text-primary" aria-hidden="true" />
                  <span>{area.locality}, {area.city}</span>
                </div>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-5 border-t pt-5">
        <div className="flex items-center gap-2">
          <CalendarClock size={17} className="text-primary" aria-hidden="true" />
          <p className="text-xs font-semibold text-muted-foreground">{copy.upcomingAvailability}</p>
        </div>
        {availabilityLoading ? (
          <div className="mt-3 space-y-2" aria-label={copy.checkingAvailability}>
            <div className="skeleton h-9 w-full rounded-xl" />
            <div className="skeleton h-9 w-4/5 rounded-xl" />
          </div>
        ) : availabilityUnavailable ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.availabilityUnavailable}</p>
        ) : availability.length > 0 ? (
          <div className="mt-3 space-y-2">
            {availability.map((window) => {
              const alreadyRequested = requestedWindowIds.has(window.id);
              const homeVisitNeedsArea = window.serviceMode === 'home_visit' && !selectedServiceAreaId;
              return (
                <div key={window.id} className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{formatAvailability(window, locale) || copy.upcomingTime}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{copy.serviceModeLabels[window.serviceMode]} · {window.timezoneName}</p>
                    </div>
                    <button
                      type="button"
                      disabled={alreadyRequested || requestingWindowId === window.id || homeVisitNeedsArea}
                      onClick={() => void requestWindow(window.id, window.serviceMode)}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground outline-none transition hover:bg-[hsl(var(--primary-hover))] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CalendarPlus size={15} aria-hidden="true" />
                      {alreadyRequested
                        ? copy.requested
                        : requestingWindowId === window.id
                          ? copy.requesting
                          : homeVisitNeedsArea
                            ? copy.chooseAreaFirst
                            : copy.requestThisTime}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.noUpcomingTimes}</p>
        )}
        {requestNotice && <p role="status" className="mt-3 rounded-xl border border-success/15 bg-success/7 px-3 py-2 text-xs font-medium text-success">{requestNotice}</p>}
        {requestError && <p role="alert" className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{requestError}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] leading-5 text-muted-foreground">{copy.requestBoundary}</p>
          <a href="/patient/appointments" className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{copy.myRequests}</a>
        </div>
      </div>
    </article>
  );
}

export function TherapistDiscoveryPage() {
  const locale = useMemo(
    () => detectPublicTherapistDiscoveryLocale(typeof navigator === 'undefined' ? undefined : navigator.languages),
    [],
  );
  const copy = useMemo(() => publicTherapistDiscoveryCopy(locale), [locale]);
  const [query, setQuery] = useState<DiscoveryQuery>(() => readDiscoveryQuery());
  const [results, setResults] = useState<VerifiedTherapistDiscoveryResult[]>([]);
  const [availabilityByPhysio, setAvailabilityByPhysio] = useState<TherapistAvailabilityByPhysio>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityUnavailable, setAvailabilityUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [hasMeaningfulSearchInteraction, setHasMeaningfulSearchInteraction] = useState(false);
  const [zeroResultStage, setZeroResultStage] = useState<ZeroResultStage>(1);
  const [showSearchHelper, setShowSearchHelper] = useState(false);

  useEffect(() => {
    const syncFromHistory = () => setQuery(readDiscoveryQuery());
    window.addEventListener('popstate', syncFromHistory);
    return () => window.removeEventListener('popstate', syncFromHistory);
  }, []);

  useEffect(() => {
    setHasMeaningfulSearchInteraction(false);
    setZeroResultStage(1);
    setShowSearchHelper(false);
  }, [query.city, query.locality, query.mode]);

  useEffect(() => {
    let active = true;

    setAvailabilityByPhysio({});
    setAvailabilityLoading(false);
    setAvailabilityUnavailable(false);

    if (!query.city) {
      setResults([]);
      setLoading(false);
      setError(null);
      setSearchCompleted(false);
      setZeroResultStage(1);
      setShowSearchHelper(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);
    setSearchCompleted(false);
    setZeroResultStage(1);
    setShowSearchHelper(false);

    searchVerifiedTherapists({
      city: query.city,
      locality: query.locality,
      serviceMode: query.mode,
    })
      .then((found) => {
        if (!active) return;
        setResults(found);
        setSearchCompleted(true);

        if (!found.length) return;
        setAvailabilityLoading(true);
        void getVerifiedTherapistAvailabilityBatch(
          found.map((therapist) => therapist.physio_id),
          query.mode,
          3,
        )
          .then((availability) => {
            if (!active) return;
            setAvailabilityByPhysio(availability);
          })
          .catch(() => {
            if (!active) return;
            setAvailabilityByPhysio({});
            setAvailabilityUnavailable(true);
          })
          .finally(() => {
            if (active) setAvailabilityLoading(false);
          });
      })
      .catch(() => {
        if (!active) return;
        setResults([]);
        setAvailabilityByPhysio({});
        setAvailabilityLoading(false);
        setAvailabilityUnavailable(false);
        setSearchCompleted(false);
        setError(copy.searchUnavailable);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query.city, query.locality, query.mode, retryKey, copy.searchUnavailable]);

  useEffect(() => {
    if (
      hasMeaningfulSearchInteraction
      || !query.city
      || !searchCompleted
      || results.length > 0
      || loading
      || error
    ) return;

    const stageTwoTimer = window.setTimeout(() => setZeroResultStage(2), 10500);
    const stageThreeTimer = window.setTimeout(() => setZeroResultStage(3), 21000);

    return () => {
      window.clearTimeout(stageTwoTimer);
      window.clearTimeout(stageThreeTimer);
    };
  }, [hasMeaningfulSearchInteraction, query.city, searchCompleted, results.length, loading, error]);

  useEffect(() => {
    setShowSearchHelper(false);
    if (
      hasMeaningfulSearchInteraction
      || !query.city
      || !searchCompleted
      || results.length > 0
      || loading
      || error
    ) return;

    const timer = window.setTimeout(() => setShowSearchHelper(true), 25000);
    return () => window.clearTimeout(timer);
  }, [hasMeaningfulSearchInteraction, query.city, searchCompleted, results.length, loading, error]);

  const searchSummary = useMemo(() => {
    if (!query.city) return copy.chooseCityToBegin;
    const place = query.locality ? `${query.locality}, ${query.city}` : query.city;
    return `${copy.serviceModeLabels[query.mode]} · ${place}`;
  }, [query, copy]);

  const searchHeading = useMemo(() => {
    if (!error && searchCompleted && query.city) {
      if (results.length > 0) return copy.verifiedCareOptions(query.city);
      if (!hasMeaningfulSearchInteraction && zeroResultStage === 3) return copy.notFindingMatch;
      if (!hasMeaningfulSearchInteraction && zeroResultStage === 2) return copy.stillLooking;
      return copy.broadenSearchHeading;
    }

    return copy.findCareHeading;
  }, [error, searchCompleted, query.city, results.length, hasMeaningfulSearchInteraction, zeroResultStage, copy]);

  const searchSupportingCopy = useMemo(() => {
    if (!error && searchCompleted && query.city && results.length === 0) {
      if (!hasMeaningfulSearchInteraction && zeroResultStage === 3) return copy.widenSearch;
      return copy.tryAnotherSearch;
    }

    return copy.adjustSearchAnytime;
  }, [error, searchCompleted, query.city, results.length, hasMeaningfulSearchInteraction, zeroResultStage, copy]);

  const markSearchInteraction = () => {
    setHasMeaningfulSearchInteraction(true);
    setZeroResultStage(1);
    setShowSearchHelper(false);
  };

  const focusSearchField = (id: string) => {
    markSearchInteraction();
    document.getElementById(id)?.focus();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" aria-label={copy.backToPhysioBill}><PhysioBillBrand /></a>
          <div className="flex items-center gap-2">
            <a href="/patient/appointments" className="hidden min-h-10 items-center rounded-xl border px-3 text-xs font-semibold sm:inline-flex">{copy.myRequests}</a>
            <a href="/professional/sign-in" className="inline-flex min-h-10 items-center rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/.14)] transition hover:bg-[hsl(var(--primary-hover))] sm:text-sm">{copy.professionalSignIn}</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <a href="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft size={16} /> {copy.backToPhysioBill}
        </a>

        <div className="mt-5 rounded-[28px] border border-border bg-card p-5 shadow-[0_16px_42px_hsl(var(--foreground)/.04)] sm:p-7">
          <div className="mb-5 border-b border-border/70 pb-5">
            <p className="text-sm font-semibold text-primary">{copy.verifiedTherapistSearch}</p>
            <div key={searchHeading} className="page-enter">
              <h1 className="mt-2 text-3xl font-bold tracking-[-.035em] sm:text-4xl">{searchHeading}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{searchSupportingCopy}</p>
            </div>
          </div>
          <div onChangeCapture={markSearchInteraction}>
            <PublicTherapistSearch
              compact
              initialCity={query.city}
              initialLocality={query.locality}
              initialMode={query.mode}
            />
          </div>
        </div>

        <section className="mt-9" aria-live="polite">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">{copy.verifiedPhysiotherapists}</p>
              <h2 className="mt-1 text-2xl font-bold tracking-[-.025em]">
                {!query.city
                  ? copy.startWithCity
                  : searchCompleted && results.length === 0
                    ? copy.noVerifiedMatches(query.city)
                    : copy.careOptionsFor(query.city)}
              </h2>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{searchSummary}</p>
          </div>

          {loading ? (
            <LoadingCards copy={copy} />
          ) : error ? (
            <div className="rounded-[26px] border border-destructive/20 bg-card p-7 text-center sm:p-10">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/8 text-destructive"><RefreshCw size={21} /></div>
              <h3 className="mt-4 text-xl font-bold">{copy.searchUnavailable}</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{error}</p>
              <button type="button" onClick={() => setRetryKey((current) => current + 1)} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[hsl(var(--primary-hover))]">
                <RefreshCw size={16} /> {copy.retrySearch}
              </button>
            </div>
          ) : !query.city ? (
            <div className="rounded-[26px] border bg-card p-7 text-center sm:p-10">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/7 text-primary"><MapPin size={22} /></div>
              <h3 className="mt-4 text-xl font-bold">{copy.enterCityToSearch}</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{copy.chooseServiceAndCity}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-[30px] border bg-card p-7 text-center shadow-[0_14px_38px_hsl(var(--foreground)/.035)] sm:p-12">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/10 bg-primary/6 text-primary"><Stethoscope size={24} /></div>
              <p className="mt-5 text-sm font-semibold text-primary">{copy.searchCompleted}</p>
              <h3 className="mx-auto mt-2 max-w-xl text-2xl font-bold tracking-[-.025em]">{copy.noVerifiedPhysiotherapists}</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{copy.broadenLocationOrCare}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => focusSearchField('discovery-locality')} className="rounded-full border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-secondary">{copy.editArea}</button>
                <button type="button" onClick={() => focusSearchField('discovery-city')} className="rounded-full border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-secondary">{copy.tryAnotherCity}</button>
                <button type="button" onClick={() => focusSearchField('discovery-service')} className="rounded-full border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-secondary">{copy.changeServiceType}</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {results.map((therapist) => (
                <TherapistCard
                  key={therapist.physio_id}
                  therapist={therapist}
                  availability={availabilityByPhysio[therapist.physio_id] ?? []}
                  availabilityLoading={availabilityLoading}
                  availabilityUnavailable={availabilityUnavailable}
                  locale={locale}
                  copy={copy}
                />
              ))}
            </div>
          )}
        </section>

        {showSearchHelper && query.city && searchCompleted && results.length === 0 && !loading && !error && (
          <aside className="page-enter mt-6 flex flex-col gap-4 rounded-2xl border border-primary/10 bg-[hsl(var(--primary-soft))] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" aria-label={copy.wantBroadenSearch}>
            <div>
              <p className="text-sm font-bold text-foreground">{copy.wantBroadenSearch}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.adjustControls}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => focusSearchField('discovery-locality')} className="rounded-full border border-primary/12 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary">{copy.editArea}</button>
              <button type="button" onClick={() => focusSearchField('discovery-city')} className="rounded-full border border-primary/12 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary">{copy.tryAnotherCity}</button>
              <button type="button" onClick={() => focusSearchField('discovery-service')} className="rounded-full border border-primary/12 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary">{copy.changeServiceType}</button>
              <button type="button" onClick={() => setShowSearchHelper(false)} aria-label={copy.dismissSearchHelp} className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground"><X size={15} /></button>
            </div>
          </aside>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
