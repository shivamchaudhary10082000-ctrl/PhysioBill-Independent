from pathlib import Path
import re

path = Path('src/App.tsx')
text = path.read_text()
original = text

import_anchor = "} from '@/lib/production-workspace';\n"
patient_imports = """} from '@/lib/production-workspace';
import {
  createPatient as createProductionPatient,
  deletePatient as deleteProductionPatient,
  loadPatients as loadProductionPatients,
  updatePatient as updateProductionPatient,
} from '@/lib/patients';
"""
if import_anchor not in text:
    raise SystemExit('patient import anchor not found')
text = text.replace(import_anchor, patient_imports, 1)

state_anchor = """  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  visits: Visit[];"""
state_replacement = """  patients: Patient[];
  patientsLoading: boolean;
  createPatientRecord: (patient: Patient) => Promise<Patient>;
  updatePatientRecord: (patient: Patient) => Promise<Patient>;
  deletePatientRecord: (patientId: string) => Promise<void>;
  visits: Visit[];"""
if state_anchor not in text:
    raise SystemExit('WorkspaceState patient anchor not found')
text = text.replace(state_anchor, state_replacement, 1)

persistent_patients = re.compile(
    r"  const \[patients, setPatients\] = usePersistentState<Patient\[]>\(\n"
    r"    `physiobill-patients-\$\{currentPhysioId\}`,\n"
    r"    \[],\n"
    r"    \(value\) => normalizePatientsForWorkspace\(value, currentPhysioId\),\n"
    r"  \);\n"
)
patient_state = """  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setPatientsLoading(true);
    setPersistenceError(null);
    loadProductionPatients()
      .then((loaded) => {
        if (active) setPatients(loaded);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setPersistenceError(error instanceof Error ? error.message : 'Unable to load patients.');
      })
      .finally(() => {
        if (active) setPatientsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentPhysioId]);

  const patientInput = (patient: Patient) => ({
    name: patient.name,
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
    age: patient.age,
    condition: patient.condition,
    referringDoctor: patient.referringDoctor,
    referralDate: patient.referralDate,
    insuranceTpa: patient.insuranceTpa,
    policyMemberId: patient.policyMemberId,
    notes: patient.notes,
  });

  const createPatientRecord = async (patient: Patient): Promise<Patient> => {
    setPersistenceError(null);
    try {
      const saved = await createProductionPatient(patientInput(patient));
      setPatients((current) => [...current, saved]);
      return saved;
    } catch (error: unknown) {
      setPersistenceError(error instanceof Error ? error.message : 'Unable to create patient.');
      throw error;
    }
  };

  const updatePatientRecord = async (patient: Patient): Promise<Patient> => {
    setPersistenceError(null);
    try {
      const saved = await updateProductionPatient(patient.id, patientInput(patient));
      setPatients((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      return saved;
    } catch (error: unknown) {
      setPersistenceError(error instanceof Error ? error.message : 'Unable to update patient.');
      throw error;
    }
  };

  const deletePatientRecord = async (patientId: string): Promise<void> => {
    setPersistenceError(null);
    try {
      await deleteProductionPatient(patientId);
      setPatients((current) => current.filter((item) => item.id !== patientId));
    } catch (error: unknown) {
      setPersistenceError(error instanceof Error ? error.message : 'Unable to delete patient.');
      throw error;
    }
  };
"""
text, count = persistent_patients.subn(patient_state, text, count=1)
if count != 1:
    raise SystemExit(f'patient localStorage replacement count={count}')

workspace_anchor = """    patients,
    setPatients,
    visits,"""
workspace_replacement = """    patients,
    patientsLoading,
    createPatientRecord,
    updatePatientRecord,
    deletePatientRecord,
    visits,"""
if workspace_anchor not in text:
    raise SystemExit('workspace patient object anchor not found')
text = text.replace(workspace_anchor, workspace_replacement, 1)

physio_header = """  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const normalized = location.startsWith('/app/') ? location.slice(4) : location;
  const editingInvoice = workspace.workspaceInvoices.find((invoice) => invoice.id === editingInvoiceId) ?? null;
"""
physio_replacement = """  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const normalized = location.startsWith('/app/') ? location.slice(4) : location;
  const editingInvoice = workspace.workspaceInvoices.find((invoice) => invoice.id === editingInvoiceId) ?? null;
  const editingPatient = workspace.workspacePatients.find((patient) => patient.id === editingPatientId) ?? null;
"""
if physio_header not in text:
    raise SystemExit('PhysioWorkspace state anchor not found')
text = text.replace(physio_header, physio_replacement, 1)

old_patient_route = """    if (normalized.startsWith('/patients')) {
      return showPatientForm ? <PatientForm onCancel={() => setShowPatientForm(false)} onSave={(patient) => { const saved: Patient = { ...patient, id: `patient-${Date.now()}`, physioId: workspace.currentPhysioId, patientNumber: formatSequentialId('PT', workspace.workspacePatients.length + 1) }; workspace.setPatients((current) => [...current, saved]); setShowPatientForm(false); }} /> : <PatientsPage patients={workspace.workspacePatients} visits={workspace.workspaceVisits} invoices={workspace.workspaceInvoices} onAdd={() => setShowPatientForm(true)} />;
    }
"""
new_patient_route = """    if (normalized.startsWith('/patients')) {
      if (showPatientForm || editingPatient) {
        return (
          <PatientForm
            initialPatient={editingPatient}
            onCancel={() => {
              setShowPatientForm(false);
              setEditingPatientId(null);
            }}
            onSave={async (patient) => {
              if (editingPatient) await workspace.updatePatientRecord({ ...editingPatient, ...patient });
              else await workspace.createPatientRecord(patient);
              setShowPatientForm(false);
              setEditingPatientId(null);
            }}
          />
        );
      }
      return (
        <PatientsPage
          patients={workspace.workspacePatients}
          visits={workspace.workspaceVisits}
          invoices={workspace.workspaceInvoices}
          loading={workspace.patientsLoading}
          onAdd={() => setShowPatientForm(true)}
          onEdit={(patient) => setEditingPatientId(patient.id)}
          onDelete={async (patient) => {
            if (!window.confirm(`Delete ${patient.name}? This cannot be undone.`)) return;
            await workspace.deletePatientRecord(patient.id);
          }}
        />
      );
    }
"""
if old_patient_route not in text:
    raise SystemExit('patient route anchor not found')
text = text.replace(old_patient_route, new_patient_route, 1)

patients_page_pattern = re.compile(r"function PatientsPage\(.*?\n\}\n\nfunction PatientForm\(.*?\n\}\n", re.S)
patients_ui = r'''function PatientsPage({ patients, visits, invoices, loading, onAdd, onEdit, onDelete }: { patients: Patient[]; visits: Visit[]; invoices: Invoice[]; loading: boolean; onAdd: () => void; onEdit: (patient: Patient) => void; onDelete: (patient: Patient) => Promise<void> }) {
  const [search, setSearch] = useState('');
  const filtered = patients.filter((patient) => [patient.name, patient.phone, patient.patientNumber, patient.condition].join(' ').toLowerCase().includes(search.toLowerCase()));
  return <div><PageHeader eyebrow="Patient directory" title="Patients" description="Patient records are stored in the authenticated physiotherapist workspace and protected by database RLS." action={<Button onClick={onAdd}><Plus size={16} /> Add patient</Button>} /><div className="mb-4 relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border bg-card pl-10 pr-4 text-sm" placeholder="Search patients..." /></div>{loading ? <div className="rounded-2xl border bg-card p-6 text-sm font-semibold text-muted-foreground">Loading patients…</div> : <div className="overflow-hidden rounded-2xl border bg-card divide-y">{filtered.map((patient) => { const visitCount = visits.filter((visit) => visit.patientId === patient.id).length; const outstanding = invoices.filter((invoice) => invoice.patientId === patient.id).reduce((sum, invoice) => sum + Math.max(invoice.total - invoice.paid, 0), 0); return <div key={patient.id} className="grid gap-3 p-5 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center"><div><p className="font-extrabold">{patient.name}</p><p className="text-xs text-muted-foreground">{patient.patientNumber}</p></div><div><p className="text-sm">{patient.condition || '—'}</p><p className="text-xs text-muted-foreground">{visitCount} visits</p></div><div className="md:text-right"><p className="font-bold">{money(outstanding)}</p><p className="text-xs text-muted-foreground">outstanding</p></div><div className="flex gap-1 md:justify-end"><Button variant="ghost" onClick={() => onEdit(patient)}><Pencil size={15} /> Edit</Button><Button variant="danger" onClick={() => void onDelete(patient)}><X size={15} /> Delete</Button></div></div>; })}{filtered.length === 0 && <div className="p-6 text-sm text-muted-foreground">No patients found.</div>}</div>}</div>;
}

function PatientForm({ initialPatient, onSave, onCancel }: { initialPatient?: Patient | null; onSave: (patient: Patient) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(initialPatient?.name ?? '');
  const [phone, setPhone] = useState(initialPatient?.phone ?? '');
  const [email, setEmail] = useState(initialPatient?.email ?? '');
  const [condition, setCondition] = useState(initialPatient?.condition ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base: Patient = initialPatient ?? { id: '', physioId: undefined, userId: undefined, patientNumber: '', name: '', phone: '', email: '', address: '', age: '', condition: '', referringDoctor: '', referralDate: '', insuranceTpa: '', policyMemberId: '', notes: '' };
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave({ ...base, name: name.trim(), phone: phone.trim(), email: email.trim(), condition: condition.trim() });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save patient.');
    } finally {
      setBusy(false);
    }
  };
  return <div className="rounded-2xl border bg-card p-6"><PageHeader eyebrow={initialPatient ? 'Patient record' : 'New record'} title={initialPatient ? 'Edit patient' : 'Add patient'} /><div className="grid gap-4 md:grid-cols-2"><Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} /><Field label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} /><Field label="Email" value={email} onChange={(e) => setEmail(e.target.value)} /><Field label="Condition" value={condition} onChange={(e) => setCondition(e.target.value)} /></div>{error && <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}<div className="mt-6 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button><Button disabled={busy || !name.trim()} onClick={() => void save()}><Check size={16} /> {busy ? 'Saving…' : 'Save'}</Button></div></div>;
}
'''
text, count = patients_page_pattern.subn(patients_ui, text, count=1)
if count != 1:
    raise SystemExit(f'patient UI replacement count={count}')

if text == original:
    raise SystemExit('no patient integration changes made')
path.write_text(text)
print('Phase 3 patient CRUD integration patch applied')
