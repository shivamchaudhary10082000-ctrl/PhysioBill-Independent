import { PhysioBillBrand } from '@/Components/PhysioBillBrand';

type PublicFooterProps = {
  className?: string;
};

export function PublicFooter({ className = '' }: PublicFooterProps) {
  return (
    <footer className={`public-footer ${className}`.trim()}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 border-b border-white/10 py-12 sm:py-14 lg:grid-cols-[1.3fr_.8fr_.85fr_1fr] lg:gap-12 lg:py-16">
          <div className="max-w-sm">
            <a href="/" aria-label="PhysioBill home" className="inline-flex rounded-xl focus-visible:outline-none">
              <PhysioBillBrand inverse />
            </a>
            <p className="mt-5 max-w-xs text-sm leading-6 text-[hsl(219_18%_72%)]">
              Thoughtful physiotherapy discovery and professional tools, built around care.
            </p>
          </div>

          <nav aria-label="Explore PhysioBill">
            <p className="public-footer-heading">Explore</p>
            <div className="mt-4 space-y-3 text-sm">
              <a href="/find-physio" className="public-footer-link">Find a physiotherapist</a>
              <p className="public-footer-note">Home visit care</p>
              <p className="public-footer-note">Clinic visit care</p>
              <p className="public-footer-note">Telephysiotherapy</p>
            </div>
          </nav>

          <nav aria-label="Professional access">
            <p className="public-footer-heading">Professional access</p>
            <div className="mt-4 space-y-3 text-sm">
              <a href="/professional/sign-in" className="public-footer-link">Professional sign in</a>
              <a href="/app/dashboard" className="public-footer-link">Clinical workspace</a>
              <a href="/app/discovery-profile" className="public-footer-link">Discovery profile</a>
            </div>
          </nav>

          <section aria-labelledby="footer-trust-heading">
            <p id="footer-trust-heading" className="public-footer-heading">Trust by design</p>
            <div className="mt-4 space-y-3 text-sm">
              <p className="public-footer-note">Verified-professional discovery</p>
              <p className="public-footer-note">Patient-safe public profiles</p>
              <p className="public-footer-note">Clear professional access</p>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-2 py-6 text-xs text-[hsl(219_18%_68%)] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 PhysioBill</p>
          <p>Built around physiotherapy care.</p>
        </div>
      </div>
    </footer>
  );
}
