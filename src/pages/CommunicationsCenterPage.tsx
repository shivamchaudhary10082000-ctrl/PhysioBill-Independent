import { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarClock, RefreshCw } from 'lucide-react';
import { CommunicationPreferencesSettings } from '@/Components/CommunicationPreferencesSettings';
import { getMyCommunicationEvents, type CommunicationEvent, type CommunicationPersona } from '@/lib/communication-events';
import {
  communicationEventLabel,
  communicationUiMessageKeys,
  loadPreferredLocale,
  message,
  normalizeLocale,
  type SupportedLocale,
} from '@/lib/locale';

function formatDateTime(value: string, locale: SupportedLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

function serviceModeLabel(value: string, locale: SupportedLocale) {
  if (value === 'telephysiotherapy') return message(locale, communicationUiMessageKeys.telephysiotherapy);
  if (value === 'home_visit') return message(locale, communicationUiMessageKeys.homeVisit);
  return value.replaceAll('_', ' ');
}

export function CommunicationsCenterPage({ persona }: { persona: CommunicationPersona }) {
  const [events, setEvents] = useState<CommunicationEvent[]>([]);
  const [locale, setLocale] = useState<SupportedLocale>('en-IN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextLocale, nextEvents] = await Promise.all([
        loadPreferredLocale(),
        getMyCommunicationEvents(persona, 50),
      ]);
      setLocale(nextLocale);
      setEvents(nextEvents);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : message(locale, communicationUiMessageKeys.unableToLoad));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [persona]);

  useEffect(() => {
    const handleLocaleChanged = (event: Event) => {
      setLocale(normalizeLocale((event as CustomEvent<SupportedLocale>).detail));
    };
    window.addEventListener('physiobill:locale-changed', handleLocaleChanged);
    return () => window.removeEventListener('physiobill:locale-changed', handleLocaleChanged);
  }, []);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => new Date(event.scheduledFor).getTime() >= now).length;
  }, [events]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">
            {message(locale, communicationUiMessageKeys.eyebrow)}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            {message(locale, communicationUiMessageKeys.title)}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {message(locale, communicationUiMessageKeys.description)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {message(locale, communicationUiMessageKeys.refresh)}
        </button>
      </div>

      <CommunicationPreferencesSettings locale={locale} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BellRing size={16} /> {message(locale, communicationUiMessageKeys.eventHistory)}
          </div>
          <div className="mt-2 text-3xl font-extrabold">{events.length}</div>
          <p className="mt-1 text-xs text-muted-foreground">{message(locale, communicationUiMessageKeys.eventHistoryDescription)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock size={16} /> {message(locale, communicationUiMessageKeys.upcoming)}
          </div>
          <div className="mt-2 text-3xl font-extrabold">{upcoming}</div>
          <p className="mt-1 text-xs text-muted-foreground">{message(locale, communicationUiMessageKeys.upcomingDescription)}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {message(locale, communicationUiMessageKeys.loading)}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <BellRing className="mx-auto text-muted-foreground" size={28} />
          <h2 className="mt-3 font-bold">{message(locale, communicationUiMessageKeys.emptyTitle)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message(locale, communicationUiMessageKeys.emptyDescription)}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <article key={event.eventId} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-bold">{communicationEventLabel(locale, event.eventType)}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{serviceModeLabel(event.serviceMode, locale)}</p>
                </div>
                <time className="text-xs font-medium text-muted-foreground" dateTime={event.scheduledFor}>
                  {formatDateTime(event.scheduledFor, locale)}
                </time>
              </div>
              <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                {message(locale, communicationUiMessageKeys.appointmentPrefix)}: {formatDateTime(event.startsAt, locale)} – {formatDateTime(event.endsAt, locale)} · {event.timezoneName}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
