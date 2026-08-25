import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  Eye,
  MapPin,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  THERAPIST_SERVICE_MODE_LABELS,
  THERAPIST_SERVICE_MODES,
  type TherapistDiscoveryServiceArea,
  type TherapistServiceMode,
} from '@/lib/therapist-discovery';
import {
  loadMyTherapistDiscoveryManagement,
  requestMyProfessionalVerification,
  saveMyTherapistDiscoveryProfile,
  type TherapistDiscoveryDraft,
  type TherapistDiscoveryManagementState,
  type TherapistVerificationStatus,
} from '@/lib/therapist-discovery-management';

const verificationLabels: Record<TherapistVerificationStatus, string> = {
  unverified: 'Unverified',
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Verification unsuccessful',
};

const emptyArea = (): TherapistDiscoveryServiceArea => ({
  locality: '',
  city: '',
  state: '',
  country_code: 'IN',
});

const normalizeAreaKey = (area: TherapistDiscoveryServiceArea) =>
  [area.locality, area.city, area.state, area.country_code]
    .map((value) => value.trim().toLowerCase())
    .join('|');

function credentialsComplete(state: TherapistDiscoveryManagementState) {
  return Boolean(
    state.credentials.qualification.trim() &&
      state.credentials.registrationNumber.trim() &&
      state.credentials.registrationAuthority.trim(),
  );
}

function areaComplete(area: TherapistDiscoveryServiceArea) {
  return Boolean(
    area.locality.trim() &&
      area.locality.trim().length <= 120 &&
      area.city.trim() &&
      area.city.trim().length <= 100 &&
      area.state.trim() &&
      area.state.trim().length <= 100,
  );
}

function requestedAtLabel(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function TherapistDiscoveryProfilePage() {
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
    loadMyTherapistDiscoveryManagement()
      .then((loaded) => {
        if (!active) return;
        setState(loaded);
        setDraft(loaded.draft);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load your discovery profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const duplicateAreas = useMemo(() => {
    if (!draft) return false;
    const keys = draft.serviceAreas.map(normalizeAreaKey).filter(Boolean);
    return new Set(keys).size !== keys.length;
  }, [draft]);

  const listingReady = useMemo(() => {
    if (!draft) return false;
    return Boolean(
      draft.displayName.trim() &&
        draft.displayName.trim().length <= 120 &&
        draft.serviceModes.length > 0 &&
        draft.serviceAreas.length > 0 &&
        draft.serviceAreas.every(areaComplete) &&
        !duplicateAreas,
    );
  }, [draft, duplicateAreas]);

  useEffect(() => {
    if (!listingReady) {
      setDraft((current) => (current?.isDiscoverable ? { ...current, isDiscoverable: false } : current));
    }
  }, [listingReady]);

  if (loading) {
    return <div className="space-y-4"><div className="h-32 rounded-[24px] skeleton" /><div className="grid gap-4 lg:grid-cols-2"><div className="h-72 rounded-2xl skeleton" /><div className="h-72 rounded-2xl skeleton" /></div></div>;
  }

  if (!state || !draft) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
        {error ?? 'Your discovery profile is unavailable right now.'}
      </div>
    );
  }

  const status = state.verification.status;
  const canRequest = (status === 'unverified' || status === 'rejected') && credentialsComplete(state);
  const requestedAt = requestedAtLabel(state.verification.requestedAt);
  const currentlyVisible = status === 'verified' && draft.isDiscoverable && listingReady;

  const setField = <K extends keyof TherapistDiscoveryDraft>(field: K, value: TherapistDiscoveryDraft[K]) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setNotice(null);
    setError(null);
  };

  const toggleMode = (mode: TherapistServiceMode) => {
    setDraft((current) => {
      if (!current) return current;
      const selected = current.serviceModes.includes(mode);
      return {
        ...current,
        serviceModes: selected
          ? current.serviceModes.filter((item) => item !== mode)
          : [...current.serviceModes, mode],
      };
    });
    setNotice(null);
    setError(null);
  };

  const updateArea = (index: number, field: 'locality' | 'city' | 'state', value: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        serviceAreas: current.serviceAreas.map((area, areaIndex) =>
          areaIndex === index ? { ...area, [field]: value, country_code: 'IN' } : area,
        ),
      };
    });
    setNotice(null);
    setError(null);
  };

  const save = async () => {
    setError(null);
    setNotice(null);

    if (draft.displayName.length > 120 || draft.headline.length > 200 || draft.bio.length > 2000 || draft.clinicName.length > 160) {
      setError('One or more public listing fields exceed the permitted length.');
      return;
    }
    if (draft.serviceAreas.some((area) => !areaComplete(area))) {
      setError('Complete locality, city and state for every service area.');
      return;
    }
    if (duplicateAreas) {
      setError('Remove duplicate service areas before saving.');
      return;
    }
    if (draft.isDiscoverable && !listingReady) {
      setError('Complete the listing before enabling publish-when-verified.');
      return;
    }

    setSaving(true);
    try {
      await saveMyTherapistDiscoveryProfile(draft);
      await reload();
      setNotice('Discovery profile saved.');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your discovery profile.');
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
      setNotice('Professional verification request submitted for review.');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to submit your verification request.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[26px] bg-primary px-5 py-7 text-primary-foreground sm:px-7">
        <div className="absolute -right-12 -top-16 size-48 rounded-full bg-white/10 blur-2xl" />
        <p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-primary-foreground/70">Public discovery</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">Prepare your verified public listing.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/75">Control only patient-safe discovery information. Professional verification remains system-managed.</p>
      </section>

      {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      {notice && <div role="status" className="rounded-xl border bg-secondary p-3 text-sm font-semibold">{notice}</div>}

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-primary">Professional verification</p>
            <div className="mt-2 flex items-center gap-2">
              {status === 'verified' ? <BadgeCheck size={20} className="text-primary" /> : status === 'pending' ? <CheckCircle2 size={20} className="text-primary" /> : <CircleAlert size={20} className="text-muted-foreground" />}
              <h2 className="text-xl font-extrabold">{verificationLabels[status]}</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Verification is controlled by PhysioBill review. This page cannot mark an account verified or edit verified credential snapshots.</p>
            {requestedAt && <p className="mt-2 text-xs font-semibold text-muted-foreground">Latest request: {requestedAt}</p>}
          </div>
          <a href="/app/profile" className="inline-flex h-10 items-center justify-center rounded-xl border bg-background px-3 text-sm font-bold">Professional profile</a>
        </div>

        <div className="mt-5 border-t pt-5">
          {(status === 'unverified' || status === 'rejected') && !credentialsComplete(state) && (
            <div className="rounded-xl bg-secondary/55 p-4 text-sm leading-6 text-muted-foreground">Complete your qualification, registration number and registration authority on the Professional Profile page before submitting for verification.</div>
          )}
          {status === 'pending' && <div className="rounded-xl bg-secondary/55 p-4 text-sm leading-6 text-muted-foreground">Your credentials are pending review. Repeated submissions are intentionally disabled while this request is pending.</div>}
          {status === 'verified' && <div className="rounded-xl bg-secondary/55 p-4 text-sm leading-6 text-muted-foreground">Your professional credentials are verified. Editing the protected credential fields on your Professional Profile will invalidate this verification automatically.</div>}
          {canRequest && (
            <button type="button" disabled={requesting} onClick={() => void requestVerification()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground disabled:opacity-60">
              <Send size={16} /> {requesting ? 'Submitting…' : status === 'rejected' ? 'Resubmit for verification' : 'Submit for verification'}
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 sm:p-6">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-primary">Patient-safe listing</p><h2 className="mt-1 text-xl font-extrabold">Public profile</h2></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 sm:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Display name</span><input maxLength={120} value={draft.displayName} onChange={(event) => setField('displayName', event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /><span className="text-[11px] text-muted-foreground">{draft.displayName.length}/120</span></label>
              <label className="block space-y-1.5 sm:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Headline</span><input maxLength={200} value={draft.headline} onChange={(event) => setField('headline', event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /><span className="text-[11px] text-muted-foreground">{draft.headline.length}/200</span></label>
              <label className="block space-y-1.5 sm:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Short bio</span><textarea maxLength={2000} value={draft.bio} onChange={(event) => setField('bio', event.target.value)} className="min-h-28 w-full rounded-xl border bg-background px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /><span className="text-[11px] text-muted-foreground">{draft.bio.length}/2000</span></label>
              <label className="block space-y-1.5 sm:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Clinic / practice name <span className="normal-case tracking-normal">(optional)</span></span><input maxLength={160} value={draft.clinicName} onChange={(event) => setField('clinicName', event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /><span className="text-[11px] text-muted-foreground">{draft.clinicName.length}/160</span></label>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 sm:p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-primary">Care format</p>
            <h2 className="mt-1 text-xl font-extrabold">Service modes</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {THERAPIST_SERVICE_MODES.map((mode) => {
                const selected = draft.serviceModes.includes(mode);
                return <button key={mode} type="button" onClick={() => toggleMode(mode)} aria-pressed={selected} className={`min-h-14 rounded-2xl border px-4 text-left text-sm font-bold transition ${selected ? 'border-primary bg-primary/8 text-primary' : 'bg-background hover:bg-secondary/40'}`}>{THERAPIST_SERVICE_MODE_LABELS[mode]}</button>;
              })}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-primary">Broad geography</p><h2 className="mt-1 text-xl font-extrabold">Service areas</h2><p className="mt-1 text-sm text-muted-foreground">Use locality, city and state only. Exact addresses and GPS are not part of discovery.</p></div><button type="button" onClick={() => setField('serviceAreas', [...draft.serviceAreas, emptyArea()])} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-secondary px-3 text-sm font-bold"><Plus size={15} /> Add area</button></div>
            <div className="mt-5 space-y-3">
              {draft.serviceAreas.map((area, index) => (
                <div key={`${index}-${area.country_code}`} className="grid gap-3 rounded-2xl border bg-background p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Locality</span><input maxLength={120} value={area.locality} onChange={(event) => updateArea(index, 'locality', event.target.value)} className="h-10 w-full rounded-xl border bg-card px-3 text-sm" /></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">City</span><input maxLength={100} value={area.city} onChange={(event) => updateArea(index, 'city', event.target.value)} className="h-10 w-full rounded-xl border bg-card px-3 text-sm" /></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">State</span><input maxLength={100} value={area.state} onChange={(event) => updateArea(index, 'state', event.target.value)} className="h-10 w-full rounded-xl border bg-card px-3 text-sm" /></label>
                  <button type="button" aria-label={`Remove service area ${index + 1}`} onClick={() => setField('serviceAreas', draft.serviceAreas.filter((_, areaIndex) => areaIndex !== index))} className="grid size-10 place-items-center rounded-xl text-destructive hover:bg-destructive/10"><Trash2 size={16} /></button>
                </div>
              ))}
              {!draft.serviceAreas.length && <div className="rounded-xl bg-secondary/45 p-4 text-sm text-muted-foreground">No service areas added yet.</div>}
              {duplicateAreas && <p className="text-xs font-semibold text-destructive">Duplicate locality / city / state combinations are not allowed.</p>}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 sm:p-6">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-primary" size={21} /><div><h2 className="font-extrabold">Public discovery opt-in</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">This preference means “publish this listing once I’m verified.” Public search still requires successful professional verification.</p></div></div>
            <label className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 ${listingReady ? 'bg-background' : 'bg-muted/35'}`}><input type="checkbox" className="mt-1 size-4" disabled={!listingReady} checked={draft.isDiscoverable} onChange={(event) => setField('isDiscoverable', event.target.checked)} /><span><span className="block text-sm font-extrabold">Publish this listing once I’m verified</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Requires a display name, at least one service mode and at least one complete service area.</span></span></label>
            <div className="mt-5 flex justify-end"><button type="button" disabled={saving} onClick={() => void save()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground disabled:opacity-60"><Save size={16} /> {saving ? 'Saving…' : 'Save discovery profile'}</button></div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <section className="overflow-hidden rounded-[26px] border bg-card shadow-sm">
            <div className="border-b bg-secondary/40 px-5 py-4"><div className="flex items-center gap-2"><Eye size={17} className="text-primary" /><p className="text-xs font-extrabold uppercase tracking-[.13em]">Patient preview</p></div><p className="mt-1 text-xs text-muted-foreground">Only discovery-safe fields are shown here.</p></div>
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4"><div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-lg font-extrabold text-primary">{draft.displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PT'}</div><div className="min-w-0"><h3 className="text-xl font-extrabold">{draft.displayName.trim() || 'Your display name'}</h3>{status === 'verified' && <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-primary"><BadgeCheck size={14} /> Verified professional</div>}{draft.headline && <p className="mt-2 text-sm font-semibold">{draft.headline}</p>}{draft.clinicName && <p className="mt-1 text-xs text-muted-foreground">{draft.clinicName}</p>}</div></div>
              {status === 'verified' && (state.verification.verifiedQualification || state.verification.verifiedRegistrationNumber || state.verification.verifiedRegistrationAuthority) && <div className="mt-5 rounded-xl bg-secondary/55 p-4 text-sm"><p className="font-bold">Verified credentials</p>{state.verification.verifiedQualification && <p className="mt-1 text-muted-foreground">{state.verification.verifiedQualification}</p>}{state.verification.verifiedRegistrationAuthority && <p className="text-muted-foreground">{state.verification.verifiedRegistrationAuthority}</p>}{state.verification.verifiedRegistrationNumber && <p className="text-muted-foreground">Registration {state.verification.verifiedRegistrationNumber}</p>}</div>}
              {draft.bio && <p className="mt-5 text-sm leading-6 text-muted-foreground">{draft.bio}</p>}
              <div className="mt-5 flex flex-wrap gap-2">{draft.serviceModes.map((mode) => <span key={mode} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold">{THERAPIST_SERVICE_MODE_LABELS[mode]}</span>)}</div>
              <div className="mt-5 space-y-2">{draft.serviceAreas.filter(areaComplete).map((area) => <div key={normalizeAreaKey(area)} className="flex items-center gap-2 text-sm"><MapPin size={14} className="text-primary" /><span>{area.locality.trim()}, {area.city.trim()}</span></div>)}</div>
              <div className={`mt-6 rounded-xl p-4 text-sm leading-6 ${currentlyVisible ? 'bg-primary/8 text-foreground' : 'bg-secondary/55 text-muted-foreground'}`}>{currentlyVisible ? <span className="inline-flex items-start gap-2"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-primary" />This saved opt-in is eligible for public discovery because your professional verification is verified.</span> : <span className="inline-flex items-start gap-2"><CircleAlert size={17} className="mt-0.5 shrink-0" />This listing is not currently visible to patients. Verification and a saved publish-when-verified preference are both required.</span>}</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
