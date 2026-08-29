import { getSupabaseClient } from '@/lib/supabase';
import type { TherapistServiceMode } from '@/lib/therapist-discovery';

export type AppointmentRequestStatus = 'requested' | 'accepted' | 'rejected' | 'cancelled';

export type PatientAppointmentRequest = {
  id: string;
  physioId: string;
  therapistDisplayName: string;
  therapistClinicName: string;
  availabilityWindowId: string;
  serviceMode: TherapistServiceMode;
  startsAt: string;
  endsAt: string;
  timezoneName: string;
  status: AppointmentRequestStatus;
  requestedAt: string;
  respondedAt: string | null;
  cancelledAt: string | null;
};

export type ProfessionalAppointmentRequest = {
  id: string;
  publicPatientId: string;
  availabilityWindowId: string;
  serviceMode: TherapistServiceMode;
  startsAt: string;
  endsAt: string;
  timezoneName: string;
  status: AppointmentRequestStatus;
  requestedAt: string;
  respondedAt: string | null;
  cancelledAt: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAT_PATTERN = /^PAT-\d{12}$/;
const SERVICE_MODES = new Set<TherapistServiceMode>(['home_visit', 'clinic_visit', 'telephysiotherapy']);
const STATUSES = new Set<AppointmentRequestStatus>(['requested', 'accepted', 'rejected', 'cancelled']);

function safeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function iso(value: unknown) {
  if (typeof value !== 'string') return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function nullableIso(value: unknown) {
  if (value === null || value === undefined) return null;
  return iso(value) || null;
}

function normalizeShared(record: Record<string, unknown>) {
  const id = safeText(record.appointment_request_id, 36);
  const availabilityWindowId = safeText(record.availability_window_id, 36);
  const serviceMode = safeText(record.service_mode, 32) as TherapistServiceMode;
  const startsAt = iso(record.starts_at);
  const endsAt = iso(record.ends_at);
  const timezoneName = safeText(record.timezone_name, 64);
  const status = safeText(record.status, 20) as AppointmentRequestStatus;
  const requestedAt = iso(record.requested_at);

  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(availabilityWindowId)) return null;
  if (!SERVICE_MODES.has(serviceMode) || !STATUSES.has(status)) return null;
  if (!startsAt || !endsAt || new Date(endsAt).getTime() <= new Date(startsAt).getTime()) return null;
  if (!timezoneName || !requestedAt) return null;

  return {
    id,
    availabilityWindowId,
    serviceMode,
    startsAt,
    endsAt,
    timezoneName,
    status,
    requestedAt,
    respondedAt: nullableIso(record.responded_at),
    cancelledAt: nullableIso(record.cancelled_at),
  };
}

export async function requestPatientAppointment(availabilityWindowId: string) {
  if (!UUID_PATTERN.test(availabilityWindowId)) throw new Error('This availability window is invalid.');
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('request_patient_appointment', {
    p_availability_window_id: availabilityWindowId,
  });
  if (error) throw error;
  if (typeof data !== 'string' || !UUID_PATTERN.test(data)) throw new Error('Appointment request could not be confirmed.');
  return data;
}

export async function cancelMyAppointmentRequest(requestId: string) {
  if (!UUID_PATTERN.test(requestId)) throw new Error('This appointment request is invalid.');
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('cancel_my_appointment_request', { p_request_id: requestId });
  if (error) throw error;
}

export async function respondToAppointmentRequest(requestId: string, decision: 'accepted' | 'rejected') {
  if (!UUID_PATTERN.test(requestId)) throw new Error('This appointment request is invalid.');
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('respond_to_appointment_request', {
    p_request_id: requestId,
    p_decision: decision,
  });
  if (error) throw error;
}

export async function loadMyPatientAppointmentRequests(): Promise<PatientAppointmentRequest[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_my_patient_appointment_requests_v2');
  if (error || !Array.isArray(data)) throw error ?? new Error('Unable to load appointment requests.');

  return data.flatMap((row: unknown) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return [];
    const record = row as Record<string, unknown>;
    const shared = normalizeShared(record);
    const physioId = safeText(record.physio_id, 36);
    const therapistDisplayName = safeText(record.therapist_display_name, 120);
    const therapistClinicName = safeText(record.therapist_clinic_name, 160);
    if (!shared || !UUID_PATTERN.test(physioId) || !therapistDisplayName) return [];
    return [{ ...shared, physioId, therapistDisplayName, therapistClinicName }];
  });
}

export async function loadMyProfessionalAppointmentRequests(): Promise<ProfessionalAppointmentRequest[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_my_professional_appointment_requests_v2');
  if (error || !Array.isArray(data)) throw error ?? new Error('Unable to load appointment requests.');

  return data.flatMap((row: unknown) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return [];
    const record = row as Record<string, unknown>;
    const shared = normalizeShared(record);
    const publicPatientId = safeText(record.public_patient_id, 32);
    if (!shared || !PAT_PATTERN.test(publicPatientId)) return [];
    return [{ ...shared, publicPatientId }];
  });
}
