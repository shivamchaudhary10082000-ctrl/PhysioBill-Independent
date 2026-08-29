import { getSupabaseClient } from '@/lib/supabase';

export type PatientCreditEntryType = 'advance_received' | 'refund' | 'adjustment';

export type PatientCreditEntry = {
  entryId: string;
  entryType: PatientCreditEntryType;
  amount: number;
  reason: string;
  occurredAt: string;
};

export type PatientCreditLedger = {
  patientId: string;
  balance: number;
  entries: PatientCreditEntry[];
};

export type LinkedPatientCreditSummary = {
  linkId: string;
  linkedAt: string;
  physiotherapistPublicId: string;
  balance: number;
  entries: PatientCreditEntry[];
};

function normalizeEntry(value: unknown): PatientCreditEntry {
  const row = value as Record<string, unknown>;
  return {
    entryId: String(row.entryId ?? ''),
    entryType: String(row.entryType ?? '') as PatientCreditEntryType,
    amount: Number(row.amount ?? 0),
    reason: String(row.reason ?? ''),
    occurredAt: String(row.occurredAt ?? ''),
  };
}

export async function loadPatientCreditLedger(patientId: string): Promise<PatientCreditLedger> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('list_patient_credit_ledger', {
    p_patient_id: patientId,
  });

  if (error) throw error;

  const row = (data ?? {}) as Record<string, unknown>;
  return {
    patientId: String(row.patientId ?? patientId),
    balance: Number(row.balance ?? 0),
    entries: Array.isArray(row.entries) ? row.entries.map(normalizeEntry) : [],
  };
}

export async function recordPatientCreditLedgerEntry(input: {
  patientId: string;
  entryType: PatientCreditEntryType;
  amount: number;
  reason?: string;
  occurredAt?: string;
}): Promise<PatientCreditLedger> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('record_patient_credit_ledger_entry', {
    p_patient_id: input.patientId,
    p_entry_type: input.entryType,
    p_amount: input.amount,
    p_reason: input.reason ?? '',
    p_occurred_at: input.occurredAt ?? new Date().toISOString(),
  });

  if (error) throw error;
  return loadPatientCreditLedger(input.patientId);
}

export async function loadMyLinkedCreditSummary(): Promise<LinkedPatientCreditSummary[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('list_my_credit_summary');

  if (error) throw error;
  if (!Array.isArray(data)) return [];

  return data.map((value) => {
    const row = value as Record<string, unknown>;
    return {
      linkId: String(row.linkId ?? ''),
      linkedAt: String(row.linkedAt ?? ''),
      physiotherapistPublicId: String(row.physiotherapistPublicId ?? ''),
      balance: Number(row.balance ?? 0),
      entries: Array.isArray(row.entries) ? row.entries.map(normalizeEntry) : [],
    };
  });
}
