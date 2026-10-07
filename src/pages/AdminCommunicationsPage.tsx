import { useEffect, useState } from 'react';
import { BellRing, CircleCheckBig, CircleOff, MessageSquareWarning, Send } from 'lucide-react';
import { getAdminCommunicationHealth, type AdminCommunicationHealth } from '@/lib/admin-operations';

const integer = new Intl.NumberFormat('en-IN');
const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export function AdminCommunicationsPage() {
  const [health, setHealth] = useState<AdminCommunicationHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    getAdminCommunicationHealth(from.toISOString(), to.toISOString())
      .then(setHealth)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load communication health.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[26px] border bg-card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Provider-neutral evidence</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.035em]">Communication health</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Thirty-day counts for appointment communication intents and their latest delivery states. Phone numbers, message bodies, OTP values, provider IDs and credentials are never returned.</p>
      </section>

      {loading && <div className="h-52 rounded-2xl skeleton" />}
      {error && <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>}
      {health && !loading && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border bg-card p-5"><BellRing className="text-primary" size={19} /><p className="mt-4 text-xs text-muted-foreground">Communication intents</p><p className="mt-1 text-2xl font-bold">{integer.format(health.intents_total)}</p></div>
            <div className="rounded-2xl border bg-card p-5"><Send className="text-primary" size={19} /><p className="mt-4 text-xs text-muted-foreground">Transport activity</p><p className="mt-1 text-2xl font-bold">{integer.format(health.delivery_activity)}</p></div>
            <div className="rounded-2xl border bg-card p-5"><CircleCheckBig className="text-success" size={19} /><p className="mt-4 text-xs text-muted-foreground">Delivered</p><p className="mt-1 text-2xl font-bold">{integer.format(health.delivered)}</p></div>
            <div className="rounded-2xl border bg-card p-5"><CircleOff className="text-destructive" size={19} /><p className="mt-4 text-xs text-muted-foreground">Failed or suppressed</p><p className="mt-1 text-2xl font-bold">{integer.format(health.failed + health.suppressed)}</p></div>
          </section>

          <section className="rounded-2xl border border-warning/20 bg-warning/5 p-6">
            <div className="flex items-center gap-3 text-warning"><MessageSquareWarning size={19} /><h2 className="font-bold">External delivery is not inferred from code</h2></div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Provider configuration remains an external launch gate. Real patient SMS OTP needs DLT approval, an MSG91 account/flow, and Supabase hook secrets. A count of zero does not prove a provider is healthy.</p>
            <p className="mt-3 text-xs text-muted-foreground">Last recorded transition: {health.last_transition_at ? dateTime.format(new Date(health.last_transition_at)) : 'none in this period'} · due intents: {integer.format(health.scheduled_due)}</p>
          </section>
        </>
      )}
    </div>
  );
}
