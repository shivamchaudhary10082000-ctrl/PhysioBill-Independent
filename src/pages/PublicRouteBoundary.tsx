import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import App from '@/App';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { WorkspaceSignOut } from '@/Components/WorkspaceSessionControls';
import { AuthPage } from '@/pages/AuthPage';
import { PublicLandingPage } from '@/pages/PublicLandingPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { TherapistDiscoveryPage } from '@/pages/TherapistDiscoveryPage';
import { TherapistDiscoveryProfilePage } from '@/pages/TherapistDiscoveryProfilePage';
import { AdminSignInPage } from '@/pages/AdminSignInPage';
import { AdminVerificationsPage } from '@/pages/AdminVerificationsPage';
import { AdminVerificationReviewPage } from '@/pages/AdminVerificationReviewPage';
import { useAuthSession } from '@/hooks/use-auth-session';
import { PASSWORD_RECOVERY_PATH, signOutPhysiotherapist } from '@/lib/auth';

function RouteLoading({ message }: { message: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div>
        <PhysioBillBrand className="justify-center" showWordmark={false} />
        <p className="mt-4 text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function ProfessionalSignInRoute() {
  const auth = useAuthSession();

  useEffect(() => {
    if (auth.user && !auth.passwordRecovery) {
      window.location.replace('/app/dashboard');
    }
  }, [auth.passwordRecovery, auth.user?.id]);

  if (!auth.configured || auth.error) return <App />;
  if (auth.loading) return <RouteLoading message="Restoring secure session…" />;
  if (auth.user) return <RouteLoading message="Opening your private workspace…" />;

  const recoveryComplete = new URLSearchParams(window.location.search).get('recovery') === 'complete';
  return <AuthPage notice={recoveryComplete ? 'Password updated. Sign in with your new password.' : null} />;
}

function PasswordRecoveryRoute() {
  const auth = useAuthSession();

  if (!auth.configured) return <App />;
  if (auth.loading) return <RouteLoading message="Restoring secure recovery session…" />;

  return (
    <ResetPasswordPage
      recoveryReady={auth.passwordRecovery && Boolean(auth.user)}
      recoveryError={auth.error}
      onComplete={() => window.location.replace('/professional/sign-in?recovery=complete')}
      onCancel={() => {
        const returnToProfessionalSignIn = () => window.location.replace('/professional/sign-in');
        if (auth.passwordRecovery && auth.user) {
          void signOutPhysiotherapist().finally(returnToProfessionalSignIn);
          return;
        }
        returnToProfessionalSignIn();
      }}
    />
  );
}

function ProfessionalDiscoveryProfileRoute() {
  const auth = useAuthSession();

  if (!auth.configured || auth.error || auth.passwordRecovery) return <App />;
  if (auth.loading) return <RouteLoading message="Restoring secure session…" />;
  if (!auth.user) return <App />;

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

function AdminSignInRoute() {
  const auth = useAuthSession();

  useEffect(() => {
    if (auth.user && !auth.passwordRecovery) {
      window.location.replace('/admin/verifications');
    }
  }, [auth.passwordRecovery, auth.user?.id]);

  if (!auth.configured || auth.error) return <NotFoundPage />;
  if (auth.loading) return <RouteLoading message="Restoring secure Admin session…" />;
  if (auth.user) return <RouteLoading message="Opening restricted verification review…" />;
  return <AdminSignInPage />;
}

function AdminVerificationRoute({ requestId }: { requestId?: string }) {
  const auth = useAuthSession();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.replace('/admin/sign-in');
    }
  }, [auth.loading, auth.user?.id]);

  if (!auth.configured || auth.error || auth.passwordRecovery) return <NotFoundPage />;
  if (auth.loading || !auth.user) return <RouteLoading message="Checking reviewer authority…" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex h-[70px] max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-7">
          <a href="/admin/verifications"><PhysioBillBrand suffix={<span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">Verification administration</span>} /></a>
          <WorkspaceSignOut className="rounded-xl border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground" />
        </div>
      </header>
      <main className="mx-auto max-w-[1180px] px-4 pb-20 pt-7 sm:px-7">
        {requestId ? <AdminVerificationReviewPage requestId={requestId} /> : <AdminVerificationsPage />}
      </main>
    </div>
  );
}

function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-xl rounded-[30px] border bg-card p-7 text-center shadow-[0_18px_50px_hsl(var(--foreground)/.05)] sm:p-10">
        <PhysioBillBrand className="justify-center" showWordmark={false} />
        <p className="mt-5 text-sm font-semibold text-primary">PhysioBill</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em]">Page not found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">This route is not available. Return to the public PhysioBill entrance or use professional access.</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <a href="/" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[hsl(var(--primary-hover))]">Back to PhysioBill</a>
          <a href="/professional/sign-in" className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-4 text-sm font-semibold hover:bg-secondary">Professional sign in</a>
        </div>
      </section>
    </main>
  );
}

const PRIVATE_ROUTE_PREFIXES = [
  '/app/dashboard',
  '/app/overview',
  '/app/patients',
  '/app/visits',
  '/app/clinical-records',
  '/app/invoices',
  '/app/invoice',
  '/app/financial-ledger',
  '/app/profile',
  '/app/discovery-profile',
  '/app/settings',
] as const;

function isSupportedPrivateRoute(path: string) {
  return (
    path === '/app' ||
    PRIVATE_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  );
}

export function PublicRouteBoundary() {
  const path = window.location.pathname;

  if (path === '/') return <PublicLandingPage />;
  if (path === '/find-physio') return <TherapistDiscoveryPage />;
  if (path === '/professional/sign-in') return <ProfessionalSignInRoute />;
  if (path === '/admin/sign-in') return <AdminSignInRoute />;
  if (path === '/admin/verifications') return <AdminVerificationRoute />;
  if (path.startsWith('/admin/verifications/')) {
    const requestId = path.slice('/admin/verifications/'.length);
    return requestId ? <AdminVerificationRoute requestId={requestId} /> : <NotFoundPage />;
  }
  if (path === PASSWORD_RECOVERY_PATH) return <PasswordRecoveryRoute />;
  if (path === '/app/discovery-profile') return <ProfessionalDiscoveryProfileRoute />;
  if (isSupportedPrivateRoute(path)) return <App />;

  return <NotFoundPage />;
}
