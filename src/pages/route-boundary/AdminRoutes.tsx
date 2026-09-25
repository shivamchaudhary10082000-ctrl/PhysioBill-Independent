import { lazy, Suspense, useEffect, useState } from 'react';
import {
  BadgeCheck,
  CalendarRange,
  CircleDollarSign,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  MessageSquareWarning,
  Scale,
  ScrollText,
  ServerCog,
  UsersRound,
} from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import { WorkspaceSignOut } from '@/Components/WorkspaceSessionControls';
import { useAuthSession } from '@/hooks/use-auth-session';
import { getAdminCapabilities, type AdminCapability } from '@/lib/admin-operations';
import { loadAdminSecurityState } from '@/lib/auth';
import { AdminMfaPage } from '@/pages/AdminMfaPage';
import {
  NotFoundPage,
  PersonaDeniedPage,
  RouteLoading,
  SessionResolutionError,
} from '@/pages/route-boundary/SessionBoundaryPages';

const AdminAccessPage = lazy(() => import('@/pages/AdminAccessPage').then((module) => ({ default: module.AdminAccessPage })));
const AdminAuditPage = lazy(() => import('@/pages/AdminAuditPage').then((module) => ({ default: module.AdminAuditPage })));
const AdminBookingsPage = lazy(() => import('@/pages/AdminBookingsPage').then((module) => ({ default: module.AdminBookingsPage })));
const AdminCasesPage = lazy(() => import('@/pages/AdminCasesPage').then((module) => ({ default: module.AdminCasesPage })));
const AdminCommunicationsPage = lazy(() => import('@/pages/AdminCommunicationsPage').then((module) => ({ default: module.AdminCommunicationsPage })));
const AdminFinancePage = lazy(() => import('@/pages/AdminFinancePage').then((module) => ({ default: module.AdminFinancePage })));
const AdminGovernancePage = lazy(() => import('@/pages/AdminGovernancePage').then((module) => ({ default: module.AdminGovernancePage })));
const AdminOperationsOverviewPage = lazy(() => import('@/pages/AdminOperationsOverviewPage').then((module) => ({ default: module.AdminOperationsOverviewPage })));
const AdminPatientsPage = lazy(() => import('@/pages/AdminPatientsPage').then((module) => ({ default: module.AdminPatientsPage })));
const AdminSignInPage = lazy(() => import('@/pages/AdminSignInPage').then((module) => ({ default: module.AdminSignInPage })));
const AdminSystemPage = lazy(() => import('@/pages/AdminSystemPage').then((module) => ({ default: module.AdminSystemPage })));
const AdminTherapistsPage = lazy(() => import('@/pages/AdminTherapistsPage').then((module) => ({ default: module.AdminTherapistsPage })));
const AdminVerificationsPage = lazy(() => import('@/pages/AdminVerificationsPage').then((module) => ({ default: module.AdminVerificationsPage })));
const AdminVerificationReviewPage = lazy(() => import('@/pages/AdminVerificationReviewPage').then((module) => ({ default: module.AdminVerificationReviewPage })));

export function AdminSignInRoute() {
  const auth = useAuthSession();

  useEffect(() => {
    if (!auth.error && auth.user && auth.role === 'physio' && !auth.passwordRecovery) {
      window.location.replace('/admin/mfa');
    }
  }, [auth.error, auth.passwordRecovery, auth.role, auth.user?.id]);

  if (!auth.configured) return <NotFoundPage />;
  if (auth.loading) return <RouteLoading message="Restoring secure Admin session…" />;
  if (auth.error) return <SessionResolutionError />;
  if (auth.user && auth.role === 'patient') {
    return (
      <PersonaDeniedPage
        title="Patient sessions cannot enter administration."
        message="Admin authority remains a separate database-controlled boundary."
        primaryHref="/patient"
        primaryLabel="Open patient gateway"
      />
    );
  }
  if (auth.user) return <RouteLoading message="Opening restricted Admin workspace…" />;
  return <Suspense fallback={<RouteLoading message="Opening Admin sign-in…" />}><AdminSignInPage /></Suspense>;
}

export function AdminMfaRoute() {
  const auth = useAuthSession();

  useEffect(() => {
    if (!auth.loading && !auth.error && !auth.user) {
      window.location.replace('/admin/sign-in');
    }
  }, [auth.error, auth.loading, auth.user?.id]);

  if (!auth.configured || auth.passwordRecovery) return <NotFoundPage />;
  if (auth.loading) return <RouteLoading message="Checking Admin session…" />;
  if (auth.error) return <SessionResolutionError />;
  if (!auth.user) return <RouteLoading message="Opening Admin sign-in…" />;
  if (auth.role !== 'physio') {
    return (
      <PersonaDeniedPage
        title="Administration access denied."
        message="Patient sessions cannot enter the Admin security surface."
        primaryHref="/patient"
        primaryLabel="Open patient gateway"
      />
    );
  }

  return <AdminMfaPage />;
}

export type AdminSection = 'overview' | 'bookings' | 'patients' | 'therapists' | 'verifications' | 'finance' | 'communications' | 'cases' | 'governance' | 'audit' | 'access' | 'system';

const ADMIN_NAVIGATION: Array<{
  section: AdminSection;
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  capabilities: AdminCapability[];
}> = [
  { section: 'overview', href: '/admin', label: 'Overview', icon: LayoutDashboard, capabilities: ['platform_owner', 'operations_admin'] },
  { section: 'bookings', href: '/admin/bookings', label: 'Bookings', icon: CalendarRange, capabilities: ['platform_owner', 'operations_admin', 'support_agent'] },
  { section: 'patients', href: '/admin/patients', label: 'Patients', icon: UsersRound, capabilities: ['platform_owner', 'operations_admin', 'support_agent', 'privacy_officer'] },
  { section: 'verifications', href: '/admin/verifications', label: 'Verification', icon: BadgeCheck, capabilities: ['platform_owner', 'verification_reviewer'] },
  { section: 'therapists', href: '/admin/therapists', label: 'Therapists', icon: UsersRound, capabilities: ['platform_owner', 'operations_admin', 'verification_reviewer', 'support_agent'] },
  { section: 'finance', href: '/admin/finance', label: 'Finance', icon: CircleDollarSign, capabilities: ['platform_owner', 'finance_reviewer'] },
  { section: 'communications', href: '/admin/communications', label: 'Delivery', icon: MessageSquareWarning, capabilities: ['platform_owner', 'operations_admin', 'support_agent', 'security_auditor'] },
  { section: 'cases', href: '/admin/cases', label: 'Cases', icon: ClipboardList, capabilities: ['platform_owner', 'operations_admin', 'support_agent', 'privacy_officer', 'finance_reviewer', 'security_auditor'] },
  { section: 'governance', href: '/admin/governance', label: 'Rules', icon: Scale, capabilities: ['platform_owner', 'privacy_officer', 'content_moderator'] },
  { section: 'audit', href: '/admin/audit', label: 'Audit', icon: ScrollText, capabilities: ['platform_owner', 'security_auditor'] },
  { section: 'access', href: '/admin/access', label: 'Access', icon: KeyRound, capabilities: ['platform_owner', 'security_auditor'] },
  { section: 'system', href: '/admin/system', label: 'Launch', icon: ServerCog, capabilities: ['platform_owner', 'security_auditor'] },
];

const canUse = (capabilities: AdminCapability[], required: AdminCapability[]) =>
  required.some((capability) => capabilities.includes(capability));

function AdminSectionPage({ section, requestId, capabilities }: { section: AdminSection; requestId?: string; capabilities: AdminCapability[] }) {
  if (section === 'bookings') return <AdminBookingsPage />;
  if (section === 'patients') return <AdminPatientsPage />;
  if (section === 'therapists') return <AdminTherapistsPage />;
  if (section === 'verifications') return requestId ? <AdminVerificationReviewPage requestId={requestId} /> : <AdminVerificationsPage />;
  if (section === 'finance') return <AdminFinancePage />;
  if (section === 'communications') return <AdminCommunicationsPage />;
  if (section === 'cases') return <AdminCasesPage capabilities={capabilities} />;
  if (section === 'governance') return <AdminGovernancePage />;
  if (section === 'audit') return <AdminAuditPage />;
  if (section === 'access') return <AdminAccessPage canEdit={capabilities.includes('platform_owner')} />;
  if (section === 'system') return <AdminSystemPage />;
  return <AdminOperationsOverviewPage />;
}

export function AdminPortalRoute({ section, requestId }: { section: AdminSection; requestId?: string }) {
  const auth = useAuthSession();
  const [adminGate, setAdminGate] = useState<'checking' | 'ready' | 'denied' | 'error'>('checking');
  const [capabilities, setCapabilities] = useState<AdminCapability[]>([]);

  useEffect(() => {
    if (!auth.loading && !auth.error && !auth.user) {
      window.location.replace('/admin/sign-in');
    }
  }, [auth.error, auth.loading, auth.user?.id]);

  useEffect(() => {
    if (auth.loading || auth.error || !auth.user || auth.role !== 'physio' || auth.passwordRecovery) return;

    let active = true;
    setAdminGate('checking');
    Promise.all([loadAdminSecurityState(), getAdminCapabilities()])
      .then(([securityState, activeCapabilities]) => {
        if (!active) return;
        if (!securityState) {
          setAdminGate('denied');
          return;
        }
        if (securityState.currentAal !== 'aal2') {
          window.location.replace('/admin/mfa');
          return;
        }
        setCapabilities(activeCapabilities);
        setAdminGate('ready');
      })
      .catch(() => {
        if (active) setAdminGate('error');
      });

    return () => {
      active = false;
    };
  }, [auth.error, auth.loading, auth.passwordRecovery, auth.role, auth.user?.id]);

  const sectionRule = ADMIN_NAVIGATION.find((item) => item.section === section);
  const sectionAuthorized = Boolean(sectionRule && canUse(capabilities, sectionRule.capabilities));
  const firstAvailable = ADMIN_NAVIGATION.find((item) => canUse(capabilities, item.capabilities));

  useEffect(() => {
    if (
      adminGate === 'ready'
      && !sectionAuthorized
      && firstAvailable
      && firstAvailable.section !== section
    ) {
      window.location.replace(firstAvailable.href);
    }
  }, [adminGate, firstAvailable?.href, firstAvailable?.section, section, sectionAuthorized]);

  if (!auth.configured || auth.passwordRecovery) return <NotFoundPage />;
  if (auth.loading || adminGate === 'checking') return <RouteLoading message="Checking Admin authority and MFA…" />;
  if (auth.error || adminGate === 'error') return <SessionResolutionError />;
  if (!auth.user) return <RouteLoading message="Opening Admin sign-in…" />;
  if (auth.role !== 'physio' || adminGate === 'denied') {
    return (
      <PersonaDeniedPage
        title="Administration access denied."
        message="This account does not have active platform Admin authority."
        primaryHref="/app"
        primaryLabel="Open professional workspace"
      />
    );
  }

  if (!sectionAuthorized) {
    if (firstAvailable && firstAvailable.section !== section) {
      return <RouteLoading message="Opening your authorized Admin workspace…" />;
    }
    return (
      <PersonaDeniedPage
        title="Administration access denied."
        message="This professional account has no active capability for this Admin section."
        primaryHref="/app"
        primaryLabel="Open professional workspace"
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex h-[70px] max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-7">
          <a href="/admin"><PhysioBillBrand suffix={<span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">Platform administration</span>} /></a>
          <WorkspaceSignOut className="rounded-xl border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground" />
        </div>
      </header>
      <div className="mx-auto grid max-w-[1320px] gap-6 px-4 pb-20 pt-5 sm:px-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:pt-7">
        <nav aria-label="Admin sections" className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-[94px] lg:block lg:h-fit lg:space-y-1 lg:overflow-visible">
          {ADMIN_NAVIGATION.filter((item) => canUse(capabilities, item.capabilities)).map((item) => {
            const Icon = item.icon;
            const current = item.section === section;
            return <a key={item.section} href={item.href} aria-current={current ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition lg:flex ${current ? 'bg-primary text-primary-foreground' : 'border bg-card text-muted-foreground hover:text-foreground'}`}><Icon size={16} />{item.label}</a>;
          })}
        </nav>
        <main className="min-w-0"><Suspense fallback={<RouteLoading message="Opening Admin section…" />}><AdminSectionPage section={section} requestId={requestId} capabilities={capabilities} /></Suspense></main>
      </div>
    </div>
  );
}

export function AdminVerificationRoute({ requestId }: { requestId?: string }) {
  return <AdminPortalRoute section="verifications" requestId={requestId} />;
}
