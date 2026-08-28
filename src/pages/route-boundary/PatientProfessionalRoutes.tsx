import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import App from '@/App';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { WorkspaceSignOut } from '@/Components/WorkspaceSessionControls';
import { AuthPage } from '@/pages/AuthPage';
import { PatientGatewayPage } from '@/pages/PatientGatewayPage';
import { PatientSignInPage } from '@/pages/PatientSignInPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { TherapistDiscoveryProfilePage } from '@/pages/TherapistDiscoveryProfilePage';
import { useAuthSession } from '@/hooks/use-auth-session';
import {
  PASSWORD_RECOVERY_PATH,
  signOutCurrentSession,
} from '@/lib/auth';
import {
  NotFoundPage,
  PersonaDeniedPage,
  RouteLoading,
  SessionResolutionError,
} from '@/pages/route-boundary/SessionBoundaryPages';

export function ProfessionalSignInRoute() {
  const auth = useAuthSession();

  useEffect(() => {
    if (auth.loading || !auth.user || auth.passwordRecovery || !auth.role) return;
    window.location.replace(auth.role === 'patient' ? '/patient' : '/app/dashboard');
  }, [auth.loading, auth.passwordRecovery, auth.role, auth.user?.id]);

  if (!auth.configured) return <App />;
  if (auth.loading) return <RouteLoading message="Restoring secure session…" />;
  if (auth.error) return <SessionResolutionError />;
  if (auth.user) return <RouteLoading message="Opening the correct account surface…" />;

  const recoveryComplete = new URLSearchParams(window.location.search).get('recovery') === 'complete';
  return <AuthPage notice={recoveryComplete ? 'Password updated. Sign in with your new password.' : null} />;
}

export function PatientSignInRoute() {
  const auth = useAuthSession();

  useEffect(() => {
    if (!auth.loading && auth.user && auth.role === 'patient') {
      window.location.replace('/patient');
    }
  }, [auth.loading, auth.role, auth.user?.id]);

  if (!auth.configured) return <NotFoundPage />;
  if (auth.loading) return <RouteLoading message="Restoring secure patient session…" />;
  if (auth.error) return <SessionResolutionError />;
  if (auth.user && auth.role === 'physio') {
    return (
      <PersonaDeniedPage
        title="A professional session is already active."
        message="Patient access cannot reuse a persisted physiotherapist persona. Sign out before authenticating a different patient identity."
        primaryHref="/app/dashboard"
        primaryLabel="Open professional workspace"
      />
    );
  }
  if (auth.user) return <RouteLoading message="Opening patient access…" />;

  return <PatientSignInPage />;
}

export function PatientGatewayRoute() {
  const auth = useAuthSession();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.replace('/patient/sign-in?returnTo=%2Fpatient');
    }
  }, [auth.loading, auth.user?.id]);

  if (!auth.configured) return <NotFoundPage />;
  if (auth.loading || !auth.user) return <RouteLoading message="Checking patient session…" />;
  if (auth.error) return <SessionResolutionError />;
  if (auth.role !== 'patient') {
    return (
      <PersonaDeniedPage
        title="This route is patient-only."
        message="A physiotherapist session cannot be treated as a patient session and receives no PAT through this gateway."
        primaryHref="/app/dashboard"
        primaryLabel="Open professional workspace"
      />
    );
  }

  return <PatientGatewayPage />;
}

export function PasswordRecoveryRoute() {
  const auth = useAuthSession();

  if (!auth.configured) return <App />;
  if (auth.loading) return <RouteLoading message="Restoring secure recovery session…" />;
  if (auth.error) return <SessionResolutionError />;
  if (auth.user && auth.role === 'patient') {
    return (
      <PersonaDeniedPage
        title="Password recovery is not a patient authentication path."
        message="Patient authentication remains passwordless. This recovery route is reserved for professional accounts."
        primaryHref="/patient"
        primaryLabel="Open patient gateway"
      />
    );
  }

  return (
    <ResetPasswordPage
      recoveryReady={
        auth.passwordRecovery &&
        Boolean(auth.user) &&
        auth.role === 'physio'
      }
      recoveryError={auth.error}
      onComplete={() => window.location.replace('/professional/sign-in?recovery=complete')}
      onCancel={() => {
        const returnToProfessionalSignIn = () => window.location.replace('/professional/sign-in');
        if (auth.passwordRecovery && auth.user) {
          void signOutCurrentSession().finally(returnToProfessionalSignIn);
          return;
        }
        returnToProfessionalSignIn();
      }}
    />
  );
}

export function ProfessionalWorkspaceRoute() {
  const auth = useAuthSession();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.replace('/professional/sign-in');
    }
  }, [auth.loading, auth.user?.id]);

  if (!auth.configured) return <App />;
  if (auth.loading || !auth.user) return <RouteLoading message="Checking professional workspace authority…" />;
  if (auth.error) return <SessionResolutionError />;
  if (auth.passwordRecovery) {
    window.location.replace(PASSWORD_RECOVERY_PATH);
    return <RouteLoading message="Opening password recovery…" />;
  }
  if (auth.role !== 'physio') {
    return (
      <PersonaDeniedPage
        title="The professional workspace is not available to this account."
        message="A persisted patient persona cannot enter physiotherapist clinical or financial routes."
        primaryHref="/patient"
        primaryLabel="Open patient gateway"
      />
    );
  }

  return <App />;
}

export function ProfessionalDiscoveryProfileRoute() {
  const auth = useAuthSession();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.replace('/professional/sign-in');
    }
  }, [auth.loading, auth.user?.id]);

  if (!auth.configured || auth.passwordRecovery) return <NotFoundPage />;
  if (auth.loading || !auth.user) return <RouteLoading message="Restoring secure session…" />;
  if (auth.error) return <SessionResolutionError />;
  if (auth.role !== 'physio') {
    return (
      <PersonaDeniedPage
        title="Professional discovery profile access denied."
        message="Patient sessions cannot enter professional profile management."
        primaryHref="/patient"
        primaryLabel="Open patient gateway"
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex h-[70px] max-w-[1420px] items-center justify-between gap-3 px-4 sm:px-7 lg:px-10">
          <a href="/app/dashboard">
            <PhysioBillBrand suffix={<span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">Professional workspace</span>} />
          </a>
          <WorkspaceSignOut className="rounded-xl border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground" />
        </div>
      </header>
      <main className="mx-auto max-w-[1420px] px-4 pb-24 pt-6 sm:px-7 lg:px-10 lg:pb-10">
        <a href="/app/dashboard" className="mb-5 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft size={16} /> Back to Overview</a>
        <TherapistDiscoveryProfilePage />
      </main>
    </div>
  );
}
