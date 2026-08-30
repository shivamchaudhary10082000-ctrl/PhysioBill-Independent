import { useEffect, useState } from 'react';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  loadPreferredLocale,
  normalizeLocale,
  savePreferredLocale,
  type SupportedLocale,
} from '@/lib/locale';

const localeLabels: Record<SupportedLocale, string> = {
  'en-IN': 'English',
  'hi-IN': 'हिंदी',
  'gu-IN': 'ગુજરાતી',
};

export function LocalePreferenceControl({ className = '' }: { className?: string }) {
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const saved = await savePreferredLocale(nextLocale);
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
    <div className={className}>
      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="sr-only">Language</span>
        <select
          aria-label="Language"
          value={locale}
          disabled={loading || saving}
          onChange={(event) => void changeLocale(event.target.value)}
          className="rounded-xl border bg-card px-2.5 py-2 text-xs font-semibold text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          {SUPPORTED_LOCALES.map((supportedLocale) => (
            <option key={supportedLocale} value={supportedLocale}>
              {localeLabels[supportedLocale]}
            </option>
          ))}
        </select>
        {saving && <span aria-live="polite">Saving…</span>}
      </label>
      {error && (
        <p role="alert" className="mt-1 max-w-56 text-[11px] leading-4 text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
