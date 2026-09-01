# Staging Security Regression Inventory

Checkpoint scope: isolated PhysioBill Staging only. This document records verification results and release invariants; it does not grant authority or replace database enforcement.

## Frozen invariants

- One authenticated application user must resolve to one persona boundary.
- PAT and PHY identifiers are immutable platform identifiers and must never collide.
- A PAT is not a therapist-owned clinical chart.
- Platform patient ↔ clinical chart linkage is an explicit relationship and is not itself clinical access authority.
- Therapist-owned clinical and financial records remain constrained by database ownership and RLS.
- Anonymous users must have zero direct access to protected clinical/financial tables.
- Frontend presentation, locale, PWA state and routing must never become authorization authority.

## Verified staging checkpoint

Current isolated staging migration history ends at `20260901113439 — fix_reimbursement_document_conflict_target`.

The preceding integrity probes returned:

- invalid `app_users.role` values outside patient/physio/admin: **0**
- platform patients with null PAT identifier: **0**
- physiotherapists with null PHY identifier: **0**
- PAT/PHY identifier collisions: **0**
- platform-patient/clinical-chart links whose chart owner differs from the recorded physiotherapist: **0**
- active chart links in the inspected staging dataset: **0**

The accepted-appointment linkage hardening migration was applied and accepted separately with transactional negative, positive/idempotent and rollback tests, leaving no test-created request/link residue.

## Sensitive-table RLS / direct-grant snapshot

All inspected sensitive tables have RLS enabled. Anonymous SELECT is denied for every inspected table.

RPC-only sensitive foundations additionally deny direct authenticated SELECT where appropriate, including:

- `home_visit_service_location_snapshots`
- `patient_credit_ledger_entries`
- `physiotherapist_payment_destinations`
- `platform_patient_clinical_chart_links`
- `invoice_credit_applications`
- `invoice_credit_application_reversals`
- `professional_reimbursement_documents`
- `telephysiotherapy_sessions`
- communication preference/event/delivery-transition tables

Legacy therapist-owned clinical/financial tables (`patients`, `visits`, `clinical_records`, `invoices`, `payments`) remain behind authenticated ownership RLS based on `private.owns_physio(physio_id)`.

The bounded direct-table audit at this checkpoint additionally confirmed composite ownership foreign keys for dependent rows and identity triggers that derive or preserve therapist ownership instead of trusting caller-supplied ownership fields.

Transactional impersonation provides dynamic staging evidence:

- Physiotherapist A could see **1** own patient and **0** Physiotherapist B patients.
- Physiotherapist A could see **0** Physiotherapist B visits, clinical records, invoices, and payments.
- A direct UPDATE attempt against Physiotherapist B's patient rows affected **0** rows.
- A patient-persona authenticated identity could directly see **0** rows across `patients`, `visits`, `clinical_records`, `invoices`, and `payments`.

These tests were transactional and left no residue. Full details are locked in `legacy-direct-table-rls-audit.md`.

## Dynamic RPC persona / owner-isolation regression

A bounded transactional RPC matrix was executed against the same isolated staging project using two controlled patient personas, two controlled physiotherapist personas, two therapist-owned legacy charts, and temporary active platform-patient/chart links created only inside rollback transactions.

Patient self-read isolation passed symmetrically:

- Patient A `list_my_clinical_care_summary()` returned only the temporary link to Physiotherapist A and only Physiotherapist A's synthetic episode/visit data; no Patient B / Physiotherapist B clinical data appeared.
- Patient A `list_my_credit_summary()` returned only the Physiotherapist A link and its own credit state.
- Patient A `list_my_financial_summary()` returned only the Physiotherapist A link; no Physiotherapist B financial surface appeared.
- Patient B `list_my_clinical_care_summary()` returned only the temporary link to Physiotherapist B and only Physiotherapist B's synthetic episode/visit data; no Patient A / Physiotherapist A clinical data appeared.
- Patient B `list_my_credit_summary()` returned only the Physiotherapist B link and its own credit state.
- Patient B `list_my_financial_summary()` returned only the Physiotherapist B link; no Physiotherapist A financial surface appeared.

Professional cross-owner rejection passed:

- Physiotherapist A `list_patient_credit_ledger()` against Physiotherapist B's chart failed with SQLSTATE `42501`.
- Physiotherapist A `record_patient_credit_ledger_entry()` against Physiotherapist B's chart failed with SQLSTATE `42501`.
- Physiotherapist A `apply_patient_credit_to_invoice()` against Physiotherapist B's invoice failed with SQLSTATE `42501`.
- Physiotherapist B `list_patient_credit_ledger()` against Physiotherapist A's chart failed with SQLSTATE `42501`.
- Physiotherapist B `record_patient_credit_ledger_entry()` against Physiotherapist A's chart failed with SQLSTATE `42501`.

Cross-persona rejection passed:

- A patient persona invoking `record_patient_credit_ledger_entry()` failed with SQLSTATE `42501` because no physiotherapist workspace can be resolved.
- A physiotherapist persona invoking `list_my_clinical_care_summary()` failed with SQLSTATE `42501` because patient clinical access is restricted to patient accounts.

Every temporary link fixture was created inside a transaction followed by `ROLLBACK`; every mutation probe either failed before mutation or ran in a rollback transaction. No test-created clinical link, credit entry, invoice application, or other financial row was intentionally persisted.

No authorization defect was demonstrated by this bounded RPC matrix. Therefore no database migration was created or applied merely to manufacture a change. Migration, rollback-migration and migration-concurrency testing are not applicable to that regression-only checkpoint.

## Payment-destination and reimbursement regression

A subsequent bounded financial RPC matrix covered therapist-owned payment destinations and professional reimbursement documents.

Payment-destination ownership/persona isolation passed transactionally:

- Physiotherapist A created a temporary UPI destination through `save_my_manual_payment_destination()`.
- Physiotherapist B could neither update that destination through `save_my_manual_payment_destination()` nor disable it through `disable_my_payment_destination()`; both rejected cross-owner access with SQLSTATE `42501`.
- A patient persona could neither create a professional payment destination nor list professional payment destinations; both rejected the caller with SQLSTATE `42501`.
- The transaction was rolled back and a post-test residue query returned **0** matching temporary destination rows.

The first reimbursement positive-path probe exposed a concrete staging defect: `issue_my_reimbursement_document(uuid)` is a table-returning PL/pgSQL function with an output parameter named `invoice_id`, so its original `ON CONFLICT (invoice_id) DO NOTHING` target was ambiguous and raised PostgreSQL error `42702` for legitimate owner issuance.

The committed forward migration `20260901113000_fix_reimbursement_document_conflict_target.sql` changes only that conflict target to the existing unique constraint `professional_reimbursement_documents_invoice_id_key`. Staging recorded the exact applied migration as `20260901113439 — fix_reimbursement_document_conflict_target`. Authorization, therapist ownership resolution, verified-professional requirements and advisory transaction locking remain unchanged.

Post-migration transactional acceptance passed:

- Physiotherapist B attempting to issue a reimbursement document for Physiotherapist A's snapshot was rejected with SQLSTATE `42501`.
- Physiotherapist A successfully issued the document.
- A second owner issuance for the same invoice returned the same verification token, proving idempotent single-document behavior under the existing advisory-lock + unique-constraint design.
- `list_my_reimbursement_documents()` returned exactly that owner document.
- A patient persona attempting professional reimbursement issuance was rejected with SQLSTATE `42501`.
- Anonymous `verify_reimbursement_document()` returned exactly one valid bounded verification result for the generated token and the expected `physiotherapy_reimbursement_statement` type; the public function's declared result contains no patient identifier or clinical payload.
- The entire fixture transaction was rolled back; post-test snapshot residue = **0** and reimbursement-document residue = **0**.
- A transactional EXECUTE-grant rollback probe confirmed authenticated execution remained restored after rollback, and the live function definition still contains the fixed named-constraint conflict target.

This slice therefore includes a real forward migration, rollback-safety check, owner/cross-owner/persona security tests and idempotency/concurrency-boundary verification rather than documentation-only progress.

## SECURITY DEFINER review state

The current Supabase Security Advisor still reports generic review warnings for intentional anonymous and authenticated `SECURITY DEFINER` RPCs. The retired legacy `request_my_clinical_chart_link(uuid)` no longer appears as an authenticated executable warning after the accepted-appointment hardening migration.

Financial source review confirms that credit-ledger, invoice-credit, therapist payment-destination and reimbursement-document RPCs are database self-authorizing: therapist mutations resolve `private.current_physio_id()` and re-check target ownership, patient credit reads resolve the patient persona and active chart linkage, sensitive tables deny direct client access, and public reimbursement verification exposes no patient or clinical payload. The reimbursement issuance positive path is now also dynamically accepted after the ambiguity fix. These generic advisor warnings are therefore not being silenced through broad grant revocation.

Dynamic direct-table and bounded RPC persona-isolation evidence now supplement the prior source-level review. Remaining RPC-level coverage should focus on appointment/onboarding, telephysiotherapy, service-location, communications and analytics boundaries rather than repeating the credit/clinical/payment-destination/reimbursement cases recorded above.

## Required pre-production regression

Before a production-candidate freeze, complete staged multi-persona tests proving:

1. Patient A cannot read Patient B clinical or financial data through bounded patient RPCs. **Bounded clinical/credit/financial self-read matrix passed at this checkpoint; expand only if new patient read surfaces are added.**
2. Physiotherapist A cannot read or mutate Physiotherapist B patients, visits, clinical records, invoices, payments, availability, service areas, analytics or payment destinations. **Legacy direct-table isolation, bounded credit/invoice-credit RPC ownership checks and payment-destination cross-owner rejection passed; availability/service-area/analytics RPC breadth remains.**
3. A patient account cannot enter physiotherapist workspace routes or execute physiotherapist-only mutations, and vice versa. **Database RPC persona rejection is partially proven; browser route enforcement remains deferred.**
4. PAT and PHY identifiers cannot be reassigned or mutated.
5. Linkage creation/revocation does not independently expose clinical data.
6. Accepted-appointment onboarding cannot attach to a chart owned by another physiotherapist.
7. Home-visit location evidence remains coarse immutable scheduling evidence and cannot become exact-location/attendance authority.
8. Credit ledger, payment-destination and reimbursement-document boundaries reject unauthorized callers. **Bounded dynamic coverage for all three now passes.**
9. Offline/PWA behavior cannot surface cached authenticated clinical or financial responses or report offline mutations as successful.
10. Locale changes alter presentation only and never database enums, identifiers, ownership, authorization or monetary values.

## Current execution state

Transactional SQL impersonation is available and has now been used for the legacy direct-table RLS matrix, bounded patient/physiotherapist RPC persona-isolation, therapist-owned payment-destination mutations and reimbursement issuance/verification. The remaining gap is breadth across appointment/onboarding, telephysiotherapy, service-location, communications and analytics plus browser/runtime acceptance; it is no longer a lack of controlled SQL impersonation capability.

## Deferred / external activation pending

The following are explicitly not represented as completed by this lock:

- remaining feature-family multi-persona RPC-level staging regression
- real browser/mobile/PWA/screen-reader regression
- real SMS/WhatsApp provider activation and delivery
- payment-provider KYC/secrets/live settlement
- telehealth-provider activation
- exact-location/geofencing/device-attestation anti-fraud
- Cloudflare/provider account-level production settings
- Supabase leaked-password protection
- production authorization / main-branch promotion
- legal, business or regulatory filings/facts

These gates must remain deferred rather than bypassed.