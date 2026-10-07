# Professional Financial & Reimbursement Accessibility Boundary

Status: LOCKED

This slice is presentation-only. It improves the authenticated physiotherapist payment-destination surface and professional reimbursement-document surface without changing financial, identity, clinical, settlement, or verification authority.

## Permanent invariants

- Supabase/Postgres remains the authority for payment destinations, invoice state, reimbursement-document issuance, and verification records.
- A physiotherapist may only manage payment destinations through the existing self-resolving database RPC boundary; frontend state is never financial authority.
- Payment destinations belong to the authenticated physiotherapist account and do not create or change PAT/PHY identity.
- Provider-managed settlement remains `EXTERNAL ACTIVATION PENDING` until separately authorized and configured. Provider state never becomes payment or invoice authority.
- Reimbursement issuance remains restricted to the existing finalized-invoice and verified-professional database boundary.
- A verification token proves PhysioBill document provenance and captured professional credentials only. It does not prove insurer approval, reimbursement eligibility, payment settlement, legal acceptance, or clinical truth.
- Public reimbursement verification must not disclose patient or clinical details.
- PAT is not a therapist-owned clinical chart. Appointment acceptance is not chart linkage. Linkage is not unrestricted clinical access.
- Physiotherapist ownership/RLS isolation and zero unauthorized clinical or financial access remain mandatory.

## UX/accessibility requirements

- Primary payment/reimbursement actions use a 44px-class minimum touch target.
- Keyboard-operable actions expose visible focus treatment.
- Loading, issuance, save, and error states are announced semantically without making UI status authoritative.
- Controls that mutate payment-destination presentation data are disabled while an existing mutation is in flight to reduce accidental duplicate submissions.
- Long payment labels, masked account-display values, invoice numbers, document IDs, and verification URLs must wrap safely on narrow screens.
- Decorative icons are hidden from assistive technology when adjacent text already provides the accessible name.

## Non-goals

This slice does not activate a payment provider, create settlement logic, collect secrets, alter invoice payment state, change reimbursement verification semantics, change RLS/RPC grants, touch production, or make legal/business representations.
