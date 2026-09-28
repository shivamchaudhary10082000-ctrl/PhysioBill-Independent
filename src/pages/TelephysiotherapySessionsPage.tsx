import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, RefreshCw, ShieldCheck, Video } from 'lucide-react';
import {
  loadMyPatientTelephysiotherapySessions,
  loadMyProfessionalTelephysiotherapySessions,
  type TelephysiotherapySession,
} from '@/lib/telephysiotherapy';
import {
  loadTelephysiotherapyLocale,
  telephysiotherapyCopy,
} from '@/lib/telephysiotherapy-locale';
import { DEFAULT_LOCALE, type SupportedLocale } from '@/lib/locale';

function formatDateTime(value: string, timezoneName: string, locale: SupportedLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezoneName,
    }).format(date);
  } catch {
    return date.toLocaleString(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
}

const actionFocusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function SessionCard({ session, locale }: { session: TelephysiotherapySession; locale: SupportedLocale }) {
  const copy = telephysiotherapyCopy(locale);
  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-primary">{copy.eyebrow}</p>
          <h2 className="mt-1 break-words text-lg font-extrabold tracking-tight">{copy.sessionTitle}</h2>
        </div>
        <div className="w-fit shrink-0 rounded-xl bg-secondary p-2.5 text-primary"><Video size={20} aria-hidden="true" /></div>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="min-w-0 rounded-xl bg-secondary/60 p-3">
          <p className="text-xs font-semibold text-muted-foreground">{copy.starts}</p>
          <p className="mt-1 break-words font-semibold">{formatDateTime(session.startsAt, session.timezoneName, locale)}</p>
        </div>
        <div className="min-w-0 rounded-xl bg-secondary/60 p-3">
          <p className="text-xs font-semibold text-muted-foreground">{copy.ends}</p>
          <p className="mt-1 break-words font-semibold">{formatDateTime(session.endsAt, session.timezoneName, locale)}</p>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
        <ShieldCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold">{copy.activationPending}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.activationPendingDescription}</p>
        </div>
      </div>
      <p className="mt-3 break-all text-[11px] text-muted-foreground">{copy.sessionId}: {session.sessionId}</p>
    </article>
  );
}

export function TelephysiotherapySessionsPage({ persona }: { persona: 'patient' | 'physio' }) {
  const [sessions, setSessions] = useState<TelephysiotherapySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const copy = useMemo(() => telephysiotherapyCopy(locale), [locale]);

  const load = async (active?: () => boolean) => {
    setLoading(true);
    setError(null);
    try {
      const [rows, resolvedLocale] = await Promise.all([
        persona === 'patient'
          ? loadMyPatientTelephysiotherapySessions()
          : loadMyProfessionalTelephysiotherapySessions(),
        loadTelephysiotherapyLocale(),
      ]);
      if (!active || active()) {
        setSessions(rows);
        setLocale(resolvedLocale);
      }
    } catch (err) {
      if (!active || active()) {
        setSessions([]);
        setError(err instanceof Error ? err.message : copy.unableToLoad);
      }
    } finally {
      if (!active || active()) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => { active = false; };
  }, [persona]);

  return (
    <section className="space-y-6" aria-busy={loading}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">{copy.eyebrow}</p>
          <h1 className="mt-1 break-words text-2xl font-extrabold tracking-tight">
            {persona === 'patient' ? copy.patientTitle : copy.professionalTitle}
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{copy.description}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-label={copy.refreshAria}
          className={`inline-flex min-h-11 w-fit shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 ${actionFocusClass}`}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {loading ? copy.refreshing : copy.refresh}
        </button>
      </div>

      {error ? <div role="alert" aria-live="assertive" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <div role="status" aria-live="polite" className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">{copy.loading}</div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <CalendarClock className="mx-auto text-muted-foreground" size={28} aria-hidden="true" />
          <p className="mt-3 font-bold">{copy.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{copy.emptyDescription}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sessions.map((session) => <SessionCard key={session.sessionId} session={session} locale={locale} />)}
        </div>
      )}
    </section>
  );
}
