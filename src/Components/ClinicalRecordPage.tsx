import { type ReactNode, useEffect, useMemo, useState } from 'react';
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

function Field({ label, value, onChange, type = 'text', min, max }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; max?: string }) {
  return <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span><input type={type} min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-24 w-full rounded-xl border bg-card px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>;
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="rounded-2xl border bg-card p-5 sm:p-6"><div className="mb-5"><h3 className="font-extrabold">{title}</h3>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{children}</section>;
}

export function ClinicalRecordPage({ patient, visit, patientVisits, onBack }: Props) {
  const [patientRecord, setPatientRecord] = useState(patient);
  const [patientDraft, setPatientDraft] = useState(patient);
  const [form, setForm] = useState<ClinicalRecordInput>(() => emptyRecord(visit.id));
  const [timelineRecords, setTimelineRecords] = useState<ClinicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [patientBusy, setPatientBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [patientMessage, setPatientMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPatientRecord(patient);
    setPatientDraft(patient);
  }, [patient]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      loadClinicalRecordForVisit(visit.id),
      loadClinicalRecordsForPatient(patient.id),
    ])
      .then(([record, timeline]) => {
        if (!active) return;
        setForm(record ? toInput(record) : emptyRecord(visit.id));
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
  const set = <K extends keyof ClinicalRecordInput>(field: K, value: ClinicalRecordInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const setPatient = <K extends keyof ProductionPatient>(field: K, value: ProductionPatient[K]) => {
    setPatientDraft((current) => ({ ...current, [field]: value }));
  };

  const savePatientDetails = async () => {
    setPatientBusy(true);
    setPatientMessage(null);
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
      setPatientMessage('Patient details saved to Supabase.');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to save patient details.');
    } finally {
      setPatientBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const saved = await saveClinicalRecord({ ...form, visitId: visit.id });
      setForm(toInput(saved));
      const timeline = await loadClinicalRecordsForPatient(patient.id);
      setTimelineRecords(timeline);
      setMessage('Clinical record saved to Supabase.');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Unable to save clinical record.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="rounded-2xl border bg-card p-6 text-sm font-semibold text-muted-foreground">Loading clinical record…</div>;

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
        <Field label="Patient name" value={patientDraft.name} onChange={(value) => setPatient('name', value)} />
        <Field label="Age" value={patientDraft.age} onChange={(value) => setPatient('age', value)} />
        <SelectField label="Sex" value={patientDraft.sex} onChange={(value) => setPatient('sex', value)} options={['', 'Female', 'Male', 'Other', 'Prefer not to say'].map((value) => ({ value, label: value || 'Select' }))} />
        <Field label="Phone number" value={patientDraft.phone} onChange={(value) => setPatient('phone', value)} />
        <Field label="Occupation" value={patientDraft.occupation} onChange={(value) => setPatient('occupation', value)} />
        <SelectField label="Condition / category" value={patientDraft.clinicalCategory} onChange={(value) => setPatient('clinicalCategory', value)} options={['', 'Ortho', 'Neuro', 'Pedia', 'Geriatrics'].map((value) => ({ value, label: value || 'Select' }))} />
        <Field label="Condition" value={patientDraft.condition} onChange={(value) => setPatient('condition', value)} />
        <SelectField label="Referred" value={patientDraft.referred ? 'Yes' : 'No'} onChange={(value) => setPatient('referred', value === 'Yes')} options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]} />
        <Field label="Referring doctor / consultant" value={patientDraft.referringDoctor} onChange={(value) => setPatient('referringDoctor', value)} />
        <div className="md:col-span-2 lg:col-span-3"><TextArea label="Address" value={patientDraft.address} onChange={(value) => setPatient('address', value)} /></div>
      </div>
      {patientMessage && <div className="mt-4 rounded-xl bg-secondary p-3 text-sm font-semibold">{patientMessage}</div>}
      <div className="mt-4 flex justify-end"><button type="button" disabled={patientBusy || !patientDraft.name.trim()} onClick={() => void savePatientDetails()} className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground disabled:opacity-50"><Check size={16} /> {patientBusy ? 'Saving…' : 'Save patient details'}</button></div>
    </Section>

    <Section title="Subjective / History" description="Structured from your assessment form, with room for additional subjective notes.">
      <div className="grid gap-4 md:grid-cols-2">
        <TextArea label="Chief complaint" value={form.chiefComplaint} onChange={(value) => set('chiefComplaint', value)} />
        <TextArea label="Previous treatment" value={form.previousTreatment} onChange={(value) => set('previousTreatment', value)} />
        <TextArea label="Past history" value={form.pastHistory} onChange={(value) => set('pastHistory', value)} />
        <TextArea label="Family history" value={form.familyHistory} onChange={(value) => set('familyHistory', value)} />
        <TextArea label="Other medical conditions" value={form.otherMedicalConditions} onChange={(value) => set('otherMedicalConditions', value)} />
        <TextArea label="Current medications" value={form.currentMedications} onChange={(value) => set('currentMedications', value)} />
        <Field label="BP" value={form.bp} onChange={(value) => set('bp', value)} />
        <Field label="Thyroid" value={form.thyroid} onChange={(value) => set('thyroid', value)} />
        <Field label="Diabetes" value={form.diabetes} onChange={(value) => set('diabetes', value)} />
        <Field label="Allergies" value={form.allergies} onChange={(value) => set('allergies', value)} />
        <Field label="Other illness" value={form.otherIllness} onChange={(value) => set('otherIllness', value)} />
        <Field label="Pain scale (0–10)" type="number" min="0" max="10" value={form.painScale} onChange={(value) => set('painScale', value)} />
        <Field label="Type of pain" value={form.painType} onChange={(value) => set('painType', value)} />
        <div className="md:col-span-2"><TextArea label="Additional subjective notes" value={form.subjective} onChange={(value) => set('subjective', value)} /></div>
      </div>
    </Section>

    <Section title="Objective / Clinical">
      <div className="grid gap-4 md:grid-cols-2">
        <TextArea label="Posture" value={form.posture} onChange={(value) => set('posture', value)} />
        <TextArea label="Additional objective findings" value={form.objective} onChange={(value) => set('objective', value)} placeholder="Add measurable findings as clinically relevant." />
      </div>
    </Section>

    <Section title="Assessment / Diagnosis">
      <div className="grid gap-4 md:grid-cols-2">
        <TextArea label="Diagnosis" value={form.diagnosis} onChange={(value) => set('diagnosis', value)} />
        <TextArea label="Assessment / clinical reasoning" value={form.assessment} onChange={(value) => set('assessment', value)} />
      </div>
    </Section>

    <Section title="Goals">
      <TextArea label="Goals" value={form.goals} onChange={(value) => set('goals', value)} placeholder="Short- and long-term functional goals." />
    </Section>

    <Section title="Plan / Treatment">
      <div className="grid gap-4 md:grid-cols-2">
        <TextArea label="Treatment plan" value={form.treatmentPlan} onChange={(value) => set('treatmentPlan', value)} />
        <TextArea label="Plan notes" value={form.plan} onChange={(value) => set('plan', value)} />
        <TextArea label="Treatment delivered / progression" value={form.treatment} onChange={(value) => set('treatment', value)} />
        <TextArea label="HEP" value={form.hep} onChange={(value) => set('hep', value)} placeholder="Home exercise programme and instructions." />
      </div>
    </Section>

    {error && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
    {message && <div className="rounded-xl bg-secondary p-3 text-sm font-semibold">{message}</div>}
    <div className="flex justify-end"><button type="button" disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Check size={16} /> {busy ? 'Saving…' : 'Save clinical record'}</button></div>

    <Section title="Longitudinal clinical timeline" description="Each assessment remains attached to its actual Visit so change can be reviewed across time.">
      <div className="space-y-3">
        {patientVisits.slice().sort((a, b) => b.date.localeCompare(a.date)).map((item) => <div key={item.id} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{item.visitNumber} · {dateLabel(item.date)}</p><p className="mt-1 text-sm text-muted-foreground">{item.treatment}</p></div><span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${recordedVisitIds.has(item.id) ? 'bg-secondary text-foreground' : 'bg-muted text-muted-foreground'}`}><ClipboardList size={14} /> {recordedVisitIds.has(item.id) ? 'Clinical record saved' : 'No clinical record yet'}</span></div>)}
      </div>
    </Section>
  </div>;
}
