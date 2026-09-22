import { useMemo, useState } from 'react';
import { Building2, Home, MapPin, Search, Video } from 'lucide-react';
import {
  THERAPIST_SERVICE_MODES,
  normalizeTherapistServiceMode,
  type TherapistServiceMode,
} from '@/lib/therapist-discovery';
import { DEFAULT_LOCALE, type SupportedLocale } from '@/lib/locale';
import {
  detectPublicTherapistSearchLocale,
  publicTherapistSearchCopy,
} from '@/lib/public-therapist-search-locale';

type PublicTherapistSearchProps = {
  initialCity?: string;
  initialLocality?: string;
  initialMode?: TherapistServiceMode;
  compact?: boolean;
  locale?: SupportedLocale;
};

export function buildTherapistSearchUrl({
  city,
  locality,
  mode,
}: {
  city: string;
  locality: string;
  mode: TherapistServiceMode;
}) {
  const params = new URLSearchParams();
  params.set('city', city.trim());
  if (locality.trim()) params.set('locality', locality.trim());
  params.set('mode', normalizeTherapistServiceMode(mode));
  return `/find-physio?${params.toString()}`;
}

export function PublicTherapistSearch({
  initialCity = '',
  initialLocality = '',
  initialMode = 'home_visit',
  compact = false,
  locale,
}: PublicTherapistSearchProps) {
  const [city, setCity] = useState(initialCity);
  const [locality, setLocality] = useState(initialLocality);
  const [mode, setMode] = useState<TherapistServiceMode>(
    normalizeTherapistServiceMode(initialMode),
  );
  const [cityError, setCityError] = useState<string | null>(null);
  const resolvedLocale = useMemo<SupportedLocale>(() => {
    if (locale) return locale;
    if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
    return detectPublicTherapistSearchLocale(
      navigator.languages?.length ? navigator.languages : [navigator.language],
    );
  }, [locale]);
  const copy = useMemo(() => publicTherapistSearchCopy(resolvedLocale), [resolvedLocale]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCity = city.trim();

    if (!normalizedCity) {
      setCityError(copy.cityRequired);
      document.getElementById('discovery-city')?.focus();
      return;
    }

    setCityError(null);
    window.location.assign(
      buildTherapistSearchUrl({
        city: normalizedCity,
        locality,
        mode,
      }),
    );
  }

  const fieldClass =
    'h-14 w-full rounded-xl border border-input bg-card px-4 text-sm font-semibold text-foreground outline-none transition placeholder:font-medium placeholder:text-muted-foreground/60 hover:border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/10';

  const modeIcons: Record<TherapistServiceMode, typeof Home> = {
    home_visit: Home,
    clinic_visit: Building2,
    telephysiotherapy: Video,
  };

  return (
    <form
      onSubmit={submit}
      className={`grid gap-3 ${compact ? 'lg:grid-cols-[1fr_1fr_auto]' : 'lg:grid-cols-[1fr_1fr_auto]'}`}
    >
      <fieldset id="discovery-service" tabIndex={-1} className="min-w-0 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-primary/10 lg:col-span-3">
        <legend className="mb-2 text-xs font-bold text-muted-foreground">{copy.service}</legend>
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-secondary/65 p-1.5">
          {THERAPIST_SERVICE_MODES.map((serviceMode) => {
            const Icon = modeIcons[serviceMode];
            const active = mode === serviceMode;
            return (
              <button
                key={serviceMode}
                type="button"
                aria-pressed={active}
                onClick={() => setMode(serviceMode)}
                className={`inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-[13px] font-bold leading-tight transition sm:gap-2 sm:text-sm ${active ? 'bg-primary text-primary-foreground shadow-[0_7px_18px_hsl(var(--primary)/.22)]' : 'text-muted-foreground hover:bg-card hover:text-foreground'}`}
              >
                <Icon size={17} className="shrink-0" aria-hidden="true" />
                <span className="text-center">{copy.serviceModeLabels[serviceMode]}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-2 block text-xs font-bold text-muted-foreground">{copy.city}</span>
        <span className="relative block">
          <MapPin
            aria-hidden="true"
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-primary"
          />
          <input
            id="discovery-city"
            name="city"
            required
            autoComplete="address-level2"
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              if (cityError) setCityError(null);
            }}
            aria-invalid={Boolean(cityError)}
            aria-describedby={cityError ? 'discovery-city-error' : undefined}
            placeholder={copy.cityPlaceholder}
            className={`${fieldClass} pl-11`}
          />
        </span>
        {cityError && (
          <span id="discovery-city-error" role="alert" className="mt-1.5 block text-xs font-semibold text-destructive">
            {cityError}
          </span>
        )}
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-bold text-muted-foreground">
          {copy.area} <span className="font-normal text-muted-foreground/75">({copy.optional})</span>
        </span>
        <input
          id="discovery-locality"
          name="locality"
          autoComplete="address-level3"
          value={locality}
          onChange={(event) => setLocality(event.target.value)}
          placeholder={copy.areaPlaceholder}
          className={fieldClass}
        />
      </label>

      <div className="flex items-end">
        <button
          type="submit"
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_hsl(var(--primary)/.16)] transition hover:bg-[hsl(var(--primary-hover))] focus:outline-none focus:ring-4 focus:ring-primary/20 lg:min-w-[190px]"
        >
          <Search size={18} /> {copy.findPhysiotherapists}
        </button>
      </div>
    </form>
  );
}
