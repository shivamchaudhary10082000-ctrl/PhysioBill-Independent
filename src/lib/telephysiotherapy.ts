import { getSupabaseClient } from '@/lib/supabase';

export type TelephysiotherapySession = {
  sessionId: string;
  appointmentRequestId: string;
  startsAt: string;
  endsAt: string;
  timezoneName: string;
  providerState: 'external_activation_pending';
};

function parseSession(value: unknown): TelephysiotherapySession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid telephysiotherapy session response.');
  }

  const row = value as Record<string, unknown>;
  const sessionId = row.session_id;
  const appointmentRequestId = row.appointment_request_id;
  const startsAt = row.starts_at;
  const endsAt = row.ends_at;
  const timezoneName = row.timezone_name;
  const providerState = row.provider_state;

  if (
    typeof sessionId !== 'string' ||
    typeof appointmentRequestId !== 'string' ||
    typeof startsAt !== 'string' ||
    typeof endsAt !== 'string' ||
    typeof timezoneName !== 'string' ||
    providerState !== 'external_activation_pending'
  ) {
    throw new Error('Telephysiotherapy session invariant failed.');
  }

  return {
    sessionId,
    appointmentRequestId,
    startsAt,
    endsAt,
    timezoneName,
    providerState,
  };
}

function parseSessionList(value: unknown): TelephysiotherapySession[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid telephysiotherapy session list response.');
  }
  return value.map(parseSession);
}

export async function loadMyPatientTelephysiotherapySessions() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_my_patient_telephysiotherapy_sessions');
  if (error) throw error;
  return parseSessionList(data);
}

export async function loadMyProfessionalTelephysiotherapySessions() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_my_professional_telephysiotherapy_sessions');
  if (error) throw error;
  return parseSessionList(data);
}

export async function ensureMyTelephysiotherapySession(appointmentRequestId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('ensure_my_telephysiotherapy_session', {
    p_appointment_request_id: appointmentRequestId,
  });
  if (error) throw error;
  const sessions = parseSessionList(data);
  if (sessions.length !== 1) {
    throw new Error('Expected exactly one telephysiotherapy session foundation.');
  }
  return sessions[0];
}
