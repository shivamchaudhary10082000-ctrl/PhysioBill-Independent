import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CircleAlert,
  Clock3,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  THERAPIST_SERVICE_MODE_LABELS,
  type TherapistServiceMode,
} from '@/lib/therapist-discovery';
import {
  loadMyTherapistAvailabilityManagement,
  saveMyTherapistAvailability,
  type TherapistAvailabilityManagement,
  type TherapistAvailabilityWindow,
} from '@/lib/therapist-availability';

type AvailabilityDraft = {
  key: string;
  serviceMode: TherapistServiceMode;
  startsAtLocal: string;
  endsAtLocal: string;
};

const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const inputClass =
  'h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10';

const draftKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function toLocalInput(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function fromWindow(window: TherapistAvailabilityWindow): AvailabilityDraft {
  return {
    key: window.id,
    serviceMode: window.serviceMode,
    startsAtLocal: toLocalInput(window.startsAt),
    endsAtLocal: toLocalInput(window.endsAt),
  };
}

function newDraft(serviceMode: TherapistServiceMode): AvailabilityDraft {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    key: draftKey(),
    serviceMode,
    startsAtLocal: toLocalInput(start.toISOString()),
    endsAtLocal: toLocalInput(end.toISOString()),
  };
}

function formatWindow(draft: AvailabilityDraft) {
  const start = new Date(draft.startsAtLocal);
  const end = new Date(draft.endsAtLocal);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(start);
  const times = new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' });
  return `${date} · ${times.format(start)}–${times.format(end)}`;
}

export function TherapistAvailabilityPage() {
  const [management, setManagement] = useState<TherapistAvailabilityManagement | null>(null);
  const [drafts, setDrafts] = useState<AvailabilityDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = async () => {
    const loaded = await loadMyTherapistAvailabilityManagement();
    setManagement(loaded);
    setDrafts(loaded.windows.map(fromWindow));
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadMyTherapistAvailabilityManagement()
      .then((loaded) => {
        if (!active) return;
        setManagement(loaded);
        setDrafts(loaded.windows.map(fromWindow));
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load therapist availability.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const validationError = useMemo(() => {
    if (!management) return null;
    if (drafts.length > 32) return 'Keep this page to 32 upcoming windows at a time.';

    const exactKeys = new Set<string>();
    const now = Date.now();
    const horizon = now + 180 * 24 * 60 * 60 * 1000;

    for (const draft of drafts) {
      if (!management.enabledServiceModes.includes(draft.serviceMode)) {
        return 'Every availability window must use a currently enabled service mode.';
      }
      const start = new Date(draft.startsAtLocal).getTime();
      const end = new Date(draft.endsAtLocal).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Complete the start and end time for every window.';
      if (end <= start) return 'Each availability window must end after it starts.';
      if (end - start > 8 * 60 * 60 * 1000) return 'An availability window cannot exceed eight hours.';
      if (end <= now) return 'Availability must end in the future.';
      if (start > horizon) return 'Availability cannot be published more than 180 days ahead.';

      const key = `${draft.serviceMode}|${new Date(start).toISOString()}|${new Date(end).toISOString()}`;
      if (exactKeys.has(key)) return 'Remove duplicate availability windows before saving.';
      exactKeys.add(key);
    }

    return null;
  }, [drafts, management]);

  const updateDraft = <K extends keyof AvailabilityDraft>(
    index: number,
    field: K,
    value: AvailabilityDraft[K],
  ) => {
    setDrafts((current) => current.map((draft, draftIndex) => (
      draftIndex === index ? { ...draft, [field]: value } : draft
    )));
    setError(null);
    setNotice(null);
  };

  const save = async () => {
    if (!management || validationError) {
      setError(validationError ?? 'Availability is unavailable right now.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await saveMyTherapistAvailability(drafts.map((draft) => ({
        serviceMode: draft.serviceMode,
        startsAt: toIso(draft.startsAtLocal),
        endsAt: toIso(draft.endsAtLocal),
        timezoneName: detectedTimezone,
      })));
      await reload();
      setNotice('Availability saved.');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to save therapist availability.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="space-y-4"><div className="h-36 rounded-[26px] skeleton" /><div className="h-80 rounded-2xl skeleton" /></div>;
  }

  if (!management) {
    return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error ?? 'Availability is unavailable right now.'}</div>;
  }

  const hasModes = management.enabledServiceModes.length > 0;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[26px] border border-primary/14 bg-[hsl(var(--primary-soft))] px-5 py-7 shadow-[0_16px_40px_hsl(var(--foreground)/.035)] sm:px-7 sm:py-8">
        <div aria-hidden="true" className="absolute left-0 top-0 h-full w-1 bg-primary/70" />
        <div aria-hidden="true" className="absolute -right-12 -top-16 size-48 rounded-full bg-accent/70 blur-2xl" />
        <p className="workspace-section-kicker">Patient discovery</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-[-.04em] sm:text-4xl">Publish real upcoming availability.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">These are explicit future time windows, not bookings. Patients cannot reserve care, enter your workspace, or gain clinical or financial access from availability alone.</p>
      </section>

      {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm font-medium">{notice}</div>}

      <section className="rounded-2xl border bg-card p-5 shadow-[0_12px_30px_hsl(var(--foreground)/.03)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="workspace-section-kicker">Availability authority</p>
            <h2 className="mt-1 text-xl font-bold tracking-[-.025em]">Upcoming windows</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Times are saved as absolute timestamps and labelled with this device timezone: <span className="font-semibold text-foreground">{detectedTimezone}</span>.</p>
          </div>
          <a href="/app/discovery-profile" className="inline-flex h-10 items-center justify-center rounded-xl border bg-background px-3 text-sm font-semibold hover:bg-secondary">Discovery profile</a>
        </div>

        {!hasModes ? (
          <div className="mt-5 rounded-2xl border border-warning/15 bg-warning/5 p-5">
            <div className="flex items-start gap-3"><CircleAlert size={20} className="mt-0.5 shrink-0 text-warning" /><div><h3 className="font-semibold">Enable a service mode first</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Availability can only be published for Home visit, Clinic visit or Telephysiotherapy modes already enabled on your discovery profile.</p></div></div>
            <a href="/app/discovery-profile" className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Open discovery profile</a>
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-3">
              {drafts.map((draft, index) => (
                <div key={draft.key} className="rounded-2xl border bg-background/70 p-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                    <label className="space-y-2"><span className="text-xs font-semibold text-foreground/70">Service</span><select value={draft.serviceMode} onChange={(event) => updateDraft(index, 'serviceMode', event.target.value as TherapistServiceMode)} className={inputClass}>{management.enabledServiceModes.map((mode) => <option key={mode} value={mode}>{THERAPIST_SERVICE_MODE_LABELS[mode]}</option>)}</select></label>
                    <label className="space-y-2"><span className="text-xs font-semibold text-foreground/70">Starts</span><input type="datetime-local" value={draft.startsAtLocal} onChange={(event) => updateDraft(index, 'startsAtLocal', event.target.value)} className={inputClass} /></label>
                    <label className="space-y-2"><span className="text-xs font-semibold text-foreground/70">Ends</span><input type="datetime-local" value={draft.endsAtLocal} onChange={(event) => updateDraft(index, 'endsAtLocal', event.target.value)} className={inputClass} /></label>
                    <button type="button" aria-label={`Remove availability window ${index + 1}`} onClick={() => setDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index))} className="grid size-11 place-items-center rounded-xl text-destructive hover:bg-destructive/8"><Trash2 size={16} /></button>
                  </div>
                  {formatWindow(draft) && <div className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Clock3 size={14} className="text-primary" /> {formatWindow(draft)} · {THERAPIST_SERVICE_MODE_LABELS[draft.serviceMode]}</div>}
                </div>
              ))}
              {!drafts.length && <div className="rounded-xl bg-secondary/45 p-5 text-sm text-muted-foreground">No upcoming availability is published. This is safe: discovery may still show the verified therapist, but it must not invent appointment availability.</div>}
            </div>

            {validationError && <p className="mt-4 text-xs font-semibold text-destructive">{validationError}</p>}

            <div className="mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" disabled={drafts.length >= 32} onClick={() => setDrafts((current) => [...current, newDraft(management.enabledServiceModes[0])])} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/12 bg-primary/5 px-4 text-sm font-semibold text-primary hover:bg-primary/8 disabled:opacity-50"><Plus size={16} /> Add availability</button>
              <button type="button" disabled={saving || Boolean(validationError)} onClick={() => void save()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(var(--primary-hover))] disabled:opacity-60"><Save size={16} /> {saving ? 'Saving…' : 'Save availability'}</button>
            </div>
          </>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/6 text-primary"><CalendarClock size={20} /></span><div><h2 className="font-bold">Concrete future windows</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">PhysioBill stores explicit timestamps instead of guessing availability from service modes, visits or profile status.</p></div></div></div>
        <div className="rounded-2xl border bg-card p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success/7 text-success"><ShieldCheck size={20} /></span><div><h2 className="font-bold">No booking authority yet</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Publishing a window does not create an appointment, treatment episode, clinical record, invoice or payment.</p></div></div></div>
      </section>
    </div>
  );
}
