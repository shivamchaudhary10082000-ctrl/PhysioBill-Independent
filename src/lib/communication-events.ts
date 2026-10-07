import { getSupabaseClient } from '@/lib/supabase';

export type CommunicationPersona = 'patient' | 'physio';

export type CommunicationEvent = {
  eventId: string;
  appointmentRequestId: string;
  eventType: string;
  scheduledFor: string;
  serviceMode: string;
  startsAt: string;
  endsAt: string;
  timezoneName: string;
};

type CommunicationEventRow = {
  event_id: unknown;
  appointment_request_id: unknown;
  event_type: unknown;
  scheduled_for: unknown;
  service_mode: unknown;
  starts_at: unknown;
  ends_at: unknown;
  timezone_name: unknown;
};

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid communication event field: ${field}`);
  }
  return value;
}

function parseRow(row: CommunicationEventRow): CommunicationEvent {
  return {
    eventId: requiredString(row.event_id, 'event_id'),
    appointmentRequestId: requiredString(row.appointment_request_id, 'appointment_request_id'),
    eventType: requiredString(row.event_type, 'event_type'),
    scheduledFor: requiredString(row.scheduled_for, 'scheduled_for'),
    serviceMode: requiredString(row.service_mode, 'service_mode'),
    startsAt: requiredString(row.starts_at, 'starts_at'),
    endsAt: requiredString(row.ends_at, 'ends_at'),
    timezoneName: requiredString(row.timezone_name, 'timezone_name'),
  };
}

export async function getMyCommunicationEvents(
  persona: CommunicationPersona,
  limit = 50,
): Promise<CommunicationEvent[]> {
  const supabase = getSupabaseClient();
  const rpc = persona === 'patient'
    ? 'get_my_patient_communication_events'
    : 'get_my_professional_communication_events';

  const { data, error } = await supabase.rpc(rpc, {
    p_limit: Math.min(Math.max(Math.trunc(limit), 1), 100),
  });

  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Invalid communication event response.');
  return data.map((row) => parseRow(row as CommunicationEventRow));
}
