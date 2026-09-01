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

Current isolated staging migration history ends at `20260901073337 — harden_clinical_linkage_accepted_appointment_only`.

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

Transactional impersonation now provides dynamic staging evidence:

- Physiotherapist A could see **1** own patient and **0** Physiotherapist B patients.
- Physiotherapist A could see **0** Physiotherapist B visits, clinical records, invoices, and payments.
- A direct UPDATE attempt against Physiotherapist B's patient rows affected **0** rows.
- A patient-persona authenticated identity could directly see **0** rows across `patients`, `visits`, `clinical_records`, `invoices`, and `payments`.

These tests were transactional and left no residue. Full details are locked in `legacy-direct-table-rls-audit.md`.

## SECURITY DEFINER review state

The current Supabase Security Advisor still reports generic review warnings for intentional anonymous and authenticated `SECURITY DEFINER` RPCs. The retired legacy `request_my_clinical_chart_link(uuid)` no longer appears as an authenticated executable warning after the accepted-appointment hardening migration.

Financial source review confirms that credit-ledger, invoice-credit, therapist payment-destination and reimbursement-document RPCs are database self-authorizing: therapist mutations resolve `private.current_physio_id()` and re-check target ownership, patient credit reads resolve the patient persona and active chart linkage, sensitive tables deny direct client access, and public reimbursement verification exposes no patient or clinical payload. These generic advisor warnings are therefore not being silenced through broad grant revocation.

Dynamic direct-table evidence now supplements the prior source-level review. RPC-level cross-persona and cross-owner mutation coverage remains incomplete and is still required before production freeze.

## Required pre-production regression

Before a production-candidate freeze, complete staged multi-persona tests proving:

1. Patient A cannot read Patient B clinical or financial data through bounded patient RPCs.
2. Physiotherapist A cannot read or mutate Physiotherapist B patients, visits, clinical records, invoices, payments, availability, service areas, analytics or payment destinations.
3. A patient account cannot enter physiotherapist workspace routes or execute physiotherapist-only mutations, and vice versa.
4. PAT and PHY identifiers cannot be reassigned or mutated.
5. Linkage creation/revocation does not independently expose clinical data.
6. Accepted-appointment onboarding cannot attach to a chart owned by another physiotherapist.
7. Home-visit location evidence remains coarse immutable scheduling evidence and cannot become exact-location/attendance authority.
8. Credit ledger, payment-destination and reimbursement-document boundaries reject unauthorized callers.
9. Offline/PWA behavior cannot surface cached authenticated clinical or financial responses or report offline mutations as successful.
10. Locale changes alter presentation only and never database enums, identifiers, ownership, authorization or monetary values.

## Current execution state

Transactional SQL impersonation is available and has now been used for the legacy direct-table RLS matrix. The remaining gap is not raw SQL availability; it is breadth of controlled staged persona fixtures and RPC-level mutation coverage. No dynamic result beyond the tests explicitly recorded above is claimed.

## Deferred / external activation pending

The following are explicitly not represented as completed by this lock:

- remaining controlled multi-persona RPC-level staging regression
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