import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Phone } from 'lucide-react';
import { AuthTurnstile, isAuthTurnstileConfigured } from '@/Components/AuthTurnstile';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import {
  normalizePatientReturnTarget,
  requestPatientPhoneOtp,
  resolveAuthenticatedPatient,
  signOutCurrentSession,
  verifyPatientPhoneOtp,
} from '@/lib/auth';

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? `•••• ••${digits.slice(-4)}` : 'your mobile';
}

function isPhoneProviderUnavailable(error: unknown) {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
  return (
    message.includes('phone provider') ||
    message.includes('sms provider') ||
    message.includes('phone signups are disabled') ||
    message.includes('phone signup is disabled')
  );
}

export function PatientSignInPage() {
  const returnTarget = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return normalizePatientReturnTarget(
      params.get('returnTo') ?? params.get('next'),
    );
  }, []);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [canonicalPhone, setCanonicalPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [challengeResetKey, setChallengeResetKey] = useState(0);
  const challengeRequired = isAuthTurnstileConfigured();

  function resetChallenge() {
    setCaptchaToken(null);
    setChallengeResetKey((current) => current + 1);
  }

  async function requestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (challengeRequired && !captchaToken) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const result = await requestPatientPhoneOtp(phoneInput, captchaToken);
      setCanonicalPhone(result.phone);
      setOtp('');
      setStep('otp');
      setNotice('Enter the six-digit SMS code sent to your mobile.');
    } catch (caught) {
      setError(
        isPhoneProviderUnavailable(caught)
          ? 'Patient SMS sign-in is not enabled on this environment yet.'
          : caught instanceof Error && caught.message.startsWith('Enter ')
            ? caught.message
            : 'Unable to send a verification code right now. Please try again.',
      );
    } finally {
      setBusy(false);
      resetChallenge();
    }
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canonicalPhone) {
      setStep('phone');
      setError('Enter your mobile number again.');
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await verifyPatientPhoneOtp(canonicalPhone, otp);

      try {
        await resolveAuthenticatedPatient();
      } catch {
        await signOutCurrentSession().catch(() => undefined);
        setError(
          'This verified identity is not provisioned as a patient account. Use the appropriate PhysioBill sign-in route.',
        );
        setStep('phone');
        setCanonicalPhone('');
        setOtp('');
        return;
      }

      window.location.replace(returnTarget);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message.startsWith('Enter ')
          ? caught.message
          : 'The verification code could not be confirmed. Check the code and try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  function useAnotherNumber() {
    setStep('phone');
    setCanonicalPhone('');
    setOtp('');
    setError(null);
    setNotice(null);
    resetChallenge();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:grid sm:place-items-center sm:py-10">
      <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_24px_70px_hsl(var(--foreground)/.055)] lg:grid-cols-[.9fr_1.1fr]">
        <div className="hidden border-r border-border bg-secondary/55 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <a href="/" aria-label="Back to PhysioBill"><PhysioBillBrand /></a>
            <div className="mt-14 max-w-sm">
              <p className="text-sm font-semibold text-primary">Patient access</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-.04em]">Your identity first. Your records stay separate.</h1>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">PhysioBill uses a short SMS verification step for patient identity. Booking and clinical access are separate features and are not enabled here.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <LockKeyhole size={15} className="text-primary" /> Passwordless patient sign in
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-4 lg:hidden">
            <a href="/" aria-label="Back to PhysioBill"><PhysioBillBrand /></a>
            <a href="/find-physio" className="text-xs font-semibold text-muted-foreground hover:text-primary">Find a physio</a>
          </div>

          {step === 'phone' ? (
            <>
              <p className="mt-8 text-sm font-semibold text-primary lg:mt-0">Patient sign in</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Continue with your mobile number</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">India +91 is assumed for a standard 10-digit mobile number. You can also enter a full international number beginning with +.</p>

              <form onSubmit={requestOtp} className="mt-7 space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground">Mobile number</span>
                  <span className="relative block">
                    <Phone className="absolute left-3.5 top-3.5 text-muted-foreground" size={17} />
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={phoneInput}
                      onChange={(event) => setPhoneInput(event.target.value)}
                      placeholder="98765 43210"
                      className="h-12 w-full rounded-xl border bg-card pl-10 pr-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </span>
                </label>

                <AuthTurnstile
                  action="patient-phone-otp"
                  resetKey={challengeResetKey}
                  onTokenChange={setCaptchaToken}
                />

                {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{error}</p>}

                <button disabled={busy || (challengeRequired && !captchaToken)} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(var(--primary-hover))] disabled:opacity-60">
                  <KeyRound size={17} />
                  {busy ? 'Requesting code…' : 'Send SMS code'}
                  {!busy && <ArrowRight size={16} />}
                </button>
              </form>

              <div className="mt-5 flex flex-wrap gap-4 text-sm">
                <a href="/find-physio" className="font-semibold text-primary">Back to therapist discovery</a>
                <a href="/professional/sign-in" className="font-semibold text-muted-foreground hover:text-primary">Professional sign in</a>
              </div>
            </>
          ) : (
            <>
              <button type="button" onClick={useAnotherNumber} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                <ArrowLeft size={16} /> Use another number
              </button>
              <p className="mt-7 text-sm font-semibold text-primary">Verify mobile</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Enter the six-digit SMS code</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Code sent to {maskPhone(canonicalPhone)}.</p>

              <form onSubmit={verifyOtp} className="mt-7 space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground">Verification code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-14 w-full rounded-xl border bg-card px-4 text-center text-2xl font-semibold tracking-[.35em] outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>

                {notice && <p role="status" className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-sm">{notice}</p>}
                {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{error}</p>}

                <button disabled={busy || otp.length !== 6} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(var(--primary-hover))] disabled:opacity-60">
                  <KeyRound size={17} />
                  {busy ? 'Verifying…' : 'Verify and continue'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
