import { getSupabaseClient } from '@/lib/supabase';

export type NewClinicalChartInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  age?: string;
  sex?: string;
  occupation?: string;
  clinicalCategory?: string;
  condition?: string;
  notes?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clean(value: string | undefined, maxLength: number) {
  return (value ?? '').trim().slice(0, maxLength);
}

export async function createAndAcceptClinicalChartLinkRequest(requestId: string, input: NewClinicalChartInput) {
  if (!UUID_PATTERN.test(requestId)) throw new Error('Clinical connection request is invalid.');

  const name = clean(input.name, 160);
  if (!name) throw new Error('Patient name is required.');

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('create_and_accept_clinical_chart_link_request', {
    p_request_id: requestId,
    p_name: name,
    p_phone: clean(input.phone, 40),
    p_email: clean(input.email, 254).toLowerCase(),
    p_address: clean(input.address, 500),
    p_age: clean(input.age, 40),
    p_sex: clean(input.sex, 40),
    p_occupation: clean(input.occupation, 160),
    p_clinical_category: clean(input.clinicalCategory, 120),
    p_condition: clean(input.condition, 500),
    p_notes: clean(input.notes, 2000),
  });

  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('New clinical chart could not be confirmed.');
  }
  return data as Record<string, unknown>;
}
