import { ChevronDown } from 'lucide-react';
import { PhysioBillBrand, PhysioBillLogoMark } from '@/Components/PhysioBillBrand';

type PublicFooterProps = {
  className?: string;
};

const footerSections = [
  {
    title: 'PhysioBill',
    links: [
      ['Find a physiotherapist', '/find-physio'],
      ['Home physiotherapy', '/find-physio?mode=home_visit'],
      ['Clinic physiotherapy', '/find-physio?mode=clinic_visit'],
      ['Telephysiotherapy', '/find-physio?mode=telephysiotherapy'],
    ],
  },
  {
    title: 'For patients',
    links: [
      ['Patient sign in', '/patient/sign-in'],
      ['My booking requests', '/patient/appointments'],
      ['How verification works', '/professional-standards'],
    ],
  },
  {
    title: 'For physiotherapists',
    links: [
      ['Professional sign in', '/professional/sign-in'],
      ['Clinical workspace', '/app/dashboard'],
      ['Manage discovery profile', '/app/discovery-profile'],
    ],
  },
  {
    title: 'Trust & legal',
    links: [
      ['Privacy policy', '/privacy'],
      ['Terms of use', '/terms'],
      ['Professional standards', '/professional-standards'],
    ],
  },
] as const;

export function PublicFooter({ className = '' }: PublicFooterProps) {
  return (
    <footer className={`public-footer ${className}`.trim()}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-white/10 py-10 sm:py-14">
          <div className="grid gap-9 lg:grid-cols-[1.2fr_2fr] lg:gap-16">
            <div className="max-w-md">
              <a href="/" aria-label="PhysioBill home" className="inline-flex rounded-xl focus-visible:outline-none">
                <PhysioBillBrand inverse />
              </a>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.12em] text-[hsl(232_76%_82%)]">Physiotherapy, clearly connected</p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[hsl(219_18%_72%)]">
                Verified-professional discovery, transparent booking requests, and focused tools for physiotherapy care.
              </p>
            </div>

            <div className="space-y-2 lg:hidden">
              {footerSections.map((section) => (
                <details key={section.title} className="public-footer-accordion group">
                  <summary>
                    <span>{section.title}</span>
                    <ChevronDown size={18} className="transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <nav aria-label={section.title} className="space-y-3 px-4 pb-4 pt-1">
                    {section.links.map(([label, href]) => (
                      <a key={label} href={href} className="public-footer-link">{label}</a>
                    ))}
                  </nav>
                </details>
              ))}
            </div>

            <div className="hidden grid-cols-4 gap-8 lg:grid">
              {footerSections.map((section) => (
                <nav key={section.title} aria-label={section.title}>
                  <p className="public-footer-heading">{section.title}</p>
                  <div className="mt-5 space-y-3 text-sm">
                    {section.links.map(([label, href]) => (
                      <a key={label} href={href} className="public-footer-link">{label}</a>
                    ))}
                  </div>
                </nav>
              ))}
            </div>
          </div>

          <a href="/" aria-label="PhysioBill home" className="public-footer-mega-brand mt-12 flex items-center justify-center gap-3 rounded-3xl py-3 sm:mt-16 sm:gap-5">
            <PhysioBillLogoMark inverse className="h-14 w-14 sm:h-20 sm:w-20 lg:h-24 lg:w-24" />
            <span className="text-[clamp(3rem,11vw,8.5rem)] font-extrabold leading-none tracking-[-.075em] text-white">
              Physio<span className="text-[hsl(174_68%_65%)]">Bill</span>
            </span>
          </a>
        </div>

        <div className="flex flex-col gap-3 py-6 text-xs text-[hsl(219_18%_68%)] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 PhysioBill. All rights reserved.</p>
          <p>Built only for physiotherapy discovery and practice operations.</p>
        </div>
      </div>
    </footer>
  );
}
