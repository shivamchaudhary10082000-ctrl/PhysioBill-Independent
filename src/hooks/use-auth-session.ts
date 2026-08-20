import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getAuthSession, onAuthSessionChange } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export type AuthSessionView = {
  loading: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  error: string | null;
};

export function useAuthSession(): AuthSessionView {
  const [state, setState] = useState<AuthSessionView>({
    loading: isSupabaseConfigured,
    configured: isSupabaseConfigured,
    session: null,
    user: null,
    error: null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;

    getAuthSession()
      .then(({ session, user }) => {
        if (!active) return;
        setState({
          loading: false,
          configured: true,
          session,
          user,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          loading: false,
          configured: true,
          session: null,
          user: null,
          error: error instanceof Error ? error.message : 'Unable to restore the session.',
        });
      });

    const unsubscribe = onAuthSessionChange((_event, session) => {
      if (!active) return;
      setState({
        loading: false,
        configured: true,
        session,
        user: session?.user ?? null,
        error: null,
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return state;
}
