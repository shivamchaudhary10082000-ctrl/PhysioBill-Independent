import { useEffect, useState } from 'react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { WorkspaceSignOut } from '@/Components/WorkspaceSessionControls';
import { AdminSignInPage } from '@/pages/AdminSignInPage';
import { AdminMfaPage } from '@/pages/AdminMfaPage';
import { AdminVerificationsPage } from '@/pages/AdminVerificationsPage';
import { AdminVerificationReviewPage } from '@/pages/AdminVerificationReviewPage';
import { useAuthSession } from '@/hooks/use-auth-session';
import { loadAdminSecurityState } from '@/lib/auth';
import {
  NotFoundPage,
  PersonaDeniedPage,
  RouteLoading,
  SessionResolutionError,
} from '@/pages/route-boundary/SessionBoundaryPages';

export function AdminSignInRoute() {
  const auth = useAuthSession();

  useEffect(() => {
    if (!auth.error && auth.user && auth.role === 'physio' && !auth.passwordRecovery) {
      window.location.replace('/admin/mfa');
    }
  }, [auth.error, auth.passwordRecovery, auth.role, auth.user?.id]);

  if (!auth.configured) return <NotFoundPage />;
  if (auth.loading) return <RouteLoading message="Restoring secure Admin session…" />;
  if (auth.error) return <SessionResolutionError />;
  if (auth.user && auth.role === 'patient') {
    return (
      <PersonaDeniedPage
        title="Patient sessions cannot enter administration."
        message="Admin reviewer authority remains a separate database-controlled boundary."
        primaryHref="/patient"
        primaryLabel="Open patient gateway"
      />
    );
  }
  if (auth.user) return <RouteLoading message="Opening restricted verification review…" />;
  return <AdminSignInPage />;
}

export function AdminMfaRoute() {
  const auth = useAuthSession();

  useEffect(() => {
    if (!auth.loading && !auth.error && !auth.user) {
      window.location.replace('/admin/sign-in');
    }
  }, [auth.error, auth.loading, auth.user?.id]);

  if (!auth.configured || auth.passwordRecovery) return <NotFoundPage />;
  if (auth.loading) return <RouteLoading message="Checking Admin session…" />;
  if (auth.error) return <SessionResolutionError />;
  if (!auth.user) return <RouteLoading message="Opening Admin sign-in…" />;
  if (auth.role !== 'physio') {
    return (
      <PersonaDeniedPage
        title="Administration access denied."
        message="Patient sessions cannot enter the Admin security surface."
        primaryHref="/patient"
        primaryLabel="Open patient gateway"
      />
    );
  }

  return <AdminMfaPage />;
}

export function AdminVerificationRoute({ requestId }: { requestId?: string }) {
  const auth = useAuthSession();
  const [adminGate, setAdminGate] = useState<'checking' | 'ready' | 'denied' | 'error'>('checking');

  useEffect(() => {
    if (!auth.loading && !auth.error && !auth.user) {
      window.location.replace('/admin/sign-in');
    }
  }, [auth.error, auth.loading, auth.user?.id]);

  useEffect(() => {
    if (auth.loading || auth.error || !auth.user || auth.role !== 'physio') return;

    let active = true;
    setAdminGate('checking');
    loadAdminSecurityState()
      .then((state) => {
        if (!active) return;
        if (!state) {
          setAdminGate('denied');
          return;
        }
        if (state.currentAal !== 'aal2') {
          window.location.replace('/admin/mfa');
          return;
        }
        setAdminGate('ready');
      })
      .catch(() => {
        if (active) setAdminGate('error');
      });

    return () => {
      active = false;
    };
  }, [auth.error, auth.loading, auth.role, auth.user?.id]);

  if (!auth.configured || auth.passwordRecovery) return <NotFoundPage />;
  if (auth.loading || adminGate === 'checking') return <RouteLoading message="Checking reviewer authority and MFA…" />;
  if (auth.error || adminGate === 'error') return <SessionResolutionError />;
  if (!auth.user) return <RouteLoading message="Opening Admin sign-in…" />;
  if (auth.role !== 'physio' || adminGate === 'denied') {
    return (
      <PersonaDeniedPage
        title="Administration access denied."
        message="This account does not have active Admin reviewer authority."
        primaryHref="/app"
        primaryLabel="Open professional workspace"
      />
    );
  }

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
