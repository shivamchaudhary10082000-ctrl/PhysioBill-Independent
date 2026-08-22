import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, Router as WouterRouter, useLocation } from 'wouter';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Pencil,
  Plus,
  ReceiptIndianRupee,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/Components/ui/toaster';
import { TooltipProvider } from '@/Components/ui/tooltip';
import { PatientFinancialLedgerPage } from '@/Components/PatientFinancialLedgerGateway';
import { TreatmentEpisodeStatusCell } from '@/Components/TreatmentEpisodeStatusCell';
import { AuthPage } from '@/pages/AuthPage';
import { useAuthSession } from '@/hooks/use-auth-session';
import { signOutPhysiotherapist } from '@/lib/auth';
import {
  loadProductionWorkspace,
  saveProductionProfile,
  saveProductionSettings,
  type ProductionWorkspace,
} from '@/lib/production-workspace';
import {
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

type UserRole = 'physio' | 'patient';

type AuthUser = {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
};

type Profile = {
  id: string;
  fullName: string;
  title: string;
  qualification: string;
  registration: string;
  pan: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  logo: string;
  upiName: string;
  upiId: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  invoicePrefix: string;
  paymentAccountId?: string;
  paymentAccountStatus?: 'not_connected' | 'pending' | 'connected';
};

type Settings = {
  practiceName: string;
  defaultPayment: string;
  footerNote: string;
  showGst: boolean;
  dateFormat: string;
};

type Patient = {
  id: string;
  physioId?: string;
  userId?: string;
  patientNumber: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  age: string;
  sex?: string;
  clinicalCategory?: string;
  condition: string;
  referringDoctor: string;
  referralDate: string;
  insuranceTpa: string;
  policyMemberId: string;
  notes: string;
};

type Visit = {
  id: string;
  physioId?: string;
  patientId: string;
  visitNumber: string;
  date: string;
  treatment: string;
  modalities: string;
  exercises: string;
  duration: string;
  notes: string;
  authorization: string;
};

type InvoiceStatus = 'Paid' | 'Part paid' | 'Outstanding' | 'Draft';
type InvoiceAuditAction = 'correction' | 'edit' | 'payment';

type AuditActor = {
  userId: string;
  role: UserRole;
  displayName: string;
};

type InvoiceAuditEntry = {
  id: string;
  action: InvoiceAuditAction;
  reason: string;
  changedAt: string;
  changedBy: string;
  changedByUserId?: string;
  changedByRole?: UserRole;
  changedFields: string[];
  before: Partial<Invoice>;
  after: Partial<Invoice>;
};

type Invoice = {
  id: string;
  physioId?: string;
  patientId: string;
  number: string;
  description: string;
  sessions: string;
  startDate: string;
  endDate: string;
  fee: number;
  additional: number;
  additionalDescription: string;
  discount: number;
  gstRate: number;
  total: number;
  paid: number;
  paymentMethod: string;
  finalized: boolean;
  status: InvoiceStatus;
  createdAt: string;
  auditTrail?: InvoiceAuditEntry[];
};

type InvoiceMutationResult =
  | { ok: true; invoice: Invoice }
  | { ok: false; error: string };

const queryClient = new QueryClient();
const DEMO_PHYSIO_ID = 'physio-demo-001';
const DEMO_PATIENT_USER_ID = 'patient-demo-user-001';
const today = new Date().toISOString().slice(0, 10);
const currentYear = new Date().getFullYear();

const demoAuthUser: AuthUser = {
  id: DEMO_PHYSIO_ID,
  role: 'physio',
  displayName: 'Demo Physiotherapist',
  email: 'demo@physiobill.local',
};

const demoPatientAuthUser: AuthUser = {
  id: DEMO_PATIENT_USER_ID,
  role: 'patient',
  displayName: 'Aarav Sharma',
  email: 'aarav@example.com',
};

const defaultProfile: Profile = {
  id: DEMO_PHYSIO_ID,
  fullName: '',
  title: 'Physiotherapist',
  qualification: '',
  registration: '',
  pan: '',
  gstin: '',
  phone: '',
  email: '',
  address: '',
  logo: '',
  upiName: '',
  upiId: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  invoicePrefix: 'PB',
  paymentAccountId: undefined,
  paymentAccountStatus: 'not_connected',
};

const defaultSettings: Settings = {
  practiceName: '',
  defaultPayment: 'Select payment method',
  footerNote: 'Thank you for choosing independent physiotherapy care.',
  showGst: false,
  dateFormat: 'DD MMM YYYY',
};

const demoPatients: Patient[] = [
  {
    id: 'patient-demo-001',
    physioId: DEMO_PHYSIO_ID,
    userId: DEMO_PATIENT_USER_ID,
    patientNumber: `PT-${currentYear}-000001`,
    name: 'Aarav Sharma',
    phone: '+91 90000 00001',
    email: 'aarav@example.com',
    address: 'Surat, Gujarat',
    age: '32',
    condition: 'Knee rehabilitation',
    referringDoctor: '',
    referralDate: '',
    insuranceTpa: '',
    policyMemberId: '',
    notes: 'Demo patient record.',
  },
  {
    id: 'patient-demo-002',
    physioId: DEMO_PHYSIO_ID,
    patientNumber: `PT-${currentYear}-000002`,
    name: 'Meera Patel',
    phone: '+91 90000 00002',
    email: 'meera@example.com',
    address: 'Surat, Gujarat',
    age: '45',
    condition: 'Low back pain',
    referringDoctor: '',
    referralDate: '',
    insuranceTpa: '',
    policyMemberId: '',
    notes: 'Demo patient record.',
  },
];

const demoVisits: Visit[] = [
  {
    id: 'visit-demo-001',
    physioId: DEMO_PHYSIO_ID,
    patientId: 'patient-demo-001',
    visitNumber: `VIS-${currentYear}-000001`,
    date: today,
    treatment: 'Knee rehabilitation',
    modalities: 'TENS',
    exercises: 'Quadriceps activation and ROM',
    duration: '60',
    notes: 'Progressive rehabilitation session.',
    authorization: 'Approved — 10 sessions',
  },
];

const demoInvoices: Invoice[] = [
  {
    id: 'invoice-demo-001',
    physioId: DEMO_PHYSIO_ID,
    patientId: 'patient-demo-001',
    number: `PB-${currentYear}-000001`,
    description: 'Physiotherapy treatment',
    sessions: '5 sessions',
    startDate: today,
    endDate: today,
    fee: 3000,
    additional: 0,
    additionalDescription: '',
    discount: 0,
    gstRate: 0,
    total: 3000,
    paid: 0,
    paymentMethod: 'Select payment method',
    finalized: true,
    status: 'Outstanding',
    createdAt: new Date().toISOString(),
    auditTrail: [],
  },
  {
    id: 'invoice-demo-002',
    physioId: DEMO_PHYSIO_ID,
    patientId: 'patient-demo-002',
    number: `PB-${currentYear}-000002`,
    description: 'Physiotherapy treatment',
    sessions: '3 sessions',
    startDate: today,
    endDate: today,
    fee: 1800,
    additional: 0,
    additionalDescription: '',
    discount: 0,
    gstRate: 0,
    total: 1800,
    paid: 1800,
    paymentMethod: 'UPI',
    finalized: true,
    status: 'Paid',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    auditTrail: [],
  },
];

const normalizeSettings = (value: Settings): Settings => ({
  ...defaultSettings,
  ...(value && typeof value === 'object' ? value : {}),
});

const normalizePatients = (items: Patient[]) =>
  Array.isArray(items) ? items.map((item) => ({ ...item })) : [];

const normalizeVisits = (items: Visit[]) =>
  Array.isArray(items) ? items.map((item) => ({ ...item })) : [];

const deriveInvoiceStatus = (
  total: number,
  paid: number,
  finalized: boolean,
): InvoiceStatus => {
  if (!finalized) return 'Draft';
  if (paid >= total) return 'Paid';
  if (paid > 0) return 'Part paid';
  return 'Outstanding';
};

const normalizeInvoices = (items: Invoice[]) =>
  Array.isArray(items)
    ? items.map((item) => ({
        ...item,
        auditTrail: Array.isArray(item.auditTrail) ? item.auditTrail : [],
        status: deriveInvoiceStatus(item.total, item.paid, item.finalized),
      }))
    : [];

const normalizePatientsForWorkspace = (items: Patient[], physioId: string) =>
  normalizePatients(items).map((patient) => ({ ...patient, physioId }));

const normalizeInvoicesForWorkspace = (items: Invoice[], physioId: string) =>
  normalizeInvoices(items).map((invoice) => ({ ...invoice, physioId }));

const belongsToPhysio = (physioId: string | undefined, currentPhysioId: string) =>
  physioId === currentPhysioId;

const getWorkspacePatients = (patients: Patient[], physioId: string) =>
  patients.filter((patient) => belongsToPhysio(patient.physioId, physioId));

const getWorkspaceVisits = (visits: Visit[], physioId: string) =>
  visits.filter((visit) => belongsToPhysio(visit.physioId, physioId));

const getWorkspaceInvoices = (invoices: Invoice[], physioId: string) =>
  invoices.filter((invoice) => belongsToPhysio(invoice.physioId, physioId));

const invoiceEditableFields = [
  'description',
  'sessions',
  'startDate',
  'endDate',
  'fee',
  'additional',
  'additionalDescription',
  'discount',
  'gstRate',
  'total',
  'paymentMethod',
] as const satisfies readonly (keyof Invoice)[];

const financialFields = [
  'fee',
  'additional',
  'additionalDescription',
  'discount',
  'gstRate',
  'total',
  'paid',
] as const satisfies readonly (keyof Invoice)[];

const invoiceAuditFields = [
  ...invoiceEditableFields,
  'paid',
  'status',
  'finalized',
] as const satisfies readonly (keyof Invoice)[];

const getInvoiceChangedFields = (before: Invoice, after: Invoice) =>
  invoiceAuditFields.filter((field) => before[field] !== after[field]);

const hasInvoiceFinancialChanges = (before: Invoice, after: Invoice) =>
  financialFields.some((field) => before[field] !== after[field]);

const createAuditId = () =>
  `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createAuditEntry = (
  action: InvoiceAuditAction,
  reason: string,
  before: Invoice,
  after: Invoice,
  actor: AuditActor,
): InvoiceAuditEntry => {
  const changedFields = getInvoiceChangedFields(before, after);
  const beforeValues: Partial<Invoice> = {};
  const afterValues: Partial<Invoice> = {};
  changedFields.forEach((field) => {
    (beforeValues as Record<string, unknown>)[field] = before[field];
    (afterValues as Record<string, unknown>)[field] = after[field];
  });
  return {
    id: createAuditId(),
    action,
    reason: reason.trim(),
    changedAt: new Date().toISOString(),
    changedBy: actor.displayName,
    changedByUserId: actor.userId,
    changedByRole: actor.role,
    changedFields,
    before: beforeValues,
    after: afterValues,
  };
};

const calculateInvoiceTotal = (invoice: Invoice) =>
  Math.max(
    0,
    Math.round(
      (invoice.fee + invoice.additional - invoice.discount) *
        (1 + invoice.gstRate / 100) *
        100,
    ) / 100,
  );

const formatSequentialId = (prefix: string, sequence: number) =>
  `${prefix}-${currentYear}-${String(sequence).padStart(6, '0')}`;

const money = (value: number) =>
  `₹${Math.round(value).toLocaleString('en-IN')}`;

const dateLabel = (value: string) =>
  value
    ? new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(`${value}T00:00:00`))
    : '—';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'PT';

function usePersistentState<T>(
  key: string,
  initial: T,
  normalize?: (value: T) => T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      const parsed = saved ? (JSON.parse(saved) as T) : initial;
      return normalize ? normalize(parsed) : parsed;
    } catch {
      return normalize ? normalize(initial) : initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

function useAuthenticatedUser() {
  return usePersistentState<AuthUser | null>('physiobill-demo-session', null);
}

type WorkspaceState = {
  authUser: AuthUser;
  currentPhysioId: string;
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  patients: Patient[];
  patientsLoading: boolean;
  createPatientRecord: (patient: Patient) => Promise<Patient>;
  updatePatientRecord: (patient: Patient) => Promise<Patient>;
  deletePatientRecord: (patientId: string) => Promise<void>;
  visits: Visit[];
  visitsLoading: boolean;
  createVisitRecord: (visit: Visit) => Promise<Visit>;
  updateVisitRecord: (visit: Visit) => Promise<Visit>;
  deleteVisitRecord: (visitId: string) => Promise<void>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  workspacePatients: Patient[];
  workspaceVisits: Visit[];
  workspaceInvoices: Invoice[];
  createInvoice: (patientId: string) => Invoice;
  updateInvoice: (invoiceId: string, proposed: Invoice, reason?: string) => InvoiceMutationResult;
  finalizeInvoice: (invoice: Invoice) => InvoiceMutationResult;
  recordInvoicePayment: (invoice: Invoice, actor: AuditActor) => InvoiceMutationResult;
  persistenceError: string | null;
};

function WorkspaceController({
  authUser,
  currentPhysioId,
  initialProfile,
  initialSettings,
}: {
  authUser: AuthUser;
  currentPhysioId: string;
  initialProfile: Profile;
  initialSettings: Settings;
}) {
  const [profile, setProfileState] = useState<Profile>(initialProfile);
  const [settings, setSettingsState] = useState<Settings>(initialSettings);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  const setProfile: React.Dispatch<React.SetStateAction<Profile>> = (value) => {
    setProfileState((current) => {
      const next = typeof value === 'function' ? value(current) : value;
      setPersistenceError(null);
      void saveProductionProfile(currentPhysioId, next)
        .then((saved) => setProfileState(saved))
        .catch((error: unknown) =>
          setPersistenceError(error instanceof Error ? error.message : 'Unable to save profile.'),
        );
      return next;
    });
  };

  const setSettings: React.Dispatch<React.SetStateAction<Settings>> = (value) => {
    setSettingsState((current) => {
      const next = typeof value === 'function' ? value(current) : value;
      setPersistenceError(null);
      void saveProductionSettings(currentPhysioId, next)
        .then((saved) => setSettingsState(saved))
        .catch((error: unknown) =>
          setPersistenceError(error instanceof Error ? error.message : 'Unable to save settings.'),
        );
      return next;
    });
  };

  const [patients, setPatients] = useState<Patient[]>([]);
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

  const [visits, setVisits] = useState<Visit[]>([]);
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
    `physiobill-invoices-${currentPhysioId}`,
    [],
    (value) => normalizeInvoicesForWorkspace(value, currentPhysioId),
  );

  const workspacePatients = getWorkspacePatients(patients, currentPhysioId);
  const workspaceVisits = getWorkspaceVisits(visits, currentPhysioId);
  const workspaceInvoices = getWorkspaceInvoices(invoices, currentPhysioId);

  const createInvoice = (patientId: string) => {
    const next = workspaceInvoices.length + 1;
    const prefix = profile.invoicePrefix.trim() || 'PB';
    const invoice: Invoice = {
      id: `invoice-${Date.now()}`,
      physioId: currentPhysioId,
      patientId,
      number: formatSequentialId(prefix, next),
      description: 'Physiotherapy treatment',
      sessions: '',
      startDate: today,
      endDate: today,
      fee: 0,
      additional: 0,
      additionalDescription: '',
      discount: 0,
      gstRate: settings.showGst ? 18 : 0,
      total: 0,
      paid: 0,
      paymentMethod: settings.defaultPayment,
      finalized: false,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      auditTrail: [],
    };
    setInvoices((current) => [...current, invoice]);
    return invoice;
  };

  const updateInvoice = (
    invoiceId: string,
    proposed: Invoice,
    reason?: string,
  ): InvoiceMutationResult => {
    const existing = workspaceInvoices.find((invoice) => invoice.id === invoiceId);
    if (!existing) return { ok: false, error: 'Invoice not found.' };
    if (proposed.physioId && proposed.physioId !== currentPhysioId) {
      return { ok: false, error: 'Invoice does not belong to the current workspace.' };
    }
    if (proposed.number !== existing.number) {
      return { ok: false, error: 'Invoice number cannot be changed.' };
    }
    if (proposed.patientId !== existing.patientId) {
      return { ok: false, error: 'Patient ownership cannot be changed on an existing invoice.' };
    }
    if (existing.status === 'Paid' && hasInvoiceFinancialChanges(existing, proposed)) {
      return { ok: false, error: 'Paid invoices cannot be financially edited.' };
    }
    if (existing.finalized && hasInvoiceFinancialChanges(existing, proposed)) {
      if (!reason?.trim()) {
        return { ok: false, error: 'A correction reason is required for finalized financial changes.' };
      }
      if (proposed.paid !== existing.paid) {
        return { ok: false, error: 'Payment changes must use the payment workflow.' };
      }
      const correctedBase: Invoice = {
        ...existing,
        ...proposed,
        id: existing.id,
        number: existing.number,
        patientId: existing.patientId,
        physioId: existing.physioId ?? currentPhysioId,
        finalized: true,
        paid: existing.paid,
      };
      correctedBase.total = calculateInvoiceTotal(correctedBase);
      correctedBase.status = deriveInvoiceStatus(correctedBase.total, correctedBase.paid, true);
      const audit = createAuditEntry('correction', reason, existing, correctedBase, {
        userId: authUser.id,
        role: authUser.role,
        displayName: authUser.displayName,
      });
      const corrected = {
        ...correctedBase,
        auditTrail: [...(existing.auditTrail ?? []), audit],
      };
      setInvoices((current) =>
        current.map((invoice) => (invoice.id === invoiceId ? corrected : invoice)),
      );
      return { ok: true, invoice: corrected };
    }
    if (existing.finalized) {
      return { ok: false, error: 'Finalized invoices must use the correction workflow.' };
    }
    const updated: Invoice = {
      ...proposed,
      id: existing.id,
      number: existing.number,
      patientId: existing.patientId,
      physioId: existing.physioId ?? currentPhysioId,
      paid: existing.paid,
      auditTrail: existing.auditTrail ?? [],
    };
    updated.total = calculateInvoiceTotal(updated);
    updated.status = deriveInvoiceStatus(updated.total, updated.paid, updated.finalized);
    setInvoices((current) =>
      current.map((invoice) => (invoice.id === invoiceId ? updated : invoice)),
    );
    return { ok: true, invoice: updated };
  };

  const finalizeInvoice = (invoice: Invoice): InvoiceMutationResult => {
    const existing = workspaceInvoices.find((item) => item.id === invoice.id);
    if (!existing) return { ok: false, error: 'Invoice not found.' };
    if (!belongsToPhysio(existing.physioId, currentPhysioId)) {
      return { ok: false, error: 'Invoice does not belong to the current workspace.' };
    }
    if (existing.finalized) return { ok: false, error: 'Invoice is already finalized.' };
    const finalized: Invoice = {
      ...existing,
      total: calculateInvoiceTotal(existing),
      finalized: true,
      status: deriveInvoiceStatus(calculateInvoiceTotal(existing), existing.paid, true),
    };
    setInvoices((current) =>
      current.map((item) => (item.id === existing.id ? finalized : item)),
    );
    return { ok: true, invoice: finalized };
  };

  const recordInvoicePayment = (
    invoice: Invoice,
    actor: AuditActor,
  ): InvoiceMutationResult => {
    const existing = workspaceInvoices.find((item) => item.id === invoice.id);
    if (!existing) return { ok: false, error: 'Invoice not found.' };
    if (!existing.finalized) {
      return { ok: false, error: 'A draft invoice must be finalized before payment.' };
    }
    if (existing.status === 'Paid' || existing.paid >= existing.total) {
      return { ok: false, error: 'This invoice has no outstanding balance.' };
    }
    const paid: Invoice = {
      ...existing,
      paid: existing.total,
      status: 'Paid',
      finalized: true,
    };
    const audit = createAuditEntry(
      'payment',
      'Invoice marked as paid.',
      existing,
      paid,
      actor,
    );
    paid.auditTrail = [...(existing.auditTrail ?? []), audit];
    setInvoices((current) =>
      current.map((item) => (item.id === existing.id ? paid : item)),
    );
    return { ok: true, invoice: paid };
  };

  const workspace: WorkspaceState = {
    authUser,
    currentPhysioId,
    profile,
    setProfile,
    settings,
    setSettings,
    patients,
    patientsLoading,
    createPatientRecord,
    updatePatientRecord,
    deletePatientRecord,
    visits,
    visitsLoading,
    createVisitRecord,
    updateVisitRecord,
    deleteVisitRecord,
    invoices,
    setInvoices,
    workspacePatients,
    workspaceVisits,
    workspaceInvoices,
    createInvoice,
    updateInvoice,
    finalizeInvoice,
    recordInvoicePayment,
    persistenceError,
  };

  return <PhysioWorkspace workspace={workspace} />;
}

function Button({ children, variant = 'primary', className = '', ...props }: { children: ReactNode; variant?: 'primary' | 'soft' | 'ghost' | 'danger'; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const style = { primary: 'bg-primary text-primary-foreground', soft: 'bg-secondary text-secondary-foreground', ghost: 'bg-transparent text-muted-foreground hover:bg-secondary', danger: 'bg-destructive/10 text-destructive' }[variant];
  return <button className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${style} ${className}`} {...props}>{children}</button>;
}

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span><input className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-muted" {...props} /></label>;
}

function TextArea({ label, ...props }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span><textarea className="min-h-24 w-full rounded-xl border bg-card px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" {...props} /></label>;
}

function SelectField({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-muted">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">{eyebrow}</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{action}</div>;
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof WalletCards }) {
  return <div className="rounded-2xl border bg-card p-5"><div className="flex items-start justify-between"><p className="text-xs font-bold text-muted-foreground">{label}</p><Icon size={18} className="text-primary" /></div><p className="mt-5 text-2xl font-extrabold">{value}</p></div>;
}

function PhysioWorkspace({ workspace }: { workspace: WorkspaceState }) {
  const [location, setLocation] = useLocation();
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const normalized = location.startsWith('/app/') ? location.slice(4) : location;
  const editingInvoice = workspace.workspaceInvoices.find((invoice) => invoice.id === editingInvoiceId) ?? null;
  const editingPatient = workspace.workspacePatients.find((patient) => patient.id === editingPatientId) ?? null;
  const editingVisit = workspace.workspaceVisits.find((visit) => visit.id === editingVisitId) ?? null;

  const content = (() => {
    if (normalized.startsWith('/patients')) {
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
    if (normalized.startsWith('/visits')) {
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
    if (normalized.startsWith('/financial-ledger')) return <PatientFinancialLedgerPage />;
    if (normalized.startsWith('/invoices') || normalized.startsWith('/invoice')) return <InvoiceWorkspace workspace={workspace} editingInvoice={editingInvoice} onOpen={(invoice) => setEditingInvoiceId(invoice.id)} onClose={() => setEditingInvoiceId(null)} />;
    if (normalized.startsWith('/profile')) return <ProfilePage workspace={workspace} />;
    if (normalized.startsWith('/settings')) return <SettingsPage workspace={workspace} />;
    return <Dashboard workspace={workspace} />;
  })();

  useEffect(() => {
    if (location === '/app' || location === '/') setLocation('/app/dashboard');
  }, [location, setLocation]);

  return <AppShell workspace={workspace}>{content}</AppShell>;
}

const physioNav = [
  { href: '/app/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/app/patients', label: 'Patients', icon: UsersRound },
  { href: '/app/visits', label: 'Visits', icon: ClipboardList },
  { href: '/app/clinical-records', label: 'Clinical Records', icon: FileText },
  { href: '/app/invoices', label: 'Invoices', icon: ReceiptIndianRupee },
  { href: '/app/financial-ledger', label: 'Financial Ledger', icon: WalletCards },
  { href: '/app/profile', label: 'Profile', icon: UserRound },
  { href: '/app/settings', label: 'Settings', icon: Settings2 },
];

function AppShell({ workspace, children }: { workspace: WorkspaceState; children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="min-h-screen bg-background lg:flex"><aside className="hidden w-[238px] shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground lg:flex"><Brand /><nav className="mt-8 space-y-1">{physioNav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${location.startsWith(href) ? 'bg-sidebar-accent' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70'}`}><Icon size={18} /> {label}</Link>)}</nav><div className="mt-auto rounded-2xl bg-sidebar-accent/55 p-3.5"><p className="font-bold">{workspace.profile.fullName || workspace.authUser.displayName}</p><p className="mt-1 text-xs text-sidebar-foreground/60">Authenticated private workspace</p><button type="button" onClick={() => void signOutPhysiotherapist()} className="mt-3 inline-flex items-center gap-2 text-xs font-bold"><LogOut size={14} /> Sign out</button></div></aside><div className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b bg-background/90 px-4 backdrop-blur-md sm:px-7"><div className="flex items-center gap-3"><button type="button" className="rounded-xl p-2 lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={20} /></button><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">PhysioBill</p><p className="text-lg font-extrabold">{workspace.settings.practiceName || 'Clinical workspace'}</p></div></div><div className="flex items-center gap-2"><Bell size={18} className="text-muted-foreground" /><span className="grid size-9 place-items-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground">{initials(workspace.profile.fullName || workspace.authUser.displayName)}</span></div></header><main className="mx-auto max-w-[1420px] px-4 pb-24 pt-6 sm:px-7 lg:px-10 lg:pb-10">{workspace.persistenceError && <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{workspace.persistenceError}</div>}{children}</main></div>{menuOpen && <div className="fixed inset-0 z-50 bg-foreground/50 lg:hidden"><aside className="relative z-[60] h-full w-[280px] bg-background p-5 text-foreground shadow-2xl"><button type="button" className="mb-5 ml-auto block" onClick={() => setMenuOpen(false)}><X size={20} /></button><Brand /><nav className="mt-8 space-y-1">{physioNav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-secondary"><Icon size={18} /> {label}</Link>)}</nav></aside></div>}</div>;
}

function Brand() { return <Link href="/app/dashboard" className="flex items-center gap-3 px-2 py-2"><span className="grid size-10 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground"><HeartPulse size={21} /></span><strong>Physio<span className="text-sidebar-primary">Bill</span></strong></Link>; }

function Dashboard({ workspace }: { workspace: WorkspaceState }) {
  const outstanding = workspace.workspaceInvoices.reduce((sum, invoice) => sum + Math.max(invoice.total - invoice.paid, 0), 0);
  const billed = workspace.workspaceInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const todaysVisits = workspace.workspaceVisits.filter((visit) => visit.date === today);
  return <div className="space-y-7"><div className="relative overflow-hidden rounded-[24px] bg-primary px-6 py-8 text-primary-foreground"><p className="text-xs font-extrabold uppercase tracking-[.16em]">Authenticated workspace</p><h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">A clear desk for better care.</h2><p className="mt-3 max-w-xl text-sm text-primary-foreground/75">Your identity, profile, settings, patients and visits are backed by Supabase Auth, Postgres and RLS.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Outstanding" value={money(outstanding)} icon={WalletCards} /><StatCard label="Today’s visits" value={String(todaysVisits.length)} icon={CalendarDays} /><StatCard label="Active patients" value={String(workspace.workspacePatients.length)} icon={UsersRound} /><StatCard label="Billed" value={money(billed)} icon={ReceiptIndianRupee} /></div><div className="grid gap-6 xl:grid-cols-2"><section className="rounded-2xl border bg-card p-5"><h3 className="font-extrabold">Recent visits</h3><div className="mt-4 space-y-3">{workspace.workspaceVisits.slice(-5).reverse().map((visit) => <div key={visit.id} className="rounded-xl bg-secondary/50 p-4"><p className="font-bold">{workspace.workspacePatients.find((p) => p.id === visit.patientId)?.name ?? 'Patient'}</p><p className="mt-1 text-xs text-muted-foreground">{dateLabel(visit.date)} · {visit.treatment}</p></div>)}</div></section><section className="rounded-2xl border bg-card p-5"><h3 className="font-extrabold">Recent invoices</h3><div className="mt-4 space-y-3">{workspace.workspaceInvoices.slice(-5).reverse().map((invoice) => <div key={invoice.id} className="flex items-center justify-between rounded-xl bg-secondary/50 p-4"><div><p className="font-bold">{invoice.number}</p><p className="text-xs text-muted-foreground">{invoice.status}</p></div><p className="font-extrabold">{money(invoice.total)}</p></div>)}</div></section></div></div>;
}

function PatientsPage({ patients, visits, invoices, loading, onAdd, onEdit, onDelete }: { patients: Patient[]; visits: Visit[]; invoices: Invoice[]; loading: boolean; onAdd: () => void; onEdit: (patient: Patient) => void; onDelete: (patient: Patient) => Promise<void> }) {
  const [search, setSearch] = useState('');
  const therapyStarts = new Map<string, string>();
  visits.forEach((visit) => { const current = therapyStarts.get(visit.patientId); if (!current || visit.date < current) therapyStarts.set(visit.patientId, visit.date); });
  const filtered = patients.filter((patient) => [patient.name, patient.patientNumber].join(' ').toLowerCase().includes(search.toLowerCase()));
  return <div><PageHeader eyebrow="Patient directory" title="Patients" description="Search by Patient name or record number. Therapy start is derived from the earliest persisted Visit." action={<Button onClick={onAdd}><Plus size={16} /> Add patient</Button>} /><div className="mb-4 relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border bg-card pl-10 pr-4 text-sm" placeholder="Search by Patient name or record number..." /></div>{loading ? <div className="rounded-2xl border bg-card p-6 text-sm font-semibold text-muted-foreground">Loading patients…</div> : <div className="overflow-hidden rounded-2xl border bg-card divide-y">{filtered.map((patient) => { const visitCount = visits.filter((visit) => visit.patientId === patient.id).length; const outstanding = invoices.filter((invoice) => invoice.patientId === patient.id).reduce((sum, invoice) => sum + Math.max(invoice.total - invoice.paid, 0), 0); const therapyStart = therapyStarts.get(patient.id); const clinical = [patient.condition, patient.clinicalCategory].filter(Boolean).join(' · '); return <div key={patient.id} className="grid gap-3 p-5 md:grid-cols-[1.5fr_1fr_auto] md:items-center"><div><p className="font-extrabold">{patient.name}</p><p className="mt-1 text-xs text-muted-foreground">{clinical || 'No condition/category recorded'}</p><p className="text-xs text-muted-foreground">{therapyStart ? `Therapy started: ${dateLabel(therapyStart)}` : 'Therapy not started · No visits yet'}</p><p className="text-xs text-muted-foreground">{patient.patientNumber}</p><TreatmentEpisodeStatusCell patientId={patient.id} defaultTitle={patient.condition} defaultCategory={patient.clinicalCategory} /></div><div><p className="text-xs text-muted-foreground">{visitCount} visits</p><p className="font-bold">{money(outstanding)} <span className="text-xs font-normal text-muted-foreground">outstanding</span></p></div><div className="flex gap-1 md:justify-end"><Button variant="ghost" onClick={() => onEdit(patient)}><Pencil size={15} /> Edit</Button><Button variant="danger" onClick={() => void onDelete(patient)}><X size={15} /> Delete</Button></div></div>; })}{filtered.length === 0 && <div className="p-6 text-sm text-muted-foreground">No patients found.</div>}</div>}</div>;
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

function VisitsPage({ visits, patients, loading, onAdd, onEdit, onDelete }: { visits: Visit[]; patients: Patient[]; loading: boolean; onAdd: () => void; onEdit: (visit: Visit) => void; onDelete: (visit: Visit) => Promise<void> }) {
  return <div><PageHeader eyebrow="Clinical records" title="Visits" description="Visit ownership and numbering are assigned by Postgres. Existing patient, visit number and historical visit date are locked against silent overwrite." action={<Button disabled={!patients.length} onClick={onAdd}><Plus size={16} /> Log visit</Button>} />{loading ? <div className="rounded-2xl border bg-card p-6 text-sm font-semibold text-muted-foreground">Loading visits…</div> : <div className="overflow-hidden rounded-2xl border bg-card divide-y">{visits.slice().sort((a, b) => b.date.localeCompare(a.date)).map((visit) => <div key={visit.id} className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_1.5fr_.7fr_auto] md:items-center"><p className="font-bold">{visit.visitNumber}</p><p>{patients.find((patient) => patient.id === visit.patientId)?.name ?? 'Patient'}</p><p>{visit.treatment}</p><p className="text-muted-foreground">{dateLabel(visit.date)}</p><div className="flex gap-1 md:justify-end"><Button variant="ghost" onClick={() => onEdit(visit)}><Pencil size={15} /> Edit</Button><Button variant="danger" onClick={() => void onDelete(visit)}><X size={15} /> Delete</Button></div></div>)}{!visits.length && <div className="p-6 text-sm text-muted-foreground">No visits recorded yet.</div>}</div>}</div>;
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
  return <div className="rounded-2xl border bg-card p-6"><PageHeader eyebrow="Clinical record" title={initialVisit ? `Edit ${initialVisit.visitNumber}` : 'Log visit'} description={initialVisit ? 'Patient, visit number and historical visit date are locked. Clinical content remains editable.' : 'The database assigns ownership and the next visit number.'} /><div className="grid gap-4 md:grid-cols-2"><SelectField label="Patient" value={patientId} onChange={setPatientId} disabled={Boolean(initialVisit)} options={patients.map((p) => ({ value: p.id, label: p.name }))} /><Field label="Date" type="date" value={date} disabled={Boolean(initialVisit)} onChange={(e) => setDate(e.target.value)} /><Field label="Treatment" value={treatment} onChange={(e) => setTreatment(e.target.value)} /><Field label="Duration (minutes)" type="number" min="0" step="1" value={duration} onChange={(e) => setDuration(e.target.value)} /><Field label="Modalities" value={modalities} onChange={(e) => setModalities(e.target.value)} /><Field label="Exercises" value={exercises} onChange={(e) => setExercises(e.target.value)} /><Field label="Authorization" value={authorization} onChange={(e) => setAuthorization(e.target.value)} /><div className="md:col-span-2"><TextArea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div></div>{error && <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}<div className="mt-6 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button><Button disabled={busy || !patientId || !treatment.trim()} onClick={() => void save()}><Check size={16} /> {busy ? 'Saving…' : initialVisit ? 'Save changes' : 'Save visit'}</Button></div></div>;
}

function InvoiceWorkspace({ workspace, editingInvoice, onOpen, onClose }: { workspace: WorkspaceState; editingInvoice: Invoice | null; onOpen: (invoice: Invoice) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  if (editingInvoice) { const current = workspace.workspaceInvoices.find((invoice) => invoice.id === editingInvoice.id) ?? editingInvoice; return <InvoiceEditor workspace={workspace} invoice={current} onClose={onClose} />; }
  const filtered = workspace.workspaceInvoices.filter((invoice) => [invoice.number, invoice.description, invoice.status, workspace.workspacePatients.find((p) => p.id === invoice.patientId)?.name ?? ''].join(' ').toLowerCase().includes(search.toLowerCase()));
  return <div><PageHeader eyebrow="Invoice workspace" title="Invoices" description="Drafts, corrections, finalization and payments all flow through WorkspaceController." action={<Button disabled={!workspace.workspacePatients.length} onClick={() => onOpen(workspace.createInvoice(workspace.workspacePatients[0].id))}><Plus size={16} /> New invoice</Button>} /><div className="mb-4 relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 w-full rounded-xl border bg-card pl-10 pr-4 text-sm" placeholder="Search invoices..." /></div><div className="overflow-hidden rounded-2xl border bg-card divide-y">{filtered.map((invoice) => <div key={invoice.id} className="grid gap-3 p-5 md:grid-cols-[1fr_1.3fr_.8fr_.8fr_auto] md:items-center"><div><p className="font-extrabold">{invoice.number}</p><p className="text-xs text-muted-foreground">{invoice.description}</p></div><p>{workspace.workspacePatients.find((p) => p.id === invoice.patientId)?.name ?? 'Patient'}</p><p className="font-bold">{money(invoice.total)}</p><p className="text-sm">{invoice.status}</p><Button variant="soft" onClick={() => onOpen(invoice)}><Pencil size={15} /> Open</Button></div>)}</div></div>;
}

function InvoiceEditor({ workspace, invoice, onClose }: { workspace: WorkspaceState; invoice: Invoice; onClose: () => void }) {
  const [form, setForm] = useState(invoice); const [correctionMode, setCorrectionMode] = useState(false); const [reason, setReason] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => { setForm(invoice); setCorrectionMode(false); setReason(''); }, [invoice.id, invoice.status, invoice.total, invoice.paid]);
  const financialLocked = invoice.status === 'Paid' || (invoice.finalized && !correctionMode); const update = <K extends keyof Invoice>(field: K, value: Invoice[K]) => setForm((current) => ({ ...current, [field]: value })); const previewTotal = calculateInvoiceTotal(form);
  const save = () => { const proposed = { ...form, total: previewTotal }; const result = workspace.updateInvoice(invoice.id, proposed, correctionMode ? reason : undefined); setMessage(result.ok ? (correctionMode ? 'Correction saved with audit entry.' : 'Draft saved.') : result.error); if (result.ok) setForm(result.invoice); };
  const finalize = () => { const saveResult = workspace.updateInvoice(invoice.id, { ...form, total: previewTotal }); if (!saveResult.ok) return setMessage(saveResult.error); const result = workspace.finalizeInvoice(saveResult.invoice); setMessage(result.ok ? 'Invoice finalized.' : result.error); };
  const pay = () => { const result = workspace.recordInvoicePayment(invoice, { userId: workspace.authUser.id, role: workspace.authUser.role, displayName: workspace.authUser.displayName }); setMessage(result.ok ? 'Payment recorded with audit entry.' : result.error); };
  return <div className="space-y-5"><Button variant="ghost" onClick={onClose}><ArrowLeft size={16} /> Back to invoices</Button><div className="rounded-2xl border bg-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">Invoice editor</p><h2 className="mt-1 text-xl font-extrabold">{invoice.number}</h2><p className="text-sm text-muted-foreground">{invoice.status}</p></div>{invoice.finalized && invoice.status !== 'Paid' && !correctionMode && <Button variant="soft" onClick={() => setCorrectionMode(true)}><Pencil size={15} /> Correct invoice</Button>}</div>{correctionMode && <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Financial correction mode. A reason is mandatory and will be added to the audit trail.</div>}<div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="Invoice number" value={invoice.number} disabled /><SelectField label="Patient" value={invoice.patientId} onChange={() => undefined} disabled options={workspace.workspacePatients.map((p) => ({ value: p.id, label: p.name }))} /><Field label="Description" value={form.description} onChange={(e) => update('description', e.target.value)} disabled={invoice.finalized} /><Field label="Sessions" value={form.sessions} onChange={(e) => update('sessions', e.target.value)} disabled={invoice.finalized} /><Field label="Start date" type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} disabled={invoice.finalized} /><Field label="End date" type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} disabled={invoice.finalized} /><Field label="Fee" type="number" value={form.fee} onChange={(e) => update('fee', Number(e.target.value) || 0)} disabled={financialLocked} /><Field label="Additional" type="number" value={form.additional} onChange={(e) => update('additional', Number(e.target.value) || 0)} disabled={financialLocked} /><Field label="Additional description" value={form.additionalDescription} onChange={(e) => update('additionalDescription', e.target.value)} disabled={financialLocked} /><Field label="Discount" type="number" value={form.discount} onChange={(e) => update('discount', Number(e.target.value) || 0)} disabled={financialLocked} /><Field label="GST rate" type="number" value={form.gstRate} onChange={(e) => update('gstRate', Number(e.target.value) || 0)} disabled={financialLocked} /><SelectField label="Payment method" value={form.paymentMethod} onChange={(value) => update('paymentMethod', value)} disabled={invoice.finalized} options={['Select payment method', 'UPI', 'Cash', 'Bank transfer', 'Card', 'Cheque', 'Other'].map((value) => ({ value, label: value }))} /></div>{correctionMode && <div className="mt-4"><TextArea label="Correction reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this finalized invoice needs a financial correction." /></div>}<div className="mt-5 grid gap-3 sm:grid-cols-3"><StatCard label="Total" value={money(previewTotal)} icon={ReceiptIndianRupee} /><StatCard label="Paid" value={money(invoice.paid)} icon={Check} /><StatCard label="Status" value={invoice.status} icon={ShieldCheck} /></div>{message && <div className="mt-4 rounded-xl bg-secondary p-3 text-sm">{message}</div>}<div className="mt-6 flex flex-wrap justify-end gap-2">{!invoice.finalized && <><Button variant="soft" onClick={save}>Save draft</Button><Button onClick={finalize}><ShieldCheck size={16} /> Finalize</Button></>}{correctionMode && <Button disabled={!reason.trim()} onClick={save}><Check size={16} /> Save correction</Button>}{invoice.finalized && invoice.status !== 'Paid' && !correctionMode && <Button onClick={pay}><Check size={16} /> Record payment</Button>}</div></div><InvoiceAuditHistory invoice={invoice} /></div>;
}

function InvoiceAuditHistory({ invoice }: { invoice: Invoice }) {
  const entries = invoice.auditTrail ?? [];
  return <section className="rounded-2xl border bg-card p-5"><h3 className="flex items-center gap-2 font-extrabold"><ShieldCheck size={18} /> Audit history</h3>{!entries.length && <p className="mt-2 text-sm text-muted-foreground">No recorded changes yet.</p>}<div className="mt-4 space-y-4">{entries.slice().reverse().map((entry) => <div key={entry.id} className="rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-bold capitalize">{entry.action}</p><p className="text-xs text-muted-foreground">{new Date(entry.changedAt).toLocaleString('en-IN')}</p></div><p className="mt-2 text-sm"><strong>{entry.changedBy}</strong> · {entry.reason}</p><div className="mt-3 grid gap-3 md:grid-cols-2"><pre className="overflow-auto rounded-lg bg-secondary/50 p-3 text-xs">{JSON.stringify(entry.before, null, 2)}</pre><pre className="overflow-auto rounded-lg bg-secondary/50 p-3 text-xs">{JSON.stringify(entry.after, null, 2)}</pre></div></div>)}</div></section>;
}

function ProfilePage({ workspace }: { workspace: WorkspaceState }) {
  const [draft, setDraft] = useState(workspace.profile); const set = <K extends keyof Profile>(field: K, value: Profile[K]) => setDraft((current) => ({ ...current, [field]: value }));
  return <div><PageHeader eyebrow="Provider profile" title="Your professional details" description="Display and billing fields only. Never store secret payment credentials here." /><div className="rounded-2xl border bg-card p-6"><div className="grid gap-4 md:grid-cols-2"><Field label="Full name" value={draft.fullName} onChange={(e) => set('fullName', e.target.value)} /><Field label="Title" value={draft.title} onChange={(e) => set('title', e.target.value)} /><Field label="Qualification" value={draft.qualification} onChange={(e) => set('qualification', e.target.value)} /><Field label="Registration" value={draft.registration} onChange={(e) => set('registration', e.target.value)} /><Field label="PAN" value={draft.pan} onChange={(e) => set('pan', e.target.value)} /><Field label="GSTIN" value={draft.gstin} onChange={(e) => set('gstin', e.target.value)} /><Field label="Phone" value={draft.phone} onChange={(e) => set('phone', e.target.value)} /><Field label="Email" value={draft.email} onChange={(e) => set('email', e.target.value)} /><Field label="Address" value={draft.address} onChange={(e) => set('address', e.target.value)} /><Field label="Logo URL" value={draft.logo} onChange={(e) => set('logo', e.target.value)} /><Field label="UPI display name" value={draft.upiName} onChange={(e) => set('upiName', e.target.value)} /><Field label="UPI ID" value={draft.upiId} onChange={(e) => set('upiId', e.target.value)} /><Field label="Bank name" value={draft.bankName} onChange={(e) => set('bankName', e.target.value)} /><Field label="Account number" value={draft.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} /><Field label="IFSC" value={draft.ifsc} onChange={(e) => set('ifsc', e.target.value)} /><Field label="Invoice prefix" value={draft.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase())} /><Field label="Payment account ID (future display reference)" value={draft.paymentAccountId ?? ''} onChange={(e) => set('paymentAccountId', e.target.value || undefined)} /><SelectField label="Payment account status" value={draft.paymentAccountStatus ?? 'not_connected'} onChange={(value) => set('paymentAccountStatus', value as Profile['paymentAccountStatus'])} options={['not_connected', 'pending', 'connected'].map((value) => ({ value, label: value.replace(/_/g, ' ') }))} /></div><div className="mt-6 flex justify-end"><Button onClick={() => workspace.setProfile(draft)}><Check size={16} /> Save profile</Button></div></div></div>;
}

function SettingsPage({ workspace }: { workspace: WorkspaceState }) {
  const [draft, setDraft] = useState(workspace.settings);
  return <div><PageHeader eyebrow="Practice settings" title="Billing defaults" /><div className="rounded-2xl border bg-card p-6 space-y-4"><Field label="Practice name" value={draft.practiceName} onChange={(e) => setDraft((c) => ({ ...c, practiceName: e.target.value }))} /><SelectField label="Default payment" value={draft.defaultPayment} onChange={(value) => setDraft((c) => ({ ...c, defaultPayment: value }))} options={['Select payment method', 'UPI', 'Cash', 'Bank transfer', 'Card', 'Cheque', 'Other'].map((value) => ({ value, label: value }))} /><TextArea label="Invoice footer note" value={draft.footerNote} onChange={(e) => setDraft((c) => ({ ...c, footerNote: e.target.value }))} /><Field label="Date format" value={draft.dateFormat} onChange={(e) => setDraft((c) => ({ ...c, dateFormat: e.target.value }))} /><label className="flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold"><input type="checkbox" checked={draft.showGst} onChange={(e) => setDraft((c) => ({ ...c, showGst: e.target.checked }))} /> Show GST fields by default</label><div className="flex justify-end"><Button onClick={() => workspace.setSettings(draft)}><Check size={16} /> Save settings</Button></div></div></div>;
}

function PatientPortal({ authUser }: { authUser: AuthUser }) {
  const [location] = useLocation(); const [, setAuthUser] = useAuthenticatedUser();
  const [profile] = usePersistentState<Profile>(`physiobill-profile-${DEMO_PHYSIO_ID}`, defaultProfile, (value) => ({ ...defaultProfile, ...value }));
  const [patients] = usePersistentState<Patient[]>(`physiobill-patients-${DEMO_PHYSIO_ID}`, demoPatients, normalizePatients);
  const [visits] = usePersistentState<Visit[]>(`physiobill-visits-${DEMO_PHYSIO_ID}`, demoVisits, normalizeVisits);
  const [invoices] = usePersistentState<Invoice[]>(`physiobill-invoices-${DEMO_PHYSIO_ID}`, demoInvoices, normalizeInvoices);
  const patient = patients.find((item) => item.userId === authUser.id && item.physioId === DEMO_PHYSIO_ID) ?? null;
  const patientVisits = patient ? visits.filter((visit) => visit.patientId === patient.id && visit.physioId === DEMO_PHYSIO_ID) : [];
  const patientInvoices = patient ? invoices.filter((invoice) => invoice.patientId === patient.id && invoice.physioId === DEMO_PHYSIO_ID) : [];
  const normalized = location.startsWith('/portal/') ? location.slice('/portal'.length) : '/';
  const content = normalized.startsWith('/visits') ? <PatientVisits visits={patientVisits} /> : normalized.startsWith('/invoices') || normalized.startsWith('/payments') ? <PatientInvoices invoices={patientInvoices} paymentStatusOnly={normalized.startsWith('/payments')} /> : <PatientDashboard patient={patient} visits={patientVisits} invoices={patientInvoices} physio={profile} />;
  return <div className="min-h-screen bg-background"><header className="border-b bg-card"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4"><div><p className="text-xs font-extrabold text-primary">PhysioBill Patient Portal</p><p className="text-sm text-muted-foreground">{profile.fullName || 'Your physiotherapist'}</p></div><Button variant="ghost" onClick={() => setAuthUser(null)}><LogOut size={16} /> Sign out</Button></div></header><nav className="mx-auto flex max-w-5xl gap-2 overflow-auto px-4 py-4"><Link href="/portal" className="rounded-xl bg-secondary px-3 py-2 text-sm font-bold">Overview</Link><Link href="/portal/visits" className="rounded-xl bg-secondary px-3 py-2 text-sm font-bold">My visits</Link><Link href="/portal/invoices" className="rounded-xl bg-secondary px-3 py-2 text-sm font-bold">My invoices</Link><Link href="/portal/payments" className="rounded-xl bg-secondary px-3 py-2 text-sm font-bold">Payments</Link></nav><main className="mx-auto max-w-5xl px-4 pb-10">{content}</main></div>;
}

function PatientDashboard({ patient, visits, invoices, physio }: { patient: Patient | null; visits: Visit[]; invoices: Invoice[]; physio: Profile }) {
  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(invoice.total - invoice.paid, 0), 0);
  if (!patient) return <div className="rounded-2xl border bg-card p-8"><h2 className="font-extrabold">No linked patient record</h2><p className="mt-2 text-sm text-muted-foreground">This demo account is not linked to a patient record.</p></div>;
  return <div className="space-y-6"><div className="rounded-2xl bg-primary p-7 text-primary-foreground"><p className="text-sm">Welcome, {patient.name}</p><h2 className="mt-2 text-3xl font-extrabold">Your care, in one private view.</h2><p className="mt-2 text-sm text-primary-foreground/75">Assigned physiotherapist: {physio.fullName || 'Demo Physiotherapist'}</p></div><div className="grid gap-3 sm:grid-cols-3"><StatCard label="Visits" value={String(visits.length)} icon={CalendarDays} /><StatCard label="Invoices" value={String(invoices.length)} icon={FileText} /><StatCard label="Outstanding" value={money(outstanding)} icon={WalletCards} /></div></div>;
}

function PatientVisits({ visits }: { visits: Visit[] }) { return <div><PageHeader eyebrow="Patient portal" title="My visits" /><div className="space-y-3">{visits.map((visit) => <div key={visit.id} className="rounded-2xl border bg-card p-5"><p className="font-extrabold">{dateLabel(visit.date)}</p><p className="mt-1 text-sm">{visit.treatment}</p><p className="mt-2 text-sm text-muted-foreground">{visit.notes}</p></div>)}</div></div>; }

function PatientInvoices({ invoices, paymentStatusOnly }: { invoices: Invoice[]; paymentStatusOnly: boolean }) { return <div><PageHeader eyebrow="Patient portal" title={paymentStatusOnly ? 'Payment status' : 'My invoices'} description="Payment settlement is not implemented in Phase 1. Production will route payment to the assigned physiotherapist’s connected account." /><div className="space-y-3">{invoices.map((invoice) => <div key={invoice.id} className="rounded-2xl border bg-card p-5"><div className="flex items-center justify-between"><div><p className="font-extrabold">{invoice.number}</p><p className="text-sm text-muted-foreground">{invoice.status}</p></div><p className="font-extrabold">{money(invoice.total)}</p></div>{invoice.status !== 'Paid' && <div className="mt-4 rounded-xl bg-secondary p-3 text-sm">Future payment action: pay the assigned physiotherapist through their connected provider account.</div>}</div>)}</div></div>; }

function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  return <div className="grid min-h-screen place-items-center bg-background p-4"><div className="w-full max-w-lg rounded-[28px] border bg-card p-8 shadow-sm"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><HeartPulse /></span><div><h1 className="text-2xl font-extrabold">PhysioBill</h1><p className="text-sm text-muted-foreground">Phase-1 demo session</p></div></div><div className="mt-7 rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">This is not production authentication. No password is stored. Real auth will replace this adapter in Phase 2.</div><div className="mt-6 grid gap-3 sm:grid-cols-2"><Button onClick={() => onLogin(demoAuthUser)}><LogIn size={16} /> Enter as physio</Button><Button variant="soft" onClick={() => onLogin(demoPatientAuthUser)}><UserRound size={16} /> Enter patient portal</Button></div></div></div>;
}

function ApplicationRouter() {
  const auth = useAuthSession();
  const [workspace, setWorkspace] = useState<ProductionWorkspace | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!auth.user) {
      setWorkspace(null);
      setWorkspaceError(null);
      return () => {
        active = false;
      };
    }

    setWorkspace(null);
    setWorkspaceError(null);
    loadProductionWorkspace(auth.user)
      .then((resolved) => {
        if (active) setWorkspace(resolved);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setWorkspaceError(
          error instanceof Error ? error.message : 'Unable to resolve the physiotherapist workspace.',
        );
      });

    return () => {
      active = false;
    };
  }, [auth.user?.id]);

  if (!auth.configured) {
    return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-lg rounded-2xl border bg-card p-6"><h1 className="font-extrabold">Supabase configuration required</h1><p className="mt-2 text-sm text-muted-foreground">The public Supabase URL and publishable key are not available to this deployment.</p></div></div>;
  }
  if (auth.loading) {
    return <div className="grid min-h-screen place-items-center text-sm font-semibold text-muted-foreground">Restoring secure session…</div>;
  }
  if (auth.error) {
    return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-lg rounded-2xl border border-destructive/20 bg-card p-6"><h1 className="font-extrabold text-destructive">Unable to restore session</h1><p className="mt-2 text-sm text-muted-foreground">{auth.error}</p></div></div>;
  }
  if (!auth.user) return <AuthPage />;
  if (workspaceError) {
    return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-lg rounded-2xl border border-destructive/20 bg-card p-6"><h1 className="font-extrabold text-destructive">Unable to open your workspace</h1><p className="mt-2 text-sm text-muted-foreground">{workspaceError}</p><button type="button" onClick={() => void signOutPhysiotherapist()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Sign out</button></div></div>;
  }
  if (!workspace) {
    return <div className="grid min-h-screen place-items-center text-sm font-semibold text-muted-foreground">Opening your private workspace…</div>;
  }

  return (
    <WorkspaceController
      authUser={workspace.authUser}
      currentPhysioId={workspace.physioId}
      initialProfile={workspace.profile}
      initialSettings={workspace.settings}
    />
  );
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter><ApplicationRouter /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
