import { getSupabaseClient } from '@/lib/supabase';

export type TherapistOperatingAnalytics = {
  periodStart: string;
  periodEndExclusive: string;
  patientsTreated: number;
  visits: number;
  unlinkedVisits: number;
  totalTreatmentMinutes: number;
  averageVisitMinutes: number;
  newEpisodes: number;
  ongoingAtPeriodEnd: number;
  recoveredDischarged: number;
  leftDiscontinued: number;
  finalizedInvoices: number;
  billedTotal: number;
  billedTotalIsSettlementEvidence: false;
};

function finiteNumber(value: unknown, field: string) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid analytics response field: ${field}.`);
  }
  return parsed;
}

function parseAnalytics(value: unknown): TherapistOperatingAnalytics {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid therapist analytics response.');
  }
  const row = value as Record<string, unknown>;
  if (typeof row.periodStart !== 'string' || typeof row.periodEndExclusive !== 'string') {
    throw new Error('Invalid therapist analytics period.');
  }
  if (row.billedTotalIsSettlementEvidence !== false) {
    throw new Error('Analytics settlement-evidence invariant failed.');
  }

  return {
    periodStart: row.periodStart,
    periodEndExclusive: row.periodEndExclusive,
    patientsTreated: finiteNumber(row.patientsTreated, 'patientsTreated'),
    visits: finiteNumber(row.visits, 'visits'),
    unlinkedVisits: finiteNumber(row.unlinkedVisits, 'unlinkedVisits'),
    totalTreatmentMinutes: finiteNumber(row.totalTreatmentMinutes, 'totalTreatmentMinutes'),
    averageVisitMinutes: finiteNumber(row.averageVisitMinutes, 'averageVisitMinutes'),
    newEpisodes: finiteNumber(row.newEpisodes, 'newEpisodes'),
    ongoingAtPeriodEnd: finiteNumber(row.ongoingAtPeriodEnd, 'ongoingAtPeriodEnd'),
    recoveredDischarged: finiteNumber(row.recoveredDischarged, 'recoveredDischarged'),
    leftDiscontinued: finiteNumber(row.leftDiscontinued, 'leftDiscontinued'),
    finalizedInvoices: finiteNumber(row.finalizedInvoices, 'finalizedInvoices'),
    billedTotal: finiteNumber(row.billedTotal, 'billedTotal'),
    billedTotalIsSettlementEvidence: false,
  };
}

export async function loadMyTherapistOperatingAnalytics(input: {
  periodStart: string;
  periodEndExclusive: string;
}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_my_therapist_operating_analytics', {
    p_period_start: input.periodStart,
    p_period_end_exclusive: input.periodEndExclusive,
  });
  if (error) throw error;
  return parseAnalytics(data);
}
