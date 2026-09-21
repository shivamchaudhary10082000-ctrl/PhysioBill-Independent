import { getSupabaseClient } from '@/lib/supabase';

export type AdminCapability =
  | 'platform_owner'
  | 'operations_admin'
  | 'verification_reviewer'
  | 'support_agent'
  | 'privacy_officer'
  | 'security_auditor'
  | 'content_moderator'
  | 'finance_reviewer';

const ADMIN_CAPABILITIES = new Set<AdminCapability>([
  'platform_owner',
  'operations_admin',
  'verification_reviewer',
  'support_agent',
  'privacy_officer',
  'security_auditor',
  'content_moderator',
  'finance_reviewer',
]);

export type AdminOperationsOverview = {
  period: { from: string; to: string };
  traffic: {
    measurement_status: 'external_configuration_required';
    unique_visitors: null;
    page_views: null;
  };
  appointments: {
    total: number;
    requested: number;
    accepted: number;
    rejected: number;
    cancelled: number;
  };
  patients: { registered_total: number };
  therapists: {
    registered_total: number;
    verified_total: number;
    discoverable_total: number;
    pending_verification_total: number;
  };
};

export type AdminAppointmentOperation = {
  appointment_request_id: string;
  public_patient_id: string;
  public_physio_id: string;
  therapist_display_name: string;
  service_mode: 'home_visit' | 'clinic_visit' | 'telephysiotherapy';
  starts_at: string;
  ends_at: string;
  timezone_name: string;
  request_status: 'requested' | 'accepted' | 'rejected' | 'cancelled';
  requested_at: string;
  responded_at: string | null;
  cancelled_at: string | null;
  cancelled_by: 'patient' | 'physio' | null;
  reschedules_request_id: string | null;
};

export type AdminTherapistOperation = {
  physio_id: string;
  public_physio_id: string;
  therapist_display_name: string;
  qualification: string;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  is_discoverable: boolean;
  registered_at: string;
  appointment_requests_30d: number;
  accepted_appointments_30d: number;
};

export type AdminPatientOperation = {
  platform_patient_id: string;
  public_patient_id: string;
  registered_at: string;
  appointment_requests_30d: number;
  accepted_appointments_30d: number;
  last_appointment_request_at: string | null;
};

export type AdminAuditEvent = {
  event_id: string;
  actor_user_id: string;
  capability_used: AdminCapability;
  action: string;
  target_type: string;
  target_id: string | null;
  reason: string;
  details: Record<string, unknown>;
  occurred_at: string;
};

export type AdminCapabilityGrant = {
  user_id: string;
  capability: AdminCapability;
  is_active: boolean;
  granted_by_user_id: string | null;
  grant_reason: string;
  created_at: string;
  updated_at: string;
};

export type AdminBillingConsistency = {
  invoice_id: string;
  invoice_number: string;
  public_physio_id: string;
  invoice_status: string;
  finalized: boolean;
  invoice_total: number;
  paid_total: number;
  snapshot_total: number | null;
  reimbursement_total: number | null;
  pdf_generation_status: 'pending' | 'complete' | 'failed' | null;
  consistency_status:
    | 'draft'
    | 'snapshot_missing'
    | 'amount_mismatch'
    | 'pdf_not_generated'
    | 'pdf_failed'
    | 'pdf_pending'
    | 'consistent';
  created_at: string;
};

export type AdminCaseCategory =
  | 'complaint'
  | 'safety_incident'
  | 'privacy_access'
  | 'privacy_correction'
  | 'privacy_deletion'
  | 'privacy_grievance'
  | 'billing'
  | 'technical';

export type AdminCaseStatus = 'open' | 'triaged' | 'in_progress' | 'waiting' | 'closed';

export type AdminCase = {
  case_id: string;
  case_number: number;
  category: AdminCaseCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  case_status: AdminCaseStatus;
  safe_summary: string;
  related_appointment_request_id: string | null;
  related_public_physio_id: string | null;
  related_public_patient_id: string | null;
  assigned_admin_user_id: string | null;
  due_at: string | null;
  legal_hold: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminCommunicationHealth = {
  period: { from: string; to: string };
  provider_configuration: 'external_configuration_required';
  intents_total: number;
  scheduled_due: number;
  delivery_activity: number;
  delivered: number;
  failed: number;
  suppressed: number;
  last_transition_at: string | null;
};

export type AdminLegalAcknowledgementSummary = {
  account_role: 'physio' | 'patient';
  notice_version: string;
  acknowledgement_count: number;
  professional_standards_count: number;
  latest_acknowledged_at: string;
};

const accessError = (area: string) =>
  new Error(`${area} is unavailable or your account does not have the required Admin capability.`);

export async function getAdminCapabilities(): Promise<AdminCapability[]> {
  const { data, error } = await getSupabaseClient().rpc('get_my_platform_admin_capabilities');
  if (error || !Array.isArray(data)) throw accessError('Admin access');
  return data.filter((value): value is AdminCapability =>
    typeof value === 'string' && ADMIN_CAPABILITIES.has(value as AdminCapability));
}

export async function getAdminOperationsOverview(
  from: string,
  to: string,
): Promise<AdminOperationsOverview> {
  const { data, error } = await getSupabaseClient().rpc('get_admin_operations_overview', {
    p_from: from,
    p_to: to,
  });
  if (error || !data || Array.isArray(data)) throw accessError('Operations overview');
  return data as AdminOperationsOverview;
}

export async function listAdminAppointmentOperations(input?: {
  from?: string;
  to?: string;
  status?: AdminAppointmentOperation['request_status'] | null;
  limit?: number;
  offset?: number;
}): Promise<AdminAppointmentOperation[]> {
  const { data, error } = await getSupabaseClient().rpc('list_admin_appointment_operations', {
    p_from: input?.from,
    p_to: input?.to,
    p_status: input?.status ?? undefined,
    p_limit: input?.limit ?? 100,
    p_offset: input?.offset ?? 0,
  });
  if (error) throw accessError('Appointment operations');
  return Array.isArray(data) ? data as AdminAppointmentOperation[] : [];
}

export async function listAdminTherapistOperations(input?: {
  verificationStatus?: AdminTherapistOperation['verification_status'] | null;
  limit?: number;
  offset?: number;
}): Promise<AdminTherapistOperation[]> {
  const { data, error } = await getSupabaseClient().rpc('list_admin_therapist_operations', {
    p_verification_status: input?.verificationStatus ?? undefined,
    p_limit: input?.limit ?? 100,
    p_offset: input?.offset ?? 0,
  });
  if (error) throw accessError('Therapist operations');
  return Array.isArray(data) ? data as AdminTherapistOperation[] : [];
}

export async function listAdminPatientOperations(input?: {
  limit?: number;
  offset?: number;
}): Promise<AdminPatientOperation[]> {
  const { data, error } = await getSupabaseClient().rpc('list_admin_patient_operations', {
    p_limit: input?.limit ?? 100,
    p_offset: input?.offset ?? 0,
  });
  if (error) throw accessError('Patient operations');
  return Array.isArray(data) ? data as AdminPatientOperation[] : [];
}

export async function listAdminBillingConsistency(input?: {
  limit?: number;
  offset?: number;
}): Promise<AdminBillingConsistency[]> {
  const { data, error } = await getSupabaseClient().rpc('list_admin_billing_consistency', {
    p_limit: input?.limit ?? 100,
    p_offset: input?.offset ?? 0,
  });
  if (error) throw accessError('Billing consistency');
  return Array.isArray(data) ? data as AdminBillingConsistency[] : [];
}

export async function getAdminCommunicationHealth(
  from: string,
  to: string,
): Promise<AdminCommunicationHealth> {
  const { data, error } = await getSupabaseClient().rpc('get_admin_communication_health', {
    p_from: from,
    p_to: to,
  });
  if (error || !data || Array.isArray(data)) throw accessError('Communication health');
  return data as AdminCommunicationHealth;
}

export async function listAdminLegalAcknowledgementSummary(): Promise<AdminLegalAcknowledgementSummary[]> {
  const { data, error } = await getSupabaseClient().rpc('list_admin_legal_acknowledgement_summary');
  if (error) throw accessError('Legal acknowledgement supervision');
  return Array.isArray(data) ? data as AdminLegalAcknowledgementSummary[] : [];
}

export async function listAdminCases(input?: {
  status?: AdminCaseStatus | null;
  limit?: number;
  offset?: number;
}): Promise<AdminCase[]> {
  const { data, error } = await getSupabaseClient().rpc('list_platform_admin_cases', {
    p_status: input?.status ?? undefined,
    p_limit: input?.limit ?? 100,
    p_offset: input?.offset ?? 0,
  });
  if (error) throw accessError('Admin cases');
  return Array.isArray(data) ? data as AdminCase[] : [];
}

export async function createAdminCase(input: {
  category: AdminCaseCategory;
  severity: AdminCase['severity'];
  safeSummary: string;
  appointmentRequestId?: string;
  physioId?: string;
  platformPatientId?: string;
  dueAt?: string;
}) {
  const { data, error } = await getSupabaseClient().rpc('create_platform_admin_case', {
    p_category: input.category,
    p_severity: input.severity,
    p_safe_summary: input.safeSummary.trim(),
    p_related_appointment_request_id: input.appointmentRequestId || undefined,
    p_related_physio_id: input.physioId || undefined,
    p_related_platform_patient_id: input.platformPatientId || undefined,
    p_due_at: input.dueAt || undefined,
  });
  if (error || typeof data !== 'string') throw accessError('Case creation');
  return data;
}

export async function transitionAdminCase(input: {
  caseId: string;
  toStatus: Exclude<AdminCaseStatus, 'open'>;
  reason: string;
}) {
  const { error } = await getSupabaseClient().rpc('transition_platform_admin_case', {
    p_case_id: input.caseId,
    p_to_status: input.toStatus,
    p_reason: input.reason.trim(),
  });
  if (error) throw accessError('Case transition');
}

export async function listAdminAuditEvents(input?: {
  limit?: number;
  offset?: number;
}): Promise<AdminAuditEvent[]> {
  const { data, error } = await getSupabaseClient().rpc('list_platform_admin_audit_events', {
    p_limit: input?.limit ?? 100,
    p_offset: input?.offset ?? 0,
  });
  if (error) throw accessError('Admin audit history');
  return Array.isArray(data) ? data as AdminAuditEvent[] : [];
}

export async function listAdminCapabilityGrants(): Promise<AdminCapabilityGrant[]> {
  const { data, error } = await getSupabaseClient().rpc('list_platform_admin_capability_grants');
  if (error) throw accessError('Admin access management');
  return Array.isArray(data) ? data as AdminCapabilityGrant[] : [];
}

export async function setAdminCapability(input: {
  userId: string;
  capability: AdminCapability;
  active: boolean;
  reason: string;
}) {
  const { error } = await getSupabaseClient().rpc('set_platform_admin_capability', {
    p_user_id: input.userId,
    p_capability: input.capability,
    p_is_active: input.active,
    p_reason: input.reason.trim(),
  });
  if (error) {
    throw new Error(
      error.code === '23514'
        ? 'This capability change violates an Admin safety boundary.'
        : 'The Admin capability could not be changed.',
    );
  }
}
