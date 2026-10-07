# Professional financial multilingual boundary

This slice localizes the physiotherapist-facing payment-destination and professional reimbursement-document workflows for `en-IN`, `hi-IN`, and `gu-IN` without changing financial, invoice, payment, reimbursement, identity, or verification authority.

## Locked invariants

- Locale is presentation only. It cannot alter physiotherapist ownership, PAT/PHY identity, patient/chart linkage, clinical access, invoice state, payment state, settlement evidence, reimbursement eligibility, or authorization.
- Payment-destination mutations continue to use the existing database RPC authorities. Destination IDs, destination types, UPI IDs, bank facts, provider codes, status enums, and default-selection semantics are not translated or rewritten.
- Provider-managed settlement remains `EXTERNAL ACTIVATION PENDING`; localized copy must never imply provider onboarding, KYC, settlement, or payout activation has occurred.
- Reimbursement issuance continues to derive from the immutable finalized-invoice snapshot and verified professional credential boundary. Locale cannot create, modify, validate, or override those facts.
- Verification tokens, document IDs, invoice numbers, QR payloads, verification URLs, and public provenance facts are rendered byte-for-byte from authoritative data and are never translated.
- Public verification proves PhysioBill document provenance and captured professional credentials only. It does not prove insurer approval, reimbursement eligibility, payment settlement, or legal acceptance.
- Patient and clinical details remain excluded from the public reimbursement verification surface.
- Locale loading failure falls back to `en-IN` and must not block or weaken database-authoritative operations.

## Scope

The slice adds a shared professional financial locale catalog and localizes authority-neutral UI copy in `PaymentDestinationSettings` and `ReimbursementDocumentPanel`, including locale-aware presentation of reimbursement issuance timestamps.

No schema, RLS policy, grant, trigger, function, RPC argument, payment calculation, or verification contract changes in this slice. Therefore no database migration is warranted.
