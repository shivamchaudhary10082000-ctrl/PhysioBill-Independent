import { useState } from 'react';
import { ArrowLeft, BadgeCheck, LogOut } from 'lucide-react';
import { signOutPhysiotherapist } from '@/lib/auth';

function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function WorkspaceSignOut({
  className = '',
}: {
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inWorkspace = window.location.pathname.startsWith('/app/');
  const onDiscoveryProfile = window.location.pathname === '/app/discovery-profile';

  const signOut = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOutPhysiotherapist();
      window.location.replace('/');
    } catch {
      setError('Unable to sign out. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div>
      {inWorkspace && !onDiscoveryProfile && (
        <button
          type="button"
          onClick={() => navigate('/app/discovery-profile')}
          className="mb-2 inline-flex items-center gap-2 text-xs font-bold opacity-80 transition hover:opacity-100"
        >
          <BadgeCheck size={14} /> Discovery profile
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        onClick={() => void signOut()}
        className={`inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <LogOut size={14} /> {busy ? 'Signing out…' : 'Sign out'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function GatewaySessionControls({
  backPath,
  backLabel,
}: {
  backPath: string;
  backLabel: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <button
        type="button"
        onClick={() => navigate(backPath)}
        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
      >
        <ArrowLeft size={16} /> {backLabel}
      </button>
      <WorkspaceSignOut className="rounded-xl border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground" />
    </div>
  );
}
