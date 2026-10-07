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
  type TherapistServiceMode,
} from '@/lib/therapist-discovery';
import {
  loadMyTherapistAvailabilityManagement,
  saveMyTherapistAvailability,
  type TherapistAvailabilityManagement,
  type TherapistAvailabilityWindow,
} from '@/lib/therapist-availability';
import { DEFAULT_LOCALE, loadPreferredLocale, type SupportedLocale } from '@/lib/locale';
import { therapistAvailabilityMessage as msg } from '@/lib/therapist-availability-locale';

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

function serviceModeLabel(locale: SupportedLocale, mode: TherapistServiceMode) {
  if (locale === 'hi-IN') return mode === 'home_visit' ? 'होम विज़िट' : mode === 'telephysiotherapy' ? 'टेलीफिजियोथेरेपी' : 'क्लिनिक विज़िट';
  if (locale === 'gu-IN') return mode === 'home_visit' ? 'હોમ વિઝિટ' : mode === 'telephysiotherapy' ? 'ટેલિફિઝિયોથેરાપી' : 'ક્લિનિક વિઝિટ';
  return mode === 'home_visit' ? 'Home visit' : mode === 'telephysiotherapy' ? 'Telephysiotherapy' : 'Clinic visit';
}

function formatWindow(draft: AvailabilityDraft, locale: SupportedLocale) {
  const start = new Date(draft.startsAtLocal);
  const end = new Date(draft.endsAtLocal);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(start);
  const times = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
  return `${date} · ${times.format(start)}–${times.format(end)}`;
}

export function TherapistAvailabilityPage() {
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
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
    void loadPreferredLocale().then((preferred) => {
      if (active) setLocale(preferred);
    }).catch(() => {});
    loadMyTherapistAvailabilityManagement()
      .then((loaded) => {
        if (!active) return;
        setManagement(loaded);
        setDrafts(loaded.windows.map(fromWindow));
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : msg(locale, 'loadError'));
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
    if (drafts.length > 32) return msg(locale, 'tooManyWindows');

    const exactKeys = new Set<string>();
    const now = Date.now();
    const horizon = now + 180 * 24 * 60 * 60 * 1000;

    for (const draft of drafts) {
      if (!management.enabledServiceModes.includes(draft.serviceMode)) {
        return msg(locale, 'disabledMode');
      }
      const start = new Date(draft.startsAtLocal).getTime();
      const end = new Date(draft.endsAtLocal).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end)) return msg(locale, 'missingTimes');
      if (end <= start) return msg(locale, 'endBeforeStart');
      if (end - start > 8 * 60 * 60 * 1000) return msg(locale, 'tooLong');
      if (end <= now) return msg(locale, 'mustBeFuture');
      if (start > horizon) return msg(locale, 'tooFarAhead');

      const key = `${draft.serviceMode}|${new Date(start).toISOString()}|${new Date(end).toISOString()}`;
      if (exactKeys.has(key)) return msg(locale, 'duplicateWindow');
      exactKeys.add(key);
    }

    return null;
  }, [drafts, management, locale]);

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
      setError(validationError ?? msg(locale, 'unavailable'));
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
      setNotice(msg(locale, 'saved'));
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : msg(locale, 'saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="space-y-4"><div className="h-36 rounded-[26px] skeleton" /><div className="h-80 rounded-2xl skeleton" /></div>;
  }

  if (!management) {
    return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error ?? msg(locale, 'unavailable')}</div>;
  }

  const hasModes = management.enabledServiceModes.length > 0;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[26px] border border-primary/14 bg-[hsl(var(--primary-soft))] px-5 py-7 shadow-[0_16px_40px_hsl(var(--foreground)/.035)] sm:px-7 sm:py-8">
        <div aria-hidden="true" className="absolute left-0 top-0 h-full w-1 bg-primary/70" />
        <div aria-hidden="true" className="absolute -right-12 -top-16 size-48 rounded-full bg-accent/70 blur-2xl" />
        <p className="workspace-section-kicker">{msg(locale, 'kicker')}</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-[-.04em] sm:text-4xl">{msg(locale, 'title')}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{msg(locale, 'intro')}</p>
      </section>

      {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm font-medium">{notice}</div>}

      <section className="rounded-2xl border bg-card p-5 shadow-[0_12px_30px_hsl(var(--foreground)/.03)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="workspace-section-kicker">{msg(locale, 'authorityKicker')}</p>
            <h2 className="mt-1 text-xl font-bold tracking-[-.025em]">{msg(locale, 'upcomingWindows')}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{msg(locale, 'timezonePrefix')} <span className="font-semibold text-foreground">{detectedTimezone}</span>.</p>
          </div>
          <a href="/app/discovery-profile" className="inline-flex h-10 items-center justify-center rounded-xl border bg-background px-3 text-sm font-semibold hover:bg-secondary">{msg(locale, 'discoveryProfile')}</a>
        </div>

        {!hasModes ? (
          <div className="mt-5 rounded-2xl border border-warning/15 bg-warning/5 p-5">
            <div className="flex items-start gap-3"><CircleAlert size={20} className="mt-0.5 shrink-0 text-warning" /><div><h3 className="font-semibold">{msg(locale, 'enableModeTitle')}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{msg(locale, 'enableModeIntro')}</p></div></div>
            <a href="/app/discovery-profile" className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">{msg(locale, 'openDiscoveryProfile')}</a>
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-3">
              {drafts.map((draft, index) => {
                const formattedWindow = formatWindow(draft, locale);
                return (
                  <div key={draft.key} className="rounded-2xl border bg-background/70 p-4">
                    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                      <label className="space-y-2"><span className="text-xs font-semibold text-foreground/70">{msg(locale, 'service')}</span><select value={draft.serviceMode} onChange={(event) => updateDraft(index, 'serviceMode', event.target.value as TherapistServiceMode)} className={inputClass}>{management.enabledServiceModes.map((mode) => <option key={mode} value={mode}>{serviceModeLabel(locale, mode)}</option>)}</select></label>
                      <label className="space-y-2"><span className="text-xs font-semibold text-foreground/70">{msg(locale, 'starts')}</span><input type="datetime-local" value={draft.startsAtLocal} onChange={(event) => updateDraft(index, 'startsAtLocal', event.target.value)} className={inputClass} /></label>
                      <label className="space-y-2"><span className="text-xs font-semibold text-foreground/70">{msg(locale, 'ends')}</span><input type="datetime-local" value={draft.endsAtLocal} onChange={(event) => updateDraft(index, 'endsAtLocal', event.target.value)} className={inputClass} /></label>
                      <button type="button" aria-label={`${msg(locale, 'removeWindow')} ${index + 1}`} onClick={() => setDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index))} className="grid size-11 place-items-center rounded-xl text-destructive hover:bg-destructive/8"><Trash2 size={16} /></button>
                    </div>
                    {formattedWindow && <div className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Clock3 size={14} className="text-primary" /> {formattedWindow} · {serviceModeLabel(locale, draft.serviceMode)}</div>}
                  </div>
                );
              })}
              {!drafts.length && <div className="rounded-xl bg-secondary/45 p-5 text-sm text-muted-foreground">{msg(locale, 'empty')}</div>}
            </div>

            {validationError && <p className="mt-4 text-xs font-semibold text-destructive">{validationError}</p>}

            <div className="mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" disabled={drafts.length >= 32} onClick={() => setDrafts((current) => [...current, newDraft(management.enabledServiceModes[0])])} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/12 bg-primary/5 px-4 text-sm font-semibold text-primary hover:bg-primary/8 disabled:opacity-50"><Plus size={16} /> {msg(locale, 'addAvailability')}</button>
              <button type="button" disabled={saving || Boolean(validationError)} onClick={() => void save()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(var(--primary-hover))] disabled:opacity-60"><Save size={16} /> {saving ? msg(locale, 'saving') : msg(locale, 'saveAvailability')}</button>
            </div>
          </>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/6 text-primary"><CalendarClock size={20} /></span><div><h2 className="font-bold">{msg(locale, 'futureWindowsTitle')}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{msg(locale, 'futureWindowsIntro')}</p></div></div></div>
        <div className="rounded-2xl border bg-card p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success/7 text-success"><ShieldCheck size={20} /></span><div><h2 className="font-bold">{msg(locale, 'noBookingTitle')}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{msg(locale, 'noBookingIntro')}</p></div></div></div>
      </section>
    </div>
  );
}
