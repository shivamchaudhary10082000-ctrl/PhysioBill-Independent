import {
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useEffect,
  useState,
} from 'react';

import {
  Link,
  Route,
  Switch,
  useLocation,
  useParams,
  Router as WouterRouter,
} from 'wouter';

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpenText,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  Copy,
  FilePlus2,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  ReceiptIndianRupee,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';

import { Toaster } from '@/Components/ui/toaster';
import { TooltipProvider } from '@/Components/ui/tooltip';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ErrorBoundary } from '@/Components/error-boundary';

/* =========================================================
   PHYSIOBILL — APPLICATION IDENTITY
   ========================================================= */

type UserRole = 'physio' | 'patient';

type AuthUser = {
  id: string;
  role: UserRole;
  displayName: string;
  email: string;
};

/*
 * IMPORTANT:
 * This is the application-level identity model.
 *
 * Phase 1:
 * The app is still running in local/demo mode.
 *
 * Future:
 * These values will come from real authentication.
 *
 * We must NOT treat localStorage as real authentication.
 */

type WorkspaceIdentity = {
  physioId: string;
};

/* =========================================================
   PHYSIOTHERAPIST PROFILE
   ========================================================= */

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

  /*
   * Future payment architecture.
   *
   * This must NEVER contain a secret payment credential.
   *
   * Later this will represent the physiotherapist's
   * connected payment identity on the selected provider.
   */
  paymentAccountId?: string;

  paymentAccountStatus?: 'not_connected' | 'pending' | 'connected';
};

/* =========================================================
   PHYSIO ↔ PATIENT RELATIONSHIP
   ========================================================= */

type PhysioPatientRelationship = {
  id: string;

  physioId: string;
  patientId: string;

  status: 'active' | 'inactive';

  createdAt: string;
};

/* =========================================================
   PATIENT
   ========================================================= */

type Patient = {
  id: string;

  /*
   * Future production ownership boundary.
   *
   * A patient belongs to a physiotherapist through the
   * explicit relationship model above.
   *
   * This field is retained as a convenient denormalized
   * ownership reference for the prototype and future API.
   */
  physioId?: string;

  /*
   * Future authentication identity.
   *
   * This is NOT a password and must never contain one.
   */
  userId?: string;

  patientNumber: string;

  name: string;
  phone: string;
  email: string;
  address: string;
  age: string;

  condition: string;

  referringDoctor: string;
  referralDate: string;

  insuranceTpa: string;
  policyMemberId: string;

  notes: string;
};

/* =========================================================
   VISIT
   ========================================================= */

type Visit = {
  id: string;

  /*
   * Ownership references.
   *
   * In production these will be validated server-side.
   */
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

/* =========================================================
   INVOICE STATUS
   ========================================================= */

type InvoiceStatus =
  | 'Paid'
  | 'Part paid'
  | 'Outstanding'
  | 'Draft';

/* =========================================================
   INVOICE AUDIT
   ========================================================= */

/*
 * Audit actions are deliberately explicit.
 *
 * "payment" is separate from "correction".
 *
 * This prevents a payment mutation from being disguised
 * as a generic invoice edit.
 */

type InvoiceAuditAction =
  | 'correction'
  | 'edit'
  | 'payment';

/*
 * Audit identity.
 *
 * Phase 1:
 * We can use the current provider profile.
 *
 * Future:
 * This will come from the authenticated backend user.
 */

type AuditActor = {
  userId: string;
  role: UserRole;
  displayName: string;
};

/*
 * One immutable audit event.
 *
 * Before/after values are stored explicitly so the history
 * can be independently reviewed.
 */

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

/* =========================================================
   INVOICE
   ========================================================= */

type Invoice = {
  id: string;

  /*
   * Production ownership.
   *
   * These are not security boundaries on the client.
   * The eventual backend/database must enforce them.
   */
  physioId?: string;
  patientId: string;

  /*
   * Same invoice number must survive corrections.
   *
   * Correction changes the invoice record and adds an
   * audit event — it does NOT generate a replacement
   * invoice number.
   */
  number: string;

  description: string;

  sessions: string;

  startDate: string;
  endDate: string;

  /*
   * Financial fields
   */
  fee: number;
  additional: number;
  additionalDescription: string;

  discount: number;
  gstRate: number;

  total: number;

  paid: number;

  paymentMethod: string;

  /*
   * Lifecycle
   */
  finalized: boolean;

  status: InvoiceStatus;

  createdAt: string;

  /*
   * Controlled audit history.
   */
  auditTrail?: InvoiceAuditEntry[];
};

/* =========================================================
   SETTINGS
   ========================================================= */

type Settings = {
  practiceName: string;

  defaultPayment: string;

  footerNote: string;

  showGst: boolean;

  dateFormat: string;
};

/* =========================================================
   QUERY CLIENT
   ========================================================= */

const queryClient = new QueryClient();

/* =========================================================
   DATE / DISPLAY HELPERS
   ========================================================= */

const today = new Date().toISOString().slice(0, 10);

const currentYear = new Date().getFullYear();

const iso = (offset: number) =>
  new Date(
    Date.now() + offset * 86400000,
  )
    .toISOString()
    .slice(0, 10);

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

const headerDateLabel =
  new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'PT';

/* =========================================================
   SEQUENTIAL IDS
   ========================================================= */

const formatSequentialId = (
  prefix: string,
  year: number,
  sequence: number,
) =>
  `${prefix}-${year}-${String(sequence).padStart(6, '0')}`;

const extractSequence = (
  value: string | undefined,
  prefix: string,
) => {
  const match = value?.match(
    new RegExp(
      `^${prefix}-(?:\\d{4}-)?(\\d+)$`,
    ),
  );

  return match ? Number(match[1]) : 0;
};

const nextSequentialId = (
  prefix: string,
  values: string[],
) =>
  formatSequentialId(
    prefix,
    currentYear,
    values.reduce(
      (max, value) =>
        Math.max(
          max,
          extractSequence(value, prefix),
        ),
      0,
    ) + 1,
  );

/* =========================================================
   INVOICE STATUS
   ========================================================= */

const deriveInvoiceStatus = (
  total: number,
  paid: number,
  finalized: boolean,
): InvoiceStatus => {
  if (!finalized) return 'Draft';

  const balance = Math.max(
    total - paid,
    0,
  );

  if (balance === 0) return 'Paid';

  if (paid > 0) return 'Part paid';

  return 'Outstanding';
};

const invoiceTone = (
  status: InvoiceStatus,
): 'neutral' | 'green' | 'amber' | 'coral' =>
  status === 'Paid'
    ? 'green'
    : status === 'Part paid'
      ? 'amber'
      : status === 'Draft'
        ? 'neutral'
        : 'coral';

const paymentMethods = [
  'Select payment method',
  'UPI',
  'Cash',
  'Bank transfer',
  'Card',
  'Cheque',
  'Other',
] as const;

/* =========================================================
   DEFAULT PROFILE / SETTINGS
   ========================================================= */

const DEMO_PHYSIO_ID = 'physio-demo-001';

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
  footerNote:
    'Thank you for choosing independent physiotherapy care.',
  showGst: false,
  dateFormat: 'DD MMM YYYY',
};

const demoAuthUser: AuthUser = {
  id: DEMO_PHYSIO_ID,
  role: 'physio',
  displayName: 'Demo Physiotherapist',
  email: 'demo@physiobill.local',
};

const demoWorkspace: WorkspaceIdentity = {
  physioId: DEMO_PHYSIO_ID,
};

/*
 * Demo relationships are created after demoPatients has been
 * declared. They must not execute before that declaration.
 *
 * The relationship construction is therefore intentionally
 * placed with the demo patient data section below.
 */

/* =========================================================
   WORKSPACE NORMALIZATION
   ========================================================= */

const normalizePatientsForWorkspace = (
  items: Patient[],
  physioId: string,
) =>
  normalizePatients(items).map((patient) => ({
    ...patient,
    physioId,
  }));

const normalizeVisitsForWorkspace = (
  items: Visit[],
  physioId: string,
) =>
  normalizeVisits(items).map((visit) => ({
    ...visit,
    physioId,
  }));

const normalizeInvoicesForWorkspace = (
  items: Invoice[],
  physioId: string,
) =>
  normalizeInvoices(items).map((invoice) => ({
    ...invoice,
    physioId,
  }));

const belongsToPhysio = (
  physioId: string | undefined,
  currentPhysioId: string,
) =>
  physioId === currentPhysioId;

const getWorkspacePatients = (
  patients: Patient[],
  physioId: string,
) =>
  patients.filter((patient) =>
    belongsToPhysio(patient.physioId, physioId),
  );

const getWorkspaceVisits = (
  visits: Visit[],
  physioId: string,
) =>
  visits.filter((visit) =>
    belongsToPhysio(visit.physioId, physioId),
  );

const getWorkspaceInvoices = (
  invoices: Invoice[],
  physioId: string,
) =>
  invoices.filter((invoice) =>
    belongsToPhysio(invoice.physioId, physioId),
  );

/* =========================================================
   INVOICE AUDIT / CONTROLLED MUTATIONS
   ========================================================= */
const createAuditId = () =>
  `audit-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

const createAuditEntry = (
  action: InvoiceAuditAction,
  reason: string,
  before: Invoice,
  after: Invoice,
  actor: AuditActor,
): InvoiceAuditEntry => ({
  id: createAuditId(),

  action,

  reason: reason.trim(),

  changedAt: new Date().toISOString(),

  changedBy: actor.displayName,

  changedByUserId: actor.userId,

  changedByRole: actor.role,

  changedFields: getInvoiceChangedFields(
    before,
    after,
  ),

  before: Object.fromEntries(
    invoiceEditableFields
      .filter(
        (field) =>
          before[field] !== after[field],
      )
      .map((field) => [
        field,
        before[field],
      ]),
  ),

  after: Object.fromEntries(
    invoiceEditableFields
      .filter(
        (field) =>
          before[field] !== after[field],
      )
      .map((field) => [
        field,
        after[field],
      ]),
  ),
});

type InvoiceMutationResult =
  | {
      ok: true;
      invoice: Invoice;
    }
  | {
      ok: false;
      error: string;
    };

const validateInvoiceCorrection = (
  before: Invoice,
  after: Invoice,
  reason: string,
) => {
  if (!reason.trim()) {
    return 'A correction reason is required.';
  }

  if (!before.finalized) {
    return 'Draft invoices should be edited normally.';
  }

  if (before.status === 'Paid') {
    return 'Paid invoices cannot be financially corrected.';
  }

  if (!hasInvoiceFinancialChanges(before, after)) {
    return 'No financial change was detected.';
  }

  if (after.number !== before.number) {
    return 'Invoice number cannot change during correction.';
  }

  /*
   * Payment mutations must use the dedicated payment workflow.
   * A correction cannot be used to alter the amount already paid.
   */
  if (after.paid !== before.paid) {
    return 'Paid amount must be changed through the payment workflow.';
  }

  if (after.total < 0) {
    return 'Invoice total cannot be negative.';
  }

  if (after.paid < 0) {
    return 'Paid amount cannot be negative.';
  }

  if (after.paid > after.total) {
    return 'Paid amount cannot exceed the invoice total.';
  }

  return null;
};

const correctFinalizedInvoice = (
  before: Invoice,
  proposed: Invoice,
  reason: string,
  actor: AuditActor,
): InvoiceMutationResult => {
  const validationError =
    validateInvoiceCorrection(
      before,
      proposed,
      reason,
    );

  if (validationError) {
    return {
      ok: false,
      error: validationError,
    };
  }

  /*
   * Preserve immutable identity and ownership.
   *
   * Workspace ownership is never taken from an arbitrary
   * proposed client-side object.
   */
  const corrected: Invoice = {
    ...proposed,

    id: before.id,

    number: before.number,

    physioId: before.physioId,

    patientId: before.patientId,

    finalized: true,

    total:
      Math.round(
        (
          proposed.fee +
          proposed.additional -
          proposed.discount
        ) *
          (1 + proposed.gstRate / 100) *
          100,
      ) / 100,

    status: 'Draft',

    auditTrail: before.auditTrail ?? [],
  };

  corrected.status = deriveInvoiceStatus(
    corrected.total,
    corrected.paid,
    true,
  );

  const audit = createAuditEntry(
    'correction',
    reason,
    before,
    corrected,
    actor,
  );

  return {
    ok: true,

    invoice: {
      ...corrected,

      auditTrail: [
        ...(before.auditTrail ?? []),
        audit,
      ],
    },
  };
};
const markInvoicePaid = (
  before: Invoice,
  actor: AuditActor,
): InvoiceMutationResult => {
  if (!before.finalized) {
    return {
      ok: false,
      error:
        'A draft invoice must be finalized before payment can be recorded.',
    };
  }

  if (before.status === 'Paid') {
    return {
      ok: false,
      error: 'This invoice is already paid.',
    };
  }

  if (before.paid >= before.total) {
    return {
      ok: false,
      error: 'This invoice has no outstanding balance.',
    };
  }

  const after: Invoice = {
    ...before,

    /*
     * Ownership is preserved from the existing invoice.
     * The payment mutation must not silently move an invoice
     * into another workspace.
     */
    physioId: before.physioId,

    paid: before.total,

    status: 'Paid',

    finalized: true,
  };

  const audit = createAuditEntry(
    'payment',
    'Invoice marked as paid.',
    before,
    after,
    actor,
  );

  return {
    ok: true,

    invoice: {
      ...after,

      auditTrail: [
        ...(before.auditTrail ?? []),
        audit,
      ],
    },
  };
};

const isFinancialFieldLocked = (
  invoice: Invoice,
) =>
  invoice.finalized || invoice.status === 'Paid';

const canDirectlyEditFinancialFields = (
  invoice: Invoice,
) =>
  !invoice.finalized &&
  invoice.status !== 'Paid';

const canCorrectInvoice = (
  invoice: Invoice,
) =>
  invoice.finalized &&
  invoice.status !== 'Paid';

/* =========================================================
   INVOICE AUDIT HISTORY
   ========================================================= */

function InvoiceAuditHistory({
  invoice,
}: {
  invoice: Invoice;
}) {
  const entries = invoice.auditTrail ?? [];

  if (!entries.length) {
    return (
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck
            size={18}
            className="text-primary"
          />

          <h3 className="font-bold">
            Audit history
          </h3>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          No recorded changes yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck
          size={18}
          className="text-primary"
        />

        <h3 className="font-bold">
          Audit history
        </h3>
      </div>

      <div className="mt-5 space-y-5">
        {entries
          .slice()
          .reverse()
          .map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border bg-background p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold capitalize">
                    {entry.action === 'correction'
                      ? 'Financial correction'
                      : entry.action === 'payment'
                        ? 'Payment recorded'
                        : 'Invoice edited'}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(
                      entry.changedAt,
                    ).toLocaleString('en-IN')}
                  </p>
                </div>

                <Badge tone="blue">
                  {entry.changedBy}
                </Badge>
              </div>

              <div className="mt-4 rounded-xl bg-secondary/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                  Reason
                </p>

                <p className="mt-1 text-sm">
                  {entry.reason}
                </p>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                  Changed fields
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.changedFields.map(
                    (field) => (
                      <span
                        key={field}
                        className="rounded-full border px-2.5 py-1 text-xs"
                      >
                        {field}
                      </span>
                    ),
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                    Before
                  </p>

                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
                    {JSON.stringify(
                      entry.before,
                      null,
                      2,
                    )}
                  </pre>
                </div>

                <div className="rounded-xl border p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                    After
                  </p>

                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
                    {JSON.stringify(
                      entry.after,
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}


function CorrectionReasonModal({
  open,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold">
              Correct invoice
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              This creates an auditable correction.
              The invoice number will remain unchanged.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Close correction dialog"
            className="rounded-xl p-2 hover:bg-secondary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6">
          <label
            htmlFor="correction-reason"
            className="text-sm font-bold"
          >
            Reason for correction
          </label>

          <textarea
            id="correction-reason"
            value={reason}
            onChange={(event) =>
              onReasonChange(event.target.value)
            }
            placeholder="Explain why the finalized invoice needs correction."
            rows={5}
            className="mt-2 w-full rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />

          <p className="mt-2 text-xs text-muted-foreground">
            A reason is mandatory and will be permanently
            recorded in the invoice audit history.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!reason.trim()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            Confirm correction
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   APPLICATION STATE / WORKSPACE
   ========================================================= */

const DEMO_PHYSIO_ID = 'physio-demo-001';

const demoAuthUser: AuthUser = {
  id: DEMO_PHYSIO_ID,
  role: 'physio',
  displayName: 'Demo Physiotherapist',
  email: 'demo@physiobill.local',
};

const demoWorkspace: WorkspaceIdentity = {
  physioId: DEMO_PHYSIO_ID,
};

const demoRelationships: PhysioPatientRelationship[] =
  demoPatients.map((patient) => ({
    id: `relationship-${patient.id}`,
    physioId: DEMO_PHYSIO_ID,
    patientId: patient.id,
    status: 'active',
    createdAt: new Date().toISOString(),
  }));

const normalizePatientsForWorkspace = (
  items: Patient[],
  physioId: string,
): Patient[] =>
  normalizePatients(items).map((patient) => ({
    ...patient,
    physioId,
  }));

const normalizeVisitsForWorkspace = (
  items: Visit[],
  physioId: string,
): Visit[] =>
  normalizeVisits(items).map((visit) => ({
    ...visit,
    physioId,
  }));

const normalizeInvoicesForWorkspace = (
  items: Invoice[],
  physioId: string,
): Invoice[] =>
  normalizeInvoices(items).map((invoice) => ({
    ...invoice,
    physioId,
  }));

const belongsToPhysio = (
  physioId: string | undefined,
  currentPhysioId: string,
): boolean =>
  physioId === currentPhysioId;

const getWorkspacePatients = (
  patients: Patient[],
  physioId: string,
): Patient[] =>
  patients.filter((patient) =>
    belongsToPhysio(
      patient.physioId,
      physioId,
    ),
  );

const getWorkspaceVisits = (
  visits: Visit[],
  physioId: string,
): Visit[] =>
  visits.filter((visit) =>
    belongsToPhysio(
      visit.physioId,
      physioId,
    ),
  );

const getWorkspaceInvoices = (
  invoices: Invoice[],
  physioId: string,
): Invoice[] =>
  invoices.filter((invoice) =>
    belongsToPhysio(
      invoice.physioId,
      physioId,
    ),
  );

const createAuditId = () =>
  `audit-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
/* =========================================================
   PERSISTENT STATE
   ========================================================= */

function usePersistentState<T>(
  key: string,
  initial: T,
  normalize?: (value: T) => T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      const parsed = saved
        ? (JSON.parse(saved) as T)
        : initial;

      return normalize
        ? normalize(parsed)
        : parsed;
    } catch {
      return normalize
        ? normalize(initial)
        : initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value),
      );
    } catch {
      /*
       * Local demo persistence is best-effort.
       * A production backend will replace this layer.
       */
    }
  }, [key, value]);

  return [value, setValue] as const;
}

/* =========================================================
   REUSABLE UI
   ========================================================= */

function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: {
  children: ReactNode;
  variant?:
    | 'primary'
    | 'soft'
    | 'ghost'
    | 'danger';
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary:
      'bg-primary text-primary-foreground shadow-[0_4px_12px_hsl(var(--primary)/.16)] hover:-translate-y-px',
    soft:
      'bg-secondary text-secondary-foreground hover:bg-accent/35',
    ghost:
      'bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
    danger:
      'bg-destructive/10 text-destructive hover:bg-destructive/15',
  };
return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  ...props
}: {
  label: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">
        <span>{label}</span>

        {hint && (
          <span className="font-normal normal-case tracking-normal">
            {hint}
          </span>
        )}
      </span>

      <input
        className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm outline-none transition-shadow placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/10"
        {...props}
      />
    </label>
  );
}
function TextArea({
  label,
  ...props
}: {
  label: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">
        {label}
      </span>

      <textarea
        className="min-h-24 w-full resize-y rounded-xl border bg-card px-3.5 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/10"
        {...props}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  label: string;
  value: string | number;
  onChange: (
    event: ChangeEvent<HTMLSelectElement>,
  ) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">
        {label}
      </span>

      <select
        disabled={disabled}
        value={value}
        onChange={onChange}
        className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70"
      >
        {children}
      </select>
    </label>
  );
}

function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?:
    | 'neutral'
    | 'green'
    | 'amber'
    | 'coral'
    | 'blue';
}) {
const tones = {
    neutral:
      'bg-muted text-muted-foreground',
    green:
      'bg-primary/10 text-primary',
    amber:
      'bg-amber-100 text-amber-800',
    coral:
      'bg-accent/25 text-foreground',
    blue:
      'bg-sky-100 text-sky-800',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/70 px-6 py-16 text-center">
      <div className="mb-4 rounded-2xl bg-secondary p-4 text-primary">
        <Icon size={25} />
      </div>

      <h3 className="text-lg font-bold">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  );
}
/* =========================================================
   WORKSPACE STATE / WORKSPACE CONTROLLER
   ========================================================= */

type WorkspaceState = {
  authUser: AuthUser;

  profile: Profile;
  setProfile: (
    value:
      | Profile
      | ((previous: Profile) => Profile),
  ) => void;

  settings: Settings;
  setSettings: (
    value:
      | Settings
      | ((previous: Settings) => Settings),
  ) => void;

  patients: Patient[];
  setPatients: (
    value:
      | Patient[]
      | ((previous: Patient[]) => Patient[]),
  ) => void;

  visits: Visit[];
  setVisits: (
    value:
      | Visit[]
      | ((previous: Visit[]) => Visit[]),
  ) => void;

  invoices: Invoice[];
  setInvoices: (
    value:
      | Invoice[]
      | ((previous: Invoice[]) => Invoice[]),
  ) => void;

  workspacePatients: Patient[];
  workspaceVisits: Visit[];
  workspaceInvoices: Invoice[];

  currentPhysioId: string;

  updateInvoice: (
    invoiceId: string,
    proposed: Invoice,
    reason?: string,
  ) => InvoiceMutationResult;

  finalizeInvoice: (
    invoice: Invoice,
  ) => InvoiceMutationResult;

  recordInvoicePayment: (
    invoice: Invoice,
    actor: AuditActor,
  ) => InvoiceMutationResult;
};

/* =========================================================
   AUTHENTICATED USER
   ========================================================= */

function useAuthenticatedUser(): AuthUser | null {
  const [authUser] =
    usePersistentState<AuthUser | null>(
      'physiobill-demo-auth-user',
      demoAuthUser,
    );

  return authUser;
}

/* =========================================================
   WORKSPACE CONTROLLER
   ========================================================= */

function WorkspaceController({
  authUser,
}: {
  authUser: AuthUser;
}) {
  const currentPhysioId =
    authUser.role === 'physio'
      ? authUser.id
      : DEMO_PHYSIO_ID;

  /* =======================================================
     PROFILE
     ======================================================= */

  const [profile, setProfile] =
    usePersistentState<Profile>(
     `physiobill-profile-${currentPhysioId}`,
      {
        ...defaultProfile,
        id: currentPhysioId,
      },
      (value) => ({
        ...defaultProfile,
        ...value,
        id: value.id || currentPhysioId,
      }),
    );

  /* =======================================================
     SETTINGS
     ======================================================= */

  const [settings, setSettings] =
    usePersistentState<Settings>(
      `physiobill-settings-${currentPhysioId}`,
      defaultSettings,
      normalizeSettings,
    );

  /* =======================================================
     PATIENTS
     ======================================================= */

  const [patients, setPatients] =
    usePersistentState<Patient[]>(
      `physiobill-patients-${currentPhysioId}`,
      normalizePatientsForWorkspace(
        demoPatients,
        currentPhysioId,
      ),
      (value) =>
        normalizePatientsForWorkspace(
          value,
          currentPhysioId,
        ),
    );

  /* =======================================================
     VISITS
     ======================================================= */

  const [visits, setVisits] =
    usePersistentState<Visit[]>(
      `physiobill-visits-${currentPhysioId}`,
      normalizeVisitsForWorkspace(
        demoVisits,
        currentPhysioId,
      ),
      (value) =>
        normalizeVisitsForWorkspace(
          value,
          currentPhysioId,
        ),
    );

  /* =======================================================
     INVOICES
     ======================================================= */

  const [invoices, setInvoices] =
    usePersistentState<Invoice[]>(
      `physiobill-invoices-${currentPhysioId}`,
      normalizeInvoicesForWorkspace(
        demoInvoices,
        currentPhysioId,
      ),
      (value) =>
        normalizeInvoicesForWorkspace(
          value,
          currentPhysioId,
        ),
    );

  /* =======================================================
     WORKSPACE-SCOPED DATA
     ======================================================= */

  const workspacePatients =
    getWorkspacePatients(
      patients,
      currentPhysioId,
    );

  const workspaceVisits =
    getWorkspaceVisits(
      visits,
      currentPhysioId,
    );

  const workspaceInvoices =
    getWorkspaceInvoices(
      invoices,
      currentPhysioId,
    );

  /* =======================================================
     CONTROLLED INVOICE UPDATE
     ======================================================= */

  const updateInvoice = (
    invoiceId: string,
    proposed: Invoice,
    reason?: string,
  ): InvoiceMutationResult => {
    const existing =
      workspaceInvoices.find(
        (invoice) =>
          invoice.id === invoiceId,
      );

    if (!existing) {
      return {
        ok: false,
        error: 'Invoice not found.',
      };
    }

    /*
     * Never allow an invoice to be moved into
     * another physiotherapist workspace.
     */
    if (
      proposed.physioId &&
      proposed.physioId !== currentPhysioId
    ) {
      return {
        ok: false,
        error:
          'Invoice does not belong to the current workspace.',
      };
    }

    /*
     * Invoice number is immutable.
     */
    if (
      proposed.number !== existing.number
    ) {
      return {
        ok: false,
        error:
          'Invoice number cannot be changed.',
      };
    }
    /*
     * PAID INVOICES ARE FINANCIALLY LOCKED.
     *
     * This check must happen before the
     * finalized-correction workflow.
     */
    if (
      existing.status === 'Paid' &&
      hasInvoiceFinancialChanges(
        existing,
        proposed,
      )
    ) {
      return {
        ok: false,
        error:
          'Paid invoices cannot be financially edited.',
      };
    }

    /*
     * FINALIZED INVOICE
     *
     * Any financial change must go through
     * the controlled correction workflow.
     */
    if (
      existing.finalized &&
      hasInvoiceFinancialChanges(
        existing,
        proposed,
      )
    ) {
      if (!reason?.trim()) {
        return {
          ok: false,
          error:
            'A correction reason is required for finalized financial changes.',
        };
      }

      const correction =
        correctFinalizedInvoice(
          existing,
          {
            ...proposed,
            id: existing.id,
            number: existing.number,
            physioId:
              existing.physioId ??
              currentPhysioId,
          },
          reason,
          {
            userId: authUser.id,
            role: authUser.role,
            displayName:
              authUser.displayName,
          },
        );

      if (!correction.ok) {
        return correction;
      }

      setInvoices((current) =>
        current.map((invoice) =>
          invoice.id === invoiceId &&
          belongsToPhysio(
            invoice.physioId,
            currentPhysioId,
          )
            ? correction.invoice
            : invoice,
        ),
      );

      return correction;
    }

    /*
     * PAYMENT CHANGES MUST NEVER HAPPEN THROUGH
     * THE NORMAL EDITOR.
     */
    if (
      existing.finalized &&
      proposed.paid !== existing.paid
    ) {
      return {
        ok: false,
        error:
          'Payment changes must be recorded through the payment workflow.',
      };
    }

    /*
     * ALL OTHER FINALIZED EDITS ARE LOCKED.
     */
    if (existing.finalized) {
      return {
        ok: false,
        error:
          'Finalized invoices must be corrected through the correction workflow.',
      };
    }

    /*
     * DRAFT UPDATE
     *
     * Draft invoices can be edited normally.
     */
    const updated: Invoice = {
      ...proposed,

      id: existing.id,

      number: existing.number,

      physioId:
        existing.physioId ??
        currentPhysioId,

      status: deriveInvoiceStatus(
        proposed.total,
        proposed.paid,
        proposed.finalized,
      ),
    };

    setInvoices((current) =>
      current.map((invoice) =>
        invoice.id === invoiceId &&
        belongsToPhysio(
          invoice.physioId,
          currentPhysioId,
        )
          ? updated
          : invoice,
      ),
    );

    return {
      ok: true,
      invoice: updated,
    };
  };

  /* =======================================================
     FINALIZE INVOICE
     ======================================================= */

  const finalizeInvoice = (
    invoice: Invoice,
  ): InvoiceMutationResult => {
    if (
      !belongsToPhysio(
        invoice.physioId,
        currentPhysioId,
      )
    ) {
      return {
        ok: false,
        error:
          'Invoice does not belong to the current workspace.',
      };
    }

    if (invoice.finalized) {
      return {
        ok: false,
        error:
          'Invoice is already finalized.',
      };
    }

    if (invoice.status === 'Paid') {
      return {
        ok: false,
        error:
          'Paid invoices do not need to be finalized again.',
      };
    }

    const after: Invoice = {
      ...invoice,

      physioId:
        invoice.physioId ??
        currentPhysioId,

      finalized: true,

      status: deriveInvoiceStatus(
        invoice.total,
        invoice.paid,
        true,
      ),
    };

    setInvoices((current) =>
      current.map((item) =>
        item.id === invoice.id &&
        belongsToPhysio(
          item.physioId,
          currentPhysioId,
        )
          ? after
          : item,
      ),
    );

    return {
      ok: true,
      invoice: after,
    };
  };

  /* =======================================================
     PAYMENT WORKFLOW
     ======================================================= */

  const recordInvoicePayment = (
    invoice: Invoice,
    actor: AuditActor,
  ): InvoiceMutationResult => {
    if (
      !belongsToPhysio(
        invoice.physioId,
        currentPhysioId,
      )
    ) {
      return {
        ok: false,
        error:
          'Invoice does not belong to the current workspace.',
      };
    }

    if (!invoice.finalized) {
      return {
        ok: false,
        error:
          'A draft invoice must be finalized before payment can be recorded.',
      };
    }

    if (invoice.status === 'Paid') {
      return {
        ok: false,
        error:
          'This invoice is already paid.',
      };
    }

    if (invoice.paid >= invoice.total) {
      return {
        ok: false,
        error:
          'This invoice has no outstanding balance.',
      };
    }

    const after: Invoice = {
      ...invoice,

      physioId:
        invoice.physioId ??
        currentPhysioId,

      paid: invoice.total,

      status: 'Paid',
    };

    const audit =
      createAuditEntry(
        'payment',
        'Invoice marked as paid.',
        invoice,
        after,
        actor,
      );

    const result: Invoice = {
      ...after,

      auditTrail: [
        ...(invoice.auditTrail ?? []),
        audit,
      ],
    };

    setInvoices((current) =>
      current.map((item) =>
        item.id === invoice.id &&
        belongsToPhysio(
          item.physioId,
          currentPhysioId,
        )
          ? result
          : item,
      ),
    );

    return {
      ok: true,
      invoice: result,
    };
  };

  /* =======================================================
     WORKSPACE OBJECT
     ======================================================= */

  const workspace: WorkspaceState = {
    authUser,

    profile,
    setProfile,

    settings,
    setSettings,

    patients,
    setPatients,

    visits,
    setVisits,

    invoices,
    setInvoices,

    workspacePatients,
    workspaceVisits,
    workspaceInvoices,

    currentPhysioId,

    updateInvoice,
    finalizeInvoice,
    recordInvoicePayment,
  };

  return (
    <PhysioWorkspace
      workspace={workspace}
    />
  );
}
/* =========================================================
   PHYSIO WORKSPACE
   ========================================================= */

function PhysioWorkspace({
  workspace,
}: {
  workspace: WorkspaceState;
}) {
  const [location, setLocation] =
    useLocation();

  const [editingInvoiceId, setEditingInvoiceId] =
    useState<string | null>(null);

  const [showPatientForm, setShowPatientForm] =
    useState(false);

  const [showVisitForm, setShowVisitForm] =
    useState(false);

  const editingInvoice =
    workspace.workspaceInvoices.find(
      (invoice) =>
        invoice.id === editingInvoiceId,
    ) ?? null;

  const openInvoice = (invoice: Invoice) => {
    setEditingInvoiceId(invoice.id);
    setLocation('/invoices');
  };

  const closeInvoiceEditor = () => {
    setEditingInvoiceId(null);
  };

  const handleInvoiceSaved = (
    invoice: Invoice,
  ) => {
    /*
     * Invoice mutations have already been
     * performed by the existing controller.
     *
     * This layer only controls presentation.
     */
    setEditingInvoiceId(invoice.id);
  };

  const handlePatientSaved = (
    patient: Patient,
  ) => {
    const patientNumber =
      patient.patientNumber ||
      nextSequentialId(
        'PT',
        workspace.patients.map(
          (item) =>
            item.patientNumber,
        ),
      );

    const savedPatient: Patient = {
      ...patient,
      id:
        patient.id ||
        `patient-${Date.now()}`,
      patientNumber,
      physioId:
        workspace.currentPhysioId,
    };

    workspace.setPatients(
      (current) => [
        ...current,
        savedPatient,
      ],
    );

    setShowPatientForm(false);
  };

  const handleVisitSaved = (
    visit: Visit,
  ) => {
    const visitNumber =
      visit.visitNumber ||
      nextSequentialId(
        'VIS',
        workspace.visits.map(
          (item) =>
            item.visitNumber,
        ),
      );

    const savedVisit: Visit = {
      ...visit,
      id:
        visit.id ||
        `visit-${Date.now()}`,
      visitNumber,
      physioId:
        workspace.currentPhysioId,
    };

    workspace.setVisits(
      (current) => [
        ...current,
        savedVisit,
      ],
    );

    setShowVisitForm(false);
  };

  const renderPage = () => {
    if (
      location.startsWith('/patients')
    ) {
      if (showPatientForm) {
        return (
          <PatientForm
            onSave={handlePatientSaved}
            onCancel={() =>
              setShowPatientForm(false)
            }
          />
        );
      }

      return (
        <PatientsPage
          patients={
            workspace.workspacePatients
          }
          visits={
            workspace.workspaceVisits
          }
          invoices={
            workspace.workspaceInvoices
          }
          onAddPatient={() =>
            setShowPatientForm(true)
          }
        />
      );
    }

    if (
      location.startsWith('/visits')
    ) {
      if (showVisitForm) {
        return (
          <VisitForm
            patients={
              workspace.workspacePatients
            }
            onSave={handleVisitSaved}
            onCancel={() =>
              setShowVisitForm(false)
            }
          />
        );
      }

      return (
        <VisitsPage
          visits={
            workspace.workspaceVisits
          }
          patients={
            workspace.workspacePatients
          }
          onAddVisit={() =>
            setShowVisitForm(true)
          }
        />
      );
    }

    if (
      location.startsWith('/invoices')
    ) {
      return (
        <InvoiceWorkspace
          invoices={
            workspace.workspaceInvoices
          }
          patients={
            workspace.workspacePatients
          }
          editingInvoice={
            editingInvoice
          }
          authUser={
            workspace.authUser
          }
          updateInvoice={
            workspace.updateInvoice
          }
          finalizeInvoice={
            workspace.finalizeInvoice
          }
          recordInvoicePayment={
            workspace.recordInvoicePayment
          }
          onOpenInvoice={
            openInvoice
          }
          onCloseEditor={
            closeInvoiceEditor
          }
          onSaved={
            handleInvoiceSaved
          }
        />
      );
    }
return (
      <Dashboard
        patients={
          workspace.workspacePatients
        }
        visits={
          workspace.workspaceVisits
        }
        invoices={
          workspace.workspaceInvoices
        }
        profile={
          workspace.profile
        }
      />
    );
  };

  return (
    <AppShell
      profile={workspace.profile}
    >
      {renderPage()}
    </AppShell>
  );
}

/* =========================================================
   F2 — INVOICE WORKSPACE / LIST
   ========================================================= */

function InvoiceWorkspace({
  invoices,
  patients,
  editingInvoice,
  authUser,
  updateInvoice,
  finalizeInvoice,
  recordInvoicePayment,
  onOpenInvoice,
  onCloseEditor,
  onSaved,
}: {
  invoices: Invoice[];
  patients: Patient[];

  editingInvoice: Invoice | null;

  authUser: AuthUser;

  updateInvoice: (
    invoiceId: string,
    proposed: Invoice,
    reason?: string,
  ) => InvoiceMutationResult;

  finalizeInvoice: (
    invoice: Invoice,
  ) => InvoiceMutationResult;

  recordInvoicePayment: (
    invoice: Invoice,
    actor: AuditActor,
  ) => InvoiceMutationResult;

  onOpenInvoice: (
    invoice: Invoice,
  ) => void;

  onCloseEditor: () => void;

  onSaved: (
    invoice: Invoice,
  ) => void;
}) {
  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<
      'All' | InvoiceStatus
    >('All');

  const patientName = (
    patientId: string,
  ) =>
    patients.find(
      (patient) =>
        patient.id === patientId,
    )?.name ??
    'Unknown patient';

  const filteredInvoices =
    invoices
      .filter((invoice) => {
        if (
          statusFilter === 'All'
        ) {
          return true;
        }

        return (
          invoice.status ===
          statusFilter
        );
      })
      .filter((invoice) => {
        const query =
          search.trim().toLowerCase();

        if (!query) {
          return true;
        }

        return [
          invoice.number,
          invoice.description,
          patientName(
            invoice.patientId,
          ),
          invoice.status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort(
        (a, b) =>
          new Date(
            b.createdAt,
          ).getTime() -
          new Date(
            a.createdAt,
          ).getTime(),
      );

  if (editingInvoice) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={
              onCloseEditor
            }
          >
            <ArrowLeft size={16} />
            Back to invoices
          </Button>
        </div>

        <InvoiceEditor
          invoice={
            editingInvoice
          }
          patients={patients}
          authUser={authUser}
          updateInvoice={
            updateInvoice
          }
          finalizeInvoice={
            finalizeInvoice
          }
          recordInvoicePayment={
            recordInvoicePayment
          }
          onSaved={onSaved}
          onCancel={
            onCloseEditor
          }
        />
      </div>
    );
  }

  const paidCount =
    invoices.filter(
      (invoice) =>
        invoice.status === 'Paid',
    ).length;

  const outstandingCount =
    invoices.filter(
      (invoice) =>
        invoice.status ===
          'Outstanding' ||
        invoice.status ===
          'Part paid',
    ).length;

  const draftCount =
    invoices.filter(
      (invoice) =>
        invoice.status === 'Draft',
    ).length;

  const totalOutstanding =
    invoices.reduce(
      (sum, invoice) =>
        sum +
        Math.max(
          invoice.total -
            invoice.paid,
          0,
        ),
      0,
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">
            Invoice workspace
          </p>

          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
            Invoices
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage drafts, finalized invoices
            and payment status from the
            existing invoice-control layer.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          label="Total invoices"
          value={String(
            invoices.length,
          )}
        />

        <InfoCard
          label="Paid"
          value={String(
            paidCount,
          )}
        />

        <InfoCard
          label="Outstanding"
          value={money(
            totalOutstanding,
          )}
        />

        <InfoCard
          label="Drafts"
          value={String(
            draftCount,
          )}
        />
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search invoice number, patient or description..."
              className="h-11 w-full rounded-xl border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {[
              'All',
              'Draft',
              'Outstanding',
              'Part paid',
              'Paid',
            ].map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      status as
                        | 'All'
                        | InvoiceStatus,
                    )
                  }
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                    statusFilter ===
                    status
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {status}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {filteredInvoices.length ===
      0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <ReceiptIndianRupee
            size={28}
            className="mx-auto text-muted-foreground"
          />
  <h3 className="mt-4 text-base font-extrabold">
            No invoices found
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Try changing the search or
            status filter.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="hidden grid-cols-[1.1fr_1.5fr_1fr_.8fr_.8fr_auto] gap-4 border-b bg-secondary/40 px-5 py-3 text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground lg:grid">
            <span>Invoice</span>
            <span>Patient</span>
            <span>Period</span>
            <span>Total</span>
            <span>Status</span>
            <span />
          </div>

          <div className="divide-y">
            {filteredInvoices.map(
              (invoice) => {
                const balance =
                  Math.max(
                    invoice.total -
                      invoice.paid,
                    0,
                  );

                return (
                  <div
                    key={invoice.id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-secondary/20 lg:grid lg:grid-cols-[1.1fr_1.5fr_1fr_.8fr_.8fr_auto] lg:items-center lg:gap-4"
                  >
                    <div>
                      <p className="text-sm font-extrabold">
                        {invoice.number}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {invoice.description ||
                          'Invoice'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-bold">
                        {patientName(
                          invoice.patientId,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {invoice.sessions ||
                          '—'}
                      </p>
                    </div>

                    <div className="text-sm">
                      <p>
                        {dateLabel(
                          invoice.startDate,
                        )}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        to{' '}
                        {dateLabel(
                          invoice.endDate,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-extrabold">
                        {money(
                          invoice.total,
                        )}
                      </p>

                      {balance > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due{' '}
                          {money(
                            balance,
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                          invoiceTone(
                            invoice.status,
                          ) ===
                          'green'
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : invoiceTone(
                                  invoice.status,
                                ) ===
                                'amber'
                              ? 'bg-amber-500/10 text-amber-700'
                              : invoiceTone(
                                    invoice.status,
                                  ) ===
                                  'coral'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="soft"
                      onClick={() =>
                        onOpenInvoice(
                          invoice,
                        )
                      }
                    >
                      <Pencil
                        size={15}
                      />
                      Open
                    </Button>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   APPLICATION SHELL
   ========================================================= */

const navItems = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
  },
  {
    href: '/patients',
    label: 'Patients',
    icon: UsersRound,
  },
  {
    href: '/visits',
    label: 'Visits',
    icon: ClipboardList,
  },
  {
    href: '/invoices',
    label: 'Invoices',
    icon: ReceiptIndianRupee,
  },
];

function AppShell({
  children,
  profile,
}: {
  children: ReactNode;
  profile: Profile;
}) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] =
    useState(false);

  const current = navItems.find((item) =>
    location.startsWith(item.href),
  );

  const title =
    current?.label ||
    (location === '/profile'
      ? 'Provider profile'
      : location === '/settings'
        ? 'Settings'
        : location.includes('/invoice')
          ? 'Invoice desk'
          : 'Overview');

  return (
    <div className="app-shell flex bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] flex-col bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex">
        <Link
          href="/dashboard"
          data-testid="link-brand"
          className="mb-10 flex items-center gap-3 px-2"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
            <HeartPulse
              size={21}
              strokeWidth={2.5}
            />
          </span>

          <span>
            <strong className="block text-base tracking-tight">
              Physio
              <span className="text-sidebar-primary">
                Bill
              </span>
            </strong>

            <small className="text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/55">
              clinical desk
            </small>
          </span>
        </Link>

        <p className="px-3 text-[10px] font-bold uppercase tracking-[.18em] text-sidebar-foreground/40">
          Workspace
        </p>

        <nav className="mt-3 space-y-1">
          {navItems.map(
            ({
              href,
              label,
              icon: Icon,
            }) => (
              <Link
                key={href}
                href={href}
                data-testid={`link-nav-${label.toLowerCase()}`}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                  location.startsWith(href)
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
                }`}
              >
                <Icon size={18} />

                <span>{label}</span>
              </Link>
            ),
          )}
        </nav>

        <p className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-sidebar-foreground/40">
          Practice
        </p>

        <nav className="mt-3 space-y-1">
          <Link
            href="/profile"
            data-testid="link-nav-profile"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
              location === '/profile'
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
            }`}
          >
            <UserRound size={18} />
            <span>Provider profile</span>
          </Link>

          <Link
            href="/settings"
            data-testid="link-nav-settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
              location === '/settings'
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
            }`}
          >
            <Settings2 size={18} />
            <span>Settings</span>
          </Link>
        </nav>

        <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-3.5">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-sidebar-primary/15 text-xs font-bold text-sidebar-primary">
              {initials(
                profile.fullName ||
                  'Your profile',
              )}
            </span>

            <div className="min-w-0">
              <p className="truncate text-xs font-bold">
                {profile.fullName ||
                  'Your practice'}
              </p>

              <p className="truncate text-[10px] text-sidebar-foreground/50">
                {profile.title}
              </p>
            </div>
          </div>

          <p className="mt-3 text-[10px] leading-4 text-sidebar-foreground/50">
            Your records stay on this device
            in demo mode.
          </p>
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:ml-[238px]">
        <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b bg-background/90 px-4 backdrop-blur-md sm:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="button-mobile-menu"
              onClick={() =>
                setMenuOpen(true)
              }
              className="rounded-xl p-2 hover:bg-secondary lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">
                {headerDateLabel}
              </p>

              <h1 className="mt-0.5 text-lg font-extrabold tracking-tight sm:text-xl">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1.5 text-[11px] font-bold text-foreground sm:flex">
              <span className="size-1.5 rounded-full bg-accent" />
              Demo workspace
            </span>

            <button
              type="button"
              data-testid="button-notifications"
              className="rounded-xl p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Bell size={18} />
            </button>

            <Link
              href="/profile"
              data-testid="link-header-profile"
              className="grid size-9 place-items-center rounded-xl bg-primary text-xs font-extrabold text-primary-foreground"
            >
              {initials(
                profile.fullName ||
                  'Your profile',
              )}
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-[1420px] px-4 pb-24 pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pb-10">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card/95 px-2 py-2 backdrop-blur-lg lg:hidden">
          {navItems.map(
            ({
              href,
              label,
              icon: Icon,
            }) => (
              <Link
                key={href}
                href={href}
                data-testid={`link-mobile-${label.toLowerCase()}`}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold ${
                  location.startsWith(href)
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <Icon size={19} />
                <span>{label}</span>
              </Link>
            ),
          )}
        </nav>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            data-testid="button-close-mobile-menu"
            className="absolute inset-0 bg-foreground/30"
            onClick={() =>
              setMenuOpen(false)
            }
          />

          <aside className="relative flex h-full w-[280px] flex-col bg-sidebar p-5 text-sidebar-foreground shadow-2xl">
            <button
              type="button"
              data-testid="button-close-menu"
              onClick={() =>
                setMenuOpen(false)
              }
              className="mb-7 self-end text-sidebar-foreground/60"
            >
              <X size={20} />
            </button>

            <Link
              href="/dashboard"
              onClick={() =>
                setMenuOpen(false)
              }
              className="mb-8 flex items-center gap-3"
            >
              <span className="grid size-10 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
                <HeartPulse size={21} />
              </span>

              <strong>
                Physio
                <span className="text-sidebar-primary">
                  Bill
                </span>
              </strong>
            </Link>

            {[
              ...navItems,
              {
                href: '/profile',
                label: 'Provider profile',
                icon: UserRound,
              },
              {
                href: '/settings',
                label: 'Settings',
                icon: Settings2,
              },
            ].map(
              ({
                href,
                label,
                icon: Icon,
              }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() =>
                    setMenuOpen(false)
                  }
                  data-testid={`link-drawer-${label
                    .toLowerCase()
                    .replaceAll(
                      ' ',
                      '-',
                    )}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-sidebar-foreground/75 hover:bg-sidebar-accent"
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ),
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SECTION HEADING
   ========================================================= */

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[.18em] text-primary">
            {eyebrow}
          </p>
        )}

        <h2 className="text-2xl font-extrabold tracking-[-.04em] sm:text-[28px]">
          {title}
        </h2>

        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function Dashboard({
  patients,
  visits,
  invoices,
  profile,
}: {
  patients: Patient[];
  visits: Visit[];
  invoices: Invoice[];
  profile: Profile;
}) {
  const outstanding =
    invoices.reduce(
      (sum, invoice) =>
        sum +
        Math.max(
          invoice.total -
            invoice.paid,
          0,
        ),
      0,
    );

  const monthTotal =
    invoices.reduce(
      (sum, invoice) =>
        sum + invoice.total,
      0,
    );

  const todaysVisits =
    visits.filter(
      (visit) =>
        visit.date === today,
    );

  const patientName = (
    patientId: string,
  ) =>
    patients.find(
      (patient) =>
        patient.id === patientId,
    )?.name ||
    'Unknown patient';

  return (
    <div className="page-enter space-y-7">
      <div className="relative overflow-hidden rounded-[24px] bg-primary px-5 py-7 text-primary-foreground sm:px-8 sm:py-9">
        <div className="absolute -right-10 -top-20 size-64 rounded-full border-[28px] border-primary-foreground/10" />

        <div className="absolute -bottom-32 right-24 size-64 rounded-full border border-sidebar-primary/20" />

        <div className="relative max-w-2xl">
          <Badge tone="coral">
            Demo workspace · local data
          </Badge>

          <h2 className="mt-4 text-[30px] font-extrabold leading-[1.04] tracking-[-.05em] sm:text-[42px]">
            A clear desk for{' '}
            <span className="display-serif font-normal italic text-sidebar-primary">
              better care.
            </span>
          </h2>

          <p className="mt-3 max-w-lg text-sm leading-6 text-primary-foreground/70">
            Move from a thoughtful visit
            note to a reimbursement-ready
            invoice, without losing the
            human details in between.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link
              href="/invoice/new"
              data-testid="link-hero-new-invoice"
              className="inline-flex items-center gap-2 rounded-xl bg-sidebar-primary px-4 py-3 text-sm font-extrabold text-sidebar-primary-foreground transition-transform hover:-translate-y-px"
            >
              Create invoice
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/visits"
              data-testid="link-hero-visits"
              className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/20 px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-foreground/10"
            >
              Log a visit
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Outstanding',
            value: money(
              outstanding,
            ),
            sub: 'across open invoices',
            icon: WalletCards,
            tone: 'text-accent',
          },
          {
            label: 'Today’s visits',
            value: String(
              todaysVisits.length,
            ).padStart(2, '0'),
            sub: todaysVisits.length
              ? 'care moments on the desk'
              : 'nothing scheduled',
            icon: CalendarDays,
            tone: 'text-primary',
          },
          {
            label: 'Active patients',
            value: String(
              patients.length,
            ).padStart(2, '0'),
            sub: 'in your directory',
            icon: UsersRound,
            tone: 'text-sky-700',
          },
          {
            label: 'Billed this cycle',
            value: money(
              monthTotal,
            ),
            sub: 'demo invoice total',
            icon: Activity,
            tone: 'text-amber-700',
          },
        ].map(
          ({
            label,
            value,
            sub,
            icon: Icon,
            tone,
          }, index) => (
            <div
              key={label}
              className={`page-enter stagger-${
                index + 1
              } rounded-2xl border bg-card p-5`}
              data-testid={`card-stat-${label
                .toLowerCase()
                .replaceAll(
                  ' ',
                  '-',
                )}`}
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-bold text-muted-foreground">
                  {label}
                </p>

                <Icon
                  size={18}
                  className={tone}
                />
              </div>

              <p className="mono mt-5 text-[27px] font-medium tracking-tight">
                {value}
              </p>

              <p className="mt-1 text-[11px] text-muted-foreground">
                {sub}
              </p>
            </div>
          ),
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h3 className="font-extrabold">
                Today’s care plan
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                {todaysVisits.length
                  ? `${todaysVisits.length} visits · your notes, in order`
                  : 'Your schedule is open today'}
              </p>
            </div>

            <Link
              href="/visits"
              data-testid="link-dashboard-all-visits"
              className="text-xs font-bold text-primary hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="divide-y">
            {todaysVisits.length ? (
              todaysVisits.map(
                (visit) => (
                  <div
                    key={visit.id}
                    data-testid={`row-today-visit-${visit.id}`}
                    className="flex items-start gap-4 px-5 py-4"
                  >
                    <div className="mt-0.5 flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary text-primary">
                      <span className="text-[10px] font-bold">
                        {visit.duration}
                      </span>

                      <span className="text-[9px]">
                        min
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">
                          {patientName(
                            visit.patientId,
                          )}
                        </p>

                        <Badge tone="green">
                          {
                            visit.authorization.split(
                              '—',
                            )[0]
                          }
                        </Badge>
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {visit.treatment}
                      </p>

                      <p className="mt-2 text-xs leading-5 text-foreground/70">
                        {visit.notes}
                      </p>
                    </div>

                    <Link
                      href="/visits"
                      data-testid={`link-edit-visit-${visit.id}`}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary"
                    >
                      <ChevronRight
                        size={17}
                      />
                    </Link>
                  </div>
                ),
              )
            ) : (
              <div className="p-10">
                <EmptyState
                  icon={CalendarDays}
                  title="A lighter day"
                  description="When you log a visit, it will appear here with the details you need at a glance."
     action={
                    <Link
                      href="/visits"
                      data-testid="link-empty-log-visit"
                      className="text-sm font-bold text-primary"
                    >
                      Open visit records
                    </Link>
                  }
                />
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h3 className="font-extrabold">
                Recent invoices
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Your last billing moments
              </p>
            </div>

            <Link
              href="/invoices"
              data-testid="link-dashboard-all-invoices"
              className="text-xs font-bold text-primary hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="divide-y">
            {invoices
              .slice(0, 4)
              .map(
                (invoice) => (
                  <div
                    key={invoice.id}
                    data-testid={`row-recent-invoice-${invoice.id}`}
                    className="flex items-center gap-3 px-5 py-4"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                      <FileText size={16} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="mono text-xs font-medium">
                        {invoice.number}
                      </p>

                      <p className="truncate text-sm font-bold">
                        {patientName(
                          invoice.patientId,
                        )}
                      </p>
                    </div>
  <div className="text-right">
                      <p className="mono text-sm font-medium">
                        {money(
                          invoice.total,
                        )}
                      </p>

                      <Badge
                        tone={
                          invoice.status ===
                          'Paid'
                            ? 'green'
                            : invoice.status ===
                                'Part paid'
                              ? 'amber'
                              : invoice.status ===
                                  'Draft'
                                ? 'neutral'
                                : 'coral'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ),
              )}
          </div>

          {!invoices.length && (
            <div className="p-6">
              <EmptyState
                icon={
                  ReceiptIndianRupee
                }
                title="No invoices yet"
                description="Create your first invoice after a visit."
              />
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction
          href="/patients"
          icon={UsersRound}
          title="Add patient"
          text="Keep care details close"
        />

        <QuickAction
          href="/visits"
          icon={BookOpenText}
          title="Write a visit note"
          text="Capture the clinical thread"
        />

        <QuickAction
          href="/profile"
          icon={SlidersHorizontal}
          title={
            profile.fullName
              ? 'Review profile'
              : 'Complete profile'
          }
          text="Make every invoice yours"
        />
      </div>
    </div>
  );
}
/* =========================================================
   QUICK ACTION
   ========================================================= */

function QuickAction({
  href,
  icon: Icon,
  title,
  text,
}: {
  href: string;
  icon: typeof Plus;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      data-testid={`link-quick-${title
        .toLowerCase()
        .replaceAll(' ', '-')}`}
      className="group flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon size={18} />
      </span>

      <span>
        <strong className="block text-sm">
          {title}
        </strong>

        <small className="mt-1 block text-xs text-muted-foreground">
          {text}
        </small>
      </span>

      <ArrowRight
        className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-1"
        size={16}
      />
    </Link>
  );
}
/* =========================================================
   PATIENTS WORKSPACE
   ========================================================= */

function PatientsPage({
  patients,
  visits,
  invoices,
  onAddPatient,
}: {
  patients: Patient[];
  visits: Visit[];
  invoices: Invoice[];
  onAddPatient: () => void;
}) {
  const [search, setSearch] =
    useState('');

  const filteredPatients =
    patients.filter((patient) => {
      const query =
        search.trim().toLowerCase();

      if (!query) return true;

      return [
        patient.patientNumber,
        patient.name,
        patient.phone,
        patient.email,
        patient.condition,
      ].some((value) =>
        value
          .toLowerCase()
          .includes(query),
      );
    });

  return (
    <div className="page-enter">
      <SectionHeading
        eyebrow="Patient directory"
        title="Patients"
        description="Keep every patient's clinical and billing context together."
        action={
          <Button
            type="button"
            onClick={onAddPatient}
            data-testid="button-add-patient"
          >
            <Plus size={16} />
            Add patient
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search by name, patient number, phone or condition..."
            data-testid="input-search-patients"
            className="h-11 w-full rounded-xl border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="hidden grid-cols-[1.1fr_1fr_1fr_.8fr_auto] gap-4 border-b px-5 py-3 text-[10px] font-extrabold uppercase tracking-[.14em] text-muted-foreground md:grid">
          <span>Patient</span>
          <span>Contact</span>
          <span>Condition</span>
          <span>Activity</span>
          <span />
        </div>

        <div className="divide-y">
          {filteredPatients.map(
            (patient) => {
              const patientVisits =
                visits.filter(
                  (visit) =>
                    visit.patientId ===
                    patient.id,
                );

              const patientInvoices =
                invoices.filter(
                  (invoice) =>
                    invoice.patientId ===
                    patient.id,
                );

              const outstanding =
                patientInvoices.reduce(
                  (sum, invoice) =>
                    sum +
                    Math.max(
                      invoice.total -
                        invoice.paid,
                      0,
                    ),
                  0,
                );

              return (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  data-testid={`link-patient-${patient.id}`}
                  className="grid gap-4 px-5 py-4 transition-colors hover:bg-secondary/40 md:grid-cols-[1.1fr_1fr_1fr_.8fr_auto] md:items-center"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-extrabold text-primary">
                      {initials(
                        patient.name,
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold">
                        {patient.name}
                      </p>

                      <p className="mono mt-0.5 text-[10px] text-muted-foreground">
                        {
                          patient.patientNumber
                        }
                      </p>
                    </div>
                  </div>

                  <div className="text-xs">
                    <p>{patient.phone}</p>

                    <p className="mt-1 truncate text-muted-foreground">
                      {patient.email ||
                        'No email'}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {patient.condition ||
                      'Not specified'}
                  </p>

                  <div>
                    <p className="text-xs font-bold">
                      {patientVisits.length}{' '}
                      visits
                    </p>

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {outstanding
                        ? `${money(
                            outstanding,
                          )} outstanding`
                        : 'No balance'}
                    </p>
                  </div>

                  <ChevronRight
                    size={17}
                    className="hidden text-muted-foreground md:block"
                  />
                </Link>
              );
            },
          )}

          {!filteredPatients.length && (
            <div className="p-10">
              <EmptyState
                icon={UsersRound}
                title={
                  search
                    ? 'No patients found'
                    : 'Your patient directory is empty'
                }
                description={
                  search
                    ? 'Try another search term.'
                    : 'Add your first patient to begin building their care record.'
                }
                action={
                  !search ? (
                    <Button
                      type="button"
                      onClick={
                        onAddPatient
                      }
                    >
                      <Plus size={16} />
                      Add patient
                    </Button>
                  ) : undefined
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
/* =========================================================
   PATIENT FORM
   ========================================================= */

function PatientForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Patient;
  onSave: (
    patient: Patient,
  ) => void;
  onCancel: () => void;
}) {
  const [form, setForm] =
    useState<Patient>(
      initial ?? {
        id: '',
        physioId: undefined,
        userId: undefined,
        patientNumber: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        age: '',
        condition: '',
        referringDoctor: '',
        referralDate: '',
        insuranceTpa: '',
        policyMemberId: '',
        notes: '',
      },
    );

  const update = <
    K extends keyof Patient,
  >(
    field: K,
    value: Patient[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = () => {
    if (!form.name.trim()) return;

    onSave({
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      condition:
        form.condition.trim(),
      notes: form.notes.trim(),
    });
  };

  return (
    <div className="rounded-2xl border bg-card p-5 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">
            {initial
              ? 'Edit record'
              : 'New record'}
          </p>

          <h3 className="mt-1 text-xl font-extrabold">
            {initial
              ? 'Update patient'
              : 'Add patient'}
          </h3>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"
          aria-label="Close patient form"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Full name"
          value={form.name}
          onChange={(event) =>
            update(
              'name',
              event.target.value,
            )
          }
          placeholder="Patient full name"
        />

        <Field
          label="Phone"
          value={form.phone}
          onChange={(event) =>
            update(
              'phone',
              event.target.value,
            )
          }
          placeholder="+91..."
        />

        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) =>
            update(
              'email',
              event.target.value,
            )
          }
          placeholder="patient@example.com"
        />

        <Field
          label="Age"
          value={form.age}
          onChange={(event) =>
            update(
              'age',
              event.target.value,
            )
          }
          placeholder="Age"
        />

        <div className="md:col-span-2">
          <Field
            label="Condition"
            value={form.condition}
            onChange={(event) =>
              update(
                'condition',
                event.target.value,
              )
            }
            placeholder="Primary condition / diagnosis"
          />
        </div>

        <div className="md:col-span-2">
          <Field
            label="Address"
            value={form.address}
            onChange={(event) =>
              update(
                'address',
                event.target.value,
              )
            }
            placeholder="Patient address"
          />
        </div>

        <Field
          label="Referring doctor"
          value={
            form.referringDoctor
          }
          onChange={(event) =>
            update(
              'referringDoctor',
              event.target.value,
            )
          }
          placeholder="Doctor name"
        />

        <Field
          label="Referral date"
          type="date"
          value={form.referralDate}
          onChange={(event) =>
            update(
              'referralDate',
              event.target.value,
            )
          }
        />

        <Field
          label="Insurance / TPA"
          value={form.insuranceTpa}
          onChange={(event) =>
            update(
              'insuranceTpa',
              event.target.value,
            )
          }
          placeholder="TPA / insurer"
        />

        <Field
          label="Policy / member ID"
          value={
            form.policyMemberId
          }
          onChange={(event) =>
            update(
              'policyMemberId',
              event.target.value,
            )
          }
          placeholder="Policy or member number"
        />

        <div className="md:col-span-2">
          <TextArea
            label="Clinical notes"
            value={form.notes}
            onChange={(event) =>
              update(
                'notes',
                event.target.value,
              )
            }
            placeholder="Relevant background, precautions or other notes..."
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button
          type="button"
          disabled={!form.name.trim()}
          onClick={submit}
          data-testid="button-save-patient"
        >
          <Check size={16} />
          {initial
            ? 'Save changes'
            : 'Add patient'}
        </Button>
      </div>
    </div>
  );
}
/* =========================================================
   PATIENT DETAIL
   ========================================================= */

function PatientDetailPage({
  patient,
  visits,
  invoices,
  onEdit,
  onBack,
}: {
  patient: Patient;
  visits: Visit[];
  invoices: Invoice[];
  onEdit: () => void;
  onBack: () => void;
}) {
  const patientVisits =
    visits.filter(
      (visit) =>
        visit.patientId ===
        patient.id,
    );

  const patientInvoices =
    invoices.filter(
      (invoice) =>
        invoice.patientId ===
        patient.id,
    );

  const balance =
    patientInvoices.reduce(
      (sum, invoice) =>
        sum +
        Math.max(
          invoice.total -
            invoice.paid,
          0,
        ),
      0,
    );

  return (
    <div className="page-enter">
      <button
        type="button"
        onClick={onBack}
        data-testid="button-back-patient"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Patients
      </button>

      <div className="rounded-2xl border bg-card p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground">
              {initials(
                patient.name,
              )}
            </span>

            <div>
              <p className="mono text-[10px] text-muted-foreground">
                {patient.patientNumber}
              </p>

              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
                {patient.name}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {patient.condition ||
                  'Condition not specified'}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={onEdit}
            data-testid="button-edit-patient"
          >
            <Pencil size={15} />
            Edit patient
          </Button>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="Phone"
            value={
              patient.phone || '—'
            }
          />

          <InfoCard
            label="Age"
            value={patient.age || '—'}
          />

          <InfoCard
            label="Visits"
            value={String(
              patientVisits.length,
            )}
          />

          <InfoCard
            label="Outstanding"
            value={money(balance)}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-card">
          <div className="border-b px-5 py-4">
            <h3 className="font-extrabold">
              Clinical record
            </h3>
          </div>

          <div className="space-y-4 p-5">
            <DetailRow
              label="Email"
              value={
                patient.email || '—'
              }
            />

            <DetailRow
              label="Address"
              value={
                patient.address || '—'
              }
            />

            <DetailRow
              label="Referring doctor"
              value={
                patient.referringDoctor ||
                '—'
              }
            />

            <DetailRow
              label="Referral date"
              value={
                patient.referralDate
                  ? dateLabel(
                      patient.referralDate,
                    )
                  : '—'
              }
            />

            <DetailRow
              label="Insurance / TPA"
              value={
                patient.insuranceTpa ||
                '—'
              }
            />

            <DetailRow
              label="Policy / member ID"
              value={
                patient.policyMemberId ||
                '—'
              }
            />

            <div className="rounded-xl bg-secondary/60 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">
                Notes
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {patient.notes ||
                  'No additional notes.'}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card">
          <div className="border-b px-5 py-4">
            <h3 className="font-extrabold">
              Recent visits
            </h3>
          </div>

          <div className="divide-y">
            {patientVisits.length ? (
              patientVisits
                .slice()
                .reverse()
                .slice(0, 6)
                .map((visit) => (
                  <div
                    key={visit.id}
                    className="px-5 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="mono text-xs font-medium">
                          {
                            visit.visitNumber
                          }
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {dateLabel(
                            visit.date,
                          )}
                        </p>
                      </div>

                      <Badge tone="blue">
                        {
                          visit.duration
                        }{' '}
                        min
                      </Badge>
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      {visit.treatment}
                    </p>

                    <p className="mt-2 text-sm leading-6">
                      {visit.notes}
                    </p>
                  </div>
                ))
            ) : (
              <div className="p-8">
                <EmptyState
                  icon={ClipboardList}
                  title="No visits recorded"
                  description="Clinical visits for this patient will appear here."
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
/* =========================================================
   VISITS WORKSPACE
   ========================================================= */

function VisitsPage({
  visits,
  patients,
  onAddVisit,
}: {
  visits: Visit[];
  patients: Patient[];
  onAddVisit: () => void;
}) {
  const patientName = (
    patientId: string,
  ) =>
    patients.find(
      (patient) =>
        patient.id === patientId,
    )?.name ||
    'Unknown patient';

  return (
    <div className="page-enter">
      <SectionHeading
        eyebrow="Clinical records"
        title="Visits"
        description="A chronological record of treatment, modalities, exercises and clinical notes."
        action={
          <Button
            type="button"
            onClick={onAddVisit}
            data-testid="button-add-visit"
          >
            <Plus size={16} />
            Log visit
          </Button>
        }
      />

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="hidden grid-cols-[1fr_1fr_1.3fr_.7fr] gap-4 border-b px-5 py-3 text-[10px] font-extrabold uppercase tracking-[.14em] text-muted-foreground md:grid">
          <span>Visit</span>
          <span>Patient</span>
          <span>Treatment</span>
          <span>Date</span>
        </div>

        <div className="divide-y">
          {visits
            .slice()
            .sort(
              (a, b) =>
                b.date.localeCompare(
                  a.date,
                ),
            )
            .map((visit) => (
              <div
                key={visit.id}
                data-testid={`row-visit-${visit.id}`}
                className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1fr_1.3fr_.7fr] md:items-center"
              >
                <div>
                  <p className="mono text-xs font-medium">
                    {visit.visitNumber}
                  </p>

                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {visit.duration} min
                  </p>
                </div>

                <p className="text-sm font-bold">
                  {patientName(
                    visit.patientId,
                  )}
                </p>

                <div>
                  <p className="text-sm">
                    {visit.treatment}
                  </p>

                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {visit.modalities ||
                      'No modalities recorded'}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  {dateLabel(
                    visit.date,
                  )}
                </p>
              </div>
            ))}

          {!visits.length && (
            <div className="p-10">
              <EmptyState
                icon={ClipboardList}
                title="No visits yet"
                description="Log the first clinical visit to start the patient's treatment timeline."
                action={
                  <Button
                    type="button"
                    onClick={
                      onAddVisit
                    }
                  >
                    <Plus size={16} />
                    Log visit
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
/* =========================================================
   VISIT FORM
   ========================================================= */

function VisitForm({
  patients,
  onSave,
  onCancel,
}: {
  patients: Patient[];
  onSave: (visit: Visit) => void;
  onCancel: () => void;
}) {
  const [patientId, setPatientId] =
    useState(
      patients[0]?.id ?? '',
    );

  const [date, setDate] =
    useState(today);

  const [treatment, setTreatment] =
    useState('');

  const [modalities, setModalities] =
    useState('');

  const [exercises, setExercises] =
    useState('');

  const [duration, setDuration] =
    useState('60');

  const [notes, setNotes] =
    useState('');

  const [authorization, setAuthorization] =
    useState('');

  const submit = () => {
    if (
      !patientId ||
      !treatment.trim()
    ) {
      return;
    }

    onSave({
      id: '',
      patientId,
      visitNumber: '',
      date,
      treatment:
        treatment.trim(),
      modalities:
        modalities.trim(),
      exercises:
        exercises.trim(),
      duration,
      notes: notes.trim(),
      authorization:
        authorization.trim(),
    });
  };

  return (
    <div className="rounded-2xl border bg-card p-5 sm:p-7">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">
            Clinical note
          </p>

          <h3 className="mt-1 text-xl font-extrabold">
            Log a visit
          </h3>
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Close visit form"
          className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Patient"
          value={patientId}
          onChange={(event) =>
            setPatientId(
              event.target.value,
            )
          }
          options={[
            {
              label:
                'Select patient',
              value: '',
            },
            ...patients.map(
              (patient) => ({
                label:
                  `${patient.name} · ${patient.patientNumber}`,
                value:
                  patient.id,
              }),
            ),
          ]}
        />

        <Field
          label="Visit date"
          type="date"
          value={date}
          onChange={(event) =>
            setDate(
              event.target.value,
            )
          }
        />

        <Field
          label="Treatment"
          value={treatment}
          onChange={(event) =>
            setTreatment(
              event.target.value,
            )
          }
          placeholder="e.g. Knee rehabilitation"
        />

        <Field
          label="Duration"
          value={duration}
          onChange={(event) =>
            setDuration(
              event.target.value,
            )
          }
          placeholder="60"
        />

        <Field
          label="Modalities"
          value={modalities}
          onChange={(event) =>
            setModalities(
              event.target.value,
            )
          }
          placeholder="e.g. TENS, ultrasound"
        />

        <Field
          label="Authorization"
          value={authorization}
          onChange={(event) =>
            setAuthorization(
              event.target.value,
            )
          }
          placeholder="e.g. Approved — 10 sessions"
        />

        <div className="md:col-span-2">
          <TextArea
            label="Exercises"
            value={exercises}
            onChange={(event) =>
              setExercises(
                event.target.value,
              )
            }
            placeholder="Exercises prescribed or performed..."
          />
        </div>

        <div className="md:col-span-2">
          <TextArea
            label="Clinical notes"
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value,
              )
            }
            placeholder="Subjective findings, objective findings, response to treatment and plan..."
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button
          type="button"
          disabled={
            !patientId ||
            !treatment.trim()
          }
          onClick={submit}
          data-testid="button-save-visit"
        >
          <Check size={16} />
          Save visit
        </Button>
      </div>
    </div>
  );
}
/* =========================================================
   SMALL DETAIL COMPONENTS
   ========================================================= */

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-secondary/60 p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-bold">
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
      <span className="text-xs font-bold text-muted-foreground">
        {label}
      </span>

      <span className="max-w-[70%] text-right text-sm">
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   F1 — INVOICE EDITOR / FORM
   ========================================================= */

function InvoiceEditor({
  invoice,
  patients,
  authUser,
  updateInvoice,
  finalizeInvoice,
  recordInvoicePayment,
  onSaved,
  onCancel,
}: {
  invoice: Invoice;
  patients: Patient[];
  authUser: AuthUser;

  updateInvoice: (
    invoiceId: string,
    proposed: Invoice,
    reason?: string,
  ) => InvoiceMutationResult;

  finalizeInvoice: (
    invoice: Invoice,
  ) => InvoiceMutationResult;

  recordInvoicePayment: (
    invoice: Invoice,
    actor: AuditActor,
  ) => InvoiceMutationResult;

  onSaved: (invoice: Invoice) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] =
    useState(invoice.description);

  const [sessions, setSessions] =
    useState(invoice.sessions);

  const [startDate, setStartDate] =
    useState(invoice.startDate);

  const [endDate, setEndDate] =
    useState(invoice.endDate);

  const [fee, setFee] =
    useState(String(invoice.fee));

  const [additional, setAdditional] =
    useState(String(invoice.additional));

  const [
    additionalDescription,
    setAdditionalDescription,
  ] = useState(
    invoice.additionalDescription,
  );

  const [discount, setDiscount] =
    useState(String(invoice.discount));

  const [gstRate, setGstRate] =
    useState(String(invoice.gstRate));

  const [paymentMethod, setPaymentMethod] =
    useState(invoice.paymentMethod);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const patientName =
    patients.find(
      (patient) =>
        patient.id === invoice.patientId,
    )?.name ?? 'Unknown patient';

  /*
   * Financial fields are locked once the invoice
   * is finalized or paid.
   *
   * The controller remains the final authority.
   */
  const financialFieldsLocked =
    invoice.finalized ||
    invoice.status === 'Paid';

  const numericFee =
    Number(fee) || 0;

  const numericAdditional =
    Number(additional) || 0;

  const numericDiscount =
    Number(discount) || 0;

  const numericGstRate =
    Number(gstRate) || 0;

  const calculatedTotal =
    Math.round(
      (
        numericFee +
        numericAdditional -
        numericDiscount
      ) *
        (1 + numericGstRate / 100) *
        100,
    ) / 100;

  const buildProposedInvoice =
    (): Invoice => ({
      ...invoice,

      description:
        description.trim(),

      sessions:
        sessions.trim(),

      startDate,

      endDate,

      fee:
        numericFee,

      additional:
        numericAdditional,

      additionalDescription:
        additionalDescription.trim(),

      discount:
        numericDiscount,

      gstRate:
        numericGstRate,

      total:
        calculatedTotal,

      paymentMethod:
        paymentMethod.trim(),
    });

  const saveDraft = () => {
    setError('');
    setSuccess('');

    const result =
      updateInvoice(
        invoice.id,
        buildProposedInvoice(),
      );

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(
      'Invoice saved successfully.',
    );

    onSaved(result.invoice);
  };

  const finalize = () => {
    setError('');
    setSuccess('');

    /*
     * First persist the current draft through
     * the existing invoice controller.
     */
    const updateResult =
      updateInvoice(
        invoice.id,
        buildProposedInvoice(),
      );

    if (!updateResult.ok) {
      setError(updateResult.error);
      return;
    }

    /*
     * Finalization is deliberately handled by
     * the existing finalization contract.
     */
    const finalizeResult =
      finalizeInvoice(
        updateResult.invoice,
      );

    if (!finalizeResult.ok) {
      setError(
        finalizeResult.error,
      );
      return;
    }

    setSuccess(
      'Invoice finalized successfully.',
    );

    onSaved(
      finalizeResult.invoice,
    );
  };

  const recordPayment = () => {
    setError('');
    setSuccess('');

    /*
     * Payment goes exclusively through the
     * dedicated payment workflow.
     */
    const result =
      recordInvoicePayment(
        invoice,
        {
          userId:
            authUser.id,

          role:
            authUser.role,

          displayName:
            authUser.displayName,
        },
      );

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(
      'Payment recorded successfully.',
    );

    onSaved(result.invoice);
  };

  return (
    <div className="rounded-2xl border bg-card p-5 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">
            Invoice editor
          </p>

          <h2 className="mt-1 text-xl font-extrabold">
            {invoice.number}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {patientName}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          aria-label="Close invoice editor"
        >
          <X size={18} />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Patient"
          value={patientName}
          onChange={() => undefined}
          disabled
        />

        <Field
          label="Invoice number"
          value={invoice.number}
          onChange={() => undefined}
          disabled
        />

        <Field
          label="Description"
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value,
            )
          }
          disabled={
            invoice.finalized
          }
        />

        <Field
          label="Sessions"
          value={sessions}
          onChange={(event) =>
            setSessions(
              event.target.value,
            )
          }
          disabled={
            invoice.finalized
          }
        />

        <Field
          label="Start date"
          type="date"
          value={startDate}
          onChange={(event) =>
            setStartDate(
              event.target.value,
            )
          }
          disabled={
            invoice.finalized
          }
        />

        <Field
          label="End date"
          type="date"
          value={endDate}
          onChange={(event) =>
            setEndDate(
              event.target.value,
            )
          }
          disabled={
            invoice.finalized
          }
        />

        <Field
          label="Fee"
          type="number"
          value={fee}
          onChange={(event) =>
            setFee(
              event.target.value,
            )
          }
          disabled={
            financialFieldsLocked
          }
        />

        <Field
          label="Additional"
          type="number"
          value={additional}
          onChange={(event) =>
            setAdditional(
              event.target.value,
            )
          }
          disabled={
            financialFieldsLocked
          }
        />

        <Field
          label="Additional description"
          value={
            additionalDescription
          }
          onChange={(event) =>
            setAdditionalDescription(
              event.target.value,
            )
          }
          disabled={
            financialFieldsLocked
          }
        />

        <Field
          label="Discount"
          type="number"
          value={discount}
          onChange={(event) =>
            setDiscount(
              event.target.value,
            )
          }
          disabled={
            financialFieldsLocked
          }
        />

        <Field
          label="GST rate"
          type="number"
          value={gstRate}
          onChange={(event) =>
            setGstRate(
              event.target.value,
            )
          }
          disabled={
            financialFieldsLocked
          }
        />

        <Field
          label="Payment method"
          value={paymentMethod}
          onChange={(event) =>
            setPaymentMethod(
              event.target.value,
            )
          }
          disabled={
            invoice.finalized
          }
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <InfoCard
          label="Total"
          value={`₹${calculatedTotal.toFixed(2)}`}
        />

        <InfoCard
          label="Paid"
          value={`₹${invoice.paid.toFixed(2)}`}
        />

        <InfoCard
          label="Status"
          value={invoice.status}
        />
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-xl bg-primary/10 p-3 text-sm text-primary">
          {success}
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
        >
          Cancel
        </Button>

        {!invoice.finalized && (
          <>
            <Button
              type="button"
              variant="soft"
              onClick={saveDraft}
            >
              <Check size={16} />
              Save draft
            </Button>

            <Button
              type="button"
              onClick={finalize}
            >
              <ShieldCheck size={16} />
              Finalize invoice
            </Button>
          </>
        )}

        {invoice.finalized &&
          invoice.status !== 'Paid' && (
            <Button
              type="button"
              onClick={recordPayment}
            >
              <Check size={16} />
              Record payment
            </Button>
          )}
      </div>
    </div>
  );
}