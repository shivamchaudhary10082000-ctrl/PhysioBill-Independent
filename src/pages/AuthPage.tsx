import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  LogIn,
  Mail,
  UserPlus,
} from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import {
  registerPhysiotherapist,
  requestPasswordReset,
  signInPhysiotherapist,
} from '@/lib/auth';

type AuthMode = 'signin' | 'signup' | 'recovery-request';

export function AuthPage({ notice: initialNotice = null }: { notice?: string | null }) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword('');
    setError(null);
    setNotice(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === 'recovery-request') {
        await requestPasswordReset(email);
        setNotice(
          'If a physiotherapist account exists for that email, a recovery link has been sent. Check your inbox and spam folder.',
        );
      } else if (mode === 'signup') {
        const result = await registerPhysiotherapist(email, password);
        if (!result.session) {
          setNotice('Account created. Check your email to confirm the address, then sign in.');
        }
      } else {
        await signInPhysiotherapist(email, password);
      }
    } catch {
      if (mode === 'recovery-request') {
        setError('The recovery request could not be completed right now. Please wait and try again.');
      } else if (mode === 'signup') {
        setError('Unable to create the account. Review your details and try again.');
      } else {
        setError('Unable to sign in. Check your credentials and try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:grid sm:place-items-center sm:py-10">
      <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_24px_70px_hsl(var(--foreground)/.055)] lg:grid-cols-[.92fr_1.08fr]">
        <div className="relative hidden border-r border-border bg-secondary/55 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <a href="/" aria-label="Back to PhysioBill"><PhysioBillBrand /></a>
            <div className="mt-14 max-w-sm">
              <p className="text-sm font-semibold text-primary">Professional workspace</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-.04em]">A calm, private place for clinical work.</h1>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">Professional access remains separate from the public patient-facing discovery experience.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <LockKeyhole size={15} className="text-primary" /> Secure physiotherapist access
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-4 lg:hidden">
            <a href="/" aria-label="Back to PhysioBill"><PhysioBillBrand /></a>
            <a href="/" className="text-xs font-semibold text-muted-foreground hover:text-primary">Public site</a>
          </div>

          <div className="mt-8 lg:mt-0">
            <p className="text-sm font-semibold text-primary">Professional access</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">
              {mode === 'recovery-request' ? 'Recover your password' : mode === 'signup' ? 'Create your physiotherapist account' : 'Sign in to PhysioBill'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {mode === 'recovery-request'
                ? 'Enter your physiotherapist account email. The result stays intentionally generic to protect account privacy.'
                : 'Continue to your private professional workspace.'}
            </p>
          </div>

          {mode === 'recovery-request' ? (
            <button type="button" onClick={() => changeMode('signin')} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <ArrowLeft size={16} /> Back to sign in
            </button>
          ) : (
            <div className="mt-7 grid grid-cols-2 rounded-xl border border-border bg-muted/60 p-1">
              <button type="button" onClick={() => changeMode('signin')} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mode === 'signin' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                Sign in
              </button>
              <button type="button" onClick={() => changeMode('signup')} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mode === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                Create account
              </button>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Email</span>
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
            </label>
            {mode !== 'recovery-request' && (
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Password</span>
                <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
              </label>
            )}

            {mode === 'signin' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => changeMode('recovery-request')} className="text-sm font-semibold text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-sm text-foreground">{notice}</p>}

            <button disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(var(--primary-hover))] disabled:opacity-60">
              {mode === 'signin' ? <LogIn size={17} /> : mode === 'signup' ? <UserPlus size={17} /> : <Mail size={17} />}
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in securely' : mode === 'signup' ? 'Create physiotherapist account' : 'Send recovery link'}
              {!busy && <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
