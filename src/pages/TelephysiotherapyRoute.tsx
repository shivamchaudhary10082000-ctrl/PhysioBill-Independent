import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { WorkspaceSignOut } from '@/Components/WorkspaceSessionControls';
import { useAuthSession } from '@/hooks/use-auth-session';
import { TelephysiotherapySessionsPage } from '@/pages/TelephysiotherapySessionsPage';
import {
  NotFoundPage,
  PersonaDeniedPage,
  RouteLoading,
  SessionResolutionError,
} from '@/pages/route-boundary/SessionBoundaryPages';
import {
  loadTelephysiotherapyLocale,
  telephysiotherapyCopy,
} from '@/lib/telephysiotherapy-locale';
import { DEFAULT_LOCALE, type SupportedLocale } from '@/lib/locale';

const actionFocusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function TelephysiotherapyRoute({ persona }: { persona: 'patient' | 'physio' }) {
  const auth = useAuthSession();
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const copy = useMemo(() => telephysiotherapyCopy(locale), [locale]);
  const signInPath = persona === 'patient' ? '/patient/sign-in?returnTo=%2Fpatient%2Ftelephysiotherapy' : '/professional/sign-in';

  useEffect(() => {
    if (!auth.loading && !auth.user) window.location.replace(signInPath);
  }, [auth.loading, auth.user?.id, signInPath]);

  useEffect(() => {
    let active = true;
    if (!auth.loading && auth.user) {
      void loadTelephysiotherapyLocale().then((resolved) => {
        if (active) setLocale(resolved);
      });
    }
    return () => { active = false; };
  }, [auth.loading, auth.user?.id]);

  if (!auth.configured) return <NotFoundPage />;
  if (auth.loading || !auth.user) return <RouteLoading message={copy.checkingAuthority} />;
  if (auth.error) return <SessionResolutionError />;
  if (auth.passwordRecovery) return <NotFoundPage />;
  if (auth.role !== persona) {
    return (
      <PersonaDeniedPage
        title={copy.accessDenied}
        message={persona === 'patient' ? copy.physioDenied : copy.patientDenied}
        primaryHref={auth.role === 'patient' ? '/patient' : '/app/dashboard'}
        primaryLabel={auth.role === 'patient' ? copy.openPatientGateway : copy.openProfessionalWorkspace}
      />
    );
  }

  const isPatient = persona === 'patient';
  const returnPath = isPatient ? '/patient' : '/app/dashboard';
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex min-h-[70px] max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-7">
          <a href={returnPath} className={`min-w-0 rounded-xl ${actionFocusClass}`} aria-label={isPatient ? copy.openPatientGateway : copy.openProfessionalWorkspace}>
            <PhysioBillBrand suffix={<span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">{isPatient ? copy.patientAccess : copy.professionalWorkspace}</span>} />
          </a>
          <WorkspaceSignOut className={`min-h-11 rounded-xl border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground ${actionFocusClass}`} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-7">
        <a href={returnPath} className={`mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground ${actionFocusClass}`}>
          <ArrowLeft size={16} aria-hidden="true" /> {isPatient ? copy.backPatient : copy.backProfessional}
        </a>
        <TelephysiotherapySessionsPage persona={persona} />
      </main>
    </div>
  );
}
