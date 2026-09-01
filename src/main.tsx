import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import { ErrorBoundary } from '@/Components/error-boundary';
import { PublicRouteBoundary } from '@/pages/PublicRouteBoundary';

import './index.css';

const LEGACY_SENSITIVE_STORAGE_KEYS = new Set([
  'physiobill-demo-session',
]);

const LEGACY_SENSITIVE_STORAGE_PREFIXES = [
  'physiobill-profile-',
  'physiobill-patients-',
  'physiobill-visits-',
  'physiobill-invoices-',
] as const;

function clearLegacySensitiveLocalStorage() {
  try {
    const keysToRemove: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;

      if (
        LEGACY_SENSITIVE_STORAGE_KEYS.has(key) ||
        LEGACY_SENSITIVE_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable in hardened/private browser contexts. The app
    // must continue without weakening the Supabase-backed authorization path.
  }
}

clearLegacySensitiveLocalStorage();

function PatientDirectorySearchClear() {
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    const ensureClearButton = () => {
      const input = document.querySelector<HTMLInputElement>(
        'input[placeholder="Search by Patient name or record number..."]',
      );
      if (!input?.parentElement) return;

      const parent = input.parentElement;
      input.classList.remove('pr-4');
      input.classList.add('pr-14');

      const clearSearch = () => {
        const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        valueSetter?.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      };

      let button = parent.querySelector<HTMLButtonElement>('[data-patient-search-clear]');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', 'Clear patient search');
        button.setAttribute('data-patient-search-clear', 'true');
        button.className = 'absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
        button.innerHTML = '<span aria-hidden="true" class="text-xl leading-none">×</span>';
        button.addEventListener('click', clearSearch);
        parent.appendChild(button);
      }

      const syncVisibility = () => {
        if (button) button.style.display = input.value ? 'grid' : 'none';
      };
      syncVisibility();

      if (!input.dataset.clearSearchBound) {
        input.dataset.clearSearchBound = 'true';
        input.addEventListener('input', syncVisibility);
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' && input.value) {
            event.preventDefault();
            clearSearch();
          }
        });
      }
    };

    const observer = new MutationObserver(ensureClearButton);
    observer.observe(root, { childList: true, subtree: true });
    ensureClearButton();

    return () => observer.disconnect();
  }, []);

  return null;
}

function registerOfflineSafeServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
      .catch((error) => {
        console.error('PhysioBill service worker registration failed', error);
      });
  });
}

registerOfflineSafeServiceWorker();

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <PatientDirectorySearchClear />
    <PublicRouteBoundary />
  </ErrorBoundary>,
);
