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
import {
  getVerifiedTherapistAvailabilityBatch,
  type TherapistAvailabilityByPhysio,
  type TherapistAvailabilityWindow,
} from '@/lib/therapist-availability';
import {
  THERAPIST_SERVICE_MODE_LABELS,
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

function formatAvailability(window: TherapistAvailabilityWindow) {
  const start = new Date(window.startsAt);
  const end = new Date(window.endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';

  try {
    const date = new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeZone: window.timezoneName,
    }).format(start);
    const time = new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: window.timezoneName,
    });
    return `${date} · ${time.format(start)}–${time.format(end)}`;
  } catch {
    return '';
  }
}

function LoadingCards() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-label="Loading verified physiotherapists">
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
}: {
  therapist: VerifiedTherapistDiscoveryResult;
  availability: TherapistAvailabilityWindow[];
  availabilityLoading: boolean;
  availabilityUnavailable: boolean;
}) {
  const [requestingWindowId, setRequestingWindowId] = useState<string | null>(null);
  const [requestedWindowIds, setRequestedWindowIds] = useState<Set<string>>(() => new Set());
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestNotice, setRequestNotice] = useState<string | null>(null);
  const registration = [
    therapist.verified_registration_authority,
    therapist.verified_registration_number,
  ].filter(Boolean);

  const requestWindow = async (availabilityWindowId: string) => {
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
        setRequestError('A professional session cannot create a patient appointment request. Sign out before continuing as a patient.');
        return;
      }

      await requestPatientAppointment(availabilityWindowId);
      setRequestedWindowIds((current) => {
        const next = new Set(current);
        next.add(availabilityWindowId);
        return next;
      });
      setRequestNotice('Request sent. The physiotherapist must accept it before the time is scheduled.');
    } catch {
      setRequestError('This time could not be requested. It may already be requested or no longer be available.');
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
            <CheckCircle2 size={13} /> Verified professional
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
              <Building2 size={15} /> {therapist.clinic_name}
            </p>
          )}
        </div>
      )}

      {therapist.bio && <p className="mt-5 text-sm leading-6 text-muted-foreground">{therapist.bio}</p>}

      {registration.length > 0 && (
        <div className="mt-5 flex items-start gap-3 border-t pt-5">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-success" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Verified registration</p>
            <p className="mt-1 text-sm font-medium">{registration.join(' · ')}</p>
          </div>
        </div>
      )}

      {therapist.service_modes.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-muted-foreground">Services</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {therapist.service_modes.map((mode) => (
              <span key={mode} className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-foreground">
                {THERAPIST_SERVICE_MODE_LABELS[mode]}
              </span>
            ))}
          </div>
        </div>
      )}

      {therapist.service_areas.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-muted-foreground">Service areas</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {therapist.service_areas.map((area) => (
              <div key={`${area.locality}-${area.city}-${area.state}`} className="flex items-center gap-2 rounded-xl bg-secondary/55 px-3 py-2.5 text-sm font-medium">
                <MapPin size={15} className="shrink-0 text-primary" />
                <span>{area.locality}, {area.city}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 border-t pt-5">
        <div className="flex items-center gap-2">
          <CalendarClock size={17} className="text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">Upcoming availability</p>
        </div>
        {availabilityLoading ? (
          <div className="mt-3 space-y-2" aria-label="Checking upcoming availability">
            <div className="skeleton h-9 w-full rounded-xl" />
            <div className="skeleton h-9 w-4/5 rounded-xl" />
          </div>
        ) : availabilityUnavailable ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Upcoming times could not be loaded right now. No availability is being assumed.</p>
        ) : availability.length > 0 ? (
          <div className="mt-3 space-y-2">
            {availability.map((window) => {
              const alreadyRequested = requestedWindowIds.has(window.id);
              return (
                <div key={window.id} className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{formatAvailability(window) || 'Upcoming time'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{THERAPIST_SERVICE_MODE_LABELS[window.serviceMode]} · {window.timezoneName}</p>
                    </div>
                    <button
                      type="button"
                      disabled={alreadyRequested || requestingWindowId === window.id}
                      onClick={() => void requestWindow(window.id)}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      <CalendarPlus size={15} />
                      {alreadyRequested ? 'Requested' : requestingWindowId === window.id ? 'Requesting…' : 'Request this time'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">No upcoming times are currently published for this care type.</p>
        )}
        {requestNotice && <p role="status" className="mt-3 rounded-xl border border-success/15 bg-success/7 px-3 py-2 text-xs font-medium text-success">{requestNotice}</p>}
        {requestError && <p role="alert" className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{requestError}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] leading-5 text-muted-foreground">A request is not confirmed until the physiotherapist accepts it. It creates no clinical or payment access.</p>
          <a href="/patient/appointments" className="text-xs font-semibold text-primary">My requests</a>
        </div>
      </div>
    </article>
  );
}

export function TherapistDiscoveryPage() {
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
        setError('We could not complete this search right now. Please retry.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query.city, query.locality, query.mode, retryKey]);

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
    if (!query.city) return 'Choose a city to begin.';
    const place = query.locality ? `${query.locality}, ${query.city}` : query.city;
    return `${THERAPIST_SERVICE_MODE_LABELS[query.mode]} · ${place}`;
  }, [query]);

  const searchHeading = useMemo(() => {
    if (!error && searchCompleted && query.city) {
      if (results.length > 0) return `Verified care options for ${query.city}.`;
      if (!hasMeaningfulSearchInteraction && zeroResultStage === 3) {
        return 'Not finding the right match yet?';
      }
      if (!hasMeaningfulSearchInteraction && zeroResultStage === 2) {
        return 'Still looking? Let’s try another approach.';
      }
      return 'Let’s broaden your search.';
    }

    return 'Find care that fits your location.';
  }, [error, searchCompleted, query.city, results.length, hasMeaningfulSearchInteraction, zeroResultStage]);

  const searchSupportingCopy = useMemo(() => {
    if (!error && searchCompleted && query.city && results.length === 0) {
      if (!hasMeaningfulSearchInteraction && zeroResultStage === 3) {
        return 'Widen the area or switch the type of care — we’ll keep the search simple.';
      }
      if (!hasMeaningfulSearchInteraction && zeroResultStage === 2) {
        return 'Try another area, city, or care type to widen your search.';
      }
      return 'Try another area, city, or care type to broaden your search.';
    }

    return 'Adjust the search anytime. Your choices stay in the URL so this page is easy to revisit.';
  }, [error, searchCompleted, query.city, results.length, hasMeaningfulSearchInteraction, zeroResultStage]);

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
          <a href="/" aria-label="Back to PhysioBill"><PhysioBillBrand /></a>
          <div className="flex items-center gap-2">
            <a href="/patient/appointments" className="hidden min-h-10 items-center rounded-xl border px-3 text-xs font-semibold sm:inline-flex">My requests</a>
            <a href="/professional/sign-in" className="inline-flex min-h-10 items-center rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/.14)] transition hover:bg-[hsl(var(--primary-hover))] sm:text-sm">Professional sign in</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <a href="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft size={16} /> Back to PhysioBill
        </a>

        <div className="mt-5 rounded-[28px] border border-border bg-card p-5 shadow-[0_16px_42px_hsl(var(--foreground)/.04)] sm:p-7">
          <div className="mb-5 border-b border-border/70 pb-5">
            <p className="text-sm font-semibold text-primary">Verified therapist search</p>
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
              <p className="text-sm font-semibold text-primary">Verified physiotherapists</p>
              <h2 className="mt-1 text-2xl font-bold tracking-[-.025em]">
                {!query.city
                  ? 'Start with your city'
                  : searchCompleted && results.length === 0
                    ? `No verified matches in ${query.city} yet`
                    : `Care options for ${query.city}`}
              </h2>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{searchSummary}</p>
          </div>

          {loading ? (
            <LoadingCards />
          ) : error ? (
            <div className="rounded-[26px] border border-destructive/20 bg-card p-7 text-center sm:p-10">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/8 text-destructive"><RefreshCw size={21} /></div>
              <h3 className="mt-4 text-xl font-bold">Search temporarily unavailable</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{error}</p>
              <button type="button" onClick={() => setRetryKey((current) => current + 1)} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[hsl(var(--primary-hover))]">
                <RefreshCw size={16} /> Retry search
              </button>
            </div>
          ) : !query.city ? (
            <div className="rounded-[26px] border bg-card p-7 text-center sm:p-10">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/7 text-primary"><MapPin size={22} /></div>
              <h3 className="mt-4 text-xl font-bold">Enter a city to search</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Choose a service and city above. Area is optional.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-[30px] border bg-card p-7 text-center shadow-[0_14px_38px_hsl(var(--foreground)/.035)] sm:p-12">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/10 bg-primary/6 text-primary"><Stethoscope size={24} /></div>
              <p className="mt-5 text-sm font-semibold text-primary">Search completed</p>
              <h3 className="mx-auto mt-2 max-w-xl text-2xl font-bold tracking-[-.025em]">No verified physiotherapists are listed for this search yet.</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Try broadening the location or changing the type of physiotherapy care.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => focusSearchField('discovery-locality')} className="rounded-full border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-secondary">Edit area</button>
                <button type="button" onClick={() => focusSearchField('discovery-city')} className="rounded-full border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-secondary">Try another city</button>
                <button type="button" onClick={() => focusSearchField('discovery-service')} className="rounded-full border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-secondary">Change service type</button>
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
                />
              ))}
            </div>
          )}
        </section>

        {showSearchHelper && query.city && searchCompleted && results.length === 0 && !loading && !error && (
          <aside className="page-enter mt-6 flex flex-col gap-4 rounded-2xl border border-primary/10 bg-[hsl(var(--primary-soft))] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" aria-label="Search help">
            <div>
              <p className="text-sm font-bold text-foreground">Want to broaden your search?</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">You can adjust the same location and service controls above.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => focusSearchField('discovery-locality')} className="rounded-full border border-primary/12 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary">Edit area</button>
              <button type="button" onClick={() => focusSearchField('discovery-city')} className="rounded-full border border-primary/12 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary">Try another city</button>
              <button type="button" onClick={() => focusSearchField('discovery-service')} className="rounded-full border border-primary/12 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary">Change service type</button>
              <button type="button" onClick={() => setShowSearchHelper(false)} aria-label="Dismiss search help" className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground"><X size={15} /></button>
            </div>
          </aside>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
