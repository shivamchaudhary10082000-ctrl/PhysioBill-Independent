import { useEffect, useMemo, useState } from 'react';
import {
  loadTreatmentPeriodAnalytics,
  type TreatmentPeriodAnalytics,
  type TreatmentPeriodEpisode,
} from '@/lib/treatment-analytics';
import type { TreatmentEpisodeStatus } from '@/lib/treatment-episodes';

type PatientSummary = {
  id: string;
  patientNumber: string;
  name: string;
  condition: string;
  clinicalCategory?: string;
};

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function statusLabel(status: TreatmentEpisodeStatus | null) {
  if (status === 'ONGOING') return 'Ongoing';
  if (status === 'RECOVERED_DISCHARGED') return 'Recovered / Discharged';
  if (status === 'LEFT_DISCONTINUED') return 'Left / Discontinued';
  if (status === 'LEGACY_UNSPECIFIED') return 'Historical status unspecified';
  return 'Status not provable at month end';
}

function statusClass(status: TreatmentEpisodeStatus | null) {
  if (status === 'ONGOING') return 'border border-emerald-200/70 bg-emerald-50/65 text-emerald-700';
  if (status === 'RECOVERED_DISCHARGED') return 'border border-sky-200/70 bg-sky-50/65 text-sky-700';
  if (status === 'LEFT_DISCONTINUED') return 'border border-rose-200/70 bg-rose-50/60 text-rose-700';
  return 'border border-border bg-secondary/65 text-muted-foreground';
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function MetricCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'ongoing' | 'recovered' | 'left';
}) {
  const toneClass = {
    neutral: 'border-border bg-card',
    ongoing: 'border-emerald-200/65 bg-emerald-50/45',
    recovered: 'border-sky-200/65 bg-sky-50/45',
    left: 'border-rose-200/65 bg-rose-50/40',
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 shadow-[0_8px_22px_hsl(var(--foreground)/.025)] ${toneClass}`}>
      <p className="text-[11px] font-semibold leading-4 text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-[-.035em] text-foreground">{value}</p>
    </div>
  );
}

function EpisodeSummary({ episode }: { episode: TreatmentPeriodEpisode }) {
  return (
    <div className="rounded-xl border bg-secondary/25 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">{episode.title}</p>
          <p className="text-xs text-muted-foreground">
            {episode.category} · Started {dateLabel(episode.startedAt)} · {episode.visitCount}{' '}
            {episode.visitCount === 1 ? 'visit' : 'visits'} this month
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(episode.statusAtMonthEnd)}`}>
          {statusLabel(episode.statusAtMonthEnd)}
        </span>
      </div>
    </div>
  );
}

export function PatientPeriodAnalytics({
  patients,
  refreshKey,
}: {
  patients: PatientSummary[];
  refreshKey: number;
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [analytics, setAnalytics] = useState<TreatmentPeriodAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 16 }, (_, index) => currentYear + 5 - index);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    loadTreatmentPeriodAnalytics({ month, year })
      .then((result) => {
        if (active) setAnalytics(result);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'Unable to load period analytics.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month, refreshKey, year]);

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );

  return (
    <section className="mb-6 rounded-2xl border bg-card p-4 shadow-[0_12px_30px_hsl(var(--foreground)/.03)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="workspace-section-kicker">Clinical activity</p>
          <h2 className="mt-1 text-xl font-bold tracking-[-.025em] text-foreground">Treatment analytics</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Review treatment activity and patient progress by month.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-[300px]">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground/70">Month</span>
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="h-11 w-full rounded-xl border bg-card px-3 text-sm font-medium">
              {months.map((label, index) => (
                <option key={label} value={index + 1}>{label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground/70">Year</span>
            <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="h-11 w-full rounded-xl border bg-card px-3 text-sm font-medium">
              {yearOptions.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      {loading ? (
        <div className="mt-4 rounded-xl border border-border/70 bg-secondary/35 p-4 text-sm font-medium text-muted-foreground">Loading treatment analytics…</div>
      ) : analytics ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-5">
            <MetricCard label="Patients treated" value={analytics.patientsTreated} />
            <MetricCard label="Visits" value={analytics.visits} />
            <MetricCard label="Ongoing at month end" value={analytics.ongoingAtMonthEnd} tone="ongoing" />
            <MetricCard label="Recovered / Discharged" value={analytics.recoveredDischarged} tone="recovered" />
            <MetricCard label="Left / Discontinued" value={analytics.leftDiscontinued} tone="left" />
          </div>

          <div className="mt-6 border-t border-border/80 pt-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-base font-bold tracking-[-.015em] text-foreground">Patients treated in {months[month - 1]} {year}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Patients with treatment visits during this period.</p>
              </div>
            </div>

            {analytics.patients.length ? (
              <div className="mt-3 space-y-3">
                {analytics.patients.map((periodPatient) => {
                  const patient = patientById.get(periodPatient.patientId);
                  if (!patient) return null;
                  const clinical = [patient.condition, patient.clinicalCategory].filter(Boolean).join(' · ');
                  return (
                    <div key={periodPatient.patientId} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-bold text-foreground">{patient.name}</p>
                          <p className="text-xs font-semibold text-muted-foreground">{patient.patientNumber}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{clinical || 'No condition/category recorded'}</p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{periodPatient.visitCount} {periodPatient.visitCount === 1 ? 'visit' : 'visits'} in period</p>
                      </div>

                      {periodPatient.episodes.length ? (
                        <div className="mt-3 space-y-2">
                          {periodPatient.episodes.map((episode) => <EpisodeSummary key={episode.id} episode={episode} />)}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">No linked Treatment Episode information is available for these Visits.</p>
                      )}

                      {periodPatient.unlinkedVisitCount > 0 && (
                        <p className="mt-2 text-xs text-amber-700">{periodPatient.unlinkedVisitCount} {periodPatient.unlinkedVisitCount === 1 ? 'Visit has' : 'Visits have'} no Treatment Episode link.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-border/70 bg-secondary/35 p-4 text-sm text-muted-foreground">No patients treated in this period.</div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
