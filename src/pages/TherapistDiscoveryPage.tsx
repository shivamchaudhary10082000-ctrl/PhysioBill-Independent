import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { PublicTherapistSearch } from '@/Components/PublicTherapistSearch';
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

function TherapistCard({ therapist }: { therapist: VerifiedTherapistDiscoveryResult }) {
  const registration = [
    therapist.verified_registration_authority,
    therapist.verified_registration_number,
  ].filter(Boolean);

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
          <h2 className="mt-2 text-xl font-semibold tracking-[-.025em] sm:text-2xl">{therapist.display_name}</h2>
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
    </article>
  );
}

export function TherapistDiscoveryPage() {
  const [query, setQuery] = useState<DiscoveryQuery>(() => readDiscoveryQuery());
  const [results, setResults] = useState<VerifiedTherapistDiscoveryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const syncFromHistory = () => setQuery(readDiscoveryQuery());
    window.addEventListener('popstate', syncFromHistory);
    return () => window.removeEventListener('popstate', syncFromHistory);
  }, []);

  useEffect(() => {
    let active = true;

    if (!query.city) {
      setResults([]);
      setLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);

    searchVerifiedTherapists({
      city: query.city,
      locality: query.locality,
      serviceMode: query.mode,
    })
      .then((found) => {
        if (active) setResults(found);
      })
      .catch(() => {
        if (!active) return;
        setResults([]);
        setError('We could not complete this search right now. Please retry.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query.city, query.locality, query.mode, retryKey]);

  const searchSummary = useMemo(() => {
    if (!query.city) return 'Choose a city to begin.';
    const place = query.locality ? `${query.locality}, ${query.city}` : query.city;
    return `${THERAPIST_SERVICE_MODE_LABELS[query.mode]} · ${place}`;
  }, [query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" aria-label="Back to PhysioBill"><PhysioBillBrand /></a>
          <a href="/professional/sign-in" className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-secondary">Professional sign in</a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <a href="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft size={16} /> Back to PhysioBill
        </a>

        <div className="mt-5 rounded-[28px] border border-border bg-card p-5 shadow-[0_16px_42px_hsl(var(--foreground)/.04)] sm:p-7">
          <div className="mb-5 border-b border-border/70 pb-5">
            <p className="text-sm font-semibold text-primary">Verified therapist search</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Find care that fits your location.</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Adjust the search anytime. Your choices stay in the URL so this page is easy to revisit.</p>
          </div>
          <PublicTherapistSearch
            compact
            initialCity={query.city}
            initialLocality={query.locality}
            initialMode={query.mode}
          />
        </div>

        <section className="mt-9" aria-live="polite">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Verified physiotherapists</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-.025em]">{query.city ? `Care options for ${query.city}` : 'Start with your city'}</h2>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{searchSummary}</p>
          </div>

          {loading ? (
            <LoadingCards />
          ) : error ? (
            <div className="rounded-[26px] border border-destructive/20 bg-card p-7 text-center sm:p-10">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/8 text-destructive"><RefreshCw size={21} /></div>
              <h3 className="mt-4 text-xl font-semibold">Search temporarily unavailable</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{error}</p>
              <button type="button" onClick={() => setRetryKey((current) => current + 1)} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[hsl(var(--primary-hover))]">
                <RefreshCw size={16} /> Retry search
              </button>
            </div>
          ) : !query.city ? (
            <div className="rounded-[26px] border bg-card p-7 text-center sm:p-10">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/7 text-primary"><MapPin size={22} /></div>
              <h3 className="mt-4 text-xl font-semibold">Enter a city to search</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Choose a service and city above. Area is optional.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-[30px] border bg-card p-7 text-center shadow-[0_14px_38px_hsl(var(--foreground)/.035)] sm:p-12">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/10 bg-primary/6 text-primary"><Stethoscope size={24} /></div>
              <p className="mt-5 text-sm font-semibold text-primary">Search completed</p>
              <h3 className="mx-auto mt-2 max-w-xl text-2xl font-semibold tracking-[-.025em]">No verified physiotherapists are listed for this search yet.</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Try broadening the location or changing the type of physiotherapy care.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => document.getElementById('discovery-locality')?.focus()} className="rounded-full border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-secondary">Edit area</button>
                <button type="button" onClick={() => document.getElementById('discovery-city')?.focus()} className="rounded-full border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-secondary">Try another city</button>
                <button type="button" onClick={() => document.getElementById('discovery-service')?.focus()} className="rounded-full border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-secondary">Change service type</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {results.map((therapist) => <TherapistCard key={therapist.physio_id} therapist={therapist} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
