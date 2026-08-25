import { getSupabaseClient } from '@/lib/supabase';

export const THERAPIST_SERVICE_MODES = [
  'home_visit',
  'clinic_visit',
  'telephysiotherapy',
] as const;

export type TherapistServiceMode = (typeof THERAPIST_SERVICE_MODES)[number];

export const THERAPIST_SERVICE_MODE_LABELS: Record<TherapistServiceMode, string> = {
  home_visit: 'Home visit',
  clinic_visit: 'Clinic visit',
  telephysiotherapy: 'Telephysiotherapy',
};

export type TherapistDiscoveryServiceArea = {
  locality: string;
  city: string;
  state: string;
  country_code: string;
};

export type VerifiedTherapistDiscoveryResult = {
  physio_id: string;
  display_name: string;
  headline: string;
  bio: string;
  clinic_name: string;
  verified_qualification: string;
  verified_registration_authority: string;
  verified_registration_number: string;
  service_modes: TherapistServiceMode[];
  service_areas: TherapistDiscoveryServiceArea[];
  is_verified: true;
};

export type TherapistDiscoverySearch = {
  city: string;
  locality?: string;
  serviceMode: TherapistServiceMode;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const safeText = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

export function normalizeTherapistServiceMode(value: string | null | undefined): TherapistServiceMode {
  const normalized = value?.trim().toLowerCase();
  return THERAPIST_SERVICE_MODES.includes(normalized as TherapistServiceMode)
    ? (normalized as TherapistServiceMode)
    : 'home_visit';
}

function normalizeServiceModes(value: unknown): TherapistServiceMode[] {
  if (!Array.isArray(value)) return [];

  const modes = value.filter(
    (item): item is TherapistServiceMode =>
      typeof item === 'string' &&
      THERAPIST_SERVICE_MODES.includes(item as TherapistServiceMode),
  );

  return Array.from(new Set(modes));
}

function normalizeServiceAreas(value: unknown): TherapistDiscoveryServiceArea[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];

    const locality = safeText(item.locality, 120);
    const city = safeText(item.city, 100);
    const state = safeText(item.state, 100);
    const countryCode = safeText(item.country_code, 2).toUpperCase();

    if (!locality || !city || !state || !/^[A-Z]{2}$/.test(countryCode)) return [];

    return [
      {
        locality,
        city,
        state,
        country_code: countryCode,
      },
    ];
  });
}

function normalizeDiscoveryRow(value: unknown): VerifiedTherapistDiscoveryResult | null {
  if (!isRecord(value)) return null;

  const physioId = safeText(value.physio_id, 36);
  const displayName = safeText(value.display_name, 120);

  if (!UUID_PATTERN.test(physioId) || !displayName || value.is_verified !== true) return null;

  return {
    physio_id: physioId,
    display_name: displayName,
    headline: safeText(value.headline, 200),
    bio: safeText(value.bio, 2000),
    clinic_name: safeText(value.clinic_name, 160),
    verified_qualification: safeText(value.verified_qualification, 200),
    verified_registration_authority: safeText(value.verified_registration_authority, 200),
    verified_registration_number: safeText(value.verified_registration_number, 200),
    service_modes: normalizeServiceModes(value.service_modes),
    service_areas: normalizeServiceAreas(value.service_areas),
    is_verified: true,
  };
}

export async function searchVerifiedTherapists(
  search: TherapistDiscoverySearch,
): Promise<VerifiedTherapistDiscoveryResult[]> {
  const city = search.city.trim();
  const locality = search.locality?.trim() ?? '';
  const serviceMode = normalizeTherapistServiceMode(search.serviceMode);
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('search_verified_therapists', {
    p_city: city || null,
    p_locality: locality || null,
    p_service_mode: serviceMode,
  });

  if (error) {
    throw new Error('Unable to search verified physiotherapists right now.');
  }

  if (!Array.isArray(data)) {
    throw new Error('Unable to search verified physiotherapists right now.');
  }

  return data
    .map((row: unknown) => normalizeDiscoveryRow(row))
    .filter((row): row is VerifiedTherapistDiscoveryResult => row !== null);
}
