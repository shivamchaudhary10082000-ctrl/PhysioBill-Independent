import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CircleCheckBig, ClipboardPlus, Scale } from 'lucide-react';
import {
  createAdminCase,
  listAdminCases,
  transitionAdminCase,
  type AdminCase,
  type AdminCapability,
  type AdminCaseCategory,
  type AdminCaseStatus,
} from '@/lib/admin-operations';

const categories: Array<{ value: AdminCaseCategory; label: string }> = [
  { value: 'complaint', label: 'Complaint' },
  { value: 'safety_incident', label: 'Safety incident' },
  { value: 'privacy_access', label: 'Privacy access request' },
  { value: 'privacy_correction', label: 'Privacy correction request' },
  { value: 'privacy_deletion', label: 'Privacy deletion request' },
  { value: 'privacy_grievance', label: 'Privacy grievance' },
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical' },
];

const statusOptions: Array<{ value: AdminCaseStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'closed', label: 'Closed' },
];

const transitions: Record<AdminCaseStatus, Array<Exclude<AdminCaseStatus, 'open'>>> = {
  open: ['triaged', 'closed'],
  triaged: ['in_progress', 'waiting', 'closed'],
  in_progress: ['waiting', 'closed'],
  waiting: ['in_progress', 'closed'],
  closed: [],
};

const label = (value: string) => value.split('_').join(' ');
const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const severityTone: Record<AdminCase['severity'], string> = {
  low: 'bg-secondary text-muted-foreground',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-destructive/8 text-destructive',
  critical: 'bg-destructive text-destructive-foreground',
};

export function AdminCasesPage({ capabilities }: { capabilities: AdminCapability[] }) {
  const [items, setItems] = useState<AdminCase[]>([]);
  const [status, setStatus] = useState<AdminCaseStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<AdminCaseCategory>('complaint');
  const [severity, setSeverity] = useState<AdminCase['severity']>('medium');
  const [summary, setSummary] = useState('');
  const [appointmentRequestId, setAppointmentRequestId] = useState('');
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  const allowedCategories = useMemo(() => categories.filter((option) => (
    capabilities.includes('platform_owner')
    || (option.value.startsWith('privacy_') && capabilities.includes('privacy_officer'))
    || (option.value === 'billing' && capabilities.includes('finance_reviewer'))
    || (['safety_incident', 'technical'].includes(option.value) && capabilities.includes('security_auditor'))
    || (['complaint', 'safety_incident', 'billing', 'technical'].includes(option.value)
      && (capabilities.includes('operations_admin') || capabilities.includes('support_agent')))
  )), [capabilities]);

  useEffect(() => {
    if (!allowedCategories.some((option) => option.value === category) && allowedCategories[0]) {
      setCategory(allowedCategories[0].value);
    }
  }, [allowedCategories, category]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listAdminCases({ status: status || null, limit: 100 }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load Admin cases.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    active: items.filter((item) => item.case_status !== 'closed').length,
    urgent: items.filter((item) => item.case_status !== 'closed' && ['high', 'critical'].includes(item.severity)).length,
    privacy: items.filter((item) => item.category.startsWith('privacy_') && item.case_status !== 'closed').length,
  }), [items]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (summary.trim().length < 8) {
      setError('Enter a safe operational summary of at least 8 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAdminCase({ category, severity, safeSummary: summary, appointmentRequestId: appointmentRequestId.trim() || undefined });
      setSummary('');
      setAppointmentRequestId('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create the case.');
    } finally {
      setSaving(false);
    }
  };

  const move = async (item: AdminCase, toStatus: Exclude<AdminCaseStatus, 'open'>) => {
    const reason = window.prompt(`Reason for moving case #${item.case_number} to ${label(toStatus)}:`)?.trim();
    if (!reason) return;
    if (reason.length < 8) {
      setError('A specific transition reason of at least 8 characters is required.');
      return;
    }
    setTransitioning(item.case_id);
    setError(null);
    try {
      await transitionAdminCase({ caseId: item.case_id, toStatus, reason });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to move the case.');
    } finally {
      setTransitioning(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border bg-card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Accountable operations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">Cases and grievances</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Track complaints, safety incidents, privacy requests, billing concerns and technical issues without placing clinical details, OTPs, credentials or payment secrets in the case summary. Every create and status change is audited.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5"><ClipboardPlus className="text-primary" size={19} /><p className="mt-4 text-xs text-muted-foreground">Active cases</p><p className="mt-1 text-2xl font-bold">{counts.active}</p></div>
        <div className="rounded-2xl border bg-card p-5"><AlertTriangle className="text-destructive" size={19} /><p className="mt-4 text-xs text-muted-foreground">High or critical</p><p className="mt-1 text-2xl font-bold">{counts.urgent}</p></div>
        <div className="rounded-2xl border bg-card p-5"><Scale className="text-warning" size={19} /><p className="mt-4 text-xs text-muted-foreground">Open privacy work</p><p className="mt-1 text-2xl font-bold">{counts.privacy}</p></div>
      </section>

      <form onSubmit={submit} className="rounded-2xl border bg-card p-5">
        <h2 className="font-bold">Open a controlled case</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-[220px_160px_minmax(0,1fr)]">
          <label className="text-xs font-semibold text-muted-foreground">Category<select value={category} onChange={(event) => setCategory(event.target.value as AdminCaseCategory)} className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3 text-sm text-foreground">{allowedCategories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted-foreground">Severity<select value={severity} onChange={(event) => setSeverity(event.target.value as AdminCase['severity'])} className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3 text-sm capitalize text-foreground"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
          <label className="text-xs font-semibold text-muted-foreground">Safe operational summary<input value={summary} maxLength={500} onChange={(event) => setSummary(event.target.value)} placeholder="No diagnosis, treatment notes, OTPs or secrets" className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3 text-sm text-foreground" /></label>
          <label className="text-xs font-semibold text-muted-foreground lg:col-span-2">Related appointment request ID (optional)<input value={appointmentRequestId} onChange={(event) => setAppointmentRequestId(event.target.value)} placeholder="Links the case to masked patient and therapist identifiers" className="mt-1 min-h-11 w-full rounded-xl border bg-background px-3 text-sm text-foreground" /></label>
          <button disabled={saving} className="mt-auto min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? 'Opening…' : 'Open case'}</button>
        </div>
      </form>

      <section className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-xs font-semibold text-muted-foreground">Status filter<select value={status} onChange={(event) => setStatus(event.target.value as AdminCaseStatus | '')} className="mt-1 block min-h-11 min-w-48 rounded-xl border bg-card px-3 text-sm text-foreground">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <button type="button" onClick={() => void load()} className="min-h-11 rounded-xl border bg-card px-4 text-sm font-semibold">Refresh</button>
      </section>

      {loading && <div className="h-52 rounded-2xl skeleton" />}
      {error && <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>}
      {!loading && !error && !items.length && <section className="rounded-2xl border bg-card p-10 text-center"><CircleCheckBig className="mx-auto text-success" /><h2 className="mt-3 font-bold">No cases in this view</h2></section>}
      {!loading && !error && items.length > 0 && <div className="space-y-3">{items.map((item) => (
        <article key={item.case_id} className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">Case #{item.case_number}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${severityTone[item.severity]}`}>{item.severity}</span><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold capitalize text-muted-foreground">{label(item.case_status)}</span></div><p className="mt-1 text-xs capitalize text-muted-foreground">{label(item.category)} · opened {dateTime.format(new Date(item.created_at))}</p></div>
            {item.legal_hold && <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning">Legal hold</span>}
          </div>
          <p className="mt-4 text-sm leading-6">{item.safe_summary}</p>
          {(item.related_public_patient_id || item.related_public_physio_id || item.related_appointment_request_id) && <p className="mt-3 text-xs text-muted-foreground">{[item.related_public_patient_id, item.related_public_physio_id, item.related_appointment_request_id].filter(Boolean).join(' · ')}</p>}
          {transitions[item.case_status].length > 0 && <div className="mt-4 flex flex-wrap gap-2">{transitions[item.case_status].map((next) => <button key={next} type="button" disabled={transitioning === item.case_id} onClick={() => void move(item, next)} className="min-h-10 rounded-xl border bg-background px-3 text-xs font-bold capitalize disabled:opacity-50">Move to {label(next)}</button>)}</div>}
        </article>
      ))}</div>}
    </div>
  );
}
