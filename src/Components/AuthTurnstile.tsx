import { useEffect, useRef, useState } from 'react';

const TURNSTILE_SCRIPT_ID = 'physiobill-turnstile-api';
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TURNSTILE_SITE_KEY_PATTERN = /^[A-Za-z0-9_-]{10,100}$/;

type TurnstileRenderOptions = {
  sitekey: string;
  action: string;
  theme: 'auto';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'timeout-callback': () => void;
  'error-callback': () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileLoadPromise: Promise<TurnstileApi> | null = null;

export function getAuthTurnstileSiteKey(): string | null {
  const raw = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
  if (!raw) return null;
  if (!TURNSTILE_SITE_KEY_PATTERN.test(raw)) {
    throw new Error('VITE_TURNSTILE_SITE_KEY is malformed.');
  }
  return raw;
}

export function isAuthTurnstileConfigured() {
  return getAuthTurnstileSiteKey() !== null;
}

function loadTurnstileApi(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileLoadPromise) return turnstileLoadPromise;

  turnstileLoadPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const finish = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
      } else {
        turnstileLoadPromise = null;
        reject(new Error('Turnstile API did not become available.'));
      }
    };

    const existing = document.getElementById(
      TURNSTILE_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener(
        'error',
        () => {
          turnstileLoadPromise = null;
          reject(new Error('Turnstile API could not be loaded.'));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', finish, { once: true });
    script.addEventListener(
      'error',
      () => {
        turnstileLoadPromise = null;
        reject(new Error('Turnstile API could not be loaded.'));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return turnstileLoadPromise;
}

export function AuthTurnstile({
  action,
  resetKey,
  onTokenChange,
}: {
  action: string;
  resetKey: number;
  onTokenChange: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const siteKey = getAuthTurnstileSiteKey();

  useEffect(() => {
    if (!siteKey) {
      onTokenChange(null);
      setLoadError(false);
      return;
    }

    let active = true;
    let widgetId: string | null = null;
    setLoadError(false);
    onTokenChange(null);

    void loadTurnstileApi()
      .then((api) => {
        if (!active || !containerRef.current) return;
        widgetId = api.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'auto',
          callback: (token) => {
            if (active) onTokenChange(token);
          },
          'expired-callback': () => {
            if (active) onTokenChange(null);
          },
          'timeout-callback': () => {
            if (active) onTokenChange(null);
          },
          'error-callback': () => {
            if (active) onTokenChange(null);
          },
        });
      })
      .catch(() => {
        if (!active) return;
        setLoadError(true);
        onTokenChange(null);
      });

    return () => {
      active = false;
      onTokenChange(null);
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [action, onTokenChange, resetKey, siteKey]);

  if (!siteKey) return null;

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="min-h-[65px]" />
      {loadError && (
        <p role="alert" className="text-xs text-destructive">
          The security challenge could not load. Reload this page before trying again.
        </p>
      )}
    </div>
  );
}
