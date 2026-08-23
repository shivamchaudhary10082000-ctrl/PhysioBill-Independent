import type { User } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import {
  loadPhysiotherapistProfessionalVerification,
  loadPhysiotherapistProfile,
  loadPhysiotherapistSettings,
  resolveAuthenticatedPhysiotherapist,
  updatePhysiotherapistProfile,
  updatePhysiotherapistSettings,
} from '@/lib/workspace';

export type ProductionProfile = {
  id: string;
  fullName: string;
  title: string;
  qualification: string;
  registration: string;
  registrationAuthority: string;
  pan: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  invoicePrefix: string;
};

export type TherapistEditableProductionProfile = Omit<ProductionProfile, 'id'>;

export type ProductionProfessionalVerification = {
  status: 'unverified' | 'pending' | 'verified' | 'rejected';
  verifiedAt: string | null;
  verifiedQualification: string;
  verifiedRegistrationNumber: string;
  verifiedRegistrationAuthority: string;
};

export type ProductionSettings = {
  practiceName: string;
  defaultPayment: string;
  footerNote: string;
  showGst: boolean;
  dateFormat: string;
};

export type ProductionWorkspace = {
  physioId: string;
  userId: string;
  authUser: {
    id: string;
    role: 'physio';
    displayName: string;
    email: string;
  };
  profile: ProductionProfile;
  verification: ProductionProfessionalVerification;
  settings: ProductionSettings;
};

const mapProfile = (row: Awaited<ReturnType<typeof loadPhysiotherapistProfile>>): ProductionProfile => ({
  id: row.physio_id,
  fullName: row.full_name,
  title: row.title,
  qualification: row.qualification,
  registration: row.registration,
  registrationAuthority: row.registration_authority,
  pan: row.pan,
  gstin: row.gstin,
  phone: row.phone,
  email: row.email,
  address: row.address,
  invoicePrefix: row.invoice_prefix,
});

const mapVerification = (
  row: Awaited<ReturnType<typeof loadPhysiotherapistProfessionalVerification>>,
): ProductionProfessionalVerification => ({
  status: row.verification_status,
  verifiedAt: row.verified_at,
  verifiedQualification: row.verified_qualification,
  verifiedRegistrationNumber: row.verified_registration_number,
  verifiedRegistrationAuthority: row.verified_registration_authority,
});

const mapSettings = (row: Awaited<ReturnType<typeof loadPhysiotherapistSettings>>): ProductionSettings => ({
  practiceName: row.practice_name,
  defaultPayment: row.default_payment,
  footerNote: row.footer_note,
  showGst: row.show_gst,
  dateFormat: row.date_format,
});

export async function loadProductionWorkspace(user: User): Promise<ProductionWorkspace> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  if (bootstrap.userId !== user.id) {
    throw new Error('Authenticated workspace identity does not match the current session.');
  }

  const [profileRow, verificationRow, settingsRow] = await Promise.all([
    loadPhysiotherapistProfile(bootstrap.physioId),
    loadPhysiotherapistProfessionalVerification(bootstrap.physioId),
    loadPhysiotherapistSettings(bootstrap.physioId),
  ]);

  const profile = mapProfile(profileRow);
  return {
    physioId: bootstrap.physioId,
    userId: user.id,
    authUser: {
      id: user.id,
      role: 'physio',
      displayName: profile.fullName || user.email || 'Physiotherapist',
      email: user.email || profile.email,
    },
    profile,
    verification: mapVerification(verificationRow),
    settings: mapSettings(settingsRow),
  };
}

export async function saveProductionProfile(
  physioId: string,
  profile: TherapistEditableProductionProfile,
): Promise<ProductionProfile> {
  const updated = await updatePhysiotherapistProfile(physioId, {
    full_name: profile.fullName,
    title: profile.title,
    qualification: profile.qualification,
    registration: profile.registration,
    registration_authority: profile.registrationAuthority,
    pan: profile.pan,
    gstin: profile.gstin,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    invoice_prefix: profile.invoicePrefix,
  });
  const savedProfile = mapProfile(updated);
  toast({
    title: 'Profile saved',
    description: 'Your professional details have been updated.',
  });
  return savedProfile;
}

export async function loadProductionProfessionalVerification(
  physioId: string,
): Promise<ProductionProfessionalVerification> {
  return mapVerification(await loadPhysiotherapistProfessionalVerification(physioId));
}

export async function saveProductionSettings(
  physioId: string,
  settings: ProductionSettings,
): Promise<ProductionSettings> {
  const updated = await updatePhysiotherapistSettings(physioId, {
    practice_name: settings.practiceName,
    default_payment: settings.defaultPayment,
    footer_note: settings.footerNote,
    show_gst: settings.showGst,
    date_format: settings.dateFormat,
  });
  return mapSettings(updated);
}
