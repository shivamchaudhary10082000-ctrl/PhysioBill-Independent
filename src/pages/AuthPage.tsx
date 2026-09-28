import { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  FileText,
  KeyRound,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import {
  AuthTurnstile,
  isAuthTurnstileConfigured,
} from '@/Components/AuthTurnstile';
import {
  registerPhysiotherapist,
  requestPasswordReset,
  requestPhysiotherapistEmailOtp,
  signInPhysiotherapist,
  verifyPhysiotherapistEmailOtp,
} from '@/lib/auth';

type AuthMode = 'signin' | 'signup' | 'recovery-request';
type SignInMethod = 'password' | 'email-otp';
type OtpStep = 'request' | 'verify';

const challengeAction: Record<AuthMode, string> = {
  signin: 'professional-sign-in',
  signup: 'professional-sign-up',
  'recovery-request': 'professional-password-reset',
};

export function AuthPage({ notice: initialNotice = null }: { notice?: string | null }) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('password');
  const [otpStep, setOtpStep] = useState<OtpStep>('request');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [challengeResetKey, setChallengeResetKey] = useState(0);
  const [acceptedProfessionalTerms, setAcceptedProfessionalTerms] = useState(false);
  const challengeConfigured = isAuthTurnstileConfigured();
  const verifyingEmailOtp =
    mode === 'signin' && signInMethod === 'email-otp' && otpStep === 'verify';
  const challengeRequired = challengeConfigured && !verifyingEmailOtp;

  function resetChallenge() {
    setCaptchaToken(null);
    setChallengeResetKey((current) => current + 1);
  }

  function resetOtpFlow() {
    setOtpStep('request');
    setOtpEmail('');
    setOtpCode('');
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword('');
    setError(null);
    setNotice(null);
    resetOtpFlow();
    if (nextMode !== 'signup') setAcceptedProfessionalTerms(false);
    resetChallenge();
  }

  function changeSignInMethod(nextMethod: SignInMethod) {
    setSignInMethod(nextMethod);
    setPassword('');
    setError(null);
    setNotice(null);
    resetOtpFlow();
    resetChallenge();
  }

  function changeOtpEmail() {
    setEmail(otpEmail || email);
    resetOtpFlow();
    setError(null);
    setNotice(null);
    resetChallenge();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (challengeRequired && !captchaToken) return;
    if (mode === 'signup' && !acceptedProfessionalTerms) {
      setError('Review and accept the Terms, Privacy Notice and Professional Standards before creating a professional account.');
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === 'recovery-request') {
        await requestPasswordReset(email, captchaToken);
        setNotice(
          'If a physiotherapist account exists for that email, a recovery link has been sent. Check your inbox and spam folder.',
        );
      } else if (mode === 'signup') {
        const result = await registerPhysiotherapist(email, password, captchaToken);
        if (!result.session) {
          setNotice('Account created. Check your email to confirm the address, then sign in.');
        }
      } else if (signInMethod === 'email-otp') {
        if (otpStep === 'request') {
          const result = await requestPhysiotherapistEmailOtp(email, captchaToken);
          setOtpEmail(result.email);
          setOtpCode('');
          setOtpStep('verify');
          setNotice(
            'If this email belongs to an existing professional account, a six-digit sign-in code has been sent. Check your inbox and spam folder.',
          );
        } else {
          await verifyPhysiotherapistEmailOtp(otpEmail || email, otpCode);
        }
      } else {
        await signInPhysiotherapist(email, password, captchaToken);
      }
    } catch (caught) {
      if (mode === 'recovery-request') {
        setError('The recovery request could not be completed right now. Please wait and try again.');
      } else if (mode === 'signup') {
        setError('Unable to create the account. Review your details and try again.');
      } else if (signInMethod === 'email-otp') {
        const message = caught instanceof Error ? caught.message : '';
        if (message.startsWith('Enter the six-digit')) {
          setError(message);
        } else if (message.includes('not provisioned as a physiotherapist')) {
          setError('This verified email is not provisioned as a physiotherapist account.');
          resetOtpFlow();
        } else if (otpStep === 'request') {
          setError('Unable to send a professional sign-in code right now. Please wait and try again.');
        } else {
          setError('The email verification code could not be confirmed. Check the code and try again.');
        }
      } else {
        setError('Unable to sign in. Check your credentials and try again.');
      }
    } finally {
      setBusy(false);
      if (!verifyingEmailOtp) resetChallenge();
    }
  }

  const signinDescription =
    signInMethod === 'email-otp'
      ? otpStep === 'verify'
        ? `Enter the six-digit code sent to ${otpEmail || email}.`
        : 'Use your professional email to receive a one-time sign-in code. No password is required.'
      : 'Use the email and password linked to your professional PhysioBill account.';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/.08),transparent_34%),hsl(var(--background))] px-4 py-5 sm:grid sm:place-items-center sm:py-10">
      <section className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[30px] border border-border bg-card shadow-[0_24px_70px_hsl(var(--foreground)/.07)] lg:grid-cols-[.95fr_1.05fr]">
        <div className="relative overflow-hidden border-b border-border bg-[linear-gradient(145deg,hsl(var(--primary)/.12),hsl(var(--secondary)/.8)_54%,hsl(var(--background)))] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full border-[34px] border-primary/5" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 size-60 rounded-full bg-primary/5 blur-2xl" />

          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <a href="/" aria-label="Back to PhysioBill">
                <PhysioBillBrand markClassName="h-12 w-12" />
              </a>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-card/80 px-3 py-1.5 text-[11px] font-bold text-primary backdrop-blur">
                <ShieldCheck size={14} /> Professional access
              </span>
            </div>

            <div className="mt-8 max-w-lg lg:mt-14">
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-primary">Physiotherapy professional workspace</p>
              <h1 className="mt-3 text-3xl font-extrabold leading-[1.08] tracking-[-.045em] sm:text-4xl">
                Clinical work, patient records and billing in one private workspace.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:leading-7">
                Built for physiotherapists to manage care workflows while keeping professional access separate from the public patient experience.
              </p>
            </div>

            <div className="mt-7 grid gap-2.5 sm:grid-cols-3 lg:mt-10 lg:grid-cols-1">
              <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card/75 p-3 backdrop-blur">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Activity size={18} /></span>
                <div><p className="text-sm font-bold">Clinical workspace</p><p className="text-[11px] text-muted-foreground">Visits and treatment records</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card/75 p-3 backdrop-blur">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileText size={18} /></span>
                <div><p className="text-sm font-bold">Billing & receipts</p><p className="text-[11px] text-muted-foreground">Invoices and mediclaim printouts</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card/75 p-3 backdrop-blur">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarDays size={18} /></span>
                <div><p className="text-sm font-bold">Practice workflow</p><p className="text-[11px] text-muted-foreground">Availability, requests and follow-up</p></div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-[11px] font-medium text-muted-foreground lg:mt-10">
              <LockKeyhole size={14} className="text-primary" /> Secure physiotherapist-only account access
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex items-center justify-end lg:hidden">
            <a href="/" className="text-xs font-semibold text-muted-foreground hover:text-primary">Public site</a>
          </div>

          <div className="mt-4 lg:mt-0">
            <p className="text-sm font-semibold text-primary">Professional account</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">
              {mode === 'recovery-request'
                ? 'Recover your password'
                : mode === 'signup'
                  ? 'Create your physiotherapist account'
                  : otpStep === 'verify' && signInMethod === 'email-otp'
                    ? 'Verify your email code'
                    : 'Sign in to your workspace'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {mode === 'recovery-request'
                ? 'Enter your physiotherapist account email. The result stays intentionally generic to protect account privacy.'
                : mode === 'signup'
                  ? 'Create a professional account. Public discovery stays off until credential verification and your explicit publish choice.'
                  : signinDescription}
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

          {mode === 'signin' && (
            <div className="mt-4 grid grid-cols-2 rounded-xl border border-border bg-secondary/35 p-1">
              <button
                type="button"
                onClick={() => changeSignInMethod('password')}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${signInMethod === 'password' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                <LockKeyhole size={15} /> Password
              </button>
              <button
                type="button"
                onClick={() => changeSignInMethod('email-otp')}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${signInMethod === 'email-otp' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                <KeyRound size={15} /> Email OTP
              </button>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {verifyingEmailOtp ? (
              <>
                <div className="rounded-xl border bg-secondary/30 p-3.5">
                  <p className="text-xs font-semibold text-muted-foreground">Professional email</p>
                  <p className="mt-1 break-all text-sm font-semibold">{otpEmail}</p>
                  <button type="button" onClick={changeOtpEmail} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    <ArrowLeft size={13} /> Change email
                  </button>
                </div>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground">Six-digit email code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-14 w-full rounded-xl border bg-card px-4 text-center text-2xl font-semibold tracking-[.35em] outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>
              </>
            ) : (
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Professional email</span>
                <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
              </label>
            )}

            {mode !== 'recovery-request' && !(mode === 'signin' && signInMethod === 'email-otp') && (
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Password</span>
                <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
              </label>
            )}

            {mode === 'signin' && signInMethod === 'password' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => changeMode('recovery-request')} className="text-sm font-semibold text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            {mode === 'signup' && (
              <label className="flex items-start gap-3 rounded-xl border bg-secondary/35 p-3.5 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={acceptedProfessionalTerms}
                  onChange={(event) => setAcceptedProfessionalTerms(event.target.checked)}
                  className="mt-1 size-4 accent-[hsl(var(--primary))]"
                  required
                />
                <span className="text-muted-foreground">
                  I agree to the <a href="/terms" className="font-semibold text-primary hover:underline">Terms</a>, have read the <a href="/privacy" className="font-semibold text-primary hover:underline">Privacy Notice</a>, and agree to follow the <a href="/professional-standards" className="font-semibold text-primary hover:underline">Professional Standards</a>. I understand that public discovery requires credential verification and truthful professional information.
                </span>
              </label>
            )}

            {!verifyingEmailOtp && (
              <AuthTurnstile
                action={challengeAction[mode]}
                resetKey={challengeResetKey}
                onTokenChange={setCaptchaToken}
              />
            )}

            {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-sm text-foreground">{notice}</p>}

            <button
              disabled={
                busy ||
                (challengeRequired && !captchaToken) ||
                (mode === 'signup' && !acceptedProfessionalTerms) ||
                (verifyingEmailOtp && otpCode.length !== 6)
              }
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(var(--primary-hover))] disabled:opacity-60"
            >
              {mode === 'signin'
                ? signInMethod === 'email-otp'
                  ? <KeyRound size={17} />
                  : <LogIn size={17} />
                : mode === 'signup'
                  ? <UserPlus size={17} />
                  : <Mail size={17} />}
              {busy
                ? 'Please wait…'
                : mode === 'signin'
                  ? signInMethod === 'email-otp'
                    ? otpStep === 'verify'
                      ? 'Verify code and sign in'
                      : 'Send email code'
                    : 'Sign in securely'
                  : mode === 'signup'
                    ? 'Create physiotherapist account'
                    : 'Send recovery link'}
              {!busy && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="mt-6 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
            Patient access uses a separate patient phone-OTP route. Professional email OTP never creates a new account and only an existing physiotherapist persona can complete this sign-in.
          </div>
        </div>
      </section>
    </main>
  );
}
