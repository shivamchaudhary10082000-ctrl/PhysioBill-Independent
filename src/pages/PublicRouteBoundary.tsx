import { useEffect } from 'react';
import { HeartPulse } from 'lucide-react';
import App from '@/App';
import { AuthPage } from '@/pages/AuthPage';
import { PublicLandingPage } from '@/pages/PublicLandingPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { TherapistDiscoveryPage } from '@/pages/TherapistDiscoveryPage';
import { useAuthSession } from '@/hooks/use-auth-session';
import { PASSWORD_RECOVERY_PATH, signOutPhysiotherapist } from '@/lib/auth';

function RouteLoading({ message }: { message: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><HeartPulse size={21} /></span>
        <p className="mt-4 text-sm font-semibold text-muted-foreground">{message}</p>
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

function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-xl rounded-[30px] border bg-card p-7 text-center shadow-sm sm:p-10">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><HeartPulse size={22} /></span>
        <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">PhysioBill</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Page not found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">This route is not available. Return to the public PhysioBill entrance or use professional access.</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <a href="/" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground">Back to PhysioBill</a>
          <a href="/professional/sign-in" className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-4 text-sm font-extrabold">Professional sign in</a>
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
  if (path === PASSWORD_RECOVERY_PATH) return <PasswordRecoveryRoute />;
  if (isSupportedPrivateRoute(path)) return <App />;

  return <NotFoundPage />;
}
