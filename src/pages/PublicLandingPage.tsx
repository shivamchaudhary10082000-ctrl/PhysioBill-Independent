import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  HeartPulse,
  Home,
  MapPin,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { PublicFooter } from '@/Components/PublicFooter';
import { PublicTherapistSearch } from '@/Components/PublicTherapistSearch';

const careModes = [
  {
    title: 'Home physiotherapy',
    copy: 'Search for verified professionals who serve your city and area.',
    image: '/images/physiobill-home-visit.webp',
    href: '/find-physio?mode=home_visit',
    icon: Home,
    mediaClass: 'physiobill-privacy-home',
  },
  {
    title: 'Clinic physiotherapy',
    copy: 'Find clinic-based care with clear professional details and availability.',
    image: '/images/physiobill-clinic-care.webp',
    href: '/find-physio?mode=clinic_visit',
    icon: Building2,
    mediaClass: 'physiobill-privacy-clinic',
  },
  {
    title: 'Telephysiotherapy',
    copy: 'Request a remote session when a professional offers online care.',
    image: '/images/physiobill-telephysio.webp',
    href: '/find-physio?mode=telephysiotherapy',
    icon: Video,
    mediaClass: 'physiobill-privacy-tele',
  },
] as const;

const patientFaqs = [
  {
    question: 'What does “verified professional” mean?',
    answer: 'PhysioBill has reviewed the professional information submitted for the public profile. You should still check the displayed qualification and registration details before requesting care.',
  },
  {
    question: 'Is a requested time immediately confirmed?',
    answer: 'No. A booking request becomes scheduled only after the physiotherapist accepts it. Sending a request does not create a clinical record, invoice, or payment obligation.',
  },
  {
    question: 'Can I choose home, clinic, or online care?',
    answer: 'Yes, when the physiotherapist has published that care mode and an upcoming time. Home visits also require you to choose one of the professional’s declared service areas.',
  },
  {
    question: 'Should I use PhysioBill for an emergency?',
    answer: 'No. PhysioBill is a discovery and scheduling service, not emergency care. Seek appropriate urgent medical help when immediate assessment is needed.',
  },
] as const;

export function PublicLandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:h-[76px] sm:px-6 lg:px-8">
          <a href="/" aria-label="PhysioBill home" className="rounded-xl">
            <PhysioBillBrand />
          </a>
          <nav aria-label="Public navigation" className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground lg:flex">
            <a href="#care-options" className="transition hover:text-foreground">Care options</a>
            <a href="#how-it-works" className="transition hover:text-foreground">How it works</a>
            <a href="/professional-standards" className="transition hover:text-foreground">Trust & safety</a>
          </nav>
          <a
            href="/professional/sign-in"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/15 bg-card px-3.5 text-xs font-bold text-primary transition hover:border-primary/30 hover:bg-primary/5 sm:text-sm"
          >
            For physiotherapists <ArrowRight size={15} />
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/70 bg-[linear-gradient(155deg,hsl(var(--background))_15%,hsl(var(--secondary))_100%)]">
          <div aria-hidden="true" className="absolute -left-28 top-12 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8 lg:pb-20 lg:pt-16">
            <div className="grid items-center gap-9 lg:grid-cols-[.9fr_1.1fr] lg:gap-14">
              <div className="page-enter relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/90 px-3 py-1.5 text-xs font-bold uppercase tracking-[.08em] text-primary shadow-sm">
                  <HeartPulse size={14} aria-hidden="true" /> PhysioBill Care
                </div>
                <h1 className="mt-5 max-w-2xl text-[2.65rem] font-extrabold leading-[1.04] tracking-[-.055em] sm:text-6xl lg:text-[4.25rem]">
                  Physiotherapy that fits <span className="text-primary">your life.</span>
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                  Find verified physiotherapists for home visits, clinic appointments, and online sessions—without unrelated healthcare listings.
                </p>
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-foreground/75">
                  <span className="inline-flex items-center gap-2"><ShieldCheck size={18} className="text-success" /> Verified profiles</span>
                  <span className="inline-flex items-center gap-2"><MapPin size={18} className="text-primary" /> Location-aware search</span>
                </div>
              </div>

              <div className="page-enter stagger-1 relative">
                <div className="physiobill-private-media physiobill-private-media-hero overflow-hidden rounded-[28px] border-[6px] border-card bg-card shadow-[0_24px_70px_hsl(var(--foreground)/.16)] sm:rounded-[34px]">
                  <img
                    src="/images/physiobill-clinic-care.webp"
                    alt="A privacy-safe cropped view of physiotherapy guidance in a bright clinic"
                    className="physiobill-privacy-hero h-full w-full object-cover"
                    fetchPriority="high"
                  />
                </div>
                <div className="absolute -bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-[0_14px_40px_hsl(var(--foreground)/.13)] backdrop-blur sm:left-auto sm:right-5 sm:w-[310px] sm:p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-success/10 text-success"><CheckCircle2 size={19} /></div>
                  <div>
                    <p className="text-xs font-bold text-success">Verified-professional search</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Professional information is reviewed before public discovery.</p>
                  </div>
                </div>
              </div>
            </div>

            <div id="search" className="page-enter stagger-2 relative z-20 mt-10 rounded-[26px] border border-border bg-card p-4 shadow-[0_20px_55px_hsl(var(--foreground)/.09)] sm:p-6 lg:-mb-28 lg:mt-12">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.08em] text-primary">Start here</p>
                  <h2 className="mt-1 text-xl font-extrabold tracking-[-.03em] sm:text-2xl">Find the right physiotherapy setting</h2>
                </div>
                <p className="text-xs text-muted-foreground">City is required · Area is optional</p>
              </div>
              <PublicTherapistSearch />
            </div>
          </div>
        </section>

        <section id="care-options" className="bg-card/65 lg:pt-28">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.1em] text-primary">Choose your care setting</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">Only physiotherapy. No directory clutter.</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">Start with how you want care, then narrow your search by city and area.</p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {careModes.map(({ title, copy, image, href, icon: Icon, mediaClass }) => (
                <a key={title} href={href} className="group overflow-hidden rounded-[24px] border border-border bg-background shadow-[0_14px_40px_hsl(var(--foreground)/.05)] transition hover:-translate-y-1 hover:shadow-[0_20px_55px_hsl(var(--foreground)/.1)]">
                  <div className="physiobill-private-media overflow-hidden">
                    <img src={image} alt="" loading="lazy" className={`${mediaClass} h-full w-full max-w-none object-cover`} />
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid size-11 place-items-center rounded-xl bg-primary/8 text-primary"><Icon size={20} /></div>
                      <ArrowUpRight size={20} className="text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                    <h3 className="mt-5 text-xl font-extrabold tracking-[-.025em]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
                    <span className="mt-4 inline-flex text-sm font-bold text-primary">Explore care</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border/70 bg-background">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.1em] text-primary">A safer way to discover care</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">Clear evidence before a booking request.</h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">PhysioBill shows professional information, service areas, care modes, and real platform availability without manufacturing scores or promises.</p>
                <a href="/find-physio" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground">Find a physiotherapist <ArrowRight size={17} /></a>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['01', 'Choose care', 'Select home, clinic, or telephysiotherapy.'],
                  ['02', 'Review profiles', 'See verified professional and registration information.'],
                  ['03', 'Request a time', 'Choose genuine availability and send a booking request.'],
                ].map(([number, title, copy]) => (
                  <div key={number} className="rounded-[22px] border border-border bg-card p-5 sm:min-h-[210px] sm:p-6">
                    <p className="mono text-xs font-bold text-primary">{number}</p>
                    <h3 className="mt-8 text-lg font-extrabold tracking-[-.02em]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-card/65" aria-labelledby="patient-faq-heading">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[.72fr_1.28fr] lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.1em] text-primary">Before you request care</p>
              <h2 id="patient-faq-heading" className="mt-3 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">Clear answers, without hidden promises.</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">These are operational answers about PhysioBill. Individual clinical advice must come from the treating professional.</p>
            </div>
            <div className="space-y-3">
              {patientFaqs.map((faq) => (
                <details key={faq.question} className="physiobill-faq group rounded-2xl border border-border bg-background p-5 shadow-[0_10px_30px_hsl(var(--foreground)/.035)]">
                  <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 text-base font-extrabold marker:hidden">
                    <span>{faq.question}</span>
                    <ChevronDown size={19} className="shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-3 border-t border-border/70 pt-3 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/70 bg-card/65">
          <div className="mx-auto max-w-7xl px-4 py-8 text-xs leading-5 text-muted-foreground sm:px-6 lg:px-8">
            PhysioBill supports professional discovery and scheduling. It is not an emergency service and does not guarantee a clinical result. “Verified” means PhysioBill reviewed the professional information submitted to the platform; it does not replace registration with the applicable government or professional council. Public information remains subject to our <a href="/professional-standards" className="font-bold text-primary hover:underline">Professional Standards</a>.
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
