import { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, LogOut } from 'lucide-react';
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
      <main className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div>
          <PhysioBillBrand className="justify-center" showWordmark={false} />
          <p className="mt-4 text-sm font-medium text-muted-foreground">Resolving patient identity…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <section className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <a href="/"><PhysioBillBrand /></a>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-60"
          >
            <LogOut size={15} /> {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>

        <div className="mt-10 rounded-[30px] border bg-card p-7 shadow-[0_18px_50px_hsl(var(--foreground)/.05)] sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
            <BadgeCheck size={15} /> Authenticated patient
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-.035em]">Your PhysioBill patient identity is ready.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            This gateway proves your patient session boundary only. Clinical records, visits, invoices, payments and booking are not exposed here.
          </p>

          {identity && (
            <div className="mt-7 rounded-2xl border bg-secondary/40 p-5">
              <p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Public patient identifier</p>
              <p className="mt-2 font-mono text-lg font-semibold tracking-wide">{identity.publicPatientId}</p>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <a href="/find-physio" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[hsl(var(--primary-hover))]">
              <ArrowLeft size={16} /> Return to therapist discovery
            </a>
            <a href="/" className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-4 text-sm font-semibold hover:bg-secondary">
              Public PhysioBill home
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
