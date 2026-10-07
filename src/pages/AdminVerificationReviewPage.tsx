import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw, ShieldX } from 'lucide-react';
import {
  decideVerification,
  loadVerificationReview,
  requireVerificationResubmission,
  revokeVerification,
  type VerificationReview,
} from '@/lib/admin-verifications';

const fieldClass = 'h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10';
const textareaClass = 'min-h-24 w-full rounded-xl border bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10';

export function AdminVerificationReviewPage({ requestId }: { requestId: string }) {
  const [review, setReview] = useState<VerificationReview | null>(null);
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = async () => {
    const loaded = await loadVerificationReview(requestId);
    setReview(loaded);
    setMethod(loaded.verification_method ?? '');
    setReference(loaded.verification_reference ?? '');
  };

  useEffect(() => {
    reload().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load review.')).finally(() => setLoading(false));
  }, [requestId]);

  async function act(action: 'approve' | 'reject' | 'resubmit' | 'revoke') {
    if (!review) return;
    if ((action === 'reject' || action === 'resubmit' || action === 'revoke') && !reason.trim()) {
      setError('A review reason is required for this action.');
      return;
    }
    if (action === 'approve' && !method.trim()) {
      setError('Record the verification method before approval.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (action === 'approve' || action === 'reject') {
        await decideVerification({
          requestId: review.request_id,
          requestVersion: review.request_version,
          credentialFingerprint: review.credential_fingerprint,
          decision: action,
          reason,
          verificationMethod: method,
          verificationReference: reference,
        });
      } else if (action === 'resubmit') {
        await requireVerificationResubmission({ requestId: review.request_id, requestVersion: review.request_version, reason });
      } else {
        await revokeVerification({ physioId: review.physio_id, credentialFingerprint: review.credential_fingerprint, reason });
      }
      await reload();
      setNotice(action === 'approve' ? 'Verification approved.' : action === 'reject' ? 'Verification rejected.' : action === 'revoke' ? 'Verification revoked.' : 'Resubmission required.');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'The review action could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="h-72 rounded-2xl skeleton" />;
  if (!review) return <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error ?? 'Review unavailable.'}</div>;

  const pending = review.request_status === 'pending';
  const approved = review.request_status === 'approved';
  const snapshot = [
    ['Professional name', review.submitted_full_name],
    ['Qualification', review.submitted_qualification],
    ['Registration number', review.submitted_registration_number],
    ['Authority', review.submitted_registration_authority],
    ['Jurisdiction', review.submitted_registration_jurisdiction],
    ['Country / region', review.submitted_registration_region_code || 'Not specified'],
  ];

  return (
    <div className="space-y-6">
      <a href="/admin/verifications" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"><ArrowLeft size={16} /> Back to queue</a>
      {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-success/15 bg-success/5 p-3 text-sm text-success">{notice}</div>}
      <section className="rounded-[26px] border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Immutable request v{review.request_version}</p><h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">{review.submitted_full_name}</h1></div><span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wide">{review.request_status}</span></div>
        {review.registration_conflict && <div className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 shrink-0" size={17} /> Another active verified therapist owns this canonical registration identity. Approval will be rejected by the database.</div>}
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">{snapshot.map(([label, value]) => <div key={label} className="rounded-xl bg-secondary/45 p-4"><dt className="text-xs font-semibold text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}</dl>
        <p className="mt-5 break-all text-xs text-muted-foreground">Credential fingerprint: {review.credential_fingerprint}</p>
      </section>
      {(pending || approved) && <section className="rounded-2xl border bg-card p-6"><h2 className="text-lg font-bold">Reviewer decision</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-xs font-semibold">Verification method</span><input maxLength={160} value={method} onChange={(event) => setMethod(event.target.value)} className={fieldClass} /></label><label className="space-y-2"><span className="text-xs font-semibold">Safe reference</span><input maxLength={240} value={reference} onChange={(event) => setReference(event.target.value)} className={fieldClass} /></label><label className="space-y-2 sm:col-span-2"><span className="text-xs font-semibold">Decision reason</span><textarea maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className={textareaClass} /></label></div><div className="mt-5 flex flex-wrap gap-2">{pending && <><button disabled={busy || review.registration_conflict} onClick={() => void act('approve')} className="inline-flex h-11 items-center gap-2 rounded-xl bg-success px-4 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 size={16} /> Approve</button><button disabled={busy} onClick={() => void act('reject')} className="inline-flex h-11 items-center gap-2 rounded-xl bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-50"><ShieldX size={16} /> Reject</button><button disabled={busy} onClick={() => void act('resubmit')} className="inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16} /> Require resubmission</button></>}{approved && <button disabled={busy} onClick={() => void act('revoke')} className="inline-flex h-11 items-center gap-2 rounded-xl bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-50"><ShieldX size={16} /> Revoke verification</button>}</div></section>}
      <section className="rounded-2xl border bg-card p-6"><h2 className="text-lg font-bold">Verification history</h2><div className="mt-4 space-y-3">{review.events.map((event) => <div key={event.id} className="rounded-xl border bg-background p-4"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold">{event.event_type.split('_').join(' ')}</p><time className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString('en-IN')}</time></div><p className="mt-1 text-xs text-muted-foreground">{event.previous_state} → {event.resulting_state}</p>{event.reason && <p className="mt-2 text-sm">{event.reason}</p>}</div>)}</div></section>
    </div>
  );
}
