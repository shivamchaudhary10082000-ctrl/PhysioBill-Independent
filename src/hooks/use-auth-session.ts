import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getAuthSession, onAuthSessionChange } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export type AuthSessionView = {
  loading: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  passwordRecovery: boolean;
  error: string | null;
};

export function useAuthSession(): AuthSessionView {
  const [state, setState] = useState<AuthSessionView>({
    loading: isSupabaseConfigured,
    configured: isSupabaseConfigured,
    session: null,
    user: null,
    passwordRecovery: false,
    error: null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;

    // Subscribe before restoring the session so the one-time recovery event
    // emitted while Supabase processes the callback cannot be missed.
    const unsubscribe = onAuthSessionChange((event, session) => {
      if (!active) return;
      setState((current) => ({
        loading: false,
        configured: true,
        session,
        user: session?.user ?? null,
        passwordRecovery:
          event === 'PASSWORD_RECOVERY'
            ? true
            : event === 'SIGNED_OUT'
              ? false
              : current.passwordRecovery,
        error: null,
      }));
    });

    getAuthSession()
      .then(({ session, user }) => {
        if (!active) return;
        setState((current) => ({
          loading: false,
          configured: true,
          session,
          user,
          passwordRecovery: current.passwordRecovery,
          error: null,
        }));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState((current) => ({
          loading: false,
          configured: true,
          session: null,
          user: null,
          passwordRecovery: current.passwordRecovery,
          error: error instanceof Error ? error.message : 'Unable to restore the session.',
        }));
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return state;
}
