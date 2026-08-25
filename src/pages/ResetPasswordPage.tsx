import { useState } from 'react';
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole } from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { signOutPhysiotherapist, updatePassword } from '@/lib/auth';

type ResetPasswordPageProps = {
  recoveryReady: boolean;
  recoveryError: string | null;
  onComplete: () => void;
  onCancel: () => void;
};

const MINIMUM_PASSWORD_LENGTH = 8;

export function ResetPasswordPage({
  recoveryReady,
  recoveryError,
  onComplete,
  onCancel,
}: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function finishRecovery() {
    setBusy(true);
    setError(null);

    try {
      await signOutPhysiotherapist();
      onComplete();
    } catch {
      setError(
        'Your password was updated, but secure sign-out did not finish. Retry below before leaving this recovery page.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (passwordUpdated) {
      await finishRecovery();
      return;
    }

    setError(null);
    setNotice(null);

    if (password.length < MINIMUM_PASSWORD_LENGTH) {
      setError(`Use at least ${MINIMUM_PASSWORD_LENGTH} characters for the new password.`);
      return;
    }
    if (password !== confirmation) {
      setError('The new password and confirmation do not match.');
      return;
    }

    setBusy(true);
    let updateSucceeded = false;
    try {
      await updatePassword(password);
      updateSucceeded = true;
      setPasswordUpdated(true);
      setNotice('Password updated. Ending the recovery session securely…');
      await signOutPhysiotherapist();
      onComplete();
    } catch {
      if (updateSucceeded) {
        setError(
          'Your password was updated, but secure sign-out did not finish. Retry below before leaving this recovery page.',
        );
      } else {
        setError('Unable to update the password. Review the password requirements and try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:grid sm:place-items-center sm:py-10">
      <section className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_24px_70px_hsl(var(--foreground)/.055)] lg:grid-cols-[.85fr_1.15fr]">
        <div className="hidden border-r border-border bg-secondary/55 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <PhysioBillBrand />
            <div className="mt-14 max-w-xs">
              <p className="text-sm font-semibold text-primary">Secure recovery</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-.04em]">Return safely to your professional workspace.</h1>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">The clinical workspace stays locked until password recovery is complete.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <LockKeyhole size={15} className="text-primary" /> Physiotherapist account recovery
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="lg:hidden"><PhysioBillBrand /></div>
          <div className="mt-8 lg:mt-0">
            <p className="text-sm font-semibold text-primary">Password recovery</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Set a new password</h2>
          </div>

          {!recoveryReady ? (
            <div className="mt-7">
              <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive">
                {recoveryError ?? 'This password recovery link is invalid or has expired. Request a new link from the sign-in page.'}
              </div>
              <button type="button" onClick={onCancel} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(var(--primary-hover))]">
                <ArrowLeft size={16} /> Return to sign in
              </button>
            </div>
          ) : (
            <>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">Choose a new password for this physiotherapist account. The clinical workspace stays locked until recovery is complete.</p>

              <form onSubmit={submit} className="mt-5 space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground">New password</span>
                  <input type="password" autoComplete="new-password" required minLength={MINIMUM_PASSWORD_LENGTH} disabled={busy || passwordUpdated} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground">Confirm new password</span>
                  <input type="password" autoComplete="new-password" required minLength={MINIMUM_PASSWORD_LENGTH} disabled={busy || passwordUpdated} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-12 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60" />
                </label>

                {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{error}</p>}
                {notice && <p role="status" className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-sm text-foreground">{notice}</p>}

                <button disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(var(--primary-hover))] disabled:opacity-60">
                  <KeyRound size={17} />
                  {busy ? 'Please wait…' : passwordUpdated ? 'Finish secure sign-out' : 'Set new password'}
                  {!busy && <ArrowRight size={16} />}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
