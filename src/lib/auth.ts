import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';

export type AuthSessionState = {
  session: Session | null;
  user: User | null;
};

export const PASSWORD_RECOVERY_PATH = '/auth/reset-password';

export async function getAuthSession(): Promise<AuthSessionState> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  return {
    session: data.session,
    user: data.session?.user ?? null,
  };
}

export async function registerPhysiotherapist(
  email: string,
  password: string,
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        account_type: 'physio',
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signInPhysiotherapist(
  email: string,
  password: string,
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;
  return data;
}

export async function signInAdmin(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOutPhysiotherapist() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const supabase = getSupabaseClient();
  const redirectTo = new URL(
    PASSWORD_RECOVERY_PATH,
    window.location.origin,
  ).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (error) throw error;
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
