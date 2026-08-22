import { getSupabaseClient } from '@/lib/supabase';
import { resolveAuthenticatedPhysiotherapist } from '@/lib/workspace';

export type TreatmentEpisodeStatus =
  | 'LEGACY_UNSPECIFIED'
  | 'ONGOING'
  | 'RECOVERED_DISCHARGED'
  | 'LEFT_DISCONTINUED';

export type TreatmentEpisodeCategory =
  | 'Ortho'
  | 'Neuro'
  | 'Cardio'
  | 'Rehab'
  | 'Pedia'
  | 'Geriatrics'
  | 'Other';

export type TreatmentEpisode = {
  id: string;
  physioId: string;
  patientId: string;
  title: string;
  category: TreatmentEpisodeCategory;
  startedAt: string;
  status: TreatmentEpisodeStatus;
  statusChangedAt: string;
  dischargeNote: string;
  createdAt: string;
  updatedAt: string;
};

type TreatmentEpisodeRow = {
  id: string;
  physio_id: string;
  patient_id: string;
  title: string;
  category: TreatmentEpisodeCategory;
  started_at: string;
  status: TreatmentEpisodeStatus;
  status_changed_at: string;
  discharge_note: string;
  created_at: string;
  updated_at: string;
};

const episodeColumns =
  'id,physio_id,patient_id,title,category,started_at,status,status_changed_at,discharge_note,created_at,updated_at' as const;

function mapEpisode(row: TreatmentEpisodeRow): TreatmentEpisode {
  return {
    id: row.id,
    physioId: row.physio_id,
    patientId: row.patient_id,
    title: row.title,
    category: row.category,
    startedAt: row.started_at,
    status: row.status,
    statusChangedAt: row.status_changed_at,
    dischargeNote: row.discharge_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadTreatmentEpisodes(): Promise<TreatmentEpisode[]> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('treatment_episodes')
    .select(episodeColumns)
    .eq('physio_id', bootstrap.physioId)
    .order('started_at', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as TreatmentEpisodeRow[]).map(mapEpisode);
}

export async function createTreatmentEpisode(input: {
  patientId: string;
  title: string;
  category: TreatmentEpisodeCategory;
  startedAt: string;
}): Promise<TreatmentEpisode> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const title = input.title.trim();
  if (!input.patientId) throw new Error('Patient is required.');
  if (!title) throw new Error('Treatment episode title is required.');
  if (!input.startedAt) throw new Error('Treatment start date is required.');

  const { data: inserted, error: insertError } = await supabase
    .from('treatment_episodes')
    .insert({
      patient_id: input.patientId,
      title,
      category: input.category,
      started_at: input.startedAt,
      status: 'ONGOING',
    })
    .select('id')
    .single();

  if (insertError) throw insertError;

  const { data, error } = await supabase
    .from('treatment_episodes')
    .select(episodeColumns)
    .eq('id', inserted.id)
    .eq('physio_id', bootstrap.physioId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Treatment episode was created but could not be read back.');
  return mapEpisode(data as TreatmentEpisodeRow);
}

export async function transitionTreatmentEpisode(
  episodeId: string,
  status: Exclude<TreatmentEpisodeStatus, 'LEGACY_UNSPECIFIED'>,
  dischargeNote = '',
): Promise<TreatmentEpisode> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('treatment_episodes')
    .update({ status, discharge_note: dischargeNote.trim() })
    .eq('id', episodeId)
    .eq('physio_id', bootstrap.physioId)
    .select(episodeColumns)
    .single();

  if (error) throw error;
  return mapEpisode(data as TreatmentEpisodeRow);
}
