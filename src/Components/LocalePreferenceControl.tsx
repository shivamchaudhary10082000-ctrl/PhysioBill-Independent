import { useEffect, useId, useState } from 'react';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  loadPreferredLocale,
  normalizeLocale,
  type SupportedLocale,
} from '@/lib/locale';
import { getSupabaseClient } from '@/lib/supabase';

const localeLabels: Record<SupportedLocale, string> = {
  'en-IN': 'English',
  'hi-IN': 'हिंदी',
  'gu-IN': 'ગુજરાતી',
};

async function saveCurrentUserPreferredLocale(locale: SupportedLocale): Promise<SupportedLocale> {
  const normalized = normalizeLocale(locale);
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error('An authenticated session is required to save language preference.');

  const { data, error } = await supabase
    .from('app_users')
    .update({ preferred_locale: normalized })
    .eq('id', user.id)
    .select('preferred_locale')
    .single();

  if (error) throw error;
  return normalizeLocale(data?.preferred_locale);
}

export function LocalePreferenceControl({ className = '' }: { className?: string }) {
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statusId = useId();

  useEffect(() => {
    let active = true;

    void loadPreferredLocale()
      .then((value) => {
        if (!active) return;
        const normalized = normalizeLocale(value);
        setLocale(normalized);
        document.documentElement.lang = normalized;
      })
      .catch(() => {
        if (!active) return;
        setLocale(DEFAULT_LOCALE);
        document.documentElement.lang = DEFAULT_LOCALE;
        setError('Language preference could not be loaded. English is being used.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const changeLocale = async (nextValue: string) => {
    const nextLocale = normalizeLocale(nextValue);
    if (nextLocale === locale) return;

    const previousLocale = locale;
    setLocale(nextLocale);
    setSaving(true);
    setError(null);

    try {
      const saved = await saveCurrentUserPreferredLocale(nextLocale);
      setLocale(saved);
      document.documentElement.lang = saved;
      window.dispatchEvent(new CustomEvent<SupportedLocale>('physiobill:locale-changed', { detail: saved }));
    } catch {
      setLocale(previousLocale);
      document.documentElement.lang = previousLocale;
      setError('Language preference could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={className} aria-busy={loading || saving || undefined}>
      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="sr-only">Language</span>
        <select
          aria-label="Language"
          aria-describedby={statusId}
          value={locale}
          disabled={loading || saving}
          onChange={(event) => void changeLocale(event.target.value)}
          className="min-h-11 rounded-xl border bg-card px-3 py-2 text-xs font-semibold text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {SUPPORTED_LOCALES.map((supportedLocale) => (
            <option key={supportedLocale} value={supportedLocale}>
              {localeLabels[supportedLocale]}
            </option>
          ))}
        </select>
        <span id={statusId} className={error ? 'text-destructive' : ''} role={error ? 'alert' : 'status'} aria-live="polite">
          {loading ? 'Loading language…' : saving ? 'Saving…' : error ?? ''}
        </span>
      </label>
    </div>
  );
}
