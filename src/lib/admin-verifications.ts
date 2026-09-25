import { getSupabaseClient } from '@/lib/supabase';

export type PendingVerificationRequest = {
  request_id: string;
  physio_id: string;
  request_version: number;
  submitted_full_name: string;
  submitted_qualification: string;
  submitted_registration_number: string;
  submitted_registration_authority: string;
  submitted_registration_jurisdiction: string;
  submitted_registration_region_code: string;
  credential_fingerprint: string;
  requested_at: string;
  registration_conflict: boolean;
};

export type VerificationEvent = {
  id: string;
  request_id: string | null;
  request_version: number | null;
  event_type: string;
  previous_state: string;
  resulting_state: string;
  reason: string;
  verification_method: string;
  verification_reference: string;
  created_at: string;
};

export type VerificationReview = PendingVerificationRequest & {
  request_status: 'pending' | 'approved' | 'rejected' | 'superseded' | 'revoked';
  decided_at: string | null;
  decision_reason: string;
  verification_method: string;
  verification_reference: string;
  events: VerificationEvent[];
};

const adminError = (message: string) => new Error(message);

export async function listPendingVerificationRequests(): Promise<PendingVerificationRequest[]> {
  const { data, error } = await getSupabaseClient().rpc('list_pending_professional_verifications');
  if (error) throw adminError('Admin verification access is unavailable or not authorized.');
  return Array.isArray(data) ? (data as PendingVerificationRequest[]) : [];
}

export async function loadVerificationReview(requestId: string): Promise<VerificationReview> {
  const { data, error } = await getSupabaseClient().rpc('get_professional_verification_review', {
    p_request_id: requestId,
  });
  if (error || !data || Array.isArray(data)) {
    throw adminError('This verification review is unavailable, stale, or not authorized.');
  }
  return data as VerificationReview;
}

export async function decideVerification(input: {
  requestId: string;
  requestVersion: number;
  credentialFingerprint: string;
  decision: 'approve' | 'reject';
  reason: string;
  verificationMethod: string;
  verificationReference: string;
}) {
  const { data, error } = await getSupabaseClient().rpc('decide_professional_verification', {
    p_request_id: input.requestId,
    p_expected_request_version: input.requestVersion,
    p_expected_credential_fingerprint: input.credentialFingerprint,
    p_decision: input.decision,
    p_reason: input.reason.trim(),
    p_verification_method: input.verificationMethod.trim(),
    p_verification_reference: input.verificationReference.trim(),
  });
  if (error) {
    throw adminError(
      error.code === '40001'
        ? 'This review is stale because the request or credentials changed. Reload before deciding.'
        : error.code === '23505'
          ? 'This canonical professional registration is already actively verified.'
          : 'The verification decision could not be completed.',
    );
  }
  return data;
}

export async function revokeVerification(input: {
  physioId: string;
  credentialFingerprint: string;
  reason: string;
}) {
  const { error } = await getSupabaseClient().rpc('revoke_professional_verification', {
    p_physio_id: input.physioId,
    p_expected_credential_fingerprint: input.credentialFingerprint,
    p_reason: input.reason.trim(),
  });
  if (error) {
    throw adminError(
      error.code === '40001'
        ? 'This verified state is stale. Reload before revoking.'
        : 'The verification could not be revoked.',
    );
  }
}

export async function requireVerificationResubmission(input: {
  requestId: string;
  requestVersion: number;
  reason: string;
}) {
  const { error } = await getSupabaseClient().rpc(
    'require_professional_verification_resubmission',
    {
      p_request_id: input.requestId,
      p_expected_request_version: input.requestVersion,
      p_reason: input.reason.trim(),
    },
  );
  if (error) {
    throw adminError(
      error.code === '40001'
        ? 'This request is stale. Reload before requiring resubmission.'
        : 'The resubmission request could not be completed.',
    );
  }
}
