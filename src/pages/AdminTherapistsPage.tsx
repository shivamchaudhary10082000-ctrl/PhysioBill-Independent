import { useEffect, useState } from 'react';
import { BadgeCheck, Eye, EyeOff, UsersRound } from 'lucide-react';
import {
  listAdminTherapistOperations,
  type AdminTherapistOperation,
} from '@/lib/admin-operations';

const integer = new Intl.NumberFormat('en-IN');
const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });

export function AdminTherapistsPage() {
  const [status, setStatus] = useState<AdminTherapistOperation['verification_status'] | 'all'>('all');
  const [therapists, setTherapists] = useState<AdminTherapistOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listAdminTherapistOperations({ verificationStatus: status === 'all' ? null : status, limit: 100 })
      .then(setTherapists)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load therapists.'))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Professional operations</p><h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">Therapists</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Verification, public visibility and recent booking activity. Private patient and clinical records remain outside this view.</p></div>
          <select aria-label="Verification status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-11 rounded-xl border bg-background px-3 text-sm font-semibold"><option value="all">All verification states</option><option value="verified">Verified</option><option value="pending">Pending</option><option value="unverified">Unverified</option><option value="rejected">Rejected</option></select>
        </div>
      </section>

      {loading && <div className="h-52 rounded-2xl skeleton" />}
      {error && <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>}
      {!loading && !error && !therapists.length && <section className="rounded-2xl border bg-card p-10 text-center"><UsersRound className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-bold">No matching therapists</h2></section>}

      {!loading && therapists.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {therapists.map((therapist) => (
            <article key={therapist.physio_id} className="rounded-2xl border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/.025)]">
              <div className="flex items-start justify-between gap-4">
                <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{therapist.therapist_display_name}</h2>{therapist.verification_status === 'verified' && <BadgeCheck className="text-success" size={18} />}</div><p className="mt-1 text-sm text-muted-foreground">{therapist.qualification || 'Qualification not supplied'}</p><p className="mt-2 text-xs font-semibold text-primary">{therapist.public_physio_id}</p></div>
                <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">{therapist.is_discoverable ? <Eye size={13} /> : <EyeOff size={13} />}{therapist.is_discoverable ? 'Public' : 'Private'}</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-secondary/45 p-3"><p className="text-[11px] text-muted-foreground">Verification</p><p className="mt-1 text-sm font-bold capitalize">{therapist.verification_status}</p></div>
                <div className="rounded-xl bg-secondary/45 p-3"><p className="text-[11px] text-muted-foreground">Requests · 30d</p><p className="mt-1 text-sm font-bold">{integer.format(therapist.appointment_requests_30d)}</p></div>
                <div className="rounded-xl bg-secondary/45 p-3"><p className="text-[11px] text-muted-foreground">Accepted · 30d</p><p className="mt-1 text-sm font-bold">{integer.format(therapist.accepted_appointments_30d)}</p></div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Registered {date.format(new Date(therapist.registered_at))}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
