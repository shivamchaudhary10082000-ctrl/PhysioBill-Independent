import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CheckCircle2, CircleAlert, Eye, MapPin, Plus, Save, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { THERAPIST_SERVICE_MODES, type TherapistDiscoveryServiceArea, type TherapistServiceMode } from '@/lib/therapist-discovery';
import {
  loadMyTherapistDiscoveryManagement,
  requestMyProfessionalVerification,
  saveMyTherapistDiscoveryProfile,
  type TherapistDiscoveryDraft,
  type TherapistDiscoveryManagementState,
} from '@/lib/therapist-discovery-management';
import { DEFAULT_LOCALE, loadPreferredLocale, type SupportedLocale } from '@/lib/locale';
import {
  therapistDiscoveryProfileMessage as msg,
  therapistDiscoveryServiceModeLabel,
  therapistDiscoveryVerificationLabel,
} from '@/lib/therapist-discovery-profile-locale';

const emptyArea = (): TherapistDiscoveryServiceArea => ({ locality: '', city: '', state: '', country_code: 'IN' });
const normalizeAreaKey = (area: TherapistDiscoveryServiceArea) => [area.locality, area.city, area.state, area.country_code].map((value) => value.trim().toLowerCase()).join('|');
const fieldClass = 'h-12 w-full rounded-xl border bg-card px-3.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10';
const textareaClass = 'min-h-28 w-full rounded-xl border bg-card px-3.5 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10';

function credentialsComplete(state: TherapistDiscoveryManagementState) {
  return Boolean(state.credentials.fullName.trim() && state.credentials.qualification.trim() && state.credentials.registrationNumber.trim() && state.credentials.registrationAuthority.trim() && state.credentials.registrationJurisdiction.trim());
}

function areaComplete(area: TherapistDiscoveryServiceArea) {
  return Boolean(area.locality.trim() && area.locality.trim().length <= 120 && area.city.trim() && area.city.trim().length <= 100 && area.state.trim() && area.state.trim().length <= 100);
}

function requestedAtLabel(value: string | null, locale: SupportedLocale) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

export function TherapistDiscoveryProfilePage() {
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const [state, setState] = useState<TherapistDiscoveryManagementState | null>(null);
  const [draft, setDraft] = useState<TherapistDiscoveryDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = async () => {
    const loaded = await loadMyTherapistDiscoveryManagement();
    setState(loaded);
    setDraft(loaded.draft);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadPreferredLocale().then((preferred) => { if (active) setLocale(preferred); }).catch(() => {});
    loadMyTherapistDiscoveryManagement()
      .then((loaded) => {
        if (!active) return;
        setState(loaded);
        setDraft(loaded.draft);
      })
      .catch(() => { if (active) setError(msg(locale, 'loadError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const duplicateAreas = useMemo(() => {
    if (!draft) return false;
    const keys = draft.serviceAreas.map(normalizeAreaKey).filter(Boolean);
    return new Set(keys).size !== keys.length;
  }, [draft]);

  const listingReady = useMemo(() => Boolean(draft && draft.displayName.trim() && draft.displayName.trim().length <= 120 && draft.serviceModes.length > 0 && draft.serviceAreas.length > 0 && draft.serviceAreas.every(areaComplete) && !duplicateAreas), [draft, duplicateAreas]);

  useEffect(() => {
    if (!listingReady) setDraft((current) => current?.isDiscoverable ? { ...current, isDiscoverable: false } : current);
  }, [listingReady]);

  if (loading) return <div className="space-y-4"><div className="h-32 rounded-[24px] skeleton" /><div className="grid gap-4 lg:grid-cols-2"><div className="h-72 rounded-2xl skeleton" /><div className="h-72 rounded-2xl skeleton" /></div></div>;
  if (!state || !draft) return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error ?? msg(locale, 'unavailable')}</div>;

  const status = state.verification.status;
  const canRequest = (status === 'unverified' || status === 'rejected') && credentialsComplete(state);
  const requestedAt = requestedAtLabel(state.verification.requestedAt, locale);
  const currentlyVisible = status === 'verified' && draft.isDiscoverable && listingReady;

  const setField = <K extends keyof TherapistDiscoveryDraft>(field: K, value: TherapistDiscoveryDraft[K]) => {
    setDraft((current) => current ? { ...current, [field]: value } : current);
    setNotice(null);
    setError(null);
  };

  const toggleMode = (mode: TherapistServiceMode) => {
    setDraft((current) => current ? { ...current, serviceModes: current.serviceModes.includes(mode) ? current.serviceModes.filter((item) => item !== mode) : [...current.serviceModes, mode] } : current);
    setNotice(null);
    setError(null);
  };

  const updateArea = (index: number, field: 'locality' | 'city' | 'state', value: string) => {
    setDraft((current) => current ? { ...current, serviceAreas: current.serviceAreas.map((area, areaIndex) => areaIndex === index ? { ...area, [field]: value, country_code: 'IN' } : area) } : current);
    setNotice(null);
    setError(null);
  };

  const save = async () => {
    setError(null);
    setNotice(null);
    if (draft.displayName.length > 120 || draft.headline.length > 200 || draft.bio.length > 2000 || draft.clinicName.length > 160) return setError(msg(locale, 'lengthError'));
    if (draft.serviceAreas.some((area) => !areaComplete(area))) return setError(msg(locale, 'areaError'));
    if (duplicateAreas) return setError(msg(locale, 'duplicateError'));
    if (draft.isDiscoverable && !listingReady) return setError(msg(locale, 'publishError'));
    setSaving(true);
    try {
      await saveMyTherapistDiscoveryProfile(draft);
      await reload();
      setNotice(msg(locale, 'saved'));
    } catch {
      setError(msg(locale, 'saveError'));
    } finally {
      setSaving(false);
    }
  };

  const requestVerification = async () => {
    setError(null);
    setNotice(null);
    setRequesting(true);
    try {
      await requestMyProfessionalVerification();
      await reload();
      setNotice(msg(locale, 'verificationSubmitted'));
    } catch {
      setError(msg(locale, 'verificationError'));
    } finally {
      setRequesting(false);
    }
  };

  const statusTone = status === 'verified' ? 'border-success/15 bg-success/6 text-success' : status === 'pending' ? 'border-warning/15 bg-warning/6 text-warning' : status === 'rejected' ? 'border-destructive/15 bg-destructive/5 text-destructive' : 'border-border bg-muted/55 text-muted-foreground';

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[26px] border border-primary/14 bg-[hsl(var(--primary-soft))] px-5 py-7 shadow-[0_16px_40px_hsl(var(--foreground)/.035)] sm:px-7 sm:py-8">
        <div aria-hidden="true" className="absolute left-0 top-0 h-full w-1 bg-primary/70" />
        <div aria-hidden="true" className="absolute -right-12 -top-16 size-48 rounded-full bg-accent/70 blur-2xl" />
        <p className="workspace-section-kicker">{msg(locale, 'publicDiscovery')}</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-[-.04em] sm:text-4xl">{msg(locale, 'title')}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{msg(locale, 'subtitle')}</p>
      </section>

      {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm font-medium">{notice}</div>}

      <section className="rounded-2xl border bg-card p-5 shadow-[0_12px_30px_hsl(var(--foreground)/.03)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div>
          <p className="workspace-section-kicker">{msg(locale, 'verificationStatus')}</p>
          <h2 className="mt-1 text-xl font-bold tracking-[-.025em]">{msg(locale, 'professionalVerification')}</h2>
          <div className="mt-4 flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-xl border ${statusTone}`}>{status === 'verified' ? <BadgeCheck size={20} /> : status === 'pending' ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}</span><div><h3 className="text-base font-bold tracking-[-.015em]">{therapistDiscoveryVerificationLabel(locale, status)}</h3>{requestedAt && <p className="mt-0.5 text-xs font-medium text-muted-foreground">{msg(locale, 'latestRequest')}: {requestedAt}</p>}</div></div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{msg(locale, 'verificationGuard')}</p>
        </div><a href="/app/profile" className="inline-flex h-10 items-center justify-center rounded-xl border bg-background px-3 text-sm font-semibold hover:bg-secondary">{msg(locale, 'professionalProfile')}</a></div>
        <div className="mt-5 border-t pt-5">
          {(status === 'unverified' || status === 'rejected') && !credentialsComplete(state) && <div className="rounded-xl bg-secondary/55 p-4 text-sm leading-6 text-muted-foreground">{msg(locale, 'credentialsIncomplete')}</div>}
          {status === 'pending' && <div className="rounded-xl border border-warning/10 bg-warning/5 p-4 text-sm leading-6 text-muted-foreground">{msg(locale, 'pendingCopy')}</div>}
          {status === 'verified' && <div className="rounded-xl border border-success/10 bg-success/5 p-4 text-sm leading-6 text-muted-foreground">{msg(locale, 'verifiedCopy')}</div>}
          {canRequest && <button type="button" disabled={requesting} onClick={() => void requestVerification()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(var(--primary-hover))] disabled:opacity-60"><Send size={16} /> {requesting ? msg(locale, 'submitting') : status === 'rejected' ? msg(locale, 'resubmit') : msg(locale, 'submit')}</button>}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><div className="space-y-6">
        <section className="rounded-2xl border bg-card p-5 shadow-[0_12px_30px_hsl(var(--foreground)/.03)] sm:p-6">
          <div><p className="workspace-section-kicker">{msg(locale, 'patientSafeListing')}</p><h2 className="mt-1 text-xl font-bold tracking-[-.025em]">{msg(locale, 'publicProfile')}</h2></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 sm:col-span-2"><span className="text-xs font-semibold text-foreground/70">{msg(locale, 'displayName')}</span><input maxLength={120} value={draft.displayName} onChange={(event) => setField('displayName', event.target.value)} className={fieldClass} /><span className="text-[11px] text-muted-foreground">{draft.displayName.length}/120</span></label>
            <label className="block space-y-2 sm:col-span-2"><span className="text-xs font-semibold text-foreground/70">{msg(locale, 'headline')}</span><input maxLength={200} value={draft.headline} onChange={(event) => setField('headline', event.target.value)} className={fieldClass} /><span className="text-[11px] text-muted-foreground">{draft.headline.length}/200</span></label>
            <label className="block space-y-2 sm:col-span-2"><span className="text-xs font-semibold text-foreground/70">{msg(locale, 'shortBio')}</span><textarea maxLength={2000} value={draft.bio} onChange={(event) => setField('bio', event.target.value)} className={textareaClass} /><span className="text-[11px] text-muted-foreground">{draft.bio.length}/2000</span></label>
            <label className="block space-y-2 sm:col-span-2"><span className="text-xs font-semibold text-foreground/70">{msg(locale, 'clinicPracticeName')} <span className="font-normal">({msg(locale, 'optional')})</span></span><input maxLength={160} value={draft.clinicName} onChange={(event) => setField('clinicName', event.target.value)} className={fieldClass} /><span className="text-[11px] text-muted-foreground">{draft.clinicName.length}/160</span></label>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-[0_12px_30px_hsl(var(--foreground)/.03)] sm:p-6"><p className="workspace-section-kicker">{msg(locale, 'careFormat')}</p><h2 className="mt-1 text-xl font-bold tracking-[-.025em]">{msg(locale, 'serviceModes')}</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{THERAPIST_SERVICE_MODES.map((mode) => { const selected = draft.serviceModes.includes(mode); return <button key={mode} type="button" onClick={() => toggleMode(mode)} aria-pressed={selected} className={`min-h-14 rounded-2xl border px-4 text-left text-sm font-semibold transition ${selected ? 'border-primary/35 bg-primary/6 text-primary' : 'bg-background text-foreground hover:bg-secondary/45'}`}>{therapistDiscoveryServiceModeLabel(locale, mode)}</button>; })}</div></section>

        <section className="rounded-2xl border bg-card p-5 shadow-[0_12px_30px_hsl(var(--foreground)/.03)] sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="workspace-section-kicker">{msg(locale, 'broadGeography')}</p><h2 className="mt-1 text-xl font-bold tracking-[-.025em]">{msg(locale, 'serviceAreas')}</h2><p className="mt-2 text-sm text-muted-foreground">{msg(locale, 'areaSafety')}</p></div><button type="button" onClick={() => setField('serviceAreas', [...draft.serviceAreas, emptyArea()])} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 text-sm font-semibold text-primary hover:bg-primary/8"><Plus size={15} /> {msg(locale, 'addArea')}</button></div>
          <div className="mt-5 space-y-3">{draft.serviceAreas.map((area, index) => <div key={`${index}-${area.country_code}`} className="grid gap-3 rounded-2xl border bg-background/70 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <label className="space-y-2"><span className="text-xs font-semibold text-foreground/70">{msg(locale, 'locality')}</span><input maxLength={120} value={area.locality} onChange={(event) => updateArea(index, 'locality', event.target.value)} className="h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
            <label className="space-y-2"><span className="text-xs font-semibold text-foreground/70">{msg(locale, 'city')}</span><input maxLength={100} value={area.city} onChange={(event) => updateArea(index, 'city', event.target.value)} className="h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
            <label className="space-y-2"><span className="text-xs font-semibold text-foreground/70">{msg(locale, 'state')}</span><input maxLength={100} value={area.state} onChange={(event) => updateArea(index, 'state', event.target.value)} className="h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
            <button type="button" aria-label={`${msg(locale, 'removeArea')} ${index + 1}`} onClick={() => setField('serviceAreas', draft.serviceAreas.filter((_, areaIndex) => areaIndex !== index))} className="grid size-11 place-items-center rounded-xl text-destructive hover:bg-destructive/8"><Trash2 size={16} /></button>
          </div>)}{!draft.serviceAreas.length && <div className="rounded-xl bg-secondary/45 p-4 text-sm text-muted-foreground">{msg(locale, 'noAreas')}</div>}{duplicateAreas && <p className="text-xs font-semibold text-destructive">{msg(locale, 'duplicateAreas')}</p>}</div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-[0_12px_30px_hsl(var(--foreground)/.03)] sm:p-6">
          <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/6 text-primary"><ShieldCheck size={20} /></span><div><p className="workspace-section-kicker">{msg(locale, 'visibilityPreference')}</p><h2 className="mt-1 text-lg font-bold tracking-[-.02em]">{msg(locale, 'publicDiscoveryOptIn')}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{msg(locale, 'optInCopy')}</p></div></div>
          <label className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 ${listingReady ? 'bg-background/70' : 'bg-muted/35'}`}><input type="checkbox" className="mt-1 size-4 accent-[hsl(var(--primary))]" disabled={!listingReady} checked={draft.isDiscoverable} onChange={(event) => setField('isDiscoverable', event.target.checked)} /><span><span className="block text-sm font-semibold text-foreground">{msg(locale, 'publishWhenVerified')}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{msg(locale, 'publishRequirements')}</span></span></label>
          <div className="mt-5 flex justify-end"><button type="button" disabled={saving} onClick={() => void save()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(var(--primary-hover))] disabled:opacity-60"><Save size={16} /> {saving ? msg(locale, 'saving') : msg(locale, 'save')}</button></div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-24 xl:self-start"><section className="overflow-hidden rounded-[26px] border bg-card shadow-[0_16px_42px_hsl(var(--foreground)/.04)]">
        <div className="border-b bg-secondary/45 px-5 py-4"><div className="flex items-center gap-2"><Eye size={17} className="text-primary" /><h2 className="text-base font-bold tracking-[-.015em]">{msg(locale, 'patientPreview')}</h2></div><p className="mt-1 text-xs text-muted-foreground">{msg(locale, 'previewSafety')}</p></div>
        <div className="p-5 sm:p-6"><div className="flex items-start gap-4"><div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-primary/12 bg-primary/7 text-base font-semibold text-primary">{draft.displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PT'}</div><div className="min-w-0"><h3 className="text-xl font-bold tracking-[-.02em]">{draft.displayName.trim() || msg(locale, 'yourDisplayName')}</h3>{status === 'verified' && <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-success/7 px-2.5 py-1 text-xs font-semibold text-success"><BadgeCheck size={14} /> {msg(locale, 'verifiedProfessional')}</div>}{draft.headline && <p className="mt-2 text-sm font-medium">{draft.headline}</p>}{draft.clinicName && <p className="mt-1 text-xs text-muted-foreground">{draft.clinicName}</p>}</div></div>
          {status === 'verified' && (state.verification.verifiedQualification || state.verification.verifiedRegistrationNumber || state.verification.verifiedRegistrationAuthority) && <div className="mt-5 rounded-xl border border-success/10 bg-success/5 p-4 text-sm"><p className="font-semibold text-success">{msg(locale, 'verifiedCredentials')}</p>{state.verification.verifiedQualification && <p className="mt-1 text-muted-foreground">{state.verification.verifiedQualification}</p>}{state.verification.verifiedRegistrationAuthority && <p className="text-muted-foreground">{state.verification.verifiedRegistrationAuthority}</p>}{state.verification.verifiedRegistrationNumber && <p className="text-muted-foreground">{msg(locale, 'registration')} {state.verification.verifiedRegistrationNumber}</p>}</div>}
          {draft.bio && <p className="mt-5 text-sm leading-6 text-muted-foreground">{draft.bio}</p>}
          <div className="mt-5 flex flex-wrap gap-2">{draft.serviceModes.map((mode) => <span key={mode} className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-semibold">{therapistDiscoveryServiceModeLabel(locale, mode)}</span>)}</div>
          <div className="mt-5 space-y-2">{draft.serviceAreas.filter(areaComplete).map((area) => <div key={normalizeAreaKey(area)} className="flex items-center gap-2 text-sm"><MapPin size={14} className="text-primary" /><span>{area.locality.trim()}, {area.city.trim()}</span></div>)}</div>
          <div className={`mt-6 rounded-xl border p-4 text-sm leading-6 ${currentlyVisible ? 'border-success/10 bg-success/5 text-foreground' : 'border-border bg-secondary/45 text-muted-foreground'}`}>{currentlyVisible ? <span className="inline-flex items-start gap-2"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-success" />{msg(locale, 'eligible')}</span> : <span className="inline-flex items-start gap-2"><CircleAlert size={17} className="mt-0.5 shrink-0" />{msg(locale, 'notVisible')}</span>}</div>
        </div>
      </section></aside></div>
    </div>
  );
}
