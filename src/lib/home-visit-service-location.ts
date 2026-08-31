import { getSupabaseClient } from '@/lib/supabase';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type HomeVisitServiceLocationSnapshot = {
  appointmentRequestId: string;
  locality: string;
  city: string;
  state: string;
  countryCode: string;
  evidenceKind: 'patient_declared_service_area';
  evidenceStatus: 'coarse_declared';
  declaredAt: string;
};

function safeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function setMyHomeVisitServiceArea(
  appointmentRequestId: string,
  serviceAreaId: string,
): Promise<string> {
  if (!UUID_PATTERN.test(appointmentRequestId) || !UUID_PATTERN.test(serviceAreaId)) {
    throw new Error('The home-visit service-area selection is invalid.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('set_my_home_visit_service_area', {
    p_appointment_request_id: appointmentRequestId,
    p_service_area_id: serviceAreaId,
  });

  if (error) throw error;
  if (typeof data !== 'string' || !UUID_PATTERN.test(data)) {
    throw new Error('The home-visit service area could not be confirmed.');
  }

  return data;
}

export async function loadMyHomeVisitServiceLocations(): Promise<HomeVisitServiceLocationSnapshot[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_my_home_visit_service_locations');
  if (error || !Array.isArray(data)) {
    throw error ?? new Error('Unable to load home-visit service-area evidence.');
  }

  return data.flatMap((row: unknown) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return [];
    const record = row as Record<string, unknown>;
    const appointmentRequestId = safeText(record.appointment_request_id, 36);
    const locality = safeText(record.locality, 120);
    const city = safeText(record.city, 100);
    const state = safeText(record.state, 100);
    const countryCode = safeText(record.country_code, 2).toUpperCase();
    const evidenceKind = safeText(record.evidence_kind, 64);
    const evidenceStatus = safeText(record.evidence_status, 64);
    const declaredAtRaw = safeText(record.declared_at, 64);
    const declaredAt = new Date(declaredAtRaw);

    if (!UUID_PATTERN.test(appointmentRequestId)) return [];
    if (!locality || !city || !state || !/^[A-Z]{2}$/.test(countryCode)) return [];
    if (evidenceKind !== 'patient_declared_service_area' || evidenceStatus !== 'coarse_declared') return [];
    if (Number.isNaN(declaredAt.getTime())) return [];

    return [{
      appointmentRequestId,
      locality,
      city,
      state,
      countryCode,
      evidenceKind: 'patient_declared_service_area' as const,
      evidenceStatus: 'coarse_declared' as const,
      declaredAt: declaredAt.toISOString(),
    }];
  });
}
