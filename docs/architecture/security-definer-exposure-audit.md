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

## Financial authorization sub-audit

A follow-up production-candidate review classified the currently exposed credit-ledger, invoice-credit, therapist payment-destination, and reimbursement-document RPCs. No grant reduction or schema change is justified from source inspection alone.

### Therapist credit ledger

- `record_patient_credit_ledger_entry(...)` resolves the caller through `private.current_physio_id()` and requires the target clinical chart to be owned by that physiotherapist before any entry is recorded.
- The ledger is append-only at table level, direct `public`/`anon`/`authenticated` table access is revoked, and balance mutations are serialized with an advisory transaction lock scoped to `(physio_id, patient_id)`.
- `list_patient_credit_ledger(uuid)` repeats the therapist-owned chart check and filters ledger rows by both therapist and patient identifiers.
- `list_my_credit_summary()` is the patient read boundary: it resolves only an `app_users.role = 'patient'` platform patient and returns entries only through that platform patient's active, non-revoked chart links. PAT identity therefore does not become direct chart ownership authority.

### Invoice credit application

- `apply_patient_credit_to_invoice(uuid,numeric)` resolves the current physiotherapist, locks and requires an invoice owned by that physiotherapist, requires a finalized invoice and a therapist-owned patient chart, and serializes the patient credit balance before applying credit.
- The application and ledger records are append-only; invoice settlement reconciliation remains database-controlled.
- `list_invoice_credit_applications(uuid)` first proves invoice ownership and then filters by the same therapist identifier.

### Therapist payment destinations

- Payment-destination tables deny direct client-role access.
- List/save/disable RPCs resolve `private.current_physio_id()` and never accept a caller-supplied therapist identifier.
- Updates and disables constrain both destination ID and the resolved therapist owner, and per-therapist advisory locking protects the single-default invariant.
- Provider destinations cannot be activated through the manual destination RPCs; provider KYC, secrets and settlement activation remain external/manual gates.

### Professional reimbursement documents

- Issuance resolves the current physiotherapist and accepts an invoice only through a finalized issuance snapshot owned by that same physiotherapist.
- Issued reimbursement documents are immutable and direct client table access is revoked.
- Therapist document listing is owner-filtered.
- Anonymous verification is intentionally token-based and returns bounded invoice/professional verification facts only; it does not return patient identifiers or clinical content.

### Decision

The generic Supabase `authenticated_security_definer_function_executable` warnings for these functions are not, by themselves, authorization defects. Replacing these self-authorizing database RPCs with frontend filtering would weaken the Security Constitution. Any future revocation must be supported by a concrete bypass or by a replacement database-authoritative path.

This source audit is not a substitute for the required dynamic multi-persona staging regression. Cross-owner and cross-persona calls still require execution with controlled staging identities before production-candidate freeze.

## Grant decision

No broad EXECUTE revocation is appropriate.

The Supabase advisor flags public/authenticated `SECURITY DEFINER` execution generically. Those warnings are review signals, not proof that the remaining RPC grants are incorrect. Revoking the four intentional anonymous read/verification endpoints would break pre-auth therapist discovery or public reimbursement verification. Revoking authenticated execution broadly would break database-authoritative application boundaries and push authorization pressure toward the frontend, which is prohibited.

Any future grant reduction must be function-specific and must first prove an equivalent database-authoritative workflow remains available.

## Acceptance evidence

Staging acceptance for the clinical-linkage hardening migration requires all of the following:

- legacy linkage-request RPC: no EXECUTE for `PUBLIC`, `anon`, `authenticated`, or `service_role`;
- existing-chart acceptance RPC: EXECUTE only for `authenticated` among exposed client roles;
- negative transactional test: an artificially inserted pending request with null appointment provenance is rejected with SQLSTATE `23514` and leaves no residue after rollback;
- positive transactional test: a request tied to an accepted appointment can link an owned chart, and an immediate retry is idempotent;
- rollback test: temporarily restoring the legacy authenticated grant inside a transaction is fully reversed by rollback;
- no test-created linkage/request state remains after rollback.

The financial sub-audit above is source-level acceptance only. Dynamic patient-A/patient-B and physiotherapist-A/physiotherapist-B adversarial calls remain required and must not be represented as passed until they are actually executed against controlled staging identities.

## Deferred items

- Dynamic multi-persona staging fixtures and adversarial caller tests remain pending where controlled identities are not yet available through the current automation tool boundary.
- Account-level leaked-password protection remains an external/account configuration gate.
- Provider activation, secrets, webhooks, payment KYC, telehealth activation, Cloudflare settings, and production promotion remain external gates.
- Browser acceptance remains independent of this database audit.