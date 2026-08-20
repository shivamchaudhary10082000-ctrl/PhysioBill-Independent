import type { User } from '@supabase/supabase-js';
import {
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
  pan: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  logo: string;
  upiName: string;
  upiId: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  invoicePrefix: string;
  paymentAccountId?: string;
  paymentAccountStatus?: 'not_connected' | 'pending' | 'connected';
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
  settings: ProductionSettings;
};

const mapProfile = (row: Awaited<ReturnType<typeof loadPhysiotherapistProfile>>): ProductionProfile => ({
  id: row.physio_id,
  fullName: row.full_name,
  title: row.title,
  qualification: row.qualification,
  registration: row.registration,
  pan: row.pan,
  gstin: row.gstin,
  phone: row.phone,
  email: row.email,
  address: row.address,
  logo: row.logo_url,
  upiName: row.upi_name,
  upiId: row.upi_id,
  bankName: row.bank_name,
  accountNumber: row.account_number_display,
  ifsc: row.ifsc_display,
  invoicePrefix: row.invoice_prefix,
  paymentAccountId: row.payment_account_id ?? undefined,
  paymentAccountStatus: row.payment_account_status,
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

  const [profileRow, settingsRow] = await Promise.all([
    loadPhysiotherapistProfile(bootstrap.physioId),
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
    settings: mapSettings(settingsRow),
  };
}

export async function saveProductionProfile(
  physioId: string,
  profile: ProductionProfile,
): Promise<ProductionProfile> {
  const updated = await updatePhysiotherapistProfile(physioId, {
    full_name: profile.fullName,
    title: profile.title,
    qualification: profile.qualification,
    registration: profile.registration,
    pan: profile.pan,
    gstin: profile.gstin,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    logo_url: profile.logo,
    upi_name: profile.upiName,
    upi_id: profile.upiId,
    bank_name: profile.bankName,
    account_number_display: profile.accountNumber,
    ifsc_display: profile.ifsc,
    invoice_prefix: profile.invoicePrefix,
    payment_account_id: profile.paymentAccountId ?? null,
    payment_account_status: profile.paymentAccountStatus ?? 'not_connected',
  });
  return mapProfile(updated);
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
