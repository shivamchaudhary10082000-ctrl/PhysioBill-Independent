import { useEffect, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import App from '@/App';
import { PaymentDestinationSettings } from '@/Components/PaymentDestinationSettings';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { WorkspaceSignOut } from '@/Components/WorkspaceSessionControls';
import { AuthPage } from '@/pages/AuthPage';
import { CommunicationsCenterPage } from '@/pages/CommunicationsCenterPage';
import { PatientAppointmentsPage } from '@/pages/PatientAppointmentsPage';
import { PatientGatewayPage } from '@/pages/PatientGatewayPage';
import { PatientSignInPage } from '@/pages/PatientSignInPage';
import { ProfessionalAppointmentRequestsPage } from '@/pages/ProfessionalAppointmentRequestsPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { TherapistAnalyticsPage } from '@/pages/TherapistAnalyticsPage';
import { TherapistAvailabilityPage } from '@/pages/TherapistAvailabilityPage';
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

function PatientSurface({ children, returnTo }: { children: ReactNode; returnTo: string }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-7">
          <a href="/patient"><PhysioBillBrand suffix={<span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">Patient access</span>} /></a>
          <WorkspaceSignOut className="rounded-xl border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-7">
        <a href={returnTo} className="mb-5 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft size={16} /> Back to patient gateway</a>
        {children}
      </main>
    </div>
  );
}

function PatientPersonaGate({ children, returnToPath, loadingMessage, deniedTitle }: { children: ReactNode; returnToPath: string; loadingMessage: string; deniedTitle: string }) {
  const auth = useAuthSession();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.replace(`/patient/sign-in?returnTo=${encodeURIComponent(returnToPath)}`);
    }
  }, [auth.loading, auth.user?.id, returnToPath]);

  if (!auth.configured) return <NotFoundPage />;
  if (auth.loading || !auth.user) return <RouteLoading message={loadingMessage} />;
  if (auth.error) return <SessionResolutionError />;
  if (auth.role !== 'patient') {
    return (
      <PersonaDeniedPage
        title={deniedTitle}
        message="A physiotherapist session cannot use this patient-only surface."
        primaryHref="/app/dashboard"
        primaryLabel="Open professional workspace"
      />
    );
  }

  return <>{children}</>;
}

export function PatientAppointmentsRoute() {
  return (
    <PatientPersonaGate
      returnToPath="/patient/appointments"
      loadingMessage="Checking patient scheduling authority…"
      deniedTitle="Patient appointment requests are not available to this account."
    >
      <PatientSurface returnTo="/patient">
        <PatientAppointmentsPage />
      </PatientSurface>
    </PatientPersonaGate>
  );
}

export function PatientCommunicationsRoute() {
  return (
    <PatientPersonaGate
      returnToPath="/patient/communications"
      loadingMessage="Checking patient communication authority…"
      deniedTitle="Patient communications are not available to this account."
    >
      <PatientSurface returnTo="/patient">
        <CommunicationsCenterPage persona="patient" />
      </PatientSurface>
    </PatientPersonaGate>
  );
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

function ProfessionalSurfaceHeader({ secondaryHref, secondaryLabel }: { secondaryHref: string; secondaryLabel: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur-md">
      <div className="mx-auto flex h-[70px] max-w-[1420px] items-center justify-between gap-3 px-4 sm:px-7 lg:px-10">
        <a href="/app/dashboard">
          <PhysioBillBrand suffix={<span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">Professional workspace</span>} />
        </a>
        <div className="flex items-center gap-2">
          <a href={secondaryHref} className="rounded-xl border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground">{secondaryLabel}</a>
          <WorkspaceSignOut className="rounded-xl border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground" />
        </div>
      </div>
    </header>
  );
}

function ProfessionalPersonaGate({ children, deniedTitle }: { children: ReactNode; deniedTitle: string }) {
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
        title={deniedTitle}
        message="Patient sessions cannot enter professional management or scheduling surfaces."
        primaryHref="/patient"
        primaryLabel="Open patient gateway"
      />
    );
  }

  return <>{children}</>;
}

export function ProfessionalDiscoveryProfileRoute() {
  return (
    <ProfessionalPersonaGate deniedTitle="Professional discovery profile access denied.">
      <div className="min-h-screen bg-background">
        <ProfessionalSurfaceHeader secondaryHref="/app/availability" secondaryLabel="Availability" />
        <main className="mx-auto max-w-[1420px] px-4 pb-24 pt-6 sm:px-7 lg:px-10 lg:pb-10">
          <a href="/app/dashboard" className="mb-5 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft size={16} /> Back to Overview</a>
          <TherapistDiscoveryProfilePage />
        </main>
      </div>
    </ProfessionalPersonaGate>
  );
}

export function ProfessionalAvailabilityRoute() {
  return (
    <ProfessionalPersonaGate deniedTitle="Professional availability access denied.">
      <div className="min-h-screen bg-background">
        <ProfessionalSurfaceHeader secondaryHref="/app/appointment-requests" secondaryLabel="Requests" />
        <main className="mx-auto max-w-[1420px] px-4 pb-24 pt-6 sm:px-7 lg:px-10 lg:pb-10">
          <a href="/app/dashboard" className="mb-5 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft size={16} /> Back to Overview</a>
          <TherapistAvailabilityPage />
        </main>
      </div>
    </ProfessionalPersonaGate>
  );
}

export function ProfessionalAppointmentRequestsRoute() {
  return (
    <ProfessionalPersonaGate deniedTitle="Professional appointment request access denied.">
      <div className="min-h-screen bg-background">
        <ProfessionalSurfaceHeader secondaryHref="/app/availability" secondaryLabel="Availability" />
        <main className="mx-auto max-w-[1420px] px-4 pb-24 pt-6 sm:px-7 lg:px-10 lg:pb-10">
          <a href="/app/dashboard" className="mb-5 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft size={16} /> Back to Overview</a>
          <ProfessionalAppointmentRequestsPage />
        </main>
      </div>
    </ProfessionalPersonaGate>
  );
}

export function ProfessionalPaymentDestinationsRoute() {
  return (
    <ProfessionalPersonaGate deniedTitle="Professional payment destination access denied.">
      <div className="min-h-screen bg-background">
        <ProfessionalSurfaceHeader secondaryHref="/app/financial-ledger" secondaryLabel="Financial ledger" />
        <main className="mx-auto max-w-[1420px] px-4 pb-24 pt-6 sm:px-7 lg:px-10 lg:pb-10">
          <a href="/app/settings" className="mb-5 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft size={16} /> Back to Settings</a>
          <div className="mb-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">Financial routing</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Payment destinations</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Manage only destinations owned by your professional account. Recording a destination does not prove that a payment settled and does not activate an external payment provider.</p>
          </div>
          <PaymentDestinationSettings />
        </main>
      </div>
    </ProfessionalPersonaGate>
  );
}

export function ProfessionalAnalyticsRoute() {
  return (
    <ProfessionalPersonaGate deniedTitle="Professional analytics access denied.">
      <div className="min-h-screen bg-background">
        <ProfessionalSurfaceHeader secondaryHref="/app/dashboard" secondaryLabel="Overview" />
        <main className="mx-auto max-w-[1420px] px-4 pb-24 pt-6 sm:px-7 lg:px-10 lg:pb-10">
          <a href="/app/dashboard" className="mb-5 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft size={16} /> Back to Overview</a>
          <TherapistAnalyticsPage />
        </main>
      </div>
    </ProfessionalPersonaGate>
  );
}

export function ProfessionalCommunicationsRoute() {
  return (
    <ProfessionalPersonaGate deniedTitle="Professional communications access denied.">
      <div className="min-h-screen bg-background">
        <ProfessionalSurfaceHeader secondaryHref="/app/appointment-requests" secondaryLabel="Requests" />
        <main className="mx-auto max-w-[1420px] px-4 pb-24 pt-6 sm:px-7 lg:px-10 lg:pb-10">
          <a href="/app/dashboard" className="mb-5 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft size={16} /> Back to Overview</a>
          <CommunicationsCenterPage persona="physio" />
        </main>
      </div>
    </ProfessionalPersonaGate>
  );
}
