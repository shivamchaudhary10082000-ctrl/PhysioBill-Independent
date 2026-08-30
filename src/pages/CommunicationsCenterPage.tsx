import { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarClock, RefreshCw } from 'lucide-react';
import { getMyCommunicationEvents, type CommunicationEvent, type CommunicationPersona } from '@/lib/communication-events';
import { communicationEventLabel, loadPreferredLocale, type SupportedLocale } from '@/lib/locale';

function formatDateTime(value: string, locale: SupportedLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

function serviceModeLabel(value: string) {
  if (value === 'telephysiotherapy') return 'Telephysiotherapy';
  if (value === 'home_visit') return 'Home visit';
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
      setError(cause instanceof Error ? cause.message : 'Unable to load communications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [persona]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => new Date(event.scheduledFor).getTime() >= now).length;
  }, [events]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">Communications</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Reminders & appointment updates</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            In-app appointment events from PhysioBill's database authority. SMS and WhatsApp delivery are not active here and remain provider-dependent.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><BellRing size={16} /> Event history</div>
          <div className="mt-2 text-3xl font-extrabold">{events.length}</div>
          <p className="mt-1 text-xs text-muted-foreground">Most recent persona-authorized events returned by the database.</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><CalendarClock size={16} /> Upcoming</div>
          <div className="mt-2 text-3xl font-extrabold">{upcoming}</div>
          <p className="mt-1 text-xs text-muted-foreground">Events scheduled for now or later. This is not proof that an external message was delivered.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Loading secure communications…</div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <BellRing className="mx-auto text-muted-foreground" size={28} />
          <h2 className="mt-3 font-bold">No appointment communications yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Events will appear here when appointment state changes or reminder events are scheduled.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <article key={event.eventId} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-bold">{communicationEventLabel(locale, event.eventType)}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{serviceModeLabel(event.serviceMode)}</p>
                </div>
                <time className="text-xs font-medium text-muted-foreground" dateTime={event.scheduledFor}>
                  {formatDateTime(event.scheduledFor, locale)}
                </time>
              </div>
              <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                Appointment: {formatDateTime(event.startsAt, locale)} – {formatDateTime(event.endsAt, locale)} · {event.timezoneName}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
