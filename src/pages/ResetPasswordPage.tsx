import { useState } from 'react';
import { ArrowLeft, ArrowRight, HeartPulse, KeyRound } from 'lucide-react';
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
    } catch (caught) {
      if (updateSucceeded) {
        setError(
          'Your password was updated, but secure sign-out did not finish. Retry below before leaving this recovery page.',
        );
      } else {
        setError(caught instanceof Error ? caught.message : 'Unable to update the password.');
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
            <h1 className="text-xl font-extrabold tracking-tight">Set a new password</h1>
          </div>
        </div>

        {!recoveryReady ? (
          <div className="mt-7">
            <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive">
              {recoveryError ?? 'This password recovery link is invalid or has expired. Request a new link from the sign-in page.'}
            </div>
            <button type="button" onClick={onCancel} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground">
              <ArrowLeft size={16} /> Return to sign in
            </button>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm leading-6 text-muted-foreground">Choose a new password for this physiotherapist account. The clinical workspace stays locked until recovery is complete.</p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">New password</span>
                <input type="password" autoComplete="new-password" required minLength={MINIMUM_PASSWORD_LENGTH} disabled={busy || passwordUpdated} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Confirm new password</span>
                <input type="password" autoComplete="new-password" required minLength={MINIMUM_PASSWORD_LENGTH} disabled={busy || passwordUpdated} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60" />
              </label>

              {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
              {notice && <p role="status" className="rounded-xl border bg-secondary px-3 py-2 text-sm text-foreground">{notice}</p>}

              <button disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground disabled:opacity-60">
                <KeyRound size={17} />
                {busy ? 'Please wait…' : passwordUpdated ? 'Finish secure sign-out' : 'Set new password'}
                {!busy && <ArrowRight size={16} />}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
