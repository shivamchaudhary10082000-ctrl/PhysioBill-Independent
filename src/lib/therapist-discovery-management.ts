import { getSupabaseClient } from '@/lib/supabase';
import {
  THERAPIST_SERVICE_MODES,
  type TherapistDiscoveryServiceArea,
  type TherapistServiceMode,
} from '@/lib/therapist-discovery';
import { resolveAuthenticatedPhysiotherapist } from '@/lib/workspace';

export type TherapistVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type TherapistDiscoveryManagementVerification = {
  status: TherapistVerificationStatus;
  requestedAt: string | null;
  verifiedQualification: string;
  verifiedRegistrationNumber: string;
  verifiedRegistrationAuthority: string;
};

export type TherapistDiscoveryCredentials = {
  qualification: string;
  registrationNumber: string;
  registrationAuthority: string;
};

export type TherapistDiscoveryDraft = {
  displayName: string;
  headline: string;
  bio: string;
  clinicName: string;
  isDiscoverable: boolean;
  serviceModes: TherapistServiceMode[];
  serviceAreas: TherapistDiscoveryServiceArea[];
};

export type TherapistDiscoveryManagementState = {
  draft: TherapistDiscoveryDraft;
  credentials: TherapistDiscoveryCredentials;
  verification: TherapistDiscoveryManagementVerification;
};

const safeText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const isVerificationStatus = (value: unknown): value is TherapistVerificationStatus =>
  value === 'unverified' || value === 'pending' || value === 'verified' || value === 'rejected';

const normalizeMode = (value: unknown): TherapistServiceMode | null =>
  typeof value === 'string' && THERAPIST_SERVICE_MODES.includes(value as TherapistServiceMode)
    ? (value as TherapistServiceMode)
    : null;

const normalizeArea = (value: Record<string, unknown>): TherapistDiscoveryServiceArea | null => {
  const locality = safeText(value.locality, 120);
  const city = safeText(value.city, 100);
  const state = safeText(value.state, 100);
  const countryCode = safeText(value.country_code, 2).toUpperCase();
  if (!locality || !city || !state || !/^[A-Z]{2}$/.test(countryCode)) return null;
  return { locality, city, state, country_code: countryCode };
};

export async function loadMyTherapistDiscoveryManagement(): Promise<TherapistDiscoveryManagementState> {
  try {
    const supabase = getSupabaseClient();
    const { physioId } = await resolveAuthenticatedPhysiotherapist();

    const [profileResult, modesResult, areasResult, credentialsResult, verificationResult] = await Promise.all([
      supabase
        .from('physiotherapist_discovery_profiles')
        .select('is_discoverable,display_name,headline,bio,clinic_name')
        .eq('physio_id', physioId)
        .maybeSingle(),
      supabase
        .from('physiotherapist_service_modes')
        .select('service_mode,is_enabled')
        .eq('physio_id', physioId),
      supabase
        .from('physiotherapist_service_areas')
        .select('locality,city,state,country_code,is_active')
        .eq('physio_id', physioId)
        .order('city', { ascending: true })
        .order('locality', { ascending: true }),
      supabase
        .from('physiotherapist_profiles')
        .select('qualification,registration,registration_authority')
        .eq('physio_id', physioId)
        .single(),
      supabase
        .from('physiotherapist_professional_verifications')
        .select('verification_status,requested_at,verified_qualification,verified_registration_number,verified_registration_authority')
        .eq('physio_id', physioId)
        .single(),
    ]);

    const error =
      profileResult.error ||
      modesResult.error ||
      areasResult.error ||
      credentialsResult.error ||
      verificationResult.error;
    if (error) throw error;

    const verificationStatus = verificationResult.data?.verification_status;
    if (!isVerificationStatus(verificationStatus)) {
      throw new Error('Unexpected professional verification state.');
    }

    const modes = (modesResult.data ?? [])
      .filter((row) => row.is_enabled === true)
      .map((row) => normalizeMode(row.service_mode))
      .filter((mode): mode is TherapistServiceMode => mode !== null);

    const serviceAreas = (areasResult.data ?? [])
      .filter((row) => row.is_active === true)
      .map((row) => normalizeArea(row as Record<string, unknown>))
      .filter((area): area is TherapistDiscoveryServiceArea => area !== null);

    const profile = profileResult.data;
    const credentials = credentialsResult.data;
    const verification = verificationResult.data;

    return {
      draft: {
        displayName: safeText(profile?.display_name, 120),
        headline: safeText(profile?.headline, 200),
        bio: safeText(profile?.bio, 2000),
        clinicName: safeText(profile?.clinic_name, 160),
        isDiscoverable: profile?.is_discoverable === true,
        serviceModes: Array.from(new Set(modes)),
        serviceAreas,
      },
      credentials: {
        qualification: safeText(credentials?.qualification, 200),
        registrationNumber: safeText(credentials?.registration, 200),
        registrationAuthority: safeText(credentials?.registration_authority, 200),
      },
      verification: {
        status: verificationStatus,
        requestedAt: typeof verification.requested_at === 'string' ? verification.requested_at : null,
        verifiedQualification: safeText(verification.verified_qualification, 200),
        verifiedRegistrationNumber: safeText(verification.verified_registration_number, 200),
        verifiedRegistrationAuthority: safeText(verification.verified_registration_authority, 200),
      },
    };
  } catch {
    throw new Error('Unable to load your therapist discovery profile right now.');
  }
}

export async function saveMyTherapistDiscoveryProfile(input: TherapistDiscoveryDraft): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('save_my_therapist_discovery_profile', {
      p_display_name: input.displayName.trim(),
      p_headline: input.headline.trim(),
      p_bio: input.bio.trim(),
      p_clinic_name: input.clinicName.trim(),
      p_is_discoverable: input.isDiscoverable,
      p_service_modes: input.serviceModes,
      p_service_areas: input.serviceAreas.map((area) => ({
        locality: area.locality.trim(),
        city: area.city.trim(),
        state: area.state.trim(),
        country_code: area.country_code.trim().toUpperCase() || 'IN',
      })),
    });

    if (error) throw error;
  } catch {
    throw new Error('Unable to save your discovery profile. Review the listing fields and try again.');
  }
}

export async function requestMyProfessionalVerification(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('request_my_professional_verification');
    if (error) throw error;
  } catch {
    throw new Error('Unable to submit your professional verification request right now.');
  }
}
