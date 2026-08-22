import { useEffect, useMemo, useState } from 'react';
import {
  createTreatmentEpisode,
  loadTreatmentEpisodesForPatient,
  transitionTreatmentEpisode,
  type TreatmentEpisode,
  type TreatmentEpisodeCategory,
  type TreatmentEpisodeStatus,
} from '@/lib/treatment-episodes';

const today = new Date().toISOString().slice(0, 10);

function label(status: TreatmentEpisodeStatus) {
  if (status === 'ONGOING') return 'Ongoing';
  if (status === 'RECOVERED_DISCHARGED') return 'Recovered / Discharged';
  if (status === 'LEFT_DISCONTINUED') return 'Left / Discontinued';
  return 'Needs review / classify historical episode';
}

function badgeClass(status: TreatmentEpisodeStatus) {
  if (status === 'ONGOING') return 'bg-emerald-50 text-emerald-700';
  if (status === 'RECOVERED_DISCHARGED') return 'bg-sky-50 text-sky-700';
  if (status === 'LEFT_DISCONTINUED') return 'bg-amber-50 text-amber-800';
  return 'bg-secondary text-muted-foreground';
}

export function TreatmentEpisodeStatusCell({
  patientId,
  defaultTitle,
  defaultCategory,
}: {
  patientId: string;
  defaultTitle: string;
  defaultCategory?: string;
}) {
  const [episodes, setEpisodes] = useState<TreatmentEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'idle' | 'start' | 'status'>('idle');
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(defaultTitle || 'Physiotherapy treatment');
  const [category, setCategory] = useState<TreatmentEpisodeCategory>(
    ['Ortho', 'Neuro', 'Cardio', 'Rehab', 'Pedia', 'Geriatrics'].includes(defaultCategory || '')
      ? (defaultCategory as TreatmentEpisodeCategory)
      : 'Other',
  );
  const [startedAt, setStartedAt] = useState(today);
  const [nextStatus, setNextStatus] = useState<'RECOVERED_DISCHARGED' | 'LEFT_DISCONTINUED'>('RECOVERED_DISCHARGED');
  const [note, setNote] = useState('');

  const reload = async () => {
    const rows = await loadTreatmentEpisodesForPatient(patientId);
    setEpisodes(rows);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadTreatmentEpisodesForPatient(patientId)
      .then((rows) => { if (active) setEpisodes(rows); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load treatment episodes.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [patientId]);

  const current = useMemo(() => episodes[0] ?? null, [episodes]);
  const hasOngoing = episodes.some((episode) => episode.status === 'ONGOING');

  const startEpisode = async () => {
    setBusy(true); setError('');
    try {
      await createTreatmentEpisode({ patientId, title, category, startedAt });
      await reload();
      setMode('idle');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to start treatment episode.');
    } finally { setBusy(false); }
  };

  const setLegacyOngoing = async () => {
    if (!current) return;
    setBusy(true); setError('');
    try {
      await transitionTreatmentEpisode(current.id, 'ONGOING');
      await reload();
      setMode('idle');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to update treatment status.');
    } finally { setBusy(false); }
  };

  const finishEpisode = async () => {
    if (!current) return;
    setBusy(true); setError('');
    try {
      await transitionTreatmentEpisode(current.id, nextStatus, note);
      await reload();
      setMode('idle'); setNote('');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to update treatment status.');
    } finally { setBusy(false); }
  };

  if (loading) return <p className="text-xs text-muted-foreground">Loading treatment status…</p>;

  return <div className="mt-3 space-y-2">
    {current ? <>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badgeClass(current.status)}`}>{label(current.status)}</span>
        <span className="text-xs text-muted-foreground">{current.title} · {current.category}</span>
      </div>
      {current.dischargeNote && <p className="text-xs text-muted-foreground">Note: {current.dischargeNote}</p>}
    </> : <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold text-muted-foreground">No treatment episode</span>}

    {mode === 'idle' && <div className="flex flex-wrap gap-2">
      {current?.status === 'LEGACY_UNSPECIFIED' && <button type="button" disabled={busy} onClick={() => void setLegacyOngoing()} className="text-xs font-bold text-primary">Mark Ongoing</button>}
      {(current?.status === 'ONGOING' || current?.status === 'LEGACY_UNSPECIFIED') && <button type="button" disabled={busy} onClick={() => setMode('status')} className="text-xs font-bold text-primary">Change status</button>}
      {current && !hasOngoing && current.status !== 'LEGACY_UNSPECIFIED' && <button type="button" disabled={busy} onClick={() => setMode('start')} className="text-xs font-bold text-primary">Start new episode</button>}
      {!current && <button type="button" disabled={busy} onClick={() => setMode('start')} className="text-xs font-bold text-primary">Start treatment episode</button>}
    </div>}

    {mode === 'start' && <div className="grid gap-2 rounded-xl border bg-secondary/30 p-3 sm:grid-cols-2">
      <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-9 rounded-lg border bg-card px-3 text-xs" placeholder="Episode title / condition" />
      <select value={category} onChange={(event) => setCategory(event.target.value as TreatmentEpisodeCategory)} className="h-9 rounded-lg border bg-card px-3 text-xs">
        {['Ortho','Neuro','Cardio','Rehab','Pedia','Geriatrics','Other'].map((value) => <option key={value}>{value}</option>)}
      </select>
      <input type="date" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} className="h-9 rounded-lg border bg-card px-3 text-xs" />
      <div className="flex gap-2"><button type="button" disabled={busy || !title.trim() || !startedAt} onClick={() => void startEpisode()} className="text-xs font-bold text-primary">{busy ? 'Saving…' : 'Start episode'}</button><button type="button" disabled={busy} onClick={() => setMode('idle')} className="text-xs font-bold text-muted-foreground">Cancel</button></div>
    </div>}

    {mode === 'status' && current && <div className="grid gap-2 rounded-xl border bg-secondary/30 p-3">
      <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as typeof nextStatus)} className="h-9 rounded-lg border bg-card px-3 text-xs"><option value="RECOVERED_DISCHARGED">Recovered / Discharged</option><option value="LEFT_DISCONTINUED">Left / Discontinued</option></select>
      <input value={note} onChange={(event) => setNote(event.target.value)} className="h-9 rounded-lg border bg-card px-3 text-xs" placeholder="Optional discharge/discontinuation note" />
      <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void finishEpisode()} className="text-xs font-bold text-primary">{busy ? 'Saving…' : 'Save status'}</button><button type="button" disabled={busy} onClick={() => setMode('idle')} className="text-xs font-bold text-muted-foreground">Cancel</button></div>
    </div>}

    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>;
}
