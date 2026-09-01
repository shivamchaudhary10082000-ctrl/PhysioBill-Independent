# SECURITY DEFINER exposure audit

## Scope

This bounded audit reviews executable `SECURITY DEFINER` functions in the exposed `public` schema of isolated staging before making any grant change.

## Locked invariants

- Database authority remains stronger than frontend visibility.
- Patient and physiotherapist personas remain isolated.
- PAT and PHY identities remain immutable and distinct from therapist-owned clinical charts.
- PAT != clinical chart. Linkage != clinical access.
- Physiotherapist ownership/RLS isolation remains authoritative for clinical and financial data.
- No grant change may widen clinical, financial, identity, appointment, reimbursement, payment, telehealth, or communication authority.
- New clinical onboarding must originate from the patient's explicit request tied to a currently accepted appointment.

## Audit findings

- `PUBLIC` has no executable access to the audited `SECURITY DEFINER` functions.
- Anonymous execution is limited to intentional pre-auth/public read surfaces: verified therapist discovery, verified therapist availability, and reimbursement-document verification.
- Authenticated execution is used by intentional application RPCs that provide the database-authoritative persona/ownership boundary for patient and professional workflows.
- Service-only operations such as communication delivery-transition recording and invoice PDF artifact generation are not executable by anonymous or authenticated callers.
- `public` schema CREATE is not available to `PUBLIC`, `anon`, `authenticated`, or `service_role`; therefore callers cannot create shadow objects in `public` to hijack definer resolution.
- Existing function search paths are explicitly configured. Functions with an empty search path use schema-qualified references; functions requiring public/private objects pin their configured paths.

## Concrete defect found and fixed

The legacy `public.request_my_clinical_chart_link(uuid)` RPC remained executable by `authenticated` patients after the accepted-appointment onboarding path was introduced. That function could create a pending patient -> therapist linkage request with `appointment_request_id = null`. Although linkage still required therapist acceptance and did not itself grant clinical access, the legacy entry point bypassed the newer accepted-appointment provenance boundary.

The production-candidate hardening migration `20260901073000_harden_clinical_linkage_accepted_appointment_only.sql` therefore:

1. removes all executable grants from the legacy free-form linkage-request RPC;
2. preserves `request_clinical_link_from_accepted_appointment(uuid)` as the patient-authorized linkage request path;
3. hardens `accept_clinical_chart_link_request(uuid, uuid)` so a pending request must carry a matching, currently accepted appointment before an existing therapist-owned chart can be linked;
4. preserves idempotent retries for a linkage that was already validly accepted, even if appointment state later changes; and
5. leaves `create_and_accept_clinical_chart_link_request(...)` unchanged because that newer new-chart path already enforces accepted-appointment provenance.

At migration time isolated staging contained zero pending and zero historical linkage requests with null appointment provenance, so retiring the legacy entry point did not strand staging workflow state.

## Grant decision

No broad EXECUTE revocation is appropriate.

The Supabase advisor flags public/authenticated `SECURITY DEFINER` execution generically. Those warnings are review signals, not proof that the remaining RPC grants are incorrect. Revoking the four intentional anonymous read/verification endpoints would break pre-auth therapist discovery or public reimbursement verification. Revoking authenticated execution broadly would break database-authoritative application boundaries and push authorization pressure toward the frontend, which is prohibited.

Any future grant reduction must be function-specific and must first prove an equivalent database-authoritative workflow remains available.

## Acceptance evidence

Staging acceptance for the hardening migration requires all of the following:

- legacy linkage-request RPC: no EXECUTE for `PUBLIC`, `anon`, `authenticated`, or `service_role`;
- existing-chart acceptance RPC: EXECUTE only for `authenticated` among exposed client roles;
- negative transactional test: an artificially inserted pending request with null appointment provenance is rejected with SQLSTATE `23514` and leaves no residue after rollback;
- positive transactional test: a request tied to an accepted appointment can link an owned chart, and an immediate retry is idempotent;
- rollback test: temporarily restoring the legacy authenticated grant inside a transaction is fully reversed by rollback;
- no test-created linkage/request state remains after rollback.

## Deferred items

- Account-level leaked-password protection remains an external/account configuration gate.
- Provider activation, secrets, webhooks, payment KYC, telehealth activation, Cloudflare settings, and production promotion remain external gates.
- Browser acceptance remains independent of this database audit.
