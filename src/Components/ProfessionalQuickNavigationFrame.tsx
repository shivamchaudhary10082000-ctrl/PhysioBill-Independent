import type { ReactNode } from 'react';
import { useAuthSession } from '@/hooks/use-auth-session';

const professionalLinks = [
  { href: '/app/dashboard', label: 'Overview' },
  { href: '/app/appointment-requests', label: 'Requests' },
  { href: '/app/availability', label: 'Availability' },
  { href: '/app/discovery-profile', label: 'Discovery profile' },
  { href: '/app/analytics', label: 'Analytics' },
  { href: '/app/communications', label: 'Communications' },
  { href: '/app/telephysiotherapy', label: 'Telephysiotherapy' },
  { href: '/app/payment-destinations', label: 'Payment destinations' },
] as const;

export function ProfessionalQuickNavigationFrame({ children }: { children: ReactNode }) {
  const auth = useAuthSession();
  const path = window.location.pathname;

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
      <div className="border-b border-border bg-background">
        <nav
          aria-label="Professional workspace quick navigation"
          className="mx-auto flex max-w-[1420px] gap-2 overflow-x-auto px-4 py-2 sm:px-7 lg:px-10"
        >
          {professionalLinks.map(({ href, label }) => {
            const active = path === href || path.startsWith(`${href}/`);
            return (
              <a
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  active
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {label}
              </a>
            );
          })}
        </nav>
      </div>
      {children}
    </>
  );
}
