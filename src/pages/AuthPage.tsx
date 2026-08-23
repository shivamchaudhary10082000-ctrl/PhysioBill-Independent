import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  HeartPulse,
  LogIn,
  Mail,
  UserPlus,
} from 'lucide-react';
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
    <main className="min-h-screen bg-background px-4 py-10 sm:grid sm:place-items-center">
      <section className="mx-auto w-full max-w-md rounded-[28px] border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <HeartPulse size={22} />
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-primary">PhysioBill</p>
            <h1 className="text-xl font-extrabold tracking-tight">Private physiotherapist workspace</h1>
          </div>
        </div>

        {mode === 'recovery-request' ? (
          <div className="mt-7">
            <button type="button" onClick={() => changeMode('signin')} className="inline-flex items-center gap-2 text-sm font-bold text-primary">
              <ArrowLeft size={16} /> Back to sign in
            </button>
            <h2 className="mt-4 text-lg font-extrabold">Recover your password</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Enter your physiotherapist account email. The result is intentionally generic to protect account privacy.</p>
          </div>
        ) : (
          <div className="mt-7 grid grid-cols-2 rounded-xl bg-secondary p-1">
            <button type="button" onClick={() => changeMode('signin')} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === 'signin' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              Sign in
            </button>
            <button type="button" onClick={() => changeMode('signup')} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === 'signup' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              Create account
            </button>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Email</span>
            <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </label>
          {mode !== 'recovery-request' && (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Password</span>
              <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
            </label>
          )}

          {mode === 'signin' && (
            <div className="flex justify-end">
              <button type="button" onClick={() => changeMode('recovery-request')} className="text-sm font-bold text-primary hover:underline">
                Forgot password?
              </button>
            </div>
          )}

          {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
          {notice && <p role="status" className="rounded-xl border bg-secondary px-3 py-2 text-sm text-foreground">{notice}</p>}

          <button disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground disabled:opacity-60">
            {mode === 'signin' ? <LogIn size={17} /> : mode === 'signup' ? <UserPlus size={17} /> : <Mail size={17} />}
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in securely' : mode === 'signup' ? 'Create physiotherapist account' : 'Send recovery link'}
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>
      </section>
    </main>
  );
}
