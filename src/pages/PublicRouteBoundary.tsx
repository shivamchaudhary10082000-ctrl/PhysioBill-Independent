import { PublicLandingPage } from '@/pages/PublicLandingPage';
import { TherapistDiscoveryPage } from '@/pages/TherapistDiscoveryPage';
import { PatientClinicalCareRoute } from '@/pages/PatientClinicalCareRoute';
import { PatientFinancialSummaryRoute } from '@/pages/PatientFinancialSummaryRoute';
import { PASSWORD_RECOVERY_PATH } from '@/lib/auth';
import { NotFoundPage } from '@/pages/route-boundary/SessionBoundaryPages';
import {
  AdminSignInRoute,
  AdminVerificationRoute,
} from '@/pages/route-boundary/AdminRoutes';
import {
  PasswordRecoveryRoute,
  PatientAppointmentsRoute,
  PatientGatewayRoute,
  PatientSignInRoute,
  ProfessionalAppointmentRequestsRoute,
  ProfessionalAvailabilityRoute,
  ProfessionalDiscoveryProfileRoute,
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
  '/app/settings',
] as const;

function isSupportedPrivateRoute(path: string) {
  return (
    path === '/app' ||
    PRIVATE_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  );
}

export function PublicRouteBoundary() {
  const path = window.location.pathname;

  if (path === '/') return <PublicLandingPage />;
  if (path === '/find-physio') return <TherapistDiscoveryPage />;
  if (path === '/patient/sign-in') return <PatientSignInRoute />;
  if (path === '/patient/appointments') return <PatientAppointmentsRoute />;
  if (path === '/patient/clinical-care') return <PatientClinicalCareRoute />;
  if (path === '/patient/financial-summary') return <PatientFinancialSummaryRoute />;
  if (path === '/patient') return <PatientGatewayRoute />;
  if (path === '/professional/sign-in') return <ProfessionalSignInRoute />;
  if (path === '/admin/sign-in') return <AdminSignInRoute />;
  if (path === '/admin/verifications') return <AdminVerificationRoute />;
  if (path.startsWith('/admin/verifications/')) {
    const requestId = path.slice('/admin/verifications/'.length);
    return requestId ? <AdminVerificationRoute requestId={requestId} /> : <NotFoundPage />;
  }
  if (path === PASSWORD_RECOVERY_PATH) return <PasswordRecoveryRoute />;
  if (path === '/app/discovery-profile') return <ProfessionalDiscoveryProfileRoute />;
  if (path === '/app/availability') return <ProfessionalAvailabilityRoute />;
  if (path === '/app/appointment-requests') return <ProfessionalAppointmentRequestsRoute />;
  if (isSupportedPrivateRoute(path)) return <ProfessionalWorkspaceRoute />;

  return <NotFoundPage />;
}
