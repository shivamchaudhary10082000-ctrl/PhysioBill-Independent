import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileCheck2, ShieldCheck, XCircle } from 'lucide-react';

import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { verifyReimbursementDocument, type ReimbursementVerification } from '@/lib/reimbursement-documents';
import { DEFAULT_LOCALE, type SupportedLocale } from '@/lib/locale';
import { detectPublicLocale, publicReimbursementCopy } from '@/lib/public-reimbursement-locale';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDate(value: string | null, locale: SupportedLocale, notRecorded: string) {
  if (!value) return notRecorded;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? notRecorded
    : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(value: number, locale: SupportedLocale) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}

export function ReimbursementVerificationPage({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<ReimbursementVerification | null>(null);
  const [failed, setFailed] = useState(false);
  const [locale] = useState<SupportedLocale>(() => {
    if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
    return detectPublicLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
  });
  const copy = useMemo(() => publicReimbursementCopy(locale), [locale]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!UUID_PATTERN.test(token)) {
        if (active) {
          setLoading(false);
          setFailed(true);
        }
        return;
      }

      try {
        const result = await verifyReimbursementDocument(token);
        if (!active) return;
        setVerification(result);
        setFailed(!result?.valid);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="min-h-screen bg-background text-foreground" lang={locale}>
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-8 sm:px-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <PhysioBillBrand />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {copy.verificationLabel}
          </div>
        </header>

        <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8" aria-busy={loading}>
          {loading ? (
            <div className="py-14 text-center" role="status" aria-live="polite">
              <FileCheck2 className="mx-auto mb-4 size-10 text-muted-foreground" aria-hidden="true" />
              <h1 className="text-xl font-semibold">{copy.checkingTitle}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{copy.checkingDescription}</p>
            </div>
          ) : verification?.valid ? (
            <div>
              <div className="mb-7 flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950" role="status">
                <CheckCircle2 className="mt-0.5 size-7 shrink-0" aria-hidden="true" />
                <div>
                  <h1 className="text-xl font-semibold">{copy.verifiedTitle}</h1>
                  <p className="mt-1 text-sm leading-6">{copy.verifiedDescription}</p>
                </div>
              </div>

              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.invoice}</dt>
                  <dd className="mt-1 font-medium">{verification.invoiceNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.invoiceTotal}</dt>
                  <dd className="mt-1 font-medium">{formatMoney(verification.invoiceTotal, locale)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.invoiceIssued}</dt>
                  <dd className="mt-1 font-medium">{formatDate(verification.invoiceIssuedAt, locale, copy.notRecorded)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.documentIssued}</dt>
                  <dd className="mt-1 font-medium">{formatDate(verification.documentIssuedAt, locale, copy.notRecorded)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.physiotherapist}</dt>
                  <dd className="mt-1 font-medium">{verification.therapistFullName}</dd>
                  {verification.practiceName ? <dd className="text-sm text-muted-foreground">{verification.practiceName}</dd> : null}
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.verifiedQualification}</dt>
                  <dd className="mt-1 font-medium">{verification.verifiedQualification}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.verifiedRegistration}</dt>
                  <dd className="mt-1 font-medium">
                    {verification.verifiedRegistrationNumber} · {verification.verifiedRegistrationAuthority}
                  </dd>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    {copy.professionalVerificationRecorded} {formatDate(verification.professionalVerifiedAt, locale, copy.notRecorded)}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 rounded-2xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
                {copy.disclaimer}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center" role="alert">
              <XCircle className="mx-auto mb-4 size-10 text-destructive" aria-hidden="true" />
              <h1 className="text-xl font-semibold">{copy.notVerifiedTitle}</h1>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                {failed ? copy.invalidToken : copy.noMatch}
              </p>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">{copy.privacyNotice}</p>
      </div>
    </main>
  );
}
