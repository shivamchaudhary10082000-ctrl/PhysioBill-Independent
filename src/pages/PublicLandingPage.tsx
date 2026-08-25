import { ArrowRight, MapPin, ShieldCheck } from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { PublicTherapistSearch } from '@/Components/PublicTherapistSearch';

export function PublicLandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="relative z-20 border-b border-border/80 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" aria-label="PhysioBill home">
            <PhysioBillBrand />
          </a>
          <a
            href="/professional/sign-in"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-foreground transition hover:bg-secondary sm:px-4"
          >
            Professional sign in <ArrowRight size={16} />
          </a>
        </div>
      </header>

      <main>
        <section className="relative border-b border-border/70">
          <div aria-hidden="true" className="absolute left-[8%] top-14 h-44 w-44 rounded-full bg-primary/7 blur-3xl" />
          <div aria-hidden="true" className="absolute right-[4%] top-24 h-52 w-52 rounded-full bg-accent/70 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.03fr_.97fr] lg:items-center lg:gap-16 lg:px-8 lg:pb-24 lg:pt-24">
            <div className="page-enter">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-[11px] font-semibold tracking-[.08em] text-primary">
                PhysioBill Care
              </div>
              <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-.045em] sm:text-6xl lg:text-[4.35rem]">
                Find the right physiotherapist,{' '}
                <span className="display-serif font-normal italic text-primary">closer to you.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Search verified professionals for home visits, clinic care, or telephysiotherapy.
              </p>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-2"><ShieldCheck size={17} className="text-success" /> Verified professionals</span>
                <span className="inline-flex items-center gap-2"><MapPin size={17} className="text-primary" /> Broad service areas</span>
              </div>
            </div>

            <div id="search" className="page-enter stagger-1 rounded-[30px] border border-border bg-card p-5 shadow-[0_22px_60px_hsl(var(--foreground)/.055)] sm:p-7">
              <div className="mb-6 border-b border-border/70 pb-5">
                <p className="text-sm font-semibold text-primary">Start your search</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-.025em]">Care, without the directory clutter.</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose how you want care, then tell us where to look.</p>
              </div>
              <PublicTherapistSearch />
            </div>
          </div>
        </section>

        <section className="bg-card/65">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-9 sm:grid-cols-3 sm:px-6 lg:px-8">
            {[
              ['01', 'Verified first', 'Only profiles returned by PhysioBill’s verified discovery service can appear.'],
              ['02', 'Location-aware', 'Search by city and optionally narrow the result to your area.'],
              ['03', 'Simple by design', 'No ratings, fake profiles, or unsupported availability claims.'],
            ].map(([number, title, copy]) => (
              <div key={number} className="rounded-2xl border border-border/80 bg-background/70 p-5">
                <p className="mono text-xs font-medium text-primary">{number}</p>
                <h3 className="mt-3 font-semibold tracking-[-.015em]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-border/70 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>PhysioBill Care · Verified physiotherapist discovery</p>
        <a href="/professional/sign-in" className="font-semibold text-foreground hover:text-primary">Professional access</a>
      </footer>
    </div>
  );
}
