import { getSupabaseClient } from '@/lib/supabase';

export type PhysiotherapistWorkspaceBootstrap = {
  physioId: string;
  userId: string;
  role: 'physio';
};

export type PhysiotherapistProfileRecord = {
  physio_id: string;
  full_name: string;
  title: string;
  qualification: string;
  registration: string;
  pan: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  logo_url: string;
  upi_name: string;
  upi_id: string;
  bank_name: string;
  account_number_display: string;
  ifsc_display: string;
  invoice_prefix: string;
  payment_account_id: string | null;
  payment_account_status: 'not_connected' | 'pending' | 'connected';
};

export type PhysiotherapistSettingsRecord = {
  physio_id: string;
  practice_name: string;
  default_payment: string;
  footer_note: string;
  show_gst: boolean;
  date_format: string;
};

export async function resolveAuthenticatedPhysiotherapist(): Promise<PhysiotherapistWorkspaceBootstrap> {
  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error('No authenticated user.');

  const { data: appUser, error: appUserError } = await supabase
    .from('app_users')
    .select('id, role')
    .eq('id', userData.user.id)
    .single();

  if (appUserError) throw appUserError;
  if (appUser.role !== 'physio') {
    throw new Error('This account is not provisioned as a physiotherapist.');
  }

  const { data: physio, error: physioError } = await supabase
    .from('physiotherapists')
    .select('id, user_id')
    .eq('user_id', userData.user.id)
    .single();

  if (physioError) throw physioError;

  return {
    physioId: physio.id,
    userId: userData.user.id,
    role: 'physio',
  };
}

export async function loadPhysiotherapistProfile(
  physioId: string,
): Promise<PhysiotherapistProfileRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('physiotherapist_profiles')
    .select('*')
    .eq('physio_id', physioId)
    .single();

  if (error) throw error;
  return data as PhysiotherapistProfileRecord;
}

export async function updatePhysiotherapistProfile(
  physioId: string,
  patch: Partial<Omit<PhysiotherapistProfileRecord, 'physio_id'>>,
): Promise<PhysiotherapistProfileRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('physiotherapist_profiles')
    .update(patch)
    .eq('physio_id', physioId)
    .select('*')
    .single();

  if (error) throw error;
  return data as PhysiotherapistProfileRecord;
}

export async function loadPhysiotherapistSettings(
  physioId: string,
): Promise<PhysiotherapistSettingsRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('physiotherapist_settings')
    .select('*')
    .eq('physio_id', physioId)
    .single();

  if (error) throw error;
  return data as PhysiotherapistSettingsRecord;
}

export async function updatePhysiotherapistSettings(
  physioId: string,
  patch: Partial<Omit<PhysiotherapistSettingsRecord, 'physio_id'>>,
): Promise<PhysiotherapistSettingsRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('physiotherapist_settings')
    .update(patch)
    .eq('physio_id', physioId)
    .select('*')
    .single();

  if (error) throw error;
  return data as PhysiotherapistSettingsRecord;
}
