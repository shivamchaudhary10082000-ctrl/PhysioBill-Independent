import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { WorkspaceSignOut } from '@/Components/WorkspaceSessionControls';
import { useAuthSession } from '@/hooks/use-auth-session';
import { PatientClinicalCarePage } from '@/pages/PatientClinicalCarePage';
import { NotFoundPage, PersonaDeniedPage, RouteLoading, SessionResolutionError } from '@/pages/route-boundary/SessionBoundaryPages';

export function PatientClinicalCareRoute() {
  const auth = useAuthSession();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.replace('/patient/sign-in?returnTo=%2Fpatient%2Fclinical-care');
    }
  }, [auth.loading, auth.user?.id]);

  if (!auth.configured) return <NotFoundPage />;
  if (auth.loading || !auth.user) return <RouteLoading message="Checking patient clinical access…" />;
  if (auth.error) return <SessionResolutionError />;
  if (auth.role !== 'patient') {
    return (
      <PersonaDeniedPage
        title="Patient clinical access is not available to this account."
        message="A physiotherapist session cannot enter the patient clinical-care surface."
        primaryHref="/app/dashboard"
        primaryLabel="Open professional workspace"
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-7">
          <a href="/patient"><PhysioBillBrand suffix={<span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">Patient access</span>} /></a>
          <WorkspaceSignOut className="rounded-xl border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-7">
        <a href="/patient" className="mb-5 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowLeft size={16} /> Back to patient gateway</a>
        <PatientClinicalCarePage />
      </main>
    </div>
  );
}
