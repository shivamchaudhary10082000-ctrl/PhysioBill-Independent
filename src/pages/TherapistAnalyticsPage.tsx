import { useEffect, useMemo, useState } from 'react';
import { Activity, FileText, IndianRupee, Link2, Stethoscope, Timer, Users } from 'lucide-react';
import {
  loadMyTherapistOperatingAnalytics,
  type TherapistOperatingAnalytics,
} from '@/lib/therapist-operating-analytics';

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: isoDate(start), end: isoDate(end) };
}

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
        </div>
        <div className="rounded-xl bg-secondary p-2.5 text-primary">{icon}</div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

export function TherapistAnalyticsPage() {
  const initial = useMemo(defaultPeriod, []);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [analytics, setAnalytics] = useState<TherapistOperatingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setAnalytics(await loadMyTherapistOperatingAnalytics({ periodStart: start, periodEndExclusive: end }));
    } catch (err) {
      setAnalytics(null);
      setError(err instanceof Error ? err.message : 'Unable to load therapist analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">Professional analytics</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Operating overview</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          Aggregate operational metrics are resolved by the database for your physiotherapist account only. No patient identity is returned by this analytics boundary.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-semibold text-muted-foreground">
          Start date
          <input value={start} onChange={(event) => setStart(event.target.value)} type="date" className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" />
        </label>
        <label className="flex-1 text-xs font-semibold text-muted-foreground">
          End date (exclusive)
          <input value={end} onChange={(event) => setEnd(event.target.value)} type="date" className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" />
        </label>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div> : null}

      {analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Patients treated" value={String(analytics.patientsTreated)} detail="Distinct therapist-owned patient charts with a recorded visit in the selected period." icon={<Users size={20} />} />
            <MetricCard label="Visits" value={String(analytics.visits)} detail={`${analytics.totalTreatmentMinutes} documented treatment minutes; average ${analytics.averageVisitMinutes} minutes per visit.`} icon={<Timer size={20} />} />
            <MetricCard label="New episodes" value={String(analytics.newEpisodes)} detail={`${analytics.ongoingAtPeriodEnd} treatment episodes were ongoing at the period end.`} icon={<Stethoscope size={20} />} />
            <MetricCard label="Unlinked visits" value={String(analytics.unlinkedVisits)} detail="Visits not attached to a treatment episode. This is a documentation-quality signal, not a patient access status." icon={<Link2 size={20} />} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Recovered / discharged" value={String(analytics.recoveredDischarged)} detail="Outcome transitions recorded during the selected period." icon={<Activity size={20} />} />
            <MetricCard label="Left / discontinued" value={String(analytics.leftDiscontinued)} detail="Discontinuation transitions recorded during the selected period." icon={<Activity size={20} />} />
            <MetricCard label="Finalized invoices" value={String(analytics.finalizedInvoices)} detail="Counted from immutable invoice issuance snapshots." icon={<FileText size={20} />} />
            <MetricCard label="Immutable billed total" value={`₹${analytics.billedTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} detail="Issued invoice value only. It is explicitly not proof of cash, bank, UPI, provider settlement, or collected revenue." icon={<IndianRupee size={20} />} />
          </div>
        </>
      ) : loading ? <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Loading therapist operating analytics…</div> : null}
    </section>
  );
}
