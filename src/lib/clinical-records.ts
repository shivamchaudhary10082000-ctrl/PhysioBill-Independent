import { getSupabaseClient } from '@/lib/supabase';
import { resolveAuthenticatedPhysiotherapist } from '@/lib/workspace';

export type ClinicalRecord = {
  id: string;
  physioId: string;
  patientId: string;
  visitId: string;
  chiefComplaint: string;
  previousTreatment: string;
  pastHistory: string;
  familyHistory: string;
  otherMedicalConditions: string;
  bp: string;
  thyroid: string;
  diabetes: string;
  allergies: string;
  otherIllness: string;
  currentMedications: string;
  painScale: string;
  painType: string;
  subjective: string;
  posture: string;
  objective: string;
  diagnosis: string;
  assessment: string;
  goals: string;
  treatmentPlan: string;
  plan: string;
  treatment: string;
  hep: string;
  createdAt: string;
  updatedAt: string;
};

export type ClinicalRecordInput = Omit<
  ClinicalRecord,
  'id' | 'physioId' | 'patientId' | 'createdAt' | 'updatedAt'
>;

type ClinicalRecordRow = {
  id: string;
  physio_id: string;
  patient_id: string;
  visit_id: string;
  chief_complaint: string;
  previous_treatment: string;
  past_history: string;
  family_history: string;
  other_medical_conditions: string;
  bp: string;
  thyroid: string;
  diabetes: string;
  allergies: string;
  other_illness: string;
  current_medications: string;
  pain_scale: number | null;
  pain_type: string;
  subjective: string;
  posture: string;
  objective: string;
  diagnosis: string;
  assessment: string;
  goals: string;
  treatment_plan: string;
  plan: string;
  treatment: string;
  hep: string;
  created_at: string;
  updated_at: string;
};

const clinicalRecordColumns = [
  'id',
  'physio_id',
  'patient_id',
  'visit_id',
  'chief_complaint',
  'previous_treatment',
  'past_history',
  'family_history',
  'other_medical_conditions',
  'bp',
  'thyroid',
  'diabetes',
  'allergies',
  'other_illness',
  'current_medications',
  'pain_scale',
  'pain_type',
  'subjective',
  'posture',
  'objective',
  'diagnosis',
  'assessment',
  'goals',
  'treatment_plan',
  'plan',
  'treatment',
  'hep',
  'created_at',
  'updated_at',
].join(',');

function clean(value: string) {
  return value.trim();
}

function normalizeInput(input: ClinicalRecordInput) {
  const rawPainScale = clean(input.painScale);
  const painScale = rawPainScale === '' ? null : Number(rawPainScale);
  if (painScale !== null && (!Number.isInteger(painScale) || painScale < 0 || painScale > 10)) {
    throw new Error('Pain scale must be a whole number from 0 to 10.');
  }

  return {
    visit_id: input.visitId,
    chief_complaint: clean(input.chiefComplaint),
    previous_treatment: clean(input.previousTreatment),
    past_history: clean(input.pastHistory),
    family_history: clean(input.familyHistory),
    other_medical_conditions: clean(input.otherMedicalConditions),
    bp: clean(input.bp),
    thyroid: clean(input.thyroid),
    diabetes: clean(input.diabetes),
    allergies: clean(input.allergies),
    other_illness: clean(input.otherIllness),
    current_medications: clean(input.currentMedications),
    pain_scale: painScale,
    pain_type: clean(input.painType),
    subjective: clean(input.subjective),
    posture: clean(input.posture),
    objective: clean(input.objective),
    diagnosis: clean(input.diagnosis),
    assessment: clean(input.assessment),
    goals: clean(input.goals),
    treatment_plan: clean(input.treatmentPlan),
    plan: clean(input.plan),
    treatment: clean(input.treatment),
    hep: clean(input.hep),
  };
}

function mapClinicalRecord(row: ClinicalRecordRow): ClinicalRecord {
  return {
    id: row.id,
    physioId: row.physio_id,
    patientId: row.patient_id,
    visitId: row.visit_id,
    chiefComplaint: row.chief_complaint,
    previousTreatment: row.previous_treatment,
    pastHistory: row.past_history,
    familyHistory: row.family_history,
    otherMedicalConditions: row.other_medical_conditions,
    bp: row.bp,
    thyroid: row.thyroid,
    diabetes: row.diabetes,
    allergies: row.allergies,
    otherIllness: row.other_illness,
    currentMedications: row.current_medications,
    painScale: row.pain_scale === null ? '' : String(row.pain_scale),
    painType: row.pain_type,
    subjective: row.subjective,
    posture: row.posture,
    objective: row.objective,
    diagnosis: row.diagnosis,
    assessment: row.assessment,
    goals: row.goals,
    treatmentPlan: row.treatment_plan,
    plan: row.plan,
    treatment: row.treatment,
    hep: row.hep,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadClinicalRecordForVisit(visitId: string): Promise<ClinicalRecord | null> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clinical_records')
    .select(clinicalRecordColumns)
    .eq('visit_id', visitId)
    .eq('physio_id', bootstrap.physioId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapClinicalRecord(data as unknown as ClinicalRecordRow) : null;
}

export async function loadClinicalRecordsForPatient(patientId: string): Promise<ClinicalRecord[]> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clinical_records')
    .select(clinicalRecordColumns)
    .eq('patient_id', patientId)
    .eq('physio_id', bootstrap.physioId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapClinicalRecord(row as unknown as ClinicalRecordRow));
}

export async function saveClinicalRecord(input: ClinicalRecordInput): Promise<ClinicalRecord> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const values = normalizeInput(input);

  const { data: existing, error: existingError } = await supabase
    .from('clinical_records')
    .select('id')
    .eq('visit_id', input.visitId)
    .eq('physio_id', bootstrap.physioId)
    .maybeSingle();

  if (existingError) throw existingError;

  const query = existing
    ? supabase
        .from('clinical_records')
        .update(values)
        .eq('id', existing.id)
        .eq('physio_id', bootstrap.physioId)
    : supabase.from('clinical_records').insert(values);

  const { data, error } = await query.select(clinicalRecordColumns).single();
  if (error) throw error;

  const saved = mapClinicalRecord(data as unknown as ClinicalRecordRow);

  const { data: verified, error: verifyError } = await supabase
    .from('clinical_records')
    .select(clinicalRecordColumns)
    .eq('id', saved.id)
    .eq('physio_id', bootstrap.physioId)
    .single();

  if (verifyError) throw verifyError;
  return mapClinicalRecord(verified as unknown as ClinicalRecordRow);
}
