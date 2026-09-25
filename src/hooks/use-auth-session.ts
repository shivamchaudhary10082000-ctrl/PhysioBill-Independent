import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  getAuthSession,
  onAuthSessionChange,
  resolveAuthenticatedSessionPersona,
  type PersistedAccountRole,
} from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export type AuthSessionView = {
  loading: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  role: PersistedAccountRole | null;
  passwordRecovery: boolean;
  error: string | null;
};

export function useAuthSession(): AuthSessionView {
  const [state, setState] = useState<AuthSessionView>({
    loading: isSupabaseConfigured,
    configured: isSupabaseConfigured,
    session: null,
    user: null,
    role: null,
    passwordRecovery: false,
    error: null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;
    let resolutionGeneration = 0;
    let passwordRecovery = false;
    let deferredTimer: number | null = null;

    const resolveSession = (
      session: Session | null,
      event?: 'PASSWORD_RECOVERY' | 'SIGNED_OUT' | null,
    ) => {
      if (event === 'PASSWORD_RECOVERY') passwordRecovery = true;
      if (event === 'SIGNED_OUT') passwordRecovery = false;

      const generation = ++resolutionGeneration;

      if (!session) {
        setState({
          loading: false,
          configured: true,
          session: null,
          user: null,
          role: null,
          passwordRecovery,
          error: null,
        });
        return;
      }

      setState({
        loading: true,
        configured: true,
        session,
        user: session.user,
        role: null,
        passwordRecovery,
        error: null,
      });

      // Supabase warns against making other Auth calls from inside the
      // onAuthStateChange callback. Deferring persona resolution until the
      // callback returns avoids lock re-entry while still re-resolving the
      // database-backed role on every restored/refreshed session.
      deferredTimer = window.setTimeout(() => {
        void resolveAuthenticatedSessionPersona()
          .then((role) => {
            if (!active || generation !== resolutionGeneration) return;
            setState({
              loading: false,
              configured: true,
              session,
              user: session.user,
              role,
              passwordRecovery,
              error: null,
            });
          })
          .catch((error: unknown) => {
            if (!active || generation !== resolutionGeneration) return;
            setState({
              loading: false,
              configured: true,
              session,
              user: session.user,
              role: null,
              passwordRecovery,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unable to resolve the authenticated account persona.',
            });
          });
      }, 0);
    };

    // Subscribe before restoring the session so the one-time recovery event
    // emitted while Supabase processes the callback cannot be missed.
    const unsubscribe = onAuthSessionChange((event, session) => {
      if (!active) return;
      resolveSession(
        session,
        event === 'PASSWORD_RECOVERY'
          ? 'PASSWORD_RECOVERY'
          : event === 'SIGNED_OUT'
            ? 'SIGNED_OUT'
            : null,
      );
    });

    getAuthSession()
      .then(({ session }) => {
        if (!active) return;
        resolveSession(session);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          loading: false,
          configured: true,
          session: null,
          user: null,
          role: null,
          passwordRecovery,
          error: error instanceof Error ? error.message : 'Unable to restore the session.',
        });
      });

    return () => {
      active = false;
      resolutionGeneration += 1;
      if (deferredTimer !== null) window.clearTimeout(deferredTimer);
      unsubscribe();
    };
  }, []);

  return state;
}
