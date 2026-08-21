from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one match, found {count}: {old[:120]!r}')
    text = text.replace(old, new, 1)

replace_once(
"""import {
  createVisit as createProductionVisit,
  deleteVisit as deleteProductionVisit,
  loadVisits as loadProductionVisits,
  updateVisit as updateProductionVisit,
} from '@/lib/visits';
""",
"""import {
  createVisit as createProductionVisit,
  deleteVisit as deleteProductionVisit,
  loadVisits as loadProductionVisits,
  updateVisit as updateProductionVisit,
} from '@/lib/visits';
import { ClinicalRecordPage } from '@/Components/ClinicalRecordPage';
""",
)

replace_once(
"""  address: string;
  age: string;
  condition: string;
""",
"""  address: string;
  age: string;
  sex: string;
  occupation: string;
  referred: boolean;
  clinicalCategory: string;
  condition: string;
""",
)

text = text.replace(
"""    age: '32',
    condition: 'Knee rehabilitation',
""",
"""    age: '32',
    sex: '',
    occupation: '',
    referred: false,
    clinicalCategory: 'Ortho',
    condition: 'Knee rehabilitation',
""",
1,
)
text = text.replace(
"""    age: '45',
    condition: 'Low back pain',
""",
"""    age: '45',
    sex: '',
    occupation: '',
    referred: false,
    clinicalCategory: 'Ortho',
    condition: 'Low back pain',
""",
1,
)

replace_once(
"""    address: patient.address,
    age: patient.age,
    condition: patient.condition,
""",
"""    address: patient.address,
    age: patient.age,
    sex: patient.sex,
    occupation: patient.occupation,
    referred: patient.referred,
    clinicalCategory: patient.clinicalCategory,
    condition: patient.condition,
""",
)

start = text.index('function PatientForm(')
end = text.index('\nfunction VisitsPage(', start)
new_patient_form = r'''function PatientForm({ initialPatient, onSave, onCancel }: { initialPatient?: Patient | null; onSave: (patient: Patient) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState<Patient>(initialPatient ?? { id: '', physioId: undefined, userId: undefined, patientNumber: '', name: '', phone: '', email: '', address: '', age: '', sex: '', occupation: '', referred: false, clinicalCategory: '', condition: '', referringDoctor: '', referralDate: '', insuranceTpa: '', policyMemberId: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Patient>(field: K, value: Patient[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave({ ...draft, name: draft.name.trim(), phone: draft.phone.trim(), email: draft.email.trim(), address: draft.address.trim(), age: draft.age.trim(), sex: draft.sex.trim(), occupation: draft.occupation.trim(), condition: draft.condition.trim(), referringDoctor: draft.referringDoctor.trim() });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save patient.');
    } finally {
      setBusy(false);
    }
  };
  return <div className="rounded-2xl border bg-card p-6"><PageHeader eyebrow={initialPatient ? 'Patient record' : 'New record'} title={initialPatient ? 'Edit patient' : 'Add patient'} description="Stable demographics from the clinical assessment stay on the Patient record and are reused across visits." /><div className="grid gap-4 md:grid-cols-2"><Field label="Full name" value={draft.name} onChange={(e) => set('name', e.target.value)} /><Field label="Age" value={draft.age} onChange={(e) => set('age', e.target.value)} /><SelectField label="Sex" value={draft.sex} onChange={(value) => set('sex', value)} options={['', 'Female', 'Male', 'Other', 'Prefer not to say'].map((value) => ({ value, label: value || 'Select' }))} /><Field label="Phone" value={draft.phone} onChange={(e) => set('phone', e.target.value)} /><Field label="Email" value={draft.email} onChange={(e) => set('email', e.target.value)} /><Field label="Occupation" value={draft.occupation} onChange={(e) => set('occupation', e.target.value)} /><Field label="Address" value={draft.address} onChange={(e) => set('address', e.target.value)} /><SelectField label="Clinical category" value={draft.clinicalCategory} onChange={(value) => set('clinicalCategory', value)} options={['', 'Ortho', 'Neuro', 'Pedia', 'Geriatrics'].map((value) => ({ value, label: value || 'Select' }))} /><Field label="Condition" value={draft.condition} onChange={(e) => set('condition', e.target.value)} /><SelectField label="Referred" value={draft.referred ? 'Yes' : 'No'} onChange={(value) => set('referred', value === 'Yes')} options={['No', 'Yes'].map((value) => ({ value, label: value }))} /><Field label="Referring doctor / consultant" value={draft.referringDoctor} onChange={(e) => set('referringDoctor', e.target.value)} /><Field label="Referral date" type="date" value={draft.referralDate} onChange={(e) => set('referralDate', e.target.value)} /></div>{error && <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}<div className="mt-6 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button><Button disabled={busy || !draft.name.trim()} onClick={() => void save()}><Check size={16} /> {busy ? 'Saving…' : 'Save'}</Button></div></div>;
}'''
text = text[:start] + new_patient_form + text[end:]

replace_once(
"""  const editingVisit = workspace.workspaceVisits.find((visit) => visit.id === editingVisitId) ?? null;

  const content = (() => {
""",
"""  const editingVisit = workspace.workspaceVisits.find((visit) => visit.id === editingVisitId) ?? null;
  const clinicalVisitMatch = normalized.match(/^\\/visits\\/([^/]+)\\/clinical$/);
  const clinicalVisit = clinicalVisitMatch ? workspace.workspaceVisits.find((visit) => visit.id === clinicalVisitMatch[1]) ?? null : null;
  const clinicalPatient = clinicalVisit ? workspace.workspacePatients.find((patient) => patient.id === clinicalVisit.patientId) ?? null : null;

  const content = (() => {
""",
)

replace_once(
"""    if (normalized.startsWith('/visits')) {
      if (showVisitForm || editingVisit) {
""",
"""    if (normalized.startsWith('/visits')) {
      if (clinicalVisit && clinicalPatient) {
        return <ClinicalRecordPage patient={clinicalPatient} visit={clinicalVisit} patientVisits={workspace.workspaceVisits.filter((item) => item.patientId === clinicalPatient.id)} onBack={() => setLocation('/app/visits')} />;
      }
      if (showVisitForm || editingVisit) {
""",
)

replace_once(
"""<div className=\"flex gap-1 md:justify-end\"><Button variant=\"ghost\" onClick={() => onEdit(visit)}><Pencil size={15} /> Edit</Button><Button variant=\"danger\" onClick={() => void onDelete(visit)}><X size={15} /> Delete</Button></div>""",
"""<div className=\"flex flex-wrap gap-1 md:justify-end\"><Link href={`/app/visits/${visit.id}/clinical`} className=\"inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-3.5 py-2.5 text-sm font-semibold text-secondary-foreground\"><FileText size={15} /> Clinical record</Link><Button variant=\"ghost\" onClick={() => onEdit(visit)}><Pencil size={15} /> Edit</Button><Button variant=\"danger\" onClick={() => void onDelete(visit)}><X size={15} /> Delete</Button></div>""",
)

path.write_text(text)
