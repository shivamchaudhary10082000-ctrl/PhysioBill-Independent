import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';

export type PersistedAccountRole = 'physio' | 'patient';

export type AuthSessionState = {
  session: Session | null;
  user: User | null;
};

export type PatientPlatformIdentity = {
  id: string;
  publicPatientId: string;
  createdAt: string;
  userId: string;
};

export const PASSWORD_RECOVERY_PATH = '/auth/reset-password';

function normalizedCaptchaToken(captchaToken?: string | null) {
  const token = captchaToken?.trim();
  return token || undefined;
}

export async function getAuthSession(): Promise<AuthSessionState> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  return {
    session: data.session,
    user: data.session?.user ?? null,
  };
}

export async function resolveAuthenticatedSessionPersona(): Promise<PersistedAccountRole> {
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
  if (appUser.role !== 'patient' && appUser.role !== 'physio') {
    throw new Error('Authenticated account has no supported persisted persona.');
  }

  return appUser.role;
}

export async function registerPhysiotherapist(
  email: string,
  password: string,
  captchaToken?: string | null,
) {
  const supabase = getSupabaseClient();
  const token = normalizedCaptchaToken(captchaToken);
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        account_type: 'physio',
      },
      ...(token ? { captchaToken: token } : {}),
    },
  });

  if (error) throw error;
  return data;
}

export async function signInPhysiotherapist(
  email: string,
  password: string,
  captchaToken?: string | null,
) {
  const supabase = getSupabaseClient();
  const token = normalizedCaptchaToken(captchaToken);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
    ...(token ? { options: { captchaToken: token } } : {}),
  });

  if (error) throw error;
  return data;
}

export async function signInAdmin(
  email: string,
  password: string,
  captchaToken?: string | null,
) {
  const supabase = getSupabaseClient();
  const token = normalizedCaptchaToken(captchaToken);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
    ...(token ? { options: { captchaToken: token } } : {}),
  });

  if (error) throw error;
  return data;
}

export async function signOutCurrentSession() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Compatibility alias for callers outside this bounded slice.
export const signOutPhysiotherapist = signOutCurrentSession;

export async function requestPasswordReset(
  email: string,
  captchaToken?: string | null,
) {
  const supabase = getSupabaseClient();
  const redirectTo = new URL(
    PASSWORD_RECOVERY_PATH,
    window.location.origin,
  ).toString();
  const token = normalizedCaptchaToken(captchaToken);
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
    ...(token ? { captchaToken: token } : {}),
  });
  if (error) throw error;
}

export function normalizePatientPhone(input: string): string {
  const raw = input.trim();

  if (!raw || raw.length > 32) {
    throw new Error('Enter a valid mobile number.');
  }

  if (!/^[+\d\s().-]+$/.test(raw)) {
    throw new Error('Enter a valid mobile number.');
  }

  const compact = raw.replace(/[\s().-]/g, '');

  if (compact.startsWith('+')) {
    if (!/^\+[1-9]\d{7,14}$/.test(compact)) {
      throw new Error('Enter a valid mobile number in international format.');
    }
    return compact;
  }

  if (/^[6-9]\d{9}$/.test(compact)) {
    return `+91${compact}`;
  }

  if (/^0[6-9]\d{9}$/.test(compact)) {
    return `+91${compact.slice(1)}`;
  }

  throw new Error('Enter a 10-digit Indian mobile number or a full international number.');
}

export async function requestPatientPhoneOtp(
  phoneInput: string,
  captchaToken?: string | null,
) {
  const supabase = getSupabaseClient();
  const phone = normalizePatientPhone(phoneInput);
  const token = normalizedCaptchaToken(captchaToken);
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: true,
      channel: 'sms',
      data: {
        account_type: 'patient',
      },
      ...(token ? { captchaToken: token } : {}),
    },
  });

  if (error) throw error;
  return { data, phone };
}

export async function verifyPatientPhoneOtp(phoneInput: string, otp: string) {
  const supabase = getSupabaseClient();
  const phone = normalizePatientPhone(phoneInput);
  const token = otp.trim();

  if (!/^\d{6}$/.test(token)) {
    throw new Error('Enter the six-digit verification code.');
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });

  if (error) throw error;
  if (!data.user || !data.session) {
    throw new Error('Phone verification did not establish an authenticated session.');
  }

  return data;
}

export async function resolveAuthenticatedPatient(): Promise<PatientPlatformIdentity> {
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
  if (appUser.role !== 'patient') {
    throw new Error('This authenticated account is not provisioned as a patient.');
  }

  const { data: platformRows, error: platformError } = await supabase.rpc(
    'get_my_platform_patient_identity',
  );

  if (platformError) throw platformError;
  if (!Array.isArray(platformRows) || platformRows.length !== 1) {
    throw new Error('Patient platform identity is missing or inconsistent.');
  }

  const row = platformRows[0] as {
    id?: unknown;
    public_patient_id?: unknown;
    created_at?: unknown;
  };

  if (
    typeof row.id !== 'string' ||
    typeof row.public_patient_id !== 'string' ||
    !/^PAT-\d{12}$/.test(row.public_patient_id) ||
    typeof row.created_at !== 'string'
  ) {
    throw new Error('Patient platform identity is invalid.');
  }

  return {
    id: row.id,
    publicPatientId: row.public_patient_id,
    createdAt: row.created_at,
    userId: userData.user.id,
  };
}

const PATIENT_RETURN_PATHS = new Set(['/', '/find-physio', '/patient']);

function isUnsafeRedirectText(value: string) {
  if (
    value.length > 512 ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value.includes('\\') ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ) {
    return true;
  }

  try {
    const decoded = decodeURIComponent(value);
    return (
      decoded.includes('\\') ||
      decoded.startsWith('//') ||
      /^[a-z][a-z0-9+.-]*:/i.test(decoded)
    );
  } catch {
    return true;
  }
}

export function normalizePatientReturnTarget(
  requestedTarget: string | null | undefined,
  fallback = '/patient',
  origin = window.location.origin,
) {
  if (!PATIENT_RETURN_PATHS.has(fallback)) {
    throw new Error('Unsafe patient return fallback.');
  }

  const value = requestedTarget?.trim();
  if (!value || isUnsafeRedirectText(value)) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(value, origin);
  } catch {
    return fallback;
  }

  if (parsed.origin !== origin || !PATIENT_RETURN_PATHS.has(parsed.pathname)) {
    return fallback;
  }

  return `${parsed.pathname}${parsed.search}`;
}

export async function updatePassword(password: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export function onAuthSessionChange(
  listener: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const supabase = getSupabaseClient();
  const { data } = supabase.auth.onAuthStateChange(listener);
  return () => data.subscription.unsubscribe();
}
