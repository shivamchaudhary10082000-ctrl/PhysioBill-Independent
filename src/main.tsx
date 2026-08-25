import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import { ErrorBoundary } from '@/Components/error-boundary';
import { PublicRouteBoundary } from '@/pages/PublicRouteBoundary';

import './index.css';

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
      input.classList.add('pr-10');

      let button = parent.querySelector<HTMLButtonElement>('[data-patient-search-clear]');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', 'Clear search');
        button.setAttribute('data-patient-search-clear', 'true');
        button.className = 'absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground';
        button.innerHTML = '<span aria-hidden="true" class="text-lg leading-none">×</span>';
        button.addEventListener('click', () => {
          const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          valueSetter?.call(input, '');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        });
        parent.appendChild(button);
      }

      const syncVisibility = () => {
        if (button) button.style.display = input.value ? 'grid' : 'none';
      };
      syncVisibility();

      if (!input.dataset.clearSearchBound) {
        input.dataset.clearSearchBound = 'true';
        input.addEventListener('input', syncVisibility);
      }
    };

    const observer = new MutationObserver(ensureClearButton);
    observer.observe(root, { childList: true, subtree: true });
    ensureClearButton();

    return () => observer.disconnect();
  }, []);

  return null;
}

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
