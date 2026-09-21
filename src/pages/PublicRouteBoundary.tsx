import type { ReactNode } from 'react';
import { ProfessionalQuickNavigationFrame } from '@/Components/ProfessionalQuickNavigationFrame';
import { PublicLandingPage } from '@/pages/PublicLandingPage';
import { TherapistDiscoveryPage } from '@/pages/TherapistDiscoveryPage';
import { PatientClinicalCareRoute } from '@/pages/PatientClinicalCareRoute';
import { PatientFinancialSummaryRoute } from '@/pages/PatientFinancialSummaryRoute';
import { ReimbursementVerificationPage } from '@/pages/ReimbursementVerificationPage';
import { TelephysiotherapyRoute } from '@/pages/TelephysiotherapyRoute';
import { PrivacyNoticePage, ProfessionalStandardsPage, TermsPage } from '@/pages/LegalPages';
import { PASSWORD_RECOVERY_PATH } from '@/lib/auth';
import { NotFoundPage } from '@/pages/route-boundary/SessionBoundaryPages';

function productionComplianceConfigured() {
  const contact = (import.meta.env.VITE_PUBLIC_CONTACT_EMAIL as string | undefined)?.trim();
  const operator = (import.meta.env.VITE_PUBLIC_OPERATOR_NAME as string | undefined)?.trim();
  return Boolean(contact && operator);
}

function ProductionConfigurationRequired() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <section className="w-full max-w-xl rounded-3xl border bg-card p-7 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Production launch gate</p>
        <h1 className="mt-3 text-2xl font-bold tracking-[-.025em]">Public launch configuration is incomplete.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">The canonical production site will stay closed until a real service-operator name and monitored privacy/grievance contact are configured. This prevents an incomplete legal disclosure from being published accidentally.</p>
      </section>
    </main>
  );
}
import {
  AdminMfaRoute,
  AdminPortalRoute,
  AdminSignInRoute,
  AdminVerificationRoute,
} from '@/pages/route-boundary/AdminRoutes';
import {
  PasswordRecoveryRoute,
  PatientAppointmentsRoute,
  PatientCommunicationsRoute,
  PatientGatewayRoute,
  PatientSignInRoute,
  ProfessionalAnalyticsRoute,
  ProfessionalAppointmentRequestsRoute,
  ProfessionalAvailabilityRoute,
  ProfessionalCommunicationsRoute,
  ProfessionalDiscoveryProfileRoute,
  ProfessionalPaymentDestinationsRoute,
  ProfessionalSignInRoute,
  ProfessionalWorkspaceRoute,
} from '@/pages/route-boundary/PatientProfessionalRoutes';

const PRIVATE_ROUTE_PREFIXES = [
  '/app/dashboard',
  '/app/overview',
  '/app/patients',
  '/app/visits',
  '/app/clinical-records',
  '/app/invoices',
  '/app/invoice',
  '/app/financial-ledger',
  '/app/profile',
  '/app/discovery-profile',
  '/app/availability',
  '/app/appointment-requests',
  '/app/payment-destinations',
  '/app/analytics',
  '/app/communications',
  '/app/telephysiotherapy',
  '/app/settings',
] as const;

function isSupportedPrivateRoute(path: string) {
  return (
    path === '/app' ||
    PRIVATE_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  );
}

function professionalRoute(child: ReactNode) {
  return <ProfessionalQuickNavigationFrame>{child}</ProfessionalQuickNavigationFrame>;
}

export function PublicRouteBoundary() {
  const path = window.location.pathname;
  const hostname = window.location.hostname.toLowerCase();
  const canonicalProductionHost = 'physiobill-independent.pages.dev';
  const localHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const nonProductionPagesHost = hostname.endsWith('.pages.dev') && hostname !== canonicalProductionHost;
  const enforceProductionDisclosure = !localHost && !nonProductionPagesHost;

  if (enforceProductionDisclosure && !productionComplianceConfigured()) {
    return <ProductionConfigurationRequired />;
  }

  if (path === '/') return <PublicLandingPage />;
  if (path === '/privacy') return <PrivacyNoticePage />;
  if (path === '/terms') return <TermsPage />;
  if (path === '/professional-standards') return <ProfessionalStandardsPage />;
  if (path === '/find-physio') return <TherapistDiscoveryPage />;
  if (path.startsWith('/verify/reimbursement/')) {
    const token = path.slice('/verify/reimbursement/'.length);
    return token ? <ReimbursementVerificationPage token={token} /> : <NotFoundPage />;
  }
  if (path === '/patient/sign-in') return <PatientSignInRoute />;
  if (path === '/patient/appointments') return <PatientAppointmentsRoute />;
  if (path === '/patient/communications') return <PatientCommunicationsRoute />;
  if (path === '/patient/clinical-care') return <PatientClinicalCareRoute />;
  if (path === '/patient/financial-summary') return <PatientFinancialSummaryRoute />;
  if (path === '/patient/telephysiotherapy') return <TelephysiotherapyRoute persona="patient" />;
  if (path === '/patient') return <PatientGatewayRoute />;
  if (path === '/professional/sign-in') return <ProfessionalSignInRoute />;
  if (path === '/admin/sign-in') return <AdminSignInRoute />;
  if (path === '/admin/mfa') return <AdminMfaRoute />;
  if (path === '/admin') return <AdminPortalRoute section="overview" />;
  if (path === '/admin/bookings') return <AdminPortalRoute section="bookings" />;
  if (path === '/admin/patients') return <AdminPortalRoute section="patients" />;
  if (path === '/admin/therapists') return <AdminPortalRoute section="therapists" />;
  if (path === '/admin/finance') return <AdminPortalRoute section="finance" />;
  if (path === '/admin/communications') return <AdminPortalRoute section="communications" />;
  if (path === '/admin/cases') return <AdminPortalRoute section="cases" />;
  if (path === '/admin/governance') return <AdminPortalRoute section="governance" />;
  if (path === '/admin/audit') return <AdminPortalRoute section="audit" />;
  if (path === '/admin/access') return <AdminPortalRoute section="access" />;
  if (path === '/admin/system') return <AdminPortalRoute section="system" />;
  if (path === '/admin/verifications') return <AdminVerificationRoute />;
  if (path.startsWith('/admin/verifications/')) {
    const requestId = path.slice('/admin/verifications/'.length);
    return requestId ? <AdminVerificationRoute requestId={requestId} /> : <NotFoundPage />;
  }
  if (path === PASSWORD_RECOVERY_PATH) return <PasswordRecoveryRoute />;
  if (path === '/app/discovery-profile') return professionalRoute(<ProfessionalDiscoveryProfileRoute />);
  if (path === '/app/availability') return professionalRoute(<ProfessionalAvailabilityRoute />);
  if (path === '/app/appointment-requests') return professionalRoute(<ProfessionalAppointmentRequestsRoute />);
  if (path === '/app/payment-destinations') return professionalRoute(<ProfessionalPaymentDestinationsRoute />);
  if (path === '/app/analytics') return professionalRoute(<ProfessionalAnalyticsRoute />);
  if (path === '/app/communications') return professionalRoute(<ProfessionalCommunicationsRoute />);
  if (path === '/app/telephysiotherapy') return professionalRoute(<TelephysiotherapyRoute persona="physio" />);
  if (isSupportedPrivateRoute(path)) return professionalRoute(<ProfessionalWorkspaceRoute />);

  return <NotFoundPage />;
}
