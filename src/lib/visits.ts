import { getSupabaseClient } from '@/lib/supabase';
import { resolveAuthenticatedPhysiotherapist } from '@/lib/workspace';

export type ProductionVisit = {
  id: string;
  physioId: string;
  patientId: string;
  visitNumber: string;
  date: string;
  treatment: string;
  modalities: string;
  exercises: string;
  duration: string;
  notes: string;
  authorization: string;
};

export type VisitInput = Omit<ProductionVisit, 'id' | 'physioId' | 'visitNumber'>;

type VisitRow = {
  id: string;
  physio_id: string;
  patient_id: string;
  visit_number: string;
  visit_date: string;
  treatment: string;
  modalities: string;
  exercises: string;
  duration_minutes: number | null;
  notes: string;
  authorization: string;
};

const visitColumns =
  'id,physio_id,patient_id,visit_number,visit_date,treatment,modalities,exercises,duration_minutes,notes,authorization' as const;

function clean(value: string) {
  return value.trim();
}

function normalizeInput(input: VisitInput) {
  const treatment = clean(input.treatment);
  if (!input.patientId) throw new Error('Patient is required.');
  if (!input.date) throw new Error('Visit date is required.');
  if (!treatment) throw new Error('Treatment is required.');

  const durationValue = clean(input.duration);
  const duration = durationValue === '' ? null : Number(durationValue);
  if (duration !== null && (!Number.isInteger(duration) || duration < 0)) {
    throw new Error('Duration must be a non-negative whole number of minutes.');
  }

  return {
    patient_id: input.patientId,
    visit_date: input.date,
    treatment,
    modalities: clean(input.modalities),
    exercises: clean(input.exercises),
    duration_minutes: duration,
    notes: clean(input.notes),
    authorization: clean(input.authorization),
  };
}

function mapVisit(row: VisitRow): ProductionVisit {
  return {
    id: row.id,
    physioId: row.physio_id,
    patientId: row.patient_id,
    visitNumber: row.visit_number,
    date: row.visit_date,
    treatment: row.treatment,
    modalities: row.modalities,
    exercises: row.exercises,
    duration: row.duration_minutes === null ? '' : String(row.duration_minutes),
    notes: row.notes,
    authorization: row.authorization,
  };
}

export async function loadVisits(): Promise<ProductionVisit[]> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('visits')
    .select(visitColumns)
    .eq('physio_id', bootstrap.physioId)
    .order('visit_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(mapVisit);
}

export async function createVisit(input: VisitInput): Promise<ProductionVisit> {
  await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const values = normalizeInput(input);
  const { data, error } = await supabase
    .from('visits')
    .insert(values)
    .select(visitColumns)
    .single();

  if (error) throw error;
  return mapVisit(data);
}

export async function updateVisit(visitId: string, input: VisitInput): Promise<ProductionVisit> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const values = normalizeInput(input);
  const { data, error } = await supabase
    .from('visits')
    .update({
      treatment: values.treatment,
      modalities: values.modalities,
      exercises: values.exercises,
      duration_minutes: values.duration_minutes,
      notes: values.notes,
      authorization: values.authorization,
    })
    .eq('id', visitId)
    .eq('physio_id', bootstrap.physioId)
    .select(visitColumns)
    .single();

  if (error) throw error;
  return mapVisit(data);
}

export async function deleteVisit(visitId: string): Promise<void> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('visits')
    .delete()
    .eq('id', visitId)
    .eq('physio_id', bootstrap.physioId)
    .select('id')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Visit not found.');
}
