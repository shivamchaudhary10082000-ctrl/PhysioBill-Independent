import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { WorkspaceSignOut } from '@/Components/WorkspaceSessionControls';
import { useAuthSession } from '@/hooks/use-auth-session';
import { PatientClinicalCarePage } from '@/pages/PatientClinicalCarePage';
import { NotFoundPage, PersonaDeniedPage, RouteLoading, SessionResolutionError } from '@/pages/route-boundary/SessionBoundaryPages';

const routeFocusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

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
        <div className="mx-auto flex min-h-[70px] max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-7">
          <a href="/patient" aria-label="PhysioBill patient gateway" className={`inline-flex min-h-11 min-w-11 items-center rounded-xl ${routeFocusClass}`}><PhysioBillBrand suffix={<span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">Patient access</span>} /></a>
          <WorkspaceSignOut className={`min-h-11 rounded-xl border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground ${routeFocusClass}`} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-7">
        <a href="/patient" className={`mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground ${routeFocusClass}`}><ArrowLeft size={16} aria-hidden="true" /> Back to patient gateway</a>
        <PatientClinicalCarePage />
      </main>
    </div>
  );
}
