import { useEffect, useState } from 'react';
import { BadgeCheck, CheckCircle2, Eye, EyeOff, PauseCircle, PlayCircle, ShieldAlert, UsersRound } from 'lucide-react';
import {
  getAdminCapabilities,
  listAdminTherapistOperations,
  setAdminTherapistDiscoveryVisibility,
  type AdminCapability,
  type AdminTherapistOperation,
} from '@/lib/admin-operations';

const integer = new Intl.NumberFormat('en-IN');
const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });

export function AdminTherapistsPage() {
  const [status, setStatus] = useState<AdminTherapistOperation['verification_status'] | 'all'>('all');
  const [therapists, setTherapists] = useState<AdminTherapistOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<AdminCapability[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [moderating, setModerating] = useState<AdminTherapistOperation | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [moderationBusy, setModerationBusy] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      listAdminTherapistOperations({ verificationStatus: status === 'all' ? null : status, limit: 100 }),
      getAdminCapabilities(),
    ])
      .then(([items, grantedCapabilities]) => { setTherapists(items); setCapabilities(grantedCapabilities); })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load therapists.'))
      .finally(() => setLoading(false));
  }, [status, refreshKey]);

  const canModerate = capabilities.some((capability) =>
    capability === 'platform_owner' || capability === 'operations_admin' || capability === 'content_moderator');

  const applyModeration = async () => {
    if (!moderating) return;
    const nextStatus = moderating.admin_visibility_status === 'paused' ? 'active' : 'paused';
    if (nextStatus === 'paused' && moderationReason.trim().length < 10) {
      setModerationError('Enter a clear pause reason of at least 10 characters.');
      return;
    }
    setModerationBusy(true);
    setModerationError(null);
    try {
      await setAdminTherapistDiscoveryVisibility({
        physioId: moderating.physio_id,
        visibilityStatus: nextStatus,
        reason: moderationReason,
      });
      setModerating(null);
      setModerationReason('');
      setRefreshKey((current) => current + 1);
    } catch (caught) {
      setModerationError(caught instanceof Error ? caught.message : 'Unable to update the listing.');
    } finally {
      setModerationBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Professional operations</p><h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">Therapists</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Verification, automated public-profile checks, listing controls and recent booking activity. Every Admin visibility change is audited; private patient and clinical records remain outside this view.</p></div>
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
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${therapist.admin_visibility_status === 'paused' ? 'bg-destructive/8 text-destructive' : 'bg-secondary'}`}>{therapist.admin_visibility_status === 'paused' ? <PauseCircle size={13} /> : therapist.is_discoverable ? <Eye size={13} /> : <EyeOff size={13} />}{therapist.admin_visibility_status === 'paused' ? 'Paused by Admin' : therapist.is_discoverable ? 'Opted in' : 'Private'}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-secondary/45 p-3"><p className="text-[11px] text-muted-foreground">Verification</p><p className="mt-1 text-sm font-bold capitalize">{therapist.verification_status}</p></div>
                <div className="rounded-xl bg-secondary/45 p-3"><p className="text-[11px] text-muted-foreground">Automated checks</p><p className="mt-1 flex items-center gap-1 text-sm font-bold capitalize">{therapist.automated_check_status === 'passed' ? <CheckCircle2 size={14} className="text-success" /> : <ShieldAlert size={14} className="text-amber-600" />}{therapist.automated_check_status.replace('_', ' ')}</p></div>
                <div className="rounded-xl bg-secondary/45 p-3"><p className="text-[11px] text-muted-foreground">Requests · 30d</p><p className="mt-1 text-sm font-bold">{integer.format(therapist.appointment_requests_30d)}</p></div>
                <div className="rounded-xl bg-secondary/45 p-3"><p className="text-[11px] text-muted-foreground">Accepted · 30d</p><p className="mt-1 text-sm font-bold">{integer.format(therapist.accepted_appointments_30d)}</p></div>
              </div>
              {therapist.admin_visibility_status === 'paused' && therapist.admin_visibility_reason && <div className="mt-4 rounded-xl border border-destructive/15 bg-destructive/5 p-3"><p className="text-[11px] font-bold uppercase tracking-[.1em] text-destructive">Admin pause reason</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{therapist.admin_visibility_reason}</p></div>}
              <div className="mt-4 flex flex-wrap gap-2">
                {therapist.is_discoverable && therapist.verification_status === 'verified' && therapist.automated_check_status === 'passed' && therapist.admin_visibility_status === 'active' && <a href={`/physiotherapist/${therapist.physio_id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold"><Eye size={14} /> View public profile</a>}
                {canModerate && (therapist.is_discoverable || therapist.admin_visibility_status === 'paused') && <button type="button" onClick={() => { setModerating(therapist); setModerationReason(''); setModerationError(null); }} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold ${therapist.admin_visibility_status === 'paused' ? 'bg-success text-success-foreground' : 'border border-destructive/20 bg-destructive/5 text-destructive'}`}>{therapist.admin_visibility_status === 'paused' ? <PlayCircle size={14} /> : <PauseCircle size={14} />}{therapist.admin_visibility_status === 'paused' ? 'Restore public listing' : 'Pause public listing'}</button>}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Registered {date.format(new Date(therapist.registered_at))}</p>
            </article>
          ))}
        </div>
      )}

      {moderating && (
        <section role="dialog" aria-modal="true" aria-labelledby="therapist-moderation-title" className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[26px] border bg-card p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Audited Admin control</p>
            <h2 id="therapist-moderation-title" className="mt-2 text-2xl font-bold">{moderating.admin_visibility_status === 'paused' ? 'Restore' : 'Pause'} {moderating.therapist_display_name}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{moderating.admin_visibility_status === 'paused' ? 'Restoring makes the profile and availability eligible for public display again, provided verification and automated checks still pass.' : 'Pausing removes the profile and public availability immediately. It does not delete the therapist account or private records.'}</p>
            <label className="mt-5 block text-sm font-bold" htmlFor="therapist-moderation-reason">Reason {moderating.admin_visibility_status === 'active' ? '(required)' : '(optional)'}</label>
            <textarea id="therapist-moderation-reason" value={moderationReason} onChange={(event) => setModerationReason(event.target.value)} maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder={moderating.admin_visibility_status === 'active' ? 'Describe the safety, policy, or accuracy reason for pausing this listing.' : 'Optional restoration note'} />
            {moderationError && <p role="alert" className="mt-3 text-xs text-destructive">{moderationError}</p>}
            <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={moderationBusy} onClick={() => setModerating(null)} className="min-h-11 rounded-xl border px-4 text-sm font-bold">Cancel</button><button type="button" disabled={moderationBusy} onClick={() => void applyModeration()} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60">{moderationBusy ? 'Saving…' : moderating.admin_visibility_status === 'paused' ? 'Restore listing' : 'Pause listing'}</button></div>
          </div>
        </section>
      )}
    </div>
  );
}
