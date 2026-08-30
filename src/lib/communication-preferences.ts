import { getSupabaseClient } from '@/lib/supabase';

export type ExternalCommunicationChannel = 'none' | 'sms' | 'whatsapp';

export type CommunicationPreferences = {
  appointmentUpdatesOptIn: boolean;
  appointmentRemindersOptIn: boolean;
  preferredExternalChannel: ExternalCommunicationChannel;
  consentVersion: number;
  consentedAt: string | null;
  revision: number;
  updatedAt: string;
};

type PreferenceRow = {
  appointment_updates_opt_in: unknown;
  appointment_reminders_opt_in: unknown;
  preferred_external_channel: unknown;
  consent_version: unknown;
  consented_at: unknown;
  revision: unknown;
  updated_at: unknown;
};

function parseChannel(value: unknown): ExternalCommunicationChannel {
  if (value === 'none' || value === 'sms' || value === 'whatsapp') return value;
  throw new Error('Invalid communication preference channel.');
}

function parseRow(row: PreferenceRow): CommunicationPreferences {
  if (typeof row.appointment_updates_opt_in !== 'boolean' || typeof row.appointment_reminders_opt_in !== 'boolean') {
    throw new Error('Invalid communication preference state.');
  }
  if (typeof row.consent_version !== 'number' || typeof row.revision !== 'number' || typeof row.updated_at !== 'string') {
    throw new Error('Invalid communication preference metadata.');
  }
  if (row.consented_at !== null && typeof row.consented_at !== 'string') {
    throw new Error('Invalid communication consent timestamp.');
  }

  return {
    appointmentUpdatesOptIn: row.appointment_updates_opt_in,
    appointmentRemindersOptIn: row.appointment_reminders_opt_in,
    preferredExternalChannel: parseChannel(row.preferred_external_channel),
    consentVersion: row.consent_version,
    consentedAt: row.consented_at,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}

function firstRow(data: unknown): CommunicationPreferences {
  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error('Invalid communication preference response.');
  }
  return parseRow(data[0] as PreferenceRow);
}

export async function getMyCommunicationPreferences(): Promise<CommunicationPreferences> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_my_communication_preferences');
  if (error) throw error;
  return firstRow(data);
}

export async function setMyCommunicationPreferences(input: {
  appointmentUpdatesOptIn: boolean;
  appointmentRemindersOptIn: boolean;
  preferredExternalChannel: ExternalCommunicationChannel;
  expectedRevision: number;
}): Promise<CommunicationPreferences> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('set_my_communication_preferences', {
    p_appointment_updates_opt_in: input.appointmentUpdatesOptIn,
    p_appointment_reminders_opt_in: input.appointmentRemindersOptIn,
    p_preferred_external_channel: input.preferredExternalChannel,
    p_expected_revision: input.expectedRevision,
  });
  if (error) throw error;
  return firstRow(data);
}
