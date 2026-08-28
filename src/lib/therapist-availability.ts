import { getSupabaseClient } from '@/lib/supabase';
import {
  THERAPIST_SERVICE_MODES,
  type TherapistServiceMode,
} from '@/lib/therapist-discovery';
import { resolveAuthenticatedPhysiotherapist } from '@/lib/workspace';

export type TherapistAvailabilityWindow = {
  id: string;
  serviceMode: TherapistServiceMode;
  startsAt: string;
  endsAt: string;
  timezoneName: string;
};

export type TherapistAvailabilityManagement = {
  enabledServiceModes: TherapistServiceMode[];
  windows: TherapistAvailabilityWindow[];
};

export type TherapistAvailabilityWindowInput = {
  serviceMode: TherapistServiceMode;
  startsAt: string;
  endsAt: string;
  timezoneName: string;
};

export type TherapistAvailabilityByPhysio = Record<string, TherapistAvailabilityWindow[]>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const safeText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const normalizeMode = (value: unknown): TherapistServiceMode | null =>
  typeof value === 'string' && THERAPIST_SERVICE_MODES.includes(value as TherapistServiceMode)
    ? (value as TherapistServiceMode)
    : null;

const validIso = (value: unknown) => {
  if (typeof value !== 'string') return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};

function normalizeWindow(value: Record<string, unknown>): TherapistAvailabilityWindow | null {
  const id = safeText(value.id, 36);
  const serviceMode = normalizeMode(value.service_mode);
  const startsAt = validIso(value.starts_at);
  const endsAt = validIso(value.ends_at);
  const timezoneName = safeText(value.timezone_name, 64);

  if (!UUID_PATTERN.test(id) || !serviceMode || !startsAt || !endsAt || !timezoneName) return null;
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) return null;

  return { id, serviceMode, startsAt, endsAt, timezoneName };
}

export async function loadMyTherapistAvailabilityManagement(): Promise<TherapistAvailabilityManagement> {
  try {
    const supabase = getSupabaseClient();
    const { physioId } = await resolveAuthenticatedPhysiotherapist();
    const nowIso = new Date().toISOString();

    const [modesResult, windowsResult] = await Promise.all([
      supabase
        .from('physiotherapist_service_modes')
        .select('service_mode,is_enabled')
        .eq('physio_id', physioId),
      supabase
        .from('physiotherapist_availability_windows')
        .select('id,service_mode,starts_at,ends_at,timezone_name,is_active')
        .eq('physio_id', physioId)
        .eq('is_active', true)
        .gt('ends_at', nowIso)
        .order('starts_at', { ascending: true }),
    ]);

    const error = modesResult.error || windowsResult.error;
    if (error) throw error;

    const enabledServiceModes = (modesResult.data ?? [])
      .filter((row) => row.is_enabled === true)
      .map((row) => normalizeMode(row.service_mode))
      .filter((mode): mode is TherapistServiceMode => mode !== null);

    const enabled = new Set(enabledServiceModes);
    const windows = (windowsResult.data ?? [])
      .map((row) => normalizeWindow(row as Record<string, unknown>))
      .filter((window): window is TherapistAvailabilityWindow => Boolean(window && enabled.has(window.serviceMode)));

    return {
      enabledServiceModes: Array.from(new Set(enabledServiceModes)),
      windows,
    };
  } catch {
    throw new Error('Unable to load therapist availability right now.');
  }
}

export async function saveMyTherapistAvailability(
  windows: TherapistAvailabilityWindowInput[],
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('save_my_therapist_availability', {
      p_windows: windows.map((window) => ({
        service_mode: window.serviceMode,
        starts_at: window.startsAt,
        ends_at: window.endsAt,
        timezone_name: window.timezoneName,
      })),
    });

    if (error) throw error;
  } catch {
    throw new Error('Unable to save therapist availability. Review the time windows and try again.');
  }
}

export async function getVerifiedTherapistAvailability(
  physioId: string,
  serviceMode?: TherapistServiceMode,
  limit = 6,
): Promise<TherapistAvailabilityWindow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_verified_therapist_availability', {
    p_physio_id: physioId,
    p_service_mode: serviceMode ?? null,
    p_limit: Math.min(20, Math.max(1, Math.trunc(limit))),
  });

  if (error || !Array.isArray(data)) {
    throw new Error('Unable to load therapist availability right now.');
  }

  return data
    .map((row: unknown) => {
      if (typeof row !== 'object' || row === null || Array.isArray(row)) return null;
      const record = row as Record<string, unknown>;
      return normalizeWindow({
        id: record.availability_window_id,
        service_mode: record.service_mode,
        starts_at: record.starts_at,
        ends_at: record.ends_at,
        timezone_name: record.timezone_name,
      });
    })
    .filter((window): window is TherapistAvailabilityWindow => window !== null);
}

export async function getVerifiedTherapistAvailabilityBatch(
  physioIds: string[],
  serviceMode?: TherapistServiceMode,
  limitPerTherapist = 3,
): Promise<TherapistAvailabilityByPhysio> {
  const uniqueIds = Array.from(new Set(physioIds.filter((id) => UUID_PATTERN.test(id)))).slice(0, 50);
  if (!uniqueIds.length) return {};

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_verified_therapist_availability_batch', {
    p_physio_ids: uniqueIds,
    p_service_mode: serviceMode ?? null,
    p_limit_per_therapist: Math.min(6, Math.max(1, Math.trunc(limitPerTherapist))),
  });

  if (error || !Array.isArray(data)) {
    throw new Error('Unable to load therapist availability right now.');
  }

  const grouped: TherapistAvailabilityByPhysio = {};
  for (const row of data) {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;
    const physioId = safeText(record.physio_id, 36);
    if (!UUID_PATTERN.test(physioId) || !uniqueIds.includes(physioId)) continue;
    const window = normalizeWindow({
      id: record.availability_window_id,
      service_mode: record.service_mode,
      starts_at: record.starts_at,
      ends_at: record.ends_at,
      timezone_name: record.timezone_name,
    });
    if (!window) continue;
    (grouped[physioId] ??= []).push(window);
  }

  return grouped;
}
