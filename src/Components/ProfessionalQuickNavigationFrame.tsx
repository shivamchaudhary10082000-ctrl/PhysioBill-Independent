import { useEffect, useState, type ReactNode } from 'react';
import { useAuthSession } from '@/hooks/use-auth-session';
import {
  DEFAULT_LOCALE,
  loadPreferredLocale,
  message,
  normalizeLocale,
  professionalNavigationMessageKeys,
  type SupportedLocale,
} from '@/lib/locale';

const professionalLinks = [
  { href: '/app/dashboard', key: professionalNavigationMessageKeys.overview },
  { href: '/app/appointment-requests', key: professionalNavigationMessageKeys.requests },
  { href: '/app/availability', key: professionalNavigationMessageKeys.availability },
  { href: '/app/discovery-profile', key: professionalNavigationMessageKeys.discoveryProfile },
  { href: '/app/analytics', key: professionalNavigationMessageKeys.analytics },
  { href: '/app/communications', key: professionalNavigationMessageKeys.communications },
  { href: '/app/telephysiotherapy', key: professionalNavigationMessageKeys.telephysiotherapy },
  { href: '/app/payment-destinations', key: professionalNavigationMessageKeys.paymentDestinations },
] as const;

export function ProfessionalQuickNavigationFrame({ children }: { children: ReactNode }) {
  const auth = useAuthSession();
  const path = window.location.pathname;
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    let active = true;

    void loadPreferredLocale()
      .then((value) => {
        if (active) setLocale(normalizeLocale(value));
      })
      .catch(() => {
        if (active) setLocale(DEFAULT_LOCALE);
      });

    const handleLocaleChanged = (event: Event) => {
      const detail = (event as CustomEvent<SupportedLocale>).detail;
      setLocale(normalizeLocale(detail));
    };

    window.addEventListener('physiobill:locale-changed', handleLocaleChanged);
    return () => {
      active = false;
      window.removeEventListener('physiobill:locale-changed', handleLocaleChanged);
    };
  }, []);

  if (
    auth.loading ||
    auth.error ||
    !auth.user ||
    auth.passwordRecovery ||
    auth.role !== 'physio'
  ) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="professional-nav-rail border-b border-border/70 bg-background">
        <nav
          aria-label={message(locale, professionalNavigationMessageKeys.ariaLabel)}
          className="professional-nav mx-auto flex h-14 max-w-[1420px] touch-pan-x items-stretch gap-7 overflow-x-auto overscroll-x-contain px-4 sm:px-7 lg:px-10"
        >
          {professionalLinks.map(({ href, key }) => {
            const active = path === href || path.startsWith(`${href}/`);
            return (
              <a
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className="professional-nav-link inline-flex min-h-14 shrink-0 items-center px-0 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {message(locale, key)}
              </a>
            );
          })}
        </nav>
      </div>
      {children}
    </>
  );
}
