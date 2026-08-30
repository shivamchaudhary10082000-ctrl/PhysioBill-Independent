import { useState } from 'react';
import { Copy, ExternalLink, FileCheck2, ShieldCheck } from 'lucide-react';

import {
  issueReimbursementDocument,
  reimbursementVerificationPath,
  reimbursementVerificationUrl,
  type IssuedReimbursementDocument,
} from '@/lib/reimbursement-documents';

export function ReimbursementDocumentPanel({ invoiceId }: { invoiceId: string }) {
  const [document, setDocument] = useState<IssuedReimbursementDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const issueDocument = async () => {
    setBusy(true);
    setError(null);
    try {
      setDocument(await issueReimbursementDocument(invoiceId));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '';
      setError(message.includes('Verified professional credentials')
        ? 'Verified professional credentials are required before a reimbursement document can be issued.'
        : 'Reimbursement document issuance failed. Confirm this is your finalized invoice and try again.');
    } finally {
      setBusy(false);
    }
  };

  const copyVerificationLink = async () => {
    if (!document) return;
    try {
      await navigator.clipboard.writeText(reimbursementVerificationUrl(document.verificationToken));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Could not copy the verification link on this device.');
    }
  };

  return (
    <section className="no-print rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-primary">
            <FileCheck2 size={18} />
            <p className="text-xs font-extrabold uppercase tracking-[.14em]">Professional reimbursement document</p>
          </div>
          <h2 className="mt-2 text-lg font-extrabold">Create an insurer-ready verification record</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Issuance is created from this immutable finalized-invoice snapshot. Patient and clinical details are never exposed by the public verification page.
          </p>
        </div>
        {!document && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void issueDocument()}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? 'Issuing…' : 'Issue verification record'}
          </button>
        )}
      </div>

      {error && <div role="alert" className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      {document && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">Verification record issued</p>
              <p className="mt-1 text-sm leading-6">
                Invoice {document.invoiceNumber} now has an immutable public verification token. Issuing again returns the same record rather than creating a second document.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={reimbursementVerificationPath(document.verificationToken)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <ExternalLink size={14} /> Open verification page
                </a>
                <button
                  type="button"
                  onClick={() => void copyVerificationLink()}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <Copy size={14} /> {copied ? 'Copied' : 'Copy verification link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        This verifies PhysioBill document provenance and captured professional credentials only. It does not prove insurer approval, reimbursement eligibility, payment settlement, or legal acceptance.
      </p>
    </section>
  );
}
