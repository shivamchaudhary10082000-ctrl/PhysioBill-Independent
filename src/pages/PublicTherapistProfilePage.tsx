import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  MapPin,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { PublicFooter } from '@/Components/PublicFooter';
import { requestPatientAppointment } from '@/lib/appointments';
import { getAuthSession, resolveAuthenticatedSessionPersona } from '@/lib/auth';
import { requestHomeVisitAppointment } from '@/lib/home-visit-service-location';
import {
  detectPublicTherapistDiscoveryLocale,
  publicTherapistDiscoveryCopy,
} from '@/lib/public-therapist-discovery-locale';
import {
  getVerifiedTherapistAvailability,
  type TherapistAvailabilityWindow,
} from '@/lib/therapist-availability';
import {
  getVerifiedTherapistPublicProfile,
  normalizeTherapistServiceMode,
  type VerifiedTherapistDiscoveryResult,
} from '@/lib/therapist-discovery';

type ProfileState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error' }
  | { status: 'ready'; profile: VerifiedTherapistDiscoveryResult };

const PROFILE_SECTIONS = [
  { id: 'book', label: 'Book' },
  { id: 'patient-stories', label: 'Patient Stories' },
  { id: 'treatments', label: 'Treatments & Conditions' },
  { id: 'photos', label: 'Photos & Media' },
  { id: 'specializations', label: 'Specializations' },
  { id: 'practice', label: 'Practice Details' },
  { id: 'about', label: 'About' },
  { id: 'faqs', label: 'FAQs' },
] as const;

type ProfileSectionId = (typeof PROFILE_SECTIONS)[number]['id'];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PT';
}

function formatWindow(window: TherapistAvailabilityWindow, locale: string) {
  const start = new Date(window.startsAt);
  const end = new Date(window.endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  try {
    const day = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: window.timezoneName }).format(start);
    const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: window.timezoneName });
    return `${day} · ${time.format(start)}–${time.format(end)}`;
  } catch {
    return '';
  }
}

export function PublicTherapistProfilePage({ physioId }: { physioId: string }) {
  const locale = useMemo(
    () => detectPublicTherapistDiscoveryLocale(typeof navigator === 'undefined' ? undefined : navigator.languages),
    [],
  );
  const copy = useMemo(() => publicTherapistDiscoveryCopy(locale), [locale]);
  const preferredMode = useMemo(
    () => normalizeTherapistServiceMode(new URLSearchParams(window.location.search).get('mode')),
    [],
  );
  const [profileState, setProfileState] = useState<ProfileState>({ status: 'loading' });
  const [availability, setAvailability] = useState<TherapistAvailabilityWindow[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(() => new Set());
  const [requestNotice, setRequestNotice] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ProfileSectionId>(() => {
    const hash = window.location.hash.replace(/^#/, '');
    return PROFILE_SECTIONS.some((section) => section.id === hash) ? hash as ProfileSectionId : 'about';
  });

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (PROFILE_SECTIONS.some((section) => section.id === hash)) setActiveSection(hash as ProfileSectionId);
    };
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  useEffect(() => {
    if (profileState.status !== 'ready') return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!PROFILE_SECTIONS.some((section) => section.id === hash)) return;
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ block: 'start' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [profileState.status]);

  useEffect(() => {
    let active = true;
    setProfileState({ status: 'loading' });
    setAvailabilityLoading(true);
    setAvailabilityError(false);

    Promise.all([
      getVerifiedTherapistPublicProfile(physioId),
      getVerifiedTherapistAvailability(physioId, undefined, 12),
    ])
      .then(([profile, windows]) => {
        if (!active) return;
        if (!profile) {
          setProfileState({ status: 'missing' });
          setAvailability([]);
          return;
        }
        setProfileState({ status: 'ready', profile });
        setAvailability(windows);
      })
      .catch(() => {
        if (!active) return;
        setProfileState({ status: 'error' });
        setAvailabilityError(true);
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false);
      });

    return () => { active = false; };
  }, [physioId]);

  const requestWindow = async (slot: TherapistAvailabilityWindow) => {
    if (slot.serviceMode === 'home_visit' && !selectedAreaId) {
      setRequestNotice(null);
      setRequestError(copy.chooseAreaError);
      return;
    }
    setRequestingId(slot.id);
    setRequestNotice(null);
    setRequestError(null);
    try {
      const auth = await getAuthSession();
      if (!auth.user) {
        const returnTo = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/patient/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      if (await resolveAuthenticatedSessionPersona() !== 'patient') {
        setRequestError(copy.professionalPersonaError);
        return;
      }
      if (slot.serviceMode === 'home_visit') {
        await requestHomeVisitAppointment(slot.id, selectedAreaId);
      } else {
        await requestPatientAppointment(slot.id);
      }
      setRequestedIds((current) => new Set(current).add(slot.id));
      setRequestNotice(slot.serviceMode === 'home_visit' ? copy.homeVisitRequestSent : copy.appointmentRequestSent);
    } catch {
      setRequestError(copy.requestFailed);
    } finally {
      setRequestingId(null);
    }
  };

  if (profileState.status === 'loading') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ProfileHeader />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="skeleton h-80 rounded-[32px]" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]"><div className="skeleton h-96 rounded-[28px]" /><div className="skeleton h-96 rounded-[28px]" /></div>
        </main>
      </div>
    );
  }

  if (profileState.status === 'missing' || profileState.status === 'error') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ProfileHeader />
        <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 py-12 text-center">
          <section className="w-full rounded-[30px] border bg-card p-8 shadow-sm sm:p-12">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/7 text-primary"><Stethoscope size={24} /></div>
            <h1 className="mt-5 text-2xl font-bold">This profile is not publicly available.</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">It may be private, paused for review, or no longer verified. PhysioBill does not show an unverified replacement.</p>
            <a href="/find-physio" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><ArrowLeft size={16} /> Find another physiotherapist</a>
          </section>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const { profile } = profileState;
  const registration = [profile.verified_registration_authority, profile.verified_registration_number].filter(Boolean).join(' · ');
  const hasHomeVisit = availability.some((item) => item.serviceMode === 'home_visit');
  const sortedAvailability = [...availability].sort((a, b) => {
    const preferredA = a.serviceMode === preferredMode ? 0 : 1;
    const preferredB = b.serviceMode === preferredMode ? 0 : 1;
    return preferredA - preferredB || new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProfileHeader />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-16">
        <a href="/find-physio" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"><ArrowLeft size={16} /> Back to search</a>

        <section className="relative mt-4 overflow-hidden rounded-[32px] border border-primary/10 bg-[linear-gradient(135deg,hsl(var(--primary)/.11),hsl(var(--card))_52%,hsl(var(--primary-soft)))] p-6 shadow-[0_24px_70px_hsl(var(--foreground)/.07)] sm:p-8 lg:p-10">
          <div className="absolute -right-16 -top-20 size-64 rounded-full bg-primary/8 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="grid size-20 shrink-0 place-items-center rounded-[24px] border border-primary/15 bg-background/85 text-xl font-bold text-primary shadow-sm" aria-label="Profile uses initials instead of a face photo">{initials(profile.display_name)}</div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/15 bg-success/10 px-3 py-1.5 text-xs font-bold text-success"><BadgeCheck size={15} /> Verified physiotherapist</span>
              <h1 className="mt-3 text-3xl font-bold tracking-[-.045em] sm:text-4xl">{profile.display_name}</h1>
              {profile.verified_qualification && <p className="mt-2 text-base font-semibold text-muted-foreground">{profile.verified_qualification}</p>}
              {profile.headline && <p className="mt-4 max-w-2xl text-base leading-7 sm:text-lg">{profile.headline}</p>}
              <div className="mt-5 flex flex-wrap gap-2">
                {profile.service_modes.map((mode) => <span key={mode} className="rounded-full border border-primary/12 bg-background/75 px-3 py-1.5 text-xs font-semibold">{copy.serviceModeLabels[mode]}</span>)}
              </div>
            </div>
          </div>
        </section>

        <ProfileSectionNav activeSection={activeSection} onNavigate={setActiveSection} />

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <section id="patient-stories" className="scroll-mt-40 rounded-[28px] border bg-card p-6 shadow-[0_14px_42px_hsl(var(--foreground)/.035)] sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Patient feedback</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-.03em]">Patient Stories</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">No public patient stories are available for this profile yet. PhysioBill does not display placeholder or invented reviews.</p>
            </section>

            <section id="treatments" className="scroll-mt-40 rounded-[28px] border bg-card p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Care offered</p>
              <h2 className="mt-2 text-2xl font-bold">Treatments & Conditions</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">No separate treatment or condition list has been published for this profile yet.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {profile.service_modes.map((mode) => <span key={mode} className="rounded-full border border-primary/12 bg-primary/5 px-3 py-1.5 text-xs font-semibold">{copy.serviceModeLabels[mode]}</span>)}
              </div>
            </section>

            <section id="photos" className="scroll-mt-40 rounded-[28px] border bg-card p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Profile media</p>
              <h2 className="mt-2 text-2xl font-bold">Photos & Media</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">No public photos or videos have been published for this profile yet.</p>
            </section>

            <section id="specializations" className="scroll-mt-40 rounded-[28px] border bg-card p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Professional focus</p>
              <h2 className="mt-2 text-2xl font-bold">Specializations</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-primary/12 bg-primary/5 px-3 py-1.5 text-xs font-semibold">Physiotherapy</span>
                {profile.verified_qualification && <span className="rounded-full border bg-secondary/45 px-3 py-1.5 text-xs font-semibold">{profile.verified_qualification}</span>}
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">PhysioBill does not infer a clinical specialty from a biography. Specific specialties should be shown only when they are explicitly published and supported by the profile workflow.</p>
            </section>

            <section id="about" className="scroll-mt-40 rounded-[28px] border bg-card p-6 shadow-[0_14px_42px_hsl(var(--foreground)/.035)] sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Professional profile</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-.03em]">About this physiotherapist</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">{profile.bio || 'This physiotherapist has not added a public introduction yet.'}</p>
              {profile.clinic_name && <div className="mt-6 flex items-start gap-3 rounded-2xl bg-secondary/55 p-4"><Building2 className="mt-0.5 shrink-0 text-primary" size={19} /><div><p className="text-xs font-semibold text-muted-foreground">Practice</p><p className="mt-1 font-bold">{profile.clinic_name}</p></div></div>}
            </section>

            <section className="rounded-[28px] border bg-card p-6 sm:p-8">
              <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-success/9 text-success"><ShieldCheck size={20} /></div><div><p className="text-xs font-bold uppercase tracking-[.12em] text-success">Credential boundary</p><h2 className="mt-1 text-xl font-bold">Verified professional details</h2></div></div>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-secondary/50 p-4"><dt className="text-xs font-semibold text-muted-foreground">Qualification</dt><dd className="mt-1 text-sm font-bold">{profile.verified_qualification || 'Not publicly listed'}</dd></div>
                <div className="rounded-2xl bg-secondary/50 p-4"><dt className="text-xs font-semibold text-muted-foreground">Registration</dt><dd className="mt-1 break-words text-sm font-bold">{registration || 'Not publicly listed'}</dd></div>
              </dl>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">PhysioBill shows only credentials approved through its professional verification workflow. This badge is not a guarantee of treatment outcome.</p>
            </section>

            <section id="practice" className="scroll-mt-40 rounded-[28px] border bg-card p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Practice details</p>
              <h2 className="mt-2 text-2xl font-bold">Service areas</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {profile.service_areas.map((area) => <div key={area.id} className="flex items-start gap-3 rounded-2xl border bg-secondary/35 p-4"><MapPin className="mt-0.5 shrink-0 text-primary" size={18} /><div><p className="font-bold">{area.locality}, {area.city}</p><p className="mt-1 text-xs text-muted-foreground">{area.state}</p></div></div>)}
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">These are broad service areas, not a clinic address or live location.</p>
            </section>

            <section id="faqs" className="scroll-mt-40 rounded-[28px] border bg-card p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Before you request</p>
              <h2 className="mt-2 text-2xl font-bold">Common questions</h2>
              <div className="mt-5 divide-y rounded-2xl border">
                {[
                  ['Is an appointment confirmed immediately?', 'No. Your request becomes scheduled only after the physiotherapist accepts it.'],
                  ['Does PhysioBill share my clinical record?', 'No. Viewing this public profile or requesting a time does not grant clinical, invoice, or payment access.'],
                  ['Why is there no face photo?', 'This profile uses initials by design to reduce unnecessary biometric exposure while preserving verified professional details.'],
                ].map(([question, answer]) => <details key={question} className="group p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold">{question}<ChevronDown size={17} className="shrink-0 transition group-open:rotate-180" /></summary><p className="mt-3 pr-6 text-sm leading-6 text-muted-foreground">{answer}</p></details>)}
              </div>
            </section>
          </div>

          <aside id="book" className="order-first scroll-mt-40 rounded-[28px] border border-primary/12 bg-card p-5 shadow-[0_20px_60px_hsl(var(--foreground)/.08)] sm:p-6 lg:order-none lg:sticky lg:top-24">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary/8 text-primary"><CalendarClock size={20} /></div><div><p className="text-xs font-semibold text-primary">Live availability</p><h2 className="text-xl font-bold">Request a time</h2></div></div>

            {hasHomeVisit && profile.service_areas.length > 0 && (
              <fieldset className="mt-5">
                <legend className="text-xs font-bold">Home-visit area</legend>
                <div className="mt-2 grid gap-2">
                  {profile.service_areas.map((area) => <label key={area.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${selectedAreaId === area.id ? 'border-primary bg-primary/7' : 'bg-secondary/35'}`}><input type="radio" name="profile-service-area" checked={selectedAreaId === area.id} onChange={() => { setSelectedAreaId(area.id); setRequestError(null); }} /><MapPin size={14} className="text-primary" />{area.locality}, {area.city}</label>)}
                </div>
              </fieldset>
            )}

            {availabilityLoading ? <div className="mt-5 space-y-2"><div className="skeleton h-16 rounded-xl" /><div className="skeleton h-16 rounded-xl" /></div>
              : availabilityError ? <p className="mt-5 rounded-xl bg-secondary/45 p-4 text-sm text-muted-foreground">{copy.availabilityUnavailable}</p>
              : sortedAvailability.length === 0 ? <p className="mt-5 rounded-xl bg-secondary/45 p-4 text-sm leading-6 text-muted-foreground">{copy.noUpcomingTimes}</p>
              : <div className="mt-5 space-y-2">{sortedAvailability.map((item) => {
                const requested = requestedIds.has(item.id);
                const needsArea = item.serviceMode === 'home_visit' && !selectedAreaId;
                return <div key={item.id} className="rounded-2xl border bg-secondary/30 p-3"><p className="text-sm font-bold">{formatWindow(item, locale) || copy.upcomingTime}</p><p className="mt-1 text-xs text-muted-foreground">{copy.serviceModeLabels[item.serviceMode]} · {item.timezoneName}</p><button type="button" disabled={requested || requestingId === item.id || needsArea} onClick={() => void requestWindow(item)} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground transition hover:bg-[hsl(var(--primary-hover))] disabled:cursor-not-allowed disabled:opacity-55"><CalendarPlus size={15} />{requested ? copy.requested : requestingId === item.id ? copy.requesting : needsArea ? copy.chooseAreaFirst : copy.requestThisTime}</button></div>;
              })}</div>}

            {requestNotice && <p role="status" className="mt-4 rounded-xl border border-success/15 bg-success/7 p-3 text-xs font-medium text-success">{requestNotice}</p>}
            {requestError && <p role="alert" className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{requestError}</p>}
            <div className="mt-5 flex items-start gap-2 border-t pt-4"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" /><p className="text-[11px] leading-5 text-muted-foreground">{copy.requestBoundary}</p></div>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur-xl lg:hidden"><a href="#book" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><CalendarClock size={18} /> View availability</a></div>
      <PublicFooter />
    </div>
  );
}

function ProfileSectionNav({
  activeSection,
  onNavigate,
}: {
  activeSection: ProfileSectionId;
  onNavigate: (section: ProfileSectionId) => void;
}) {
  return (
    <nav aria-label="Physiotherapist profile sections" className="sticky top-[72px] z-30 mt-6 rounded-2xl border bg-background/95 p-1.5 shadow-sm backdrop-blur-xl">
      <div className="flex gap-1 overflow-x-auto">
        {PROFILE_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={activeSection === section.id ? 'page' : undefined}
            onClick={() => onNavigate(section.id)}
            className={`flex min-h-10 shrink-0 items-center rounded-xl px-3.5 text-sm font-semibold transition ${activeSection === section.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function ProfileHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" aria-label="PhysioBill home"><PhysioBillBrand /></a>
        <div className="flex items-center gap-2"><a href="/find-physio" className="hidden min-h-10 items-center rounded-xl border px-3 text-xs font-semibold sm:inline-flex">Find a physiotherapist</a><a href="/patient/appointments" className="inline-flex min-h-10 items-center rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground">My requests</a></div>
      </div>
    </header>
  );
}
