import { useEffect, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  CalendarCheck2,
  CalendarClock,
  CircleOff,
  Eye,
  ShieldAlert,
  UsersRound,
} from 'lucide-react';
import {
  getAdminOperationsOverview,
  type AdminOperationsOverview,
} from '@/lib/admin-operations';

const integer = new Intl.NumberFormat('en-IN');

function dateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: typeof Activity;
}) {
  return (
    <article className="rounded-2xl border border-primary/8 bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/.025)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_hsl(var(--foreground)/.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-[-.035em]">{typeof value === 'number' ? integer.format(value) : value}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-primary/8 text-primary"><Icon size={19} /></span>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}

function QuickAction({
  href,
  label,
  detail,
  icon: Icon,
}: {
  href: string;
  label: string;
  detail: string;
  icon: typeof Activity;
}) {
  return (
    <a href={href} className="group flex min-h-24 items-center gap-4 rounded-2xl border bg-card p-4 transition hover:border-primary/25 hover:bg-primary/[.025]">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><Icon size={19} /></span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span>
      </span>
    </a>
  );
}

export function AdminOperationsOverviewPage() {
  const today = new Date();
  const initialFrom = new Date(today);
  initialFrom.setDate(today.getDate() - 29);
  const [from, setFrom] = useState(dateInput(initialFrom));
  const [to, setTo] = useState(dateInput(today));
  const [overview, setOverview] = useState<AdminOperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAdminOperationsOverview(from, to)
      .then(setOverview)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load operations.'))
      .finally(() => setLoading(false));
  }, [from, to]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-primary/14 bg-[linear-gradient(135deg,hsl(var(--primary-soft)),hsl(var(--card))_72%)] p-6 shadow-[0_18px_50px_hsl(var(--foreground)/.04)] sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Operations control</p>
              <span className="rounded-full border border-success/15 bg-success/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-success">MFA protected</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-[-.035em] sm:text-4xl">Admin control center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">See what needs attention, move into operational queues quickly, and keep clinical notes, diagnoses, OTPs and provider secrets outside the Admin surface.</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            <label className="space-y-1"><span className="block text-[11px] font-semibold text-muted-foreground">From</span><input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm" /></label>
            <label className="space-y-1"><span className="block text-[11px] font-semibold text-muted-foreground">To</span><input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm" /></label>
          </div>
        </div>
      </section>

      <section aria-label="Admin quick actions" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction href="/admin/bookings" label="Booking queue" detail="Review patient → therapist request states." icon={CalendarClock} />
        <QuickAction href="/admin/patients" label="Patient operations" detail="Open privacy-safe patient identities." icon={UsersRound} />
        <QuickAction href="/admin/therapists" label="Therapist roster" detail="Inspect professional and discovery status." icon={BadgeCheck} />
        <QuickAction href="/admin/cases" label="Operational cases" detail="Handle escalations without exposing clinical notes." icon={ShieldAlert} />
      </section>

      {loading && <div className="h-44 rounded-2xl skeleton" />}
      {error && <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>}

      {overview && !loading && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Appointment requests" value={overview.appointments.total} detail={`${overview.period.from} to ${overview.period.to}`} icon={CalendarClock} />
            <MetricCard label="Awaiting response" value={overview.appointments.requested} detail="Therapist action still pending" icon={CalendarCheck2} />
            <MetricCard label="Registered patients" value={overview.patients.registered_total} detail="Platform patient identities; not therapist-owned charts" icon={UsersRound} />
            <MetricCard label="Verified therapists" value={overview.therapists.verified_total} detail={`${overview.therapists.discoverable_total} currently discoverable`} icon={BadgeCheck} />
          </section>

          {(overview.appointments.requested > 0 || overview.therapists.pending_verification_total > 0) && (
            <section className="rounded-2xl border border-warning/20 bg-warning/5 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning/10 text-warning"><ShieldAlert size={19} /></span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[.12em] text-warning">Needs attention</p>
                  <h2 className="mt-1 text-lg font-bold">There is unfinished operational work</h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    {overview.appointments.requested > 0 && <a href="/admin/bookings" className="rounded-full border bg-background px-3 py-2 hover:border-primary/25">{integer.format(overview.appointments.requested)} booking request{overview.appointments.requested === 1 ? '' : 's'} awaiting response</a>}
                    {overview.therapists.pending_verification_total > 0 && <span className="rounded-full border bg-background px-3 py-2">{integer.format(overview.therapists.pending_verification_total)} therapist verification request{overview.therapists.pending_verification_total === 1 ? '' : 's'} pending</span>}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
            <article className="rounded-2xl border bg-card p-6">
              <div className="flex items-center gap-3"><Activity className="text-primary" size={19} /><h2 className="text-lg font-bold">Booking state</h2></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Awaiting response', overview.appointments.requested],
                  ['Accepted', overview.appointments.accepted],
                  ['Rejected', overview.appointments.rejected],
                  ['Cancelled', overview.appointments.cancelled],
                ].map(([label, value]) => <div key={label} className="rounded-xl bg-secondary/45 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{integer.format(Number(value))}</p></div>)}
              </div>
            </article>

            <article className="rounded-2xl border border-warning/20 bg-warning/5 p-6">
              <div className="flex items-center gap-3 text-warning"><Eye size={19} /><h2 className="text-lg font-bold">Site traffic</h2></div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">Traffic measurement is not configured yet. Visitor and page-view numbers are deliberately blank instead of invented.</p>
              <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldAlert className="mt-0.5 shrink-0" size={15} /> Cloudflare analytics access is a separate manual configuration step. Health or booking identities must never be sent to advertising analytics.</p>
            </article>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="All therapists" value={overview.therapists.registered_total} detail="Professional platform identities" icon={UsersRound} />
            <MetricCard label="Pending verification" value={overview.therapists.pending_verification_total} detail="Requests requiring reviewer action" icon={ShieldAlert} />
            <MetricCard label="Not accepted" value={overview.appointments.rejected + overview.appointments.cancelled} detail="Rejected or cancelled in the selected request period" icon={CircleOff} />
          </section>
        </>
      )}
    </div>
  );
}
