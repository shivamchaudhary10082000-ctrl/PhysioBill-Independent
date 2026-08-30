import { useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2, ShieldCheck, XCircle } from 'lucide-react';

import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { verifyReimbursementDocument, type ReimbursementVerification } from '@/lib/reimbursement-documents';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDate(value: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}

export function ReimbursementVerificationPage({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<ReimbursementVerification | null>(null);
  const [failed, setFailed] = useState(false);

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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-8 sm:px-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <PhysioBillBrand />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" />
            Document verification
          </div>
        </header>

        <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          {loading ? (
            <div className="py-14 text-center">
              <FileCheck2 className="mx-auto mb-4 size-10 text-muted-foreground" />
              <h1 className="text-xl font-semibold">Checking document record…</h1>
              <p className="mt-2 text-sm text-muted-foreground">Verifying the token against the PhysioBill issuance record.</p>
            </div>
          ) : verification?.valid ? (
            <div>
              <div className="mb-7 flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
                <CheckCircle2 className="mt-0.5 size-7 shrink-0" />
                <div>
                  <h1 className="text-xl font-semibold">Verified PhysioBill document</h1>
                  <p className="mt-1 text-sm leading-6">
                    This token matches an immutable reimbursement-document record created from the finalized invoice snapshot shown below.
                  </p>
                </div>
              </div>

              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invoice</dt>
                  <dd className="mt-1 font-medium">{verification.invoiceNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invoice total</dt>
                  <dd className="mt-1 font-medium">{formatMoney(verification.invoiceTotal)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invoice issued</dt>
                  <dd className="mt-1 font-medium">{formatDate(verification.invoiceIssuedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Document issued</dt>
                  <dd className="mt-1 font-medium">{formatDate(verification.documentIssuedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Physiotherapist</dt>
                  <dd className="mt-1 font-medium">{verification.therapistFullName}</dd>
                  {verification.practiceName ? <dd className="text-sm text-muted-foreground">{verification.practiceName}</dd> : null}
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Verified qualification</dt>
                  <dd className="mt-1 font-medium">{verification.verifiedQualification}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Verified registration</dt>
                  <dd className="mt-1 font-medium">
                    {verification.verifiedRegistrationNumber} · {verification.verifiedRegistrationAuthority}
                  </dd>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    Professional verification recorded {formatDate(verification.professionalVerifiedAt)}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 rounded-2xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
                Verification confirms that this token matches the PhysioBill record and the professional credentials captured when the invoice was finalized. It does not represent insurer approval, payment confirmation, reimbursement eligibility, or a legal guarantee.
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <XCircle className="mx-auto mb-4 size-10 text-destructive" />
              <h1 className="text-xl font-semibold">Document not verified</h1>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                {failed
                  ? 'The supplied verification token is invalid, unknown, or could not be verified.'
                  : 'No matching PhysioBill reimbursement-document record was found.'}
              </p>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
          No patient identity, clinical record, payment account, or private contact information is disclosed by this verification page.
        </p>
      </div>
    </main>
  );
}
