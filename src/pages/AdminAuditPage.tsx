import { useEffect, useState } from 'react';
import { ScrollText, ShieldCheck } from 'lucide-react';
import { listAdminAuditEvents, type AdminAuditEvent } from '@/lib/admin-operations';

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const label = (value: string) => value.split('_').join(' ');

export function AdminAuditPage() {
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminAuditEvents({ limit: 100 })
      .then(setEvents)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load Admin audit history.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border bg-card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Accountability</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">Admin audit history</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Append-only evidence of privileged operational reads and actions. This view requires owner or security-auditor authority.</p>
      </section>

      {loading && <div className="h-52 rounded-2xl skeleton" />}
      {error && <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>}
      {!loading && !error && !events.length && <section className="rounded-2xl border bg-card p-10 text-center"><ShieldCheck className="mx-auto text-success" /><h2 className="mt-3 font-bold">No audit events yet</h2></section>}

      {!loading && events.length > 0 && (
        <div className="space-y-3">
          {events.map((event) => (
            <article key={event.event_id} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary/8 text-primary"><ScrollText size={17} /></span><div><h2 className="text-sm font-bold capitalize">{label(event.action)}</h2><p className="mt-1 text-xs text-muted-foreground">{label(event.target_type)} · {label(event.capability_used)}</p></div></div>
                <time className="text-xs text-muted-foreground">{dateTime.format(new Date(event.occurred_at))}</time>
              </div>
              {event.reason && <p className="mt-3 rounded-xl bg-secondary/45 p-3 text-sm">{event.reason}</p>}
              <div className="mt-3 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2"><p className="break-all">Actor: {event.actor_user_id}</p><p className="break-all">Target: {event.target_id ?? 'aggregate/list'}</p></div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
