import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ClipboardList } from 'lucide-react';
import {
  loadClinicalRecordForVisit,
  loadClinicalRecordsForPatient,
  saveClinicalRecord,
  type ClinicalRecord,
  type ClinicalRecordInput,
} from '@/lib/clinical-records';
import { updatePatient, type ProductionPatient } from '@/lib/patients';

type VisitSummary = {
  id: string;
  visitNumber: string;
  patientId: string;
  date: string;
  treatment: string;
};

type Props = {
  patient: ProductionPatient;
  visit: VisitSummary;
  patientVisits: VisitSummary[];
  onBack: () => void;
};

const emptyRecord = (visitId: string): ClinicalRecordInput => ({
  visitId,
  chiefComplaint: '',
  previousTreatment: '',
  pastHistory: '',
  familyHistory: '',
  otherMedicalConditions: '',
  bp: '',
  thyroid: '',
  diabetes: '',
  allergies: '',
  otherIllness: '',
  currentMedications: '',
  painScale: '',
  painType: '',
  subjective: '',
  posture: '',
  objective: '',
  diagnosis: '',
  assessment: '',
  goals: '',
  treatmentPlan: '',
  plan: '',
  treatment: '',
  hep: '',
});

function toInput(record: ClinicalRecord): ClinicalRecordInput {
  const { id: _id, physioId: _physioId, patientId: _patientId, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = record;
  return input;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function Field({ label, value, onChange, disabled, type = 'text', min, max }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; type?: string; min?: string; max?: string }) {
  return <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span><input type={type} min={min} max={max} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-muted/40 disabled:text-foreground disabled:opacity-100" /></label>;
}

function SelectField({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span><select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-muted/40 disabled:text-foreground disabled:opacity-100">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function TextArea({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean }) {
  return <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span><textarea disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-24 w-full rounded-xl border bg-card px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-muted/40 disabled:text-foreground disabled:opacity-100" /></label>;
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="rounded-2xl border bg-card p-5 sm:p-6"><div className="mb-5"><h3 className="font-extrabold">{title}</h3>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{children}</section>;
}

function ActionButton({ children, onClick, disabled, primary = false }: { children: ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${primary ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{children}</button>;
}

export function ClinicalRecordPage({ patient, visit, patientVisits, onBack }: Props) {
  const [patientRecord, setPatientRecord] = useState(patient);
  const [patientDraft, setPatientDraft] = useState(patient);
  const [form, setForm] = useState<ClinicalRecordInput>(() => emptyRecord(visit.id));
  const [persistedForm, setPersistedForm] = useState<ClinicalRecordInput | null>(null);
  const [timelineRecords, setTimelineRecords] = useState<ClinicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [patientBusy, setPatientBusy] = useState(false);
  const [clinicalEditing, setClinicalEditing] = useState(true);
  const [patientEditing, setPatientEditing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const successTimer = useRef<number | null>(null);

  const showSuccess = (text: string) => {
    setSuccess(text);
    if (successTimer.current !== null) window.clearTimeout(successTimer.current);
    successTimer.current = window.setTimeout(() => setSuccess(null), 1800);
  };

  useEffect(() => () => {
    if (successTimer.current !== null) window.clearTimeout(successTimer.current);
  }, []);

  useEffect(() => {
    setPatientRecord(patient);
    setPatientDraft(patient);
    setPatientEditing(false);
  }, [patient]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSuccess(null);
    Promise.all([
      loadClinicalRecordForVisit(visit.id),
      loadClinicalRecordsForPatient(patient.id),
    ])
      .then(([record, timeline]) => {
        if (!active) return;
        const loaded = record ? toInput(record) : emptyRecord(visit.id);
        setForm(loaded);
        setPersistedForm(record ? loaded : null);
        setClinicalEditing(!record);
        setTimelineRecords(timeline);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load clinical record.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patient.id, visit.id]);

  const recordedVisitIds = useMemo(() => new Set(timelineRecords.map((record) => record.visitId)), [timelineRecords]);
  const set = <K extends keyof ClinicalRecordInput>(field: K, value: ClinicalRecordInput[K]) => setForm((current) => ({ ...current, [field]: value }));
  const setPatient = <K extends keyof ProductionPatient>(field: K, value: ProductionPatient[K]) => setPatientDraft((current) => ({ ...current, [field]: value }));

  const cancelPatientEdit = () => {
    setPatientDraft(patientRecord);
    setPatientEditing(false);
    setError(null);
  };

  const cancelClinicalEdit = () => {
    if (persistedForm) setForm(persistedForm);
    setClinicalEditing(false);
    setError(null);
  };

  const savePatientDetails = async () => {
    setPatientBusy(true);
    setError(null);
    try {
      const saved = await updatePatient(patientDraft.id, {
        name: patientDraft.name,
        phone: patientDraft.phone,
        email: patientDraft.email,
        address: patientDraft.address,
        age: patientDraft.age,
        sex: patientDraft.sex,
        occupation: patientDraft.occupation,
        referred: patientDraft.referred,
        clinicalCategory: patientDraft.clinicalCategory,
        condition: patientDraft.condition,
        referringDoctor: patientDraft.referringDoctor,
        referralDate: patientDraft.referralDate,
        insuranceTpa: patientDraft.insuranceTpa,
        policyMemberId: patientDraft.policyMemberId,
        notes: patientDraft.notes,
      });
      setPatientRecord(saved);
      setPatientDraft(saved);
      setPatientEditing(false);
      showSuccess('✓ Patient details saved');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to save patient details.');
    } finally {
      setPatientBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await saveClinicalRecord({ ...form, visitId: visit.id });
      const savedInput = toInput(saved);
      setForm(savedInput);
      setPersistedForm(savedInput);
      setClinicalEditing(false);
      const timeline = await loadClinicalRecordsForPatient(patient.id);
      setTimelineRecords(timeline);
      showSuccess('✓ Saved');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to save clinical record.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="rounded-2xl border bg-card p-6 text-sm font-semibold text-muted-foreground">Loading clinical record…</div>;

  const clinicalReadOnly = Boolean(persistedForm) && !clinicalEditing;
  const patientReadOnly = !patientEditing;

  return <div className="space-y-5">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"><ArrowLeft size={16} /> Back to clinical records</button>

    <div className="rounded-[24px] bg-primary px-6 py-7 text-primary-foreground">
      <p className="text-[10px] font-extrabold uppercase tracking-[.16em]">Clinical Record</p>
      <h2 className="mt-2 text-2xl font-extrabold">{patientRecord.name} · {visit.visitNumber}</h2>
      <p className="mt-2 text-sm text-primary-foreground/75">{dateLabel(visit.date)} · {visit.treatment}</p>
    </div>

    <Section title="Patient details" description="Stable demographics are saved on the Patient record and reused across visits; they are not copied into each clinical assessment.">
      <div className="mb-4 rounded-xl bg-secondary/50 p-3 text-sm"><strong>Record number:</strong> {patientRecord.patientNumber}</div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field disabled={patientReadOnly} label="Patient name" value={patientDraft.name} onChange={(value) => setPatient('name', value)} />
        <Field disabled={patientReadOnly} label="Age" value={patientDraft.age} onChange={(value) => setPatient('age', value)} />
        <SelectField disabled={patientReadOnly} label="Sex" value={patientDraft.sex} onChange={(value) => setPatient('sex', value)} options={['', 'Female', 'Male', 'Other', 'Prefer not to say'].map((value) => ({ value, label: value || 'Select' }))} />
        <Field disabled={patientReadOnly} label="Phone number" value={patientDraft.phone} onChange={(value) => setPatient('phone', value)} />
        <Field disabled={patientReadOnly} label="Occupation" value={patientDraft.occupation} onChange={(value) => setPatient('occupation', value)} />
        <SelectField disabled={patientReadOnly} label="Condition / category" value={patientDraft.clinicalCategory} onChange={(value) => setPatient('clinicalCategory', value)} options={['', 'Ortho', 'Neuro', 'Pedia', 'Geriatrics'].map((value) => ({ value, label: value || 'Select' }))} />
        <Field disabled={patientReadOnly} label="Condition" value={patientDraft.condition} onChange={(value) => setPatient('condition', value)} />
        <SelectField disabled={patientReadOnly} label="Referred" value={patientDraft.referred ? 'Yes' : 'No'} onChange={(value) => setPatient('referred', value === 'Yes')} options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]} />
        <Field disabled={patientReadOnly} label="Referring doctor / consultant" value={patientDraft.referringDoctor} onChange={(value) => setPatient('referringDoctor', value)} />
        <div className="md:col-span-2 lg:col-span-3"><TextArea disabled={patientReadOnly} label="Address" value={patientDraft.address} onChange={(value) => setPatient('address', value)} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {patientEditing ? <>
          <ActionButton disabled={patientBusy} onClick={cancelPatientEdit}>Cancel</ActionButton>
          <ActionButton primary disabled={patientBusy || !patientDraft.name.trim()} onClick={() => void savePatientDetails()}><Check size={16} /> {patientBusy ? 'Saving…' : 'Save changes'}</ActionButton>
        </> : <ActionButton onClick={() => { setPatientDraft(patientRecord); setPatientEditing(true); }}>Update patient details</ActionButton>}
      </div>
    </Section>

    <Section title="Subjective / History" description="Structured from your assessment form, with room for additional subjective notes.">
      <div className="grid gap-4 md:grid-cols-2">
        <TextArea disabled={clinicalReadOnly} label="Chief complaint" value={form.chiefComplaint} onChange={(value) => set('chiefComplaint', value)} />
        <TextArea disabled={clinicalReadOnly} label="Previous treatment" value={form.previousTreatment} onChange={(value) => set('previousTreatment', value)} />
        <TextArea disabled={clinicalReadOnly} label="Past history" value={form.pastHistory} onChange={(value) => set('pastHistory', value)} />
        <TextArea disabled={clinicalReadOnly} label="Family history" value={form.familyHistory} onChange={(value) => set('familyHistory', value)} />
        <TextArea disabled={clinicalReadOnly} label="Other medical conditions" value={form.otherMedicalConditions} onChange={(value) => set('otherMedicalConditions', value)} />
        <TextArea disabled={clinicalReadOnly} label="Current medications" value={form.currentMedications} onChange={(value) => set('currentMedications', value)} />
        <Field disabled={clinicalReadOnly} label="BP" value={form.bp} onChange={(value) => set('bp', value)} />
        <Field disabled={clinicalReadOnly} label="Thyroid" value={form.thyroid} onChange={(value) => set('thyroid', value)} />
        <Field disabled={clinicalReadOnly} label="Diabetes" value={form.diabetes} onChange={(value) => set('diabetes', value)} />
        <Field disabled={clinicalReadOnly} label="Allergies" value={form.allergies} onChange={(value) => set('allergies', value)} />
        <Field disabled={clinicalReadOnly} label="Other illness" value={form.otherIllness} onChange={(value) => set('otherIllness', value)} />
        <Field disabled={clinicalReadOnly} label="Pain scale (0–10)" type="number" min="0" max="10" value={form.painScale} onChange={(value) => set('painScale', value)} />
        <Field disabled={clinicalReadOnly} label="Type of pain" value={form.painType} onChange={(value) => set('painType', value)} />
        <div className="md:col-span-2"><TextArea disabled={clinicalReadOnly} label="Additional subjective notes" value={form.subjective} onChange={(value) => set('subjective', value)} /></div>
      </div>
    </Section>

    <Section title="Objective / Clinical"><div className="grid gap-4 md:grid-cols-2"><TextArea disabled={clinicalReadOnly} label="Posture" value={form.posture} onChange={(value) => set('posture', value)} /><TextArea disabled={clinicalReadOnly} label="Additional objective findings" value={form.objective} onChange={(value) => set('objective', value)} placeholder="Add measurable findings as clinically relevant." /></div></Section>
    <Section title="Assessment / Diagnosis"><div className="grid gap-4 md:grid-cols-2"><TextArea disabled={clinicalReadOnly} label="Diagnosis" value={form.diagnosis} onChange={(value) => set('diagnosis', value)} /><TextArea disabled={clinicalReadOnly} label="Assessment / clinical reasoning" value={form.assessment} onChange={(value) => set('assessment', value)} /></div></Section>
    <Section title="Goals"><TextArea disabled={clinicalReadOnly} label="Goals" value={form.goals} onChange={(value) => set('goals', value)} placeholder="Short- and long-term functional goals." /></Section>
    <Section title="Plan / Treatment"><div className="grid gap-4 md:grid-cols-2"><TextArea disabled={clinicalReadOnly} label="Treatment plan" value={form.treatmentPlan} onChange={(value) => set('treatmentPlan', value)} /><TextArea disabled={clinicalReadOnly} label="Plan notes" value={form.plan} onChange={(value) => set('plan', value)} /><TextArea disabled={clinicalReadOnly} label="Treatment delivered / progression" value={form.treatment} onChange={(value) => set('treatment', value)} /><TextArea disabled={clinicalReadOnly} label="HEP" value={form.hep} onChange={(value) => set('hep', value)} placeholder="Home exercise programme and instructions." /></div></Section>

    {error && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
    {success && <div className="rounded-xl bg-secondary p-3 text-sm font-semibold">{success}</div>}
    <div className="flex justify-end gap-2">
      {!persistedForm ? <ActionButton primary disabled={busy} onClick={() => void save()}><Check size={16} /> {busy ? 'Saving…' : 'Save clinical record'}</ActionButton> : clinicalEditing ? <>
        <ActionButton disabled={busy} onClick={cancelClinicalEdit}>Cancel</ActionButton>
        <ActionButton primary disabled={busy} onClick={() => void save()}><Check size={16} /> {busy ? 'Saving…' : 'Save changes'}</ActionButton>
      </> : <ActionButton primary onClick={() => setClinicalEditing(true)}>Update clinical record</ActionButton>}
    </div>

    <Section title="Longitudinal clinical timeline" description="Each assessment remains attached to its actual Visit so change can be reviewed across time.">
      <div className="space-y-3">{patientVisits.slice().sort((a, b) => b.date.localeCompare(a.date)).map((item) => <div key={item.id} className="flex flex-col gap-2 rounded-xl bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{item.visitNumber} · {dateLabel(item.date)}</p><p className="text-sm text-muted-foreground">{item.treatment}</p></div><span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground"><ClipboardList size={14} /> {recordedVisitIds.has(item.id) ? 'Clinical record saved' : 'No clinical record yet'}</span></div>)}</div>
    </Section>
  </div>;
}
