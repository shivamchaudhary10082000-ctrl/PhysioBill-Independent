import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  loadPhysiotherapistProfile,
  loadPhysiotherapistSettings,
  resolveAuthenticatedPhysiotherapist,
  type PhysiotherapistProfileRecord,
  type PhysiotherapistSettingsRecord,
  type PhysiotherapistWorkspaceBootstrap,
} from '@/lib/workspace';

export type PhysioBootstrapState = {
  loading: boolean;
  workspace: PhysiotherapistWorkspaceBootstrap | null;
  profile: PhysiotherapistProfileRecord | null;
  settings: PhysiotherapistSettingsRecord | null;
  error: string | null;
};

export function usePhysioBootstrap(user: User | null): PhysioBootstrapState {
  const [state, setState] = useState<PhysioBootstrapState>({
    loading: Boolean(user),
    workspace: null,
    profile: null,
    settings: null,
    error: null,
  });

  useEffect(() => {
    let active = true;

    if (!user) {
      setState({
        loading: false,
        workspace: null,
        profile: null,
        settings: null,
        error: null,
      });
      return () => {
        active = false;
      };
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    resolveAuthenticatedPhysiotherapist()
      .then(async (workspace) => {
        const [profile, settings] = await Promise.all([
          loadPhysiotherapistProfile(workspace.physioId),
          loadPhysiotherapistSettings(workspace.physioId),
        ]);

        if (!active) return;
        setState({
          loading: false,
          workspace,
          profile,
          settings,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          loading: false,
          workspace: null,
          profile: null,
          settings: null,
          error: error instanceof Error ? error.message : 'Unable to load the physiotherapist workspace.',
        });
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  return state;
}
