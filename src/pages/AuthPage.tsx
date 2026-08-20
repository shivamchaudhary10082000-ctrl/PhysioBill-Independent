import { useState } from 'react';
import { ArrowRight, HeartPulse, KeyRound, LogIn, UserPlus } from 'lucide-react';
import {
  registerPhysiotherapist,
  signInPhysiotherapist,
} from '@/lib/auth';

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === 'signup') {
        const result = await registerPhysiotherapist(email, password);
        if (!result.session) {
          setNotice('Account created. Check your email to confirm the address, then sign in.');
        }
      } else {
        await signInPhysiotherapist(email, password);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed.');
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

        <div className="mt-7 grid grid-cols-2 rounded-xl bg-secondary p-1">
          <button type="button" onClick={() => setMode('signin')} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === 'signin' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
            Sign in
          </button>
          <button type="button" onClick={() => setMode('signup')} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === 'signup' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Email</span>
            <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Password</span>
            <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </label>

          {error && <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
          {notice && <p className="rounded-xl border bg-secondary px-3 py-2 text-sm text-foreground">{notice}</p>}

          <button disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground disabled:opacity-60">
            {mode === 'signin' ? <LogIn size={17} /> : <UserPlus size={17} />}
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in securely' : 'Create physiotherapist account'}
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="mt-6 flex items-start gap-2 rounded-xl bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground">
          <KeyRound size={15} className="mt-0.5 shrink-0" />
          Authentication is handled by Supabase. PhysioBill does not store your password in application data.
        </div>
      </section>
    </main>
  );
}
