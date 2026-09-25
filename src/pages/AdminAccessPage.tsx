import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import {
  listAdminCapabilityGrants,
  setAdminCapability,
  type AdminCapability,
  type AdminCapabilityGrant,
} from '@/lib/admin-operations';

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const capabilityLabel = (value: string) => value.split('_').join(' ');
const CAPABILITY_OPTIONS: AdminCapability[] = [
  'operations_admin',
  'verification_reviewer',
  'support_agent',
  'privacy_officer',
  'security_auditor',
  'content_moderator',
  'finance_reviewer',
  'platform_owner',
];

export function AdminAccessPage({ canEdit }: { canEdit: boolean }) {
  const [grants, setGrants] = useState<AdminCapabilityGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [userId, setUserId] = useState('');
  const [capability, setCapability] = useState<AdminCapability>('operations_admin');
  const [active, setActive] = useState(true);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    listAdminCapabilityGrants()
      .then(setGrants)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load Admin access.'))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await setAdminCapability({ userId: userId.trim(), capability, active, reason });
      setNotice(`${capabilityLabel(capability)} was ${active ? 'activated' : 'deactivated'}.`);
      setReason('');
      setReloadKey((value) => value + 1);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to change Admin access.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border bg-card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Least privilege</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">Admin access</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Capabilities are separate and attributable. An Admin must keep a professional persona; patient accounts cannot receive Admin authority.</p>
      </section>

      {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-success">{notice}</div>}

      {canEdit && (
        <form onSubmit={submit} className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3"><KeyRound className="text-primary" size={19} /><h2 className="text-lg font-bold">Change a capability</h2></div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Use the professional account’s Auth user UUID. Every change requires a specific reason and is written to the Admin audit history.</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr_.6fr]">
            <label className="space-y-2"><span className="text-xs font-semibold">Professional Auth user UUID</span><input required pattern="[0-9a-fA-F-]{36}" value={userId} onChange={(event) => setUserId(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm" /></label>
            <label className="space-y-2"><span className="text-xs font-semibold">Capability</span><select value={capability} onChange={(event) => setCapability(event.target.value as AdminCapability)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm">{CAPABILITY_OPTIONS.map((value) => <option key={value} value={value}>{capabilityLabel(value)}</option>)}</select></label>
            <label className="space-y-2"><span className="text-xs font-semibold">State</span><select value={active ? 'active' : 'inactive'} onChange={(event) => setActive(event.target.value === 'active')} className="h-11 w-full rounded-xl border bg-background px-3 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <label className="space-y-2 lg:col-span-3"><span className="text-xs font-semibold">Reason</span><textarea required minLength={8} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-24 w-full rounded-xl border bg-background px-3 py-3 text-sm" /></label>
          </div>
          <button disabled={busy} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"><KeyRound size={16} />{busy ? 'Saving…' : 'Record capability change'}</button>
        </form>
      )}

      {loading && <div className="h-44 rounded-2xl skeleton" />}
      {!loading && !grants.length && <section className="rounded-2xl border bg-card p-8 text-center"><ShieldOff className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-bold">No capability grants</h2></section>}
      {!loading && grants.length > 0 && (
        <div className="space-y-3">
          {grants.map((grant) => (
            <article key={`${grant.user_id}:${grant.capability}`} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3"><span className={`grid size-9 place-items-center rounded-xl ${grant.is_active ? 'bg-success/8 text-success' : 'bg-secondary text-muted-foreground'}`}>{grant.is_active ? <ShieldCheck size={17} /> : <ShieldOff size={17} />}</span><div><h2 className="text-sm font-bold capitalize">{capabilityLabel(grant.capability)}</h2><p className="mt-1 break-all text-xs text-muted-foreground">{grant.user_id}</p></div></div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">{grant.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <p className="mt-3 text-sm">{grant.grant_reason || 'No historical reason recorded.'}</p>
              <p className="mt-2 text-xs text-muted-foreground">Updated {dateTime.format(new Date(grant.updated_at))}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
