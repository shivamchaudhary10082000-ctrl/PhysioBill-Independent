import { useEffect, useMemo, useState } from 'react';
import { Activity, FileText, IndianRupee, Link2, Stethoscope, Timer, Users } from 'lucide-react';
import {
  loadMyTherapistOperatingAnalytics,
  type TherapistOperatingAnalytics,
} from '@/lib/therapist-operating-analytics';
import {
  loadTherapistAnalyticsLocale,
  therapistAnalyticsCopy,
} from '@/lib/therapist-analytics-locale';
import { DEFAULT_LOCALE, type SupportedLocale } from '@/lib/locale';

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
    <div className="min-w-0 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="break-words text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">{label}</p>
          <p className="mt-2 break-words text-3xl font-extrabold tracking-tight">{value}</p>
        </div>
        <div aria-hidden="true" className="shrink-0 rounded-xl bg-secondary p-2.5 text-primary">{icon}</div>
      </div>
      <p className="mt-3 break-words text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function TherapistAnalyticsPage() {
  const initial = useMemo(defaultPeriod, []);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [analytics, setAnalytics] = useState<TherapistOperatingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const copy = therapistAnalyticsCopy(locale);

  const load = async () => {
    if (loading && analytics !== null) return;
    if (!start || !end || start >= end) {
      setAnalytics(null);
      setError(copy.invalidPeriod);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setAnalytics(await loadMyTherapistOperatingAnalytics({ periodStart: start, periodEndExclusive: end }));
    } catch {
      setAnalytics(null);
      setError(copy.unableToLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    void (async () => {
      const preferredLocale = await loadTherapistAnalyticsLocale();
      if (!active) return;
      setLocale(preferredLocale);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void load();
    // Initial period is intentionally loaded once; subsequent date changes require an explicit refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="space-y-6" aria-busy={loading} lang={locale}>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">{copy.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{copy.title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{copy.description}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-semibold text-muted-foreground">
          {copy.startDate}
          <input value={start} onChange={(event) => setStart(event.target.value)} type="date" disabled={loading} className={`mt-1.5 min-h-11 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`} />
        </label>
        <label className="flex-1 text-xs font-semibold text-muted-foreground">
          {copy.endDateExclusive}
          <input value={end} onChange={(event) => setEnd(event.target.value)} type="date" disabled={loading} className={`mt-1.5 min-h-11 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`} />
        </label>
        <button type="button" onClick={() => void load()} disabled={loading} aria-busy={loading} className={`min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`}>
          {loading ? copy.loadingButton : copy.refresh}
        </button>
      </div>

      {error ? <div role="alert" aria-live="assertive" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <div role="status" aria-live="polite" className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {copy.loading}
        </div>
      ) : analytics ? (
        <>
          <div role="status" aria-live="polite" className="sr-only">{copy.loaded}</div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={copy.patientsTreated} value={String(analytics.patientsTreated)} detail={copy.patientsTreatedDetail} icon={<Users size={20} />} />
            <MetricCard label={copy.visits} value={String(analytics.visits)} detail={copy.visitsDetail(analytics.totalTreatmentMinutes, analytics.averageVisitMinutes)} icon={<Timer size={20} />} />
            <MetricCard label={copy.newEpisodes} value={String(analytics.newEpisodes)} detail={copy.newEpisodesDetail(analytics.ongoingAtPeriodEnd)} icon={<Stethoscope size={20} />} />
            <MetricCard label={copy.unlinkedVisits} value={String(analytics.unlinkedVisits)} detail={copy.unlinkedVisitsDetail} icon={<Link2 size={20} />} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label={copy.recoveredDischarged} value={String(analytics.recoveredDischarged)} detail={copy.recoveredDischargedDetail} icon={<Activity size={20} />} />
            <MetricCard label={copy.leftDiscontinued} value={String(analytics.leftDiscontinued)} detail={copy.leftDiscontinuedDetail} icon={<Activity size={20} />} />
            <MetricCard label={copy.finalizedInvoices} value={String(analytics.finalizedInvoices)} detail={copy.finalizedInvoicesDetail} icon={<FileText size={20} />} />
            <MetricCard label={copy.billedTotal} value={`₹${analytics.billedTotal.toLocaleString(locale, { maximumFractionDigits: 2 })}`} detail={copy.billedTotalDetail} icon={<IndianRupee size={20} />} />
          </div>
        </>
      ) : null}
    </section>
  );
}
