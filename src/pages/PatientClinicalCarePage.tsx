import { useEffect, useState } from 'react';
import { Activity, CalendarDays, Dumbbell, HeartPulse, Stethoscope } from 'lucide-react';
import { loadMyClinicalCareSummary, type PatientClinicalSummary } from '@/lib/patient-clinical-access';

export function PatientClinicalCarePage() {
  const [care, setCare] = useState<PatientClinicalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadMyClinicalCareSummary()
      .then((rows) => { if (active) setCare(rows); })
      .catch(() => { if (active) setError('Your linked clinical care could not be loaded safely.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <p className="py-16 text-center text-sm text-muted-foreground">Loading your linked clinical care…</p>;

  return (
    <section className="space-y-5">
      <div className="rounded-[26px] border border-primary/14 bg-[hsl(var(--primary-soft))] px-5 py-7 sm:px-7 sm:py-8">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Patient clinical access</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Your linked physiotherapy care</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Only care from an active patient-requested, therapist-accepted chart connection appears here. Therapist-private assessment notes, internal history, billing data and records belonging to another physiotherapist are not exposed on this surface.</p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      {!error && care.length === 0 && (
        <div className="rounded-2xl border bg-card p-6 text-sm leading-6 text-muted-foreground">
          No active clinical chart connection is available yet. Booking an appointment alone does not expose clinical records.
        </div>
      )}

      {care.map((chart) => (
        <article key={chart.linkId} className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Linked physiotherapist</p>
              <p className="mt-1 font-mono text-sm font-semibold">{chart.physiotherapistPublicId}</p>
            </div>
            <span className="rounded-full border bg-secondary/55 px-3 py-1 text-xs font-semibold">Clinical connection active</span>
          </div>

          <div className="mt-5 space-y-4">
            {chart.episodes.length === 0 && <p className="text-sm text-muted-foreground">The linked chart is active, but no treatment episode has been documented yet.</p>}
            {chart.episodes.map((episode) => (
              <section key={episode.episodeId} className="rounded-xl border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><Activity size={16} className="text-primary" /><h2 className="font-bold">{episode.title || 'Treatment episode'}</h2></div>
                    <p className="mt-1 text-xs text-muted-foreground">{episode.category || 'Physiotherapy care'} · Started {episode.startedAt || '—'}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize">{episode.status || 'active'}</span>
                </div>

                <div className="mt-4 space-y-3">
                  {episode.visits.length === 0 && <p className="text-sm text-muted-foreground">No visits are available in this episode yet.</p>}
                  {episode.visits.map((visit) => (
                    <div key={visit.visitId} className="rounded-xl border bg-card p-4">
                      <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                        <span className="inline-flex items-center gap-2"><CalendarDays size={15} /> {visit.visitDate || 'Visit'}</span>
                        {visit.visitNumber && <span className="text-muted-foreground">{visit.visitNumber}</span>}
                        {visit.durationMinutes !== null && <span className="text-muted-foreground">{visit.durationMinutes} min</span>}
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {visit.clinicalSummary?.diagnosis && <div className="rounded-lg bg-secondary/35 p-3"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-muted-foreground"><Stethoscope size={14} /> Diagnosis</p><p className="mt-1 text-sm leading-6">{visit.clinicalSummary.diagnosis}</p></div>}
                        {visit.clinicalSummary?.treatmentPlan && <div className="rounded-lg bg-secondary/35 p-3"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-muted-foreground"><HeartPulse size={14} /> Treatment plan</p><p className="mt-1 text-sm leading-6">{visit.clinicalSummary.treatmentPlan}</p></div>}
                        {visit.treatment && <div className="rounded-lg bg-secondary/35 p-3"><p className="text-xs font-bold uppercase tracking-[.08em] text-muted-foreground">Treatment delivered</p><p className="mt-1 text-sm leading-6">{visit.treatment}</p></div>}
                        {(visit.exercises || visit.clinicalSummary?.homeExerciseProgram) && <div className="rounded-lg bg-secondary/35 p-3"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-muted-foreground"><Dumbbell size={14} /> Exercises / HEP</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{visit.clinicalSummary?.homeExerciseProgram || visit.exercises}</p></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
