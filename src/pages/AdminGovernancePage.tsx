import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileCheck2, Scale, ShieldCheck } from 'lucide-react';
import {
  listAdminLegalAcknowledgementSummary,
  type AdminLegalAcknowledgementSummary,
} from '@/lib/admin-operations';

const integer = new Intl.NumberFormat('en-IN');
const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export function AdminGovernancePage() {
  const [items, setItems] = useState<AdminLegalAcknowledgementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminLegalAcknowledgementSummary()
      .then(setItems)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load legal acknowledgement summary.'))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => ({
    accounts: items.reduce((sum, item) => sum + Number(item.acknowledgement_count), 0),
    professionals: items.filter((item) => item.account_role === 'physio').reduce((sum, item) => sum + Number(item.acknowledgement_count), 0),
    standards: items.reduce((sum, item) => sum + Number(item.professional_standards_count), 0),
  }), [items]);

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border bg-card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Policy evidence</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">Rules and acknowledgements</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Aggregate version evidence for Terms, Privacy Notice and Professional Standards. This page does not provide an unsafe free-form legal editor; approved policy wording remains release-controlled and must be reviewed by qualified professionals.</p>
        <div className="mt-5 flex flex-wrap gap-2"><a href="/terms" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border bg-background px-3 text-xs font-bold">Terms <ExternalLink size={14} /></a><a href="/privacy" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border bg-background px-3 text-xs font-bold">Privacy Notice <ExternalLink size={14} /></a><a href="/professional-standards" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border bg-background px-3 text-xs font-bold">Professional Standards <ExternalLink size={14} /></a></div>
      </section>

      {loading && <div className="h-48 rounded-2xl skeleton" />}
      {error && <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>}
      {!loading && !error && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-card p-5"><FileCheck2 className="text-primary" size={19} /><p className="mt-4 text-xs text-muted-foreground">Account acknowledgements</p><p className="mt-1 text-2xl font-bold">{integer.format(totals.accounts)}</p></div>
            <div className="rounded-2xl border bg-card p-5"><Scale className="text-primary" size={19} /><p className="mt-4 text-xs text-muted-foreground">Professional accounts</p><p className="mt-1 text-2xl font-bold">{integer.format(totals.professionals)}</p></div>
            <div className="rounded-2xl border bg-card p-5"><ShieldCheck className="text-success" size={19} /><p className="mt-4 text-xs text-muted-foreground">Standards acknowledgements</p><p className="mt-1 text-2xl font-bold">{integer.format(totals.standards)}</p></div>
          </section>

          {!items.length ? <section className="rounded-2xl border bg-card p-8 text-center"><h2 className="font-bold">No acknowledgement evidence found</h2></section> : <div className="space-y-3">{items.map((item) => (
            <article key={`${item.account_role}:${item.notice_version}`} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-bold">Version {item.notice_version}</h2><p className="mt-1 text-xs capitalize text-muted-foreground">{item.account_role} accounts · latest {dateTime.format(new Date(item.latest_acknowledged_at))}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{integer.format(item.acknowledgement_count)} acknowledged</span></div>
              <p className="mt-3 text-xs text-muted-foreground">Professional Standards acknowledged: {integer.format(item.professional_standards_count)}</p>
            </article>
          ))}</div>}

          <section className="rounded-2xl border border-warning/20 bg-warning/5 p-5 text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Manual gate:</strong> version counts prove recorded acknowledgement only. They do not prove that policy wording is legally sufficient. Operator identity, grievance ownership, retention rules and professional/legal review remain required before launch.</section>
        </>
      )}
    </div>
  );
}
