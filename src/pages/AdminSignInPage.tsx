import { useState } from 'react';
import { LockKeyhole, LogIn, Mail } from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { signInAdmin } from '@/lib/auth';

export function AdminSignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInAdmin(email, password);
      window.location.replace('/admin/verifications');
    } catch {
      setError('Admin sign-in could not be completed. Check the credentials and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-[28px] border bg-card p-6 shadow-[0_20px_60px_hsl(var(--foreground)/.07)] sm:p-8">
        <PhysioBillBrand />
        <p className="mt-8 text-xs font-bold uppercase tracking-[.14em] text-primary">Restricted administration</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">Verification reviewer sign in</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Authentication does not grant reviewer authority. Every review operation is independently authorized by the database.</p>
        {error && <div role="alert" className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block space-y-2"><span className="text-xs font-semibold">Email</span><span className="relative block"><Mail className="absolute left-3 top-3.5 text-muted-foreground" size={17} /><input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></span></label>
          <label className="block space-y-2"><span className="text-xs font-semibold">Password</span><span className="relative block"><LockKeyhole className="absolute left-3 top-3.5 text-muted-foreground" size={17} /><input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></span></label>
          <button disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[hsl(var(--primary-hover))] disabled:opacity-60"><LogIn size={17} />{busy ? 'Signing in…' : 'Sign in to review'}</button>
        </form>
      </section>
    </main>
  );
}
