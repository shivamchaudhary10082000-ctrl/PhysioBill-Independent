import { getSupabaseClient } from '@/lib/supabase';
import { resolveAuthenticatedPhysiotherapist } from '@/lib/workspace';

export type ProductionPatient = {
  id: string;
  physioId: string;
  userId?: string;
  patientNumber: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  age: string;
  condition: string;
  referringDoctor: string;
  referralDate: string;
  insuranceTpa: string;
  policyMemberId: string;
  notes: string;
};

export type PatientInput = Omit<ProductionPatient, 'id' | 'physioId' | 'userId' | 'patientNumber'>;

type PatientRow = {
  id: string;
  physio_id: string;
  user_id: string | null;
  patient_number: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  age: string;
  condition: string;
  referring_doctor: string;
  referral_date: string | null;
  insurance_tpa: string;
  policy_member_id: string;
  notes: string;
};

const patientColumns = 'id,physio_id,user_id,patient_number,name,phone,email,address,age,condition,referring_doctor,referral_date,insurance_tpa,policy_member_id,notes' as const;

function clean(value: string) {
  return value.trim();
}

function cleanPhone(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeInput(input: PatientInput) {
  const name = clean(input.name);
  if (!name) throw new Error('Patient name is required.');

  return {
    name,
    phone: cleanPhone(input.phone),
    email: clean(input.email),
    address: clean(input.address),
    age: clean(input.age),
    condition: clean(input.condition),
    referring_doctor: clean(input.referringDoctor),
    referral_date: clean(input.referralDate) || null,
    insurance_tpa: clean(input.insuranceTpa),
    policy_member_id: clean(input.policyMemberId),
    notes: clean(input.notes),
  };
}

function mapPatient(row: PatientRow): ProductionPatient {
  return {
    id: row.id,
    physioId: row.physio_id,
    userId: row.user_id ?? undefined,
    patientNumber: row.patient_number,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    age: row.age,
    condition: row.condition,
    referringDoctor: row.referring_doctor,
    referralDate: row.referral_date ?? '',
    insuranceTpa: row.insurance_tpa,
    policyMemberId: row.policy_member_id,
    notes: row.notes,
  };
}

function extractSequence(patientNumber: string) {
  const match = patientNumber.match(/^PT-\d{4}-(\d+)$/);
  return match ? Number(match[1]) || 0 : 0;
}

async function nextPatientNumber(physioId: string) {
  const supabase = getSupabaseClient();
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from('patients')
    .select('patient_number')
    .eq('physio_id', physioId)
    .like('patient_number', `PT-${year}-%`);

  if (error) throw error;
  const next = (data ?? []).reduce(
    (highest, row) => Math.max(highest, extractSequence(row.patient_number)),
    0,
  ) + 1;
  return `PT-${year}-${String(next).padStart(6, '0')}`;
}

export async function loadPatients(): Promise<ProductionPatient[]> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('patients')
    .select(patientColumns)
    .eq('physio_id', bootstrap.physioId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(mapPatient);
}

export async function createPatient(input: PatientInput): Promise<ProductionPatient> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const values = normalizeInput(input);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const patientNumber = await nextPatientNumber(bootstrap.physioId);
    const { data, error } = await supabase
      .from('patients')
      .insert({
        physio_id: bootstrap.physioId,
        user_id: null,
        patient_number: patientNumber,
        ...values,
      })
      .select(patientColumns)
      .single();

    if (!error) return mapPatient(data);
    if (error.code !== '23505' || attempt === 2) throw error;
  }

  throw new Error('Unable to allocate a patient number.');
}

export async function updatePatient(
  patientId: string,
  input: PatientInput,
): Promise<ProductionPatient> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('patients')
    .update(normalizeInput(input))
    .eq('id', patientId)
    .eq('physio_id', bootstrap.physioId)
    .select(patientColumns)
    .single();

  if (error) throw error;
  return mapPatient(data);
}

export async function deletePatient(patientId: string): Promise<void> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('patients')
    .delete()
    .eq('id', patientId)
    .eq('physio_id', bootstrap.physioId)
    .select('id')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Patient not found.');
}
