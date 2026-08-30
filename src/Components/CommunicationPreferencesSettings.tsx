import { useEffect, useState } from 'react';
import { Loader2, MessageSquareText, Save } from 'lucide-react';
import {
  getMyCommunicationPreferences,
  setMyCommunicationPreferences,
  type CommunicationPreferences,
  type ExternalCommunicationChannel,
} from '@/lib/communication-preferences';

function errorMessage(cause: unknown) {
  if (cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string') {
    return cause.message;
  }
  return 'Unable to update communication preferences.';
}

export function CommunicationPreferencesSettings() {
  const [saved, setSaved] = useState<CommunicationPreferences | null>(null);
  const [updates, setUpdates] = useState(false);
  const [reminders, setReminders] = useState(false);
  const [channel, setChannel] = useState<ExternalCommunicationChannel>('none');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const apply = (next: CommunicationPreferences) => {
    setSaved(next);
    setUpdates(next.appointmentUpdatesOptIn);
    setReminders(next.appointmentRemindersOptIn);
    setChannel(next.preferredExternalChannel);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      apply(await getMyCommunicationPreferences());
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const anyOptIn = updates || reminders;
  const dirty = Boolean(saved) && (
    updates !== saved!.appointmentUpdatesOptIn ||
    reminders !== saved!.appointmentRemindersOptIn ||
    (anyOptIn ? channel : 'none') !== saved!.preferredExternalChannel
  );

  const save = async () => {
    if (!saved || saving) return;
    if (anyOptIn && channel === 'none') {
      setError('Choose SMS or WhatsApp before enabling external updates or reminders.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const next = await setMyCommunicationPreferences({
        appointmentUpdatesOptIn: updates,
        appointmentRemindersOptIn: reminders,
        preferredExternalChannel: anyOptIn ? channel : 'none',
        expectedRevision: saved.revision,
      });
      apply(next);
      setNotice('Communication preferences saved. Provider delivery is still not active.');
    } catch (cause) {
      const message = errorMessage(cause);
      setError(message);
      if (message.toLowerCase().includes('refresh before saving') || message.toLowerCase().includes('serialization')) {
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5" aria-labelledby="communication-preferences-heading">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
          <MessageSquareText size={18} />
        </div>
        <div>
          <h2 id="communication-preferences-heading" className="font-bold">External communication preferences</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Opt in only to appointment-related external messages. SMS and WhatsApp delivery remain inactive until a provider is separately approved and configured.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Loading preferences…</div>
      ) : (
        <div className="mt-5 space-y-4">
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3">
            <input type="checkbox" className="mt-1" checked={updates} onChange={(event) => setUpdates(event.target.checked)} />
            <span><span className="block text-sm font-semibold">Appointment updates</span><span className="block text-xs text-muted-foreground">Requests, acceptance, rejection, cancellation and rescheduling updates.</span></span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3">
            <input type="checkbox" className="mt-1" checked={reminders} onChange={(event) => setReminders(event.target.checked)} />
            <span><span className="block text-sm font-semibold">Appointment reminders</span><span className="block text-xs text-muted-foreground">Reminder eligibility only. Saving this does not prove or trigger provider delivery.</span></span>
          </label>

          <fieldset disabled={!anyOptIn} className="space-y-2 disabled:opacity-50">
            <legend className="text-sm font-semibold">Preferred external channel</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['sms', 'whatsapp'] as const).map((value) => (
                <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3">
                  <input type="radio" name="external-channel" value={value} checked={channel === value} onChange={() => setChannel(value)} />
                  <span className="text-sm font-medium">{value === 'sms' ? 'SMS' : 'WhatsApp'}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</div> : null}
          {notice ? <div className="rounded-xl border bg-secondary/60 p-3 text-sm text-muted-foreground" role="status">{notice}</div> : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">In-app appointment events stay available regardless of these external-message preferences.</p>
            <button type="button" onClick={() => void save()} disabled={!dirty || saving || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save preferences
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
