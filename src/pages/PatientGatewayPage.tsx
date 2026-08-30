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

export function PatientGatewayPage() {
  const [identity, setIdentity] = useState<PatientPlatformIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    resolveAuthenticatedPatient()
      .then((resolved) => {
        if (active) setIdentity(resolved);
      })
      .catch(() => {
        if (active) {
          setIdentity(null);
          setError('Patient identity could not be resolved safely.');
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
      setError('Unable to sign out. Please try again.');
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-center" aria-busy="true">
        <div>
          <PhysioBillBrand className="justify-center" showWordmark={false} />
          <p className="mt-4 text-sm font-medium text-muted-foreground">Resolving patient identity…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <section className="mx-auto w-full max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <a href="/" aria-label="PhysioBill public home"><PhysioBillBrand /></a>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void signOut()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <LogOut size={15} aria-hidden="true" /> {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>

        <div className="mt-8 rounded-[30px] border bg-card p-6 shadow-[0_18px_50px_hsl(var(--foreground)/.05)] sm:mt-10 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
            <BadgeCheck size={15} aria-hidden="true" /> Authenticated patient
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-.035em]">Your care, appointments and billing in one place.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            Find verified physiotherapists and manage the parts of your care that your authenticated patient identity is allowed to access. Therapist-private clinical notes, draft billing and payment-provider identifiers remain protected.
          </p>

          {identity && (
            <div className="mt-7 rounded-2xl border bg-secondary/40 p-5">
              <p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Public patient identifier</p>
              <p className="mt-2 break-all font-mono text-base font-semibold tracking-wide sm:text-lg">{identity.publicPatientId}</p>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <nav className="mt-7" aria-label="Patient workspace">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <a href="/find-physio" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[hsl(var(--primary-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ArrowLeft size={16} aria-hidden="true" /> Find a physiotherapist
              </a>
              <a href="/patient/appointments" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-center text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <CalendarClock size={16} aria-hidden="true" /> Appointment requests
              </a>
              <a href="/patient/communications" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-center text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <MessageCircle size={16} aria-hidden="true" /> Updates & reminders
              </a>
              <a href="/patient/telephysiotherapy" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-center text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Video size={16} aria-hidden="true" /> Telephysiotherapy
              </a>
              <a href="/patient/clinical-care" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-center text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <HeartPulse size={16} aria-hidden="true" /> Linked clinical care
              </a>
              <a href="/patient/financial-summary" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-center text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <WalletCards size={16} aria-hidden="true" /> Financial summary
              </a>
            </div>
          </nav>

          <div className="mt-6 border-t pt-5 text-center">
            <a href="/" className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Public PhysioBill home
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
