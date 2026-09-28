import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { WorkspaceSignOut } from '@/Components/WorkspaceSessionControls';
import {
  enrollAdminTotp,
  loadAdminSecurityState,
  verifyAdminTotp,
} from '@/lib/auth';

type Enrollment = {
  id: string;
  qrCode: string;
  secret: string;
};

type StoredEnrollment = Enrollment & {
  createdAt: number;
};

const ADMIN_MFA_ENROLLMENT_STORAGE_KEY = 'physiobill.admin.mfa.enrollment.v1';
const ADMIN_MFA_ENROLLMENT_MAX_AGE_MS = 30 * 60 * 1000;

function clearStoredEnrollment() {
  try {
    window.sessionStorage.removeItem(ADMIN_MFA_ENROLLMENT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }
}

function readStoredEnrollment(): Enrollment | null {
  try {
    const raw = window.sessionStorage.getItem(ADMIN_MFA_ENROLLMENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredEnrollment>;
    const valid =
      typeof parsed.id === 'string' &&
      typeof parsed.qrCode === 'string' &&
      typeof parsed.secret === 'string' &&
      typeof parsed.createdAt === 'number' &&
      Date.now() - parsed.createdAt <= ADMIN_MFA_ENROLLMENT_MAX_AGE_MS;

    if (!valid) {
      clearStoredEnrollment();
      return null;
    }

    return {
      id: parsed.id as string,
      qrCode: parsed.qrCode as string,
      secret: parsed.secret as string,
    };
  } catch {
    clearStoredEnrollment();
    return null;
  }
}

function storeEnrollment(enrollment: Enrollment) {
  try {
    const payload: StoredEnrollment = {
      ...enrollment,
      createdAt: Date.now(),
    };
    window.sessionStorage.setItem(
      ADMIN_MFA_ENROLLMENT_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // The setup can still continue in memory if session storage is unavailable.
  }
}

export function AdminMfaPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [existingFactorId, setExistingFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(() => readStoredEnrollment());
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loadAdminSecurityState()
      .then((state) => {
        if (!active) return;
        if (!state) {
          setAuthorized(false);
          return;
        }
        setAuthorized(true);
        if (state.currentAal === 'aal2') {
          clearStoredEnrollment();
          window.location.replace('/admin/verifications');
          return;
        }
        setExistingFactorId(state.verifiedTotpFactorId);
      })
      .catch(() => {
        if (active) setError('Admin security status could not be verified.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function startEnrollment() {
    setBusy(true);
    setError(null);
    try {
      const data = await enrollAdminTotp();
      const nextEnrollment = {
        id: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      };
      setEnrollment(nextEnrollment);
      storeEnrollment(nextEnrollment);
    } catch {
      setError('Authenticator setup could not be started. Try again after signing in again.');
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const factorId = enrollment?.id ?? existingFactorId;
    if (!factorId) return;

    setBusy(true);
    setError(null);
    try {
      await verifyAdminTotp(factorId, code);
      clearStoredEnrollment();
      window.location.replace('/admin/verifications');
    } catch {
      setError('The authenticator code was not accepted. Use the current six-digit code and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Checking Admin security requirements…</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
        <section className="w-full max-w-md rounded-[28px] border bg-card p-7">
          <PhysioBillBrand />
          <h1 className="mt-8 text-2xl font-bold">Administration access denied</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This account is authenticated but does not have active platform Admin authority.
          </p>
          <WorkspaceSignOut className="mt-6 h-11 rounded-xl border px-4 text-sm font-semibold" />
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-[28px] border bg-card p-6 shadow-[0_20px_60px_hsl(var(--foreground)/.07)] sm:p-8">
        <PhysioBillBrand />
        <div className="mt-8 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck size={22} />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-primary">Admin MFA required</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">
          {existingFactorId ? 'Verify authenticator code' : 'Secure this Admin account'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Admin operations require a second factor. Use an authenticator app; SMS is not required.
          Your current setup key is kept for this browser tab so switching to your authenticator
          app or refreshing Chrome does not generate a different key.
        </p>

        {!existingFactorId && !enrollment && (
          <button
            type="button"
            disabled={busy}
            onClick={startEnrollment}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <KeyRound size={17} />
            {busy ? 'Starting setup…' : 'Set up authenticator app'}
          </button>
        )}

        {enrollment && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border bg-background p-4 text-center">
              <img
                src={enrollment.qrCode}
                alt="Authenticator QR code"
                className="mx-auto size-52 max-w-full"
              />
            </div>
            <div className="rounded-xl border bg-muted/40 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Manual setup key</p>
              <p className="mt-1 break-all font-mono text-sm">{enrollment.secret}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Keep using this same key after switching apps. Do not press setup again unless you intentionally want a new key.
              </p>
            </div>
          </div>
        )}

        {(existingFactorId || enrollment) && (
          <form onSubmit={submitCode} className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold">Six-digit authenticator code</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-12 w-full rounded-xl border bg-background px-4 text-center font-mono text-lg tracking-[.25em] outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            {error && (
              <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <button
              disabled={busy || code.length !== 6}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? 'Verifying…' : 'Verify and open Admin'}
            </button>
          </form>
        )}

        {error && !existingFactorId && !enrollment && (
          <div role="alert" className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <WorkspaceSignOut className="mt-6 h-11 w-full rounded-xl border px-4 text-sm font-semibold text-muted-foreground" />
      </section>
    </main>
  );
}
