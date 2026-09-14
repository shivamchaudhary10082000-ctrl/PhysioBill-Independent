import { getSupabaseClient } from '@/lib/supabase';

export type PatientClinicalSummary = {
  linkId: string;
  linkedAt: string;
  physiotherapistPublicId: string;
  episodes: Array<{
    episodeId: string;
    title: string;
    category: string;
    startedAt: string;
    status: string;
    statusChangedAt: string;
    visits: Array<{
      visitId: string;
      visitNumber: string;
      visitDate: string;
      durationMinutes: number | null;
      treatment: string;
      exercises: string;
      clinicalSummary: null | {
        diagnosis: string;
        treatmentPlan: string;
        homeExerciseProgram: string;
      };
    }>;
  }>;
};

function text(value: unknown, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalize(raw: unknown): PatientClinicalSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const linkId = text(row.linkId, 36);
    const linkedAt = text(row.linkedAt, 64);
    const physiotherapistPublicId = text(row.physiotherapistPublicId, 32);
    if (!linkId || !linkedAt || !physiotherapistPublicId) return [];

    const episodes = Array.isArray(row.episodes) ? row.episodes.flatMap((episode) => {
      if (!episode || typeof episode !== 'object') return [];
      const e = episode as Record<string, unknown>;
      const episodeId = text(e.episodeId, 36);
      if (!episodeId) return [];
      const visits = Array.isArray(e.visits) ? e.visits.flatMap((visit) => {
        if (!visit || typeof visit !== 'object') return [];
        const v = visit as Record<string, unknown>;
        const visitId = text(v.visitId, 36);
        if (!visitId) return [];
        const cs = v.clinicalSummary && typeof v.clinicalSummary === 'object'
          ? v.clinicalSummary as Record<string, unknown>
          : null;
        return [{
          visitId,
          visitNumber: text(v.visitNumber, 80),
          visitDate: text(v.visitDate, 32),
          durationMinutes: typeof v.durationMinutes === 'number' && Number.isFinite(v.durationMinutes) ? v.durationMinutes : null,
          treatment: text(v.treatment),
          exercises: text(v.exercises),
          clinicalSummary: cs ? {
            diagnosis: text(cs.diagnosis),
            treatmentPlan: text(cs.treatmentPlan),
            homeExerciseProgram: text(cs.homeExerciseProgram),
          } : null,
        }];
      }) : [];
      return [{
        episodeId,
        title: text(e.title, 200),
        category: text(e.category, 120),
        startedAt: text(e.startedAt, 32),
        status: text(e.status, 40),
        statusChangedAt: text(e.statusChangedAt, 64),
        visits,
      }];
    }) : [];

    return [{ linkId, linkedAt, physiotherapistPublicId, episodes }];
  });
}

export async function loadMyClinicalCareSummary() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('list_my_clinical_care_summary');
  if (error) throw error;
  return normalize(data);
}
