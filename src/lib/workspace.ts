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
  registration_authority: string;
  pan: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  invoice_prefix: string;
};

export type TherapistEditableProfileUpdate = Omit<PhysiotherapistProfileRecord, 'physio_id'>;

export type PhysiotherapistProfessionalVerificationRecord = {
  physio_id: string;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  verified_qualification: string;
  verified_registration_number: string;
  verified_registration_authority: string;
};

export type PhysiotherapistSettingsRecord = {
  physio_id: string;
  practice_name: string;
  default_payment: string;
  footer_note: string;
  show_gst: boolean;
  date_format: string;
};

const profileColumns = 'physio_id,full_name,title,qualification,registration,registration_authority,pan,gstin,phone,email,address,invoice_prefix' as const;
const verificationColumns = 'physio_id,verification_status,verified_at,verified_qualification,verified_registration_number,verified_registration_authority' as const;

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
    .select(profileColumns)
    .eq('physio_id', physioId)
    .single();

  if (error) throw error;
  return data as unknown as PhysiotherapistProfileRecord;
}

export async function updatePhysiotherapistProfile(
  physioId: string,
  input: TherapistEditableProfileUpdate,
): Promise<PhysiotherapistProfileRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('physiotherapist_profiles')
    .update({
      full_name: input.full_name,
      title: input.title,
      qualification: input.qualification,
      registration: input.registration,
      registration_authority: input.registration_authority,
      pan: input.pan,
      gstin: input.gstin,
      phone: input.phone,
      email: input.email,
      address: input.address,
      invoice_prefix: input.invoice_prefix,
    })
    .eq('physio_id', physioId)
    .select(profileColumns)
    .single();

  if (error) throw error;
  return data as unknown as PhysiotherapistProfileRecord;
}

export async function loadPhysiotherapistProfessionalVerification(
  physioId: string,
): Promise<PhysiotherapistProfessionalVerificationRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('physiotherapist_professional_verifications')
    .select(verificationColumns)
    .eq('physio_id', physioId)
    .single();

  if (error) throw error;
  return data as unknown as PhysiotherapistProfessionalVerificationRecord;
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
