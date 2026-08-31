import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  HeartPulse,
  LogOut,
  MessageCircle,
  Video,
  WalletCards,
} from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import {
  resolveAuthenticatedPatient,
  signOutCurrentSession,
  type PatientPlatformIdentity,
} from '@/lib/auth';
import { DEFAULT_LOCALE, loadPreferredLocale, type SupportedLocale } from '@/lib/locale';
import { patientGatewayMessage } from '@/lib/patient-gateway-locale';

export function PatientGatewayPage() {
  const [identity, setIdentity] = useState<PatientPlatformIdentity | null>(null);
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const t = (key: Parameters<typeof patientGatewayMessage>[1]) => patientGatewayMessage(locale, key);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void loadPreferredLocale()
      .then((preferredLocale) => {
        if (active) setLocale(preferredLocale);
      })
      .catch(() => {
        if (active) setLocale(DEFAULT_LOCALE);
      });

    resolveAuthenticatedPatient()
      .then((resolved) => {
        if (active) setIdentity(resolved);
      })
      .catch(() => {
        if (active) {
          setIdentity(null);
          setError(patientGatewayMessage(locale, 'identityError'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    setError(null);
    try {
      await signOutCurrentSession();
      window.location.replace('/');
    } catch {
      setError(t('signOutError'));
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-center" aria-busy="true">
        <div>
          <PhysioBillBrand className="justify-center" showWordmark={false} />
          <p className="mt-4 text-sm font-medium text-muted-foreground">{t('resolvingIdentity')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <section className="mx-auto w-full max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <a href="/" aria-label={t('publicHomeAria')}><PhysioBillBrand /></a>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void signOut()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <LogOut size={15} aria-hidden="true" /> {signingOut ? t('signingOut') : t('signOut')}
          </button>
        </div>

        <div className="mt-8 rounded-[30px] border bg-card p-6 shadow-[0_18px_50px_hsl(var(--foreground)/.05)] sm:mt-10 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
            <BadgeCheck size={15} aria-hidden="true" /> {t('authenticatedPatient')}
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-.035em]">{t('headline')}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            {t('description')}
          </p>

          {identity && (
            <div className="mt-7 rounded-2xl border bg-secondary/40 p-5">
              <p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">{t('publicPatientIdentifier')}</p>
              <p className="mt-2 break-all font-mono text-base font-semibold tracking-wide sm:text-lg">{identity.publicPatientId}</p>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <nav className="mt-7" aria-label={t('workspaceAria')}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <a href="/find-physio" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[hsl(var(--primary-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ArrowLeft size={16} aria-hidden="true" /> {t('findPhysio')}
              </a>
              <a href="/patient/appointments" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-center text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <CalendarClock size={16} aria-hidden="true" /> {t('appointmentRequests')}
              </a>
              <a href="/patient/communications" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-center text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <MessageCircle size={16} aria-hidden="true" /> {t('updatesReminders')}
              </a>
              <a href="/patient/telephysiotherapy" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-center text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Video size={16} aria-hidden="true" /> {t('telephysiotherapy')}
              </a>
              <a href="/patient/clinical-care" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-center text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <HeartPulse size={16} aria-hidden="true" /> {t('linkedClinicalCare')}
              </a>
              <a href="/patient/financial-summary" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-center text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <WalletCards size={16} aria-hidden="true" /> {t('financialSummary')}
              </a>
            </div>
          </nav>

          <div className="mt-6 border-t pt-5 text-center">
            <a href="/" className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {t('publicHome')}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
