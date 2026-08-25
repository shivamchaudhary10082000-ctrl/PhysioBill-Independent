import { useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import {
  THERAPIST_SERVICE_MODE_LABELS,
  THERAPIST_SERVICE_MODES,
  normalizeTherapistServiceMode,
  type TherapistServiceMode,
} from '@/lib/therapist-discovery';

type PublicTherapistSearchProps = {
  initialCity?: string;
  initialLocality?: string;
  initialMode?: TherapistServiceMode;
  compact?: boolean;
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
}: PublicTherapistSearchProps) {
  const [city, setCity] = useState(initialCity);
  const [locality, setLocality] = useState(initialLocality);
  const [mode, setMode] = useState<TherapistServiceMode>(
    normalizeTherapistServiceMode(initialMode),
  );
  const [cityError, setCityError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCity = city.trim();

    if (!normalizedCity) {
      setCityError('Enter a city to continue.');
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
    'h-14 w-full rounded-2xl border border-input bg-card px-4 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground/60 hover:border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/10';

  return (
    <form
      onSubmit={submit}
      className={`grid gap-3 ${compact ? 'lg:grid-cols-[1.05fr_1fr_1fr_auto]' : 'lg:grid-cols-[1.05fr_1fr_1fr_auto]'}`}
    >
      <label className="block">
        <span className="mb-2 block text-xs font-semibold text-muted-foreground">Service</span>
        <select
          id="discovery-service"
          value={mode}
          onChange={(event) => setMode(normalizeTherapistServiceMode(event.target.value))}
          className={fieldClass}
        >
          {THERAPIST_SERVICE_MODES.map((serviceMode) => (
            <option key={serviceMode} value={serviceMode}>
              {THERAPIST_SERVICE_MODE_LABELS[serviceMode]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold text-muted-foreground">City</span>
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
            placeholder="Surat"
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
        <span className="mb-2 block text-xs font-semibold text-muted-foreground">
          Area <span className="font-normal text-muted-foreground/75">(optional)</span>
        </span>
        <input
          id="discovery-locality"
          name="locality"
          autoComplete="address-level3"
          value={locality}
          onChange={(event) => setLocality(event.target.value)}
          placeholder="Dindoli"
          className={fieldClass}
        />
      </label>

      <div className="flex items-end">
        <button
          type="submit"
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_hsl(var(--primary)/.16)] transition hover:bg-[hsl(var(--primary-hover))] focus:outline-none focus:ring-4 focus:ring-primary/20 lg:min-w-[190px]"
        >
          <Search size={18} /> Find physiotherapists
        </button>
      </div>
    </form>
  );
}
