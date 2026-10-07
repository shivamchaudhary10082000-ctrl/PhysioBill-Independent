import { AlertTriangle, CheckCircle2, CircleDotDashed, ServerCog } from 'lucide-react';

type ReadinessState = 'configured' | 'engineering_ready' | 'manual_required' | 'verification_required';

const stateLabel: Record<ReadinessState, string> = {
  configured: 'Configured',
  engineering_ready: 'Engineering ready',
  manual_required: 'Manual setup required',
  verification_required: 'Verification required',
};

const stateTone: Record<ReadinessState, string> = {
  configured: 'bg-success/10 text-success',
  engineering_ready: 'bg-primary/10 text-primary',
  manual_required: 'bg-warning/10 text-warning',
  verification_required: 'bg-destructive/8 text-destructive',
};

export function AdminSystemPage() {
  const operatorConfigured = Boolean((import.meta.env.VITE_PUBLIC_OPERATOR_NAME as string | undefined)?.trim());
  const contactConfigured = Boolean((import.meta.env.VITE_PUBLIC_CONTACT_EMAIL as string | undefined)?.trim());
  const captchaEnabled = (import.meta.env.VITE_AUTH_CAPTCHA_ENABLED as string | undefined)?.trim().toLowerCase() === 'true';
  const turnstileConfigured = Boolean((import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim());

  const controls: Array<{ area: string; state: ReadinessState; detail: string }> = [
    {
      area: 'Admin authorization and audit',
      state: 'engineering_ready',
      detail: 'Capability-specific database RPCs, masked operational reads, reason-required writes and append-only audit events are present in the release candidate.',
    },
    {
      area: 'Staging migration alignment',
      state: 'verification_required',
      detail: 'The exact PhysioBill staging migration ledger must be compared with repository migrations before promotion. Filenames alone are not proof.',
    },
    {
      area: 'Admin MFA and privileged sessions',
      state: 'manual_required',
      detail: 'Admin capability checks are database-enforced, but mandatory AAL2/MFA enrollment and a short privileged-session policy still require Supabase Auth configuration, enrollment and end-to-end testing.',
    },
    {
      area: 'Billing regression',
      state: 'engineering_ready',
      detail: 'The Admin finance view and database fixture assert ₹6,000 across invoice, ledger/paid total, issuance snapshot, reimbursement document and PDF artifact state.',
    },
    {
      area: 'Aggregate site traffic',
      state: 'manual_required',
      detail: 'A server-side Cloudflare analytics connection or approved privacy-safe equivalent is required. The Admin overview intentionally shows no invented visitor count.',
    },
    {
      area: 'Patient SMS OTP',
      state: 'manual_required',
      detail: 'India DLT registration, approved entity/header/template, MSG91 account and Supabase Send SMS Hook secrets are required before real delivery can be tested.',
    },
    {
      area: 'Professional email delivery',
      state: 'manual_required',
      detail: 'A verified SMTP provider/domain with SPF, DKIM and DMARC remains required for production confirmation and recovery email.',
    },
    {
      area: 'Auth abuse protection',
      state: captchaEnabled && turnstileConfigured ? 'configured' : 'manual_required',
      detail: captchaEnabled && turnstileConfigured
        ? 'This build contains an enabled Turnstile site key. Matching server-side Supabase CAPTCHA configuration still needs operational verification.'
        : 'Create matching Cloudflare Turnstile site/secret keys, configure the secret in Supabase Auth and enable the public site key in the build.',
    },
    {
      area: 'Public operator disclosure',
      state: operatorConfigured && contactConfigured ? 'configured' : 'manual_required',
      detail: operatorConfigured && contactConfigured
        ? 'This build contains the public operator name and monitored privacy/grievance contact.'
        : 'A real service-operator name and monitored privacy/grievance email must be supplied. Production remains fail-closed without them.',
    },
    {
      area: 'Policies and professional rules',
      state: 'manual_required',
      detail: 'Terms, Privacy Notice and Professional Standards have a technical acknowledgement foundation, but qualified legal/professional review and approved versions remain manual gates.',
    },
    {
      area: 'Invoice PDF typography',
      state: 'verification_required',
      detail: 'The numerical result is correct; the known letter-spacing/typography defect is intentionally unchanged until a visual change is reviewed.',
    },
  ];

  const blocked = controls.filter((control) => ['manual_required', 'verification_required'].includes(control.state)).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border bg-card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Release truth</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">Launch controls</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">A deliberately conservative checklist. “Engineering ready” means code exists in this release candidate; it does not mean deployed, provider-configured or production-approved.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5"><ServerCog className="text-primary" size={19} /><p className="mt-4 text-xs text-muted-foreground">Controls tracked</p><p className="mt-1 text-2xl font-bold">{controls.length}</p></div>
        <div className="rounded-2xl border bg-card p-5"><CheckCircle2 className="text-success" size={19} /><p className="mt-4 text-xs text-muted-foreground">Configured or engineering ready</p><p className="mt-1 text-2xl font-bold">{controls.length - blocked}</p></div>
        <div className="rounded-2xl border bg-card p-5"><AlertTriangle className="text-warning" size={19} /><p className="mt-4 text-xs text-muted-foreground">External/manual or verification gates</p><p className="mt-1 text-2xl font-bold">{blocked}</p></div>
      </section>

      <div className="space-y-3">
        {controls.map((control) => (
          <article key={control.area} className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><CircleDotDashed size={18} className="text-muted-foreground" /><h2 className="font-bold">{control.area}</h2></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${stateTone[control.state]}`}>{stateLabel[control.state]}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{control.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
