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
  createPatient as createProductionPatient,
  deletePatient as deleteProductionPatient,
  loadPatients as loadProductionPatients,
  updatePatient as updateProductionPatient,
} from '@/lib/patients';
""",
"""import {
  createPatient as createProductionPatient,
  deletePatient as deleteProductionPatient,
  loadPatients as loadProductionPatients,
  updatePatient as updateProductionPatient,
} from '@/lib/patients';
import {
  createVisit as createProductionVisit,
  deleteVisit as deleteProductionVisit,
  loadVisits as loadProductionVisits,
  updateVisit as updateProductionVisit,
} from '@/lib/visits';
""",
)

replace_once(
"""  visits: Visit[];
  setVisits: React.Dispatch<React.SetStateAction<Visit[]>>;
""",
"""  visits: Visit[];
  visitsLoading: boolean;
  createVisitRecord: (visit: Visit) => Promise<Visit>;
  updateVisitRecord: (visit: Visit) => Promise<Visit>;
  deleteVisitRecord: (visitId: string) => Promise<void>;
""",
)

replace_once(
"""  const [visits, setVisits] = usePersistentState<Visit[]>(
    `physiobill-visits-${currentPhysioId}`,
    [],
    (value) => normalizeVisitsForWorkspace(value, currentPhysioId),
  );
  const [invoices, setInvoices] = usePersistentState<Invoice[]>(
""",
"""  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setVisitsLoading(true);
    setPersistenceError(null);
    loadProductionVisits()
      .then((loaded) => {
        if (active) setVisits(loaded);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setPersistenceError(error instanceof Error ? error.message : 'Unable to load visits.');
      })
      .finally(() => {
        if (active) setVisitsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentPhysioId]);

  const visitInput = (visit: Visit) => ({
    patientId: visit.patientId,
    date: visit.date,
    treatment: visit.treatment,
    modalities: visit.modalities,
    exercises: visit.exercises,
    duration: visit.duration,
    notes: visit.notes,
    authorization: visit.authorization,
  });

  const createVisitRecord = async (visit: Visit): Promise<Visit> => {
    setPersistenceError(null);
    try {
      const saved = await createProductionVisit(visitInput(visit));
      setVisits((current) => [...current, saved]);
      return saved;
    } catch (error: unknown) {
      setPersistenceError(error instanceof Error ? error.message : 'Unable to create visit.');
      throw error;
    }
  };

  const updateVisitRecord = async (visit: Visit): Promise<Visit> => {
    setPersistenceError(null);
    try {
      const saved = await updateProductionVisit(visit.id, visitInput(visit));
      setVisits((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      return saved;
    } catch (error: unknown) {
      setPersistenceError(error instanceof Error ? error.message : 'Unable to update visit.');
      throw error;
    }
  };

  const deleteVisitRecord = async (visitId: string): Promise<void> => {
    setPersistenceError(null);
    try {
      await deleteProductionVisit(visitId);
      setVisits((current) => current.filter((item) => item.id !== visitId));
    } catch (error: unknown) {
      setPersistenceError(error instanceof Error ? error.message : 'Unable to delete visit.');
      throw error;
    }
  };

  const [invoices, setInvoices] = usePersistentState<Invoice[]>(
""",
)

replace_once(
"""    visits,
    setVisits,
    invoices,
""",
"""    visits,
    visitsLoading,
    createVisitRecord,
    updateVisitRecord,
    deleteVisitRecord,
    invoices,
""",
)

replace_once(
"""  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
""",
"""  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
""",
)

replace_once(
"""  const editingInvoice = workspace.workspaceInvoices.find((invoice) => invoice.id === editingInvoiceId) ?? null;
  const editingPatient = workspace.workspacePatients.find((patient) => patient.id === editingPatientId) ?? null;
""",
"""  const editingInvoice = workspace.workspaceInvoices.find((invoice) => invoice.id === editingInvoiceId) ?? null;
  const editingPatient = workspace.workspacePatients.find((patient) => patient.id === editingPatientId) ?? null;
  const editingVisit = workspace.workspaceVisits.find((visit) => visit.id === editingVisitId) ?? null;
""",
)

replace_once(
"""    if (normalized.startsWith('/visits')) {
      return showVisitForm ? <VisitForm patients={workspace.workspacePatients} onCancel={() => setShowVisitForm(false)} onSave={(visit) => { const saved: Visit = { ...visit, id: `visit-${Date.now()}`, physioId: workspace.currentPhysioId, visitNumber: formatSequentialId('VIS', workspace.workspaceVisits.length + 1) }; workspace.setVisits((current) => [...current, saved]); setShowVisitForm(false); }} /> : <VisitsPage visits={workspace.workspaceVisits} patients={workspace.workspacePatients} onAdd={() => setShowVisitForm(true)} />;
    }
""",
"""    if (normalized.startsWith('/visits')) {
      if (showVisitForm || editingVisit) {
        return (
          <VisitForm
            patients={workspace.workspacePatients}
            initialVisit={editingVisit}
            onCancel={() => {
              setShowVisitForm(false);
              setEditingVisitId(null);
            }}
            onSave={async (visit) => {
              if (editingVisit) await workspace.updateVisitRecord({ ...editingVisit, ...visit });
              else await workspace.createVisitRecord(visit);
              setShowVisitForm(false);
              setEditingVisitId(null);
            }}
          />
        );
      }
      return (
        <VisitsPage
          visits={workspace.workspaceVisits}
          patients={workspace.workspacePatients}
          loading={workspace.visitsLoading}
          onAdd={() => setShowVisitForm(true)}
          onEdit={(visit) => setEditingVisitId(visit.id)}
          onDelete={async (visit) => {
            if (!window.confirm(`Delete ${visit.visitNumber}? This cannot be undone.`)) return;
            await workspace.deleteVisitRecord(visit.id);
          }}
        />
      );
    }
""",
)

replace_once(
"""function VisitsPage({ visits, patients, onAdd }: { visits: Visit[]; patients: Patient[]; onAdd: () => void }) {
  return <div><PageHeader eyebrow="Clinical records" title="Visits" action={<Button onClick={onAdd}><Plus size={16} /> Log visit</Button>} /><div className="overflow-hidden rounded-2xl border bg-card divide-y">{visits.slice().sort((a, b) => b.date.localeCompare(a.date)).map((visit) => <div key={visit.id} className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_1.5fr_.7fr]"><p className="font-bold">{visit.visitNumber}</p><p>{patients.find((patient) => patient.id === visit.patientId)?.name ?? 'Patient'}</p><p>{visit.treatment}</p><p className="text-muted-foreground">{dateLabel(visit.date)}</p></div>)}</div></div>;
}

function VisitForm({ patients, onSave, onCancel }: { patients: Patient[]; onSave: (visit: Visit) => void; onCancel: () => void }) {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? ''); const [treatment, setTreatment] = useState(''); const [date, setDate] = useState(today); const [notes, setNotes] = useState('');
  return <div className="rounded-2xl border bg-card p-6"><PageHeader eyebrow="Clinical record" title="Log visit" /><div className="grid gap-4 md:grid-cols-2"><SelectField label="Patient" value={patientId} onChange={setPatientId} options={patients.map((p) => ({ value: p.id, label: p.name }))} /><Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /><Field label="Treatment" value={treatment} onChange={(e) => setTreatment(e.target.value)} /><Field label="Duration" defaultValue="60" /><div className="md:col-span-2"><TextArea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div></div><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button disabled={!patientId || !treatment.trim()} onClick={() => onSave({ id: '', patientId, visitNumber: '', date, treatment, modalities: '', exercises: '', duration: '60', notes, authorization: '' })}><Check size={16} /> Save visit</Button></div></div>;
}
""",
"""function VisitsPage({ visits, patients, loading, onAdd, onEdit, onDelete }: { visits: Visit[]; patients: Patient[]; loading: boolean; onAdd: () => void; onEdit: (visit: Visit) => void; onDelete: (visit: Visit) => Promise<void> }) {
  return <div><PageHeader eyebrow="Clinical records" title="Visits" description="Visit ownership and numbering are assigned by Postgres; historical visit dates stay immutable until the audited correction ledger is introduced." action={<Button disabled={!patients.length} onClick={onAdd}><Plus size={16} /> Log visit</Button>} />{loading ? <div className="rounded-2xl border bg-card p-6 text-sm font-semibold text-muted-foreground">Loading visits…</div> : <div className="overflow-hidden rounded-2xl border bg-card divide-y">{visits.slice().sort((a, b) => b.date.localeCompare(a.date)).map((visit) => <div key={visit.id} className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_1.5fr_.7fr_auto] md:items-center"><p className="font-bold">{visit.visitNumber}</p><p>{patients.find((patient) => patient.id === visit.patientId)?.name ?? 'Patient'}</p><p>{visit.treatment}</p><p className="text-muted-foreground">{dateLabel(visit.date)}</p><div className="flex gap-1 md:justify-end"><Button variant="ghost" onClick={() => onEdit(visit)}><Pencil size={15} /> Edit</Button><Button variant="danger" onClick={() => void onDelete(visit)}><X size={15} /> Delete</Button></div></div>)}{!visits.length && <div className="p-6 text-sm text-muted-foreground">No visits recorded yet.</div>}</div>}</div>;
}

function VisitForm({ patients, initialVisit, onSave, onCancel }: { patients: Patient[]; initialVisit?: Visit | null; onSave: (visit: Visit) => Promise<void>; onCancel: () => void }) {
  const [patientId, setPatientId] = useState(initialVisit?.patientId ?? patients[0]?.id ?? '');
  const [treatment, setTreatment] = useState(initialVisit?.treatment ?? '');
  const [date, setDate] = useState(initialVisit?.date ?? today);
  const [duration, setDuration] = useState(initialVisit?.duration ?? '60');
  const [modalities, setModalities] = useState(initialVisit?.modalities ?? '');
  const [exercises, setExercises] = useState(initialVisit?.exercises ?? '');
  const [authorization, setAuthorization] = useState(initialVisit?.authorization ?? '');
  const [notes, setNotes] = useState(initialVisit?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base: Visit = initialVisit ?? { id: '', patientId: '', visitNumber: '', date: today, treatment: '', modalities: '', exercises: '', duration: '60', notes: '', authorization: '' };
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave({ ...base, patientId, date, treatment: treatment.trim(), modalities, exercises, duration, notes, authorization });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save visit.');
    } finally {
      setBusy(false);
    }
  };
  return <div className="rounded-2xl border bg-card p-6"><PageHeader eyebrow="Clinical record" title={initialVisit ? `Edit ${initialVisit.visitNumber}` : 'Log visit'} description={initialVisit ? 'Patient, visit number and historical visit date are locked. Clinical content remains editable.' : 'The server assigns ownership and the next visit number.'} /><div className="grid gap-4 md:grid-cols-2"><SelectField label="Patient" value={patientId} onChange={setPatientId} disabled={Boolean(initialVisit)} options={patients.map((p) => ({ value: p.id, label: p.name }))} /><Field label="Date" type="date" value={date} disabled={Boolean(initialVisit)} onChange={(e) => setDate(e.target.value)} /><Field label="Treatment" value={treatment} onChange={(e) => setTreatment(e.target.value)} /><Field label="Duration (minutes)" type="number" min="0" step="1" value={duration} onChange={(e) => setDuration(e.target.value)} /><Field label="Modalities" value={modalities} onChange={(e) => setModalities(e.target.value)} /><Field label="Exercises" value={exercises} onChange={(e) => setExercises(e.target.value)} /><Field label="Authorization" value={authorization} onChange={(e) => setAuthorization(e.target.value)} /><div className="md:col-span-2"><TextArea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div></div>{error && <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}<div className="mt-6 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button><Button disabled={busy || !patientId || !treatment.trim()} onClick={() => void save()}><Check size={16} /> {busy ? 'Saving…' : initialVisit ? 'Save changes' : 'Save visit'}</Button></div></div>;
}
""",
)

path.write_text(text)
print('Phase 3 Visit integration applied to src/App.tsx')
