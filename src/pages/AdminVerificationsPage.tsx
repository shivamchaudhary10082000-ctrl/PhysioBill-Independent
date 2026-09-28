import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import {
  listPendingVerificationRequests,
  type PendingVerificationRequest,
} from '@/lib/admin-verifications';

const dateLabel = (value: string) => new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

export function AdminVerificationsPage() {
  const [requests, setRequests] = useState<PendingVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPendingVerificationRequests()
      .then(setRequests)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load requests.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-48 rounded-2xl skeleton" />;
  if (error) return <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>;

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border border-primary/14 bg-[hsl(var(--primary-soft))] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Verification authority</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">Pending professional reviews</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Review only the submitted professional snapshot. Patient, clinical and financial records are outside this authority.</p>
      </section>
      {!requests.length ? (
        <section className="rounded-2xl border bg-card p-8 text-center"><ShieldCheck className="mx-auto text-success" /><h2 className="mt-3 text-lg font-bold">No pending requests</h2><p className="mt-1 text-sm text-muted-foreground">The verification queue is currently clear.</p></section>
      ) : (
        <div className="grid gap-3">
          {requests.map((request) => (
            <a key={request.request_id} href={`/admin/verifications/${request.request_id}`} className="group rounded-2xl border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/.025)] transition hover:border-primary/25">
              <div className="flex items-start justify-between gap-4">
                <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{request.submitted_full_name}</h2>{request.registration_conflict && <span className="inline-flex items-center gap-1 rounded-full bg-destructive/7 px-2.5 py-1 text-xs font-semibold text-destructive"><AlertTriangle size={13} /> Registration conflict</span>}</div><p className="mt-1 text-sm text-muted-foreground">{request.submitted_qualification}</p><p className="mt-3 text-sm font-medium">{request.submitted_registration_authority} · {request.submitted_registration_jurisdiction}</p><p className="mt-1 text-xs text-muted-foreground">Request v{request.request_version} · {dateLabel(request.requested_at)}</p></div>
                <ArrowRight className="mt-1 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" size={19} />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
