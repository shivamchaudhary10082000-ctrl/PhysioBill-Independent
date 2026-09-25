# Public reimbursement verification multilingual boundary

## Scope

This lock covers only the public presentation of an already-existing reimbursement-document verification result. It does not change reimbursement issuance, verification-token generation, invoice finalization, professional verification, payment evidence, insurer decisions, patient access, or clinical access.

Supported presentation locales remain `en-IN`, `hi-IN`, and `gu-IN`.

## Locale authority

The public verification route is anonymous and therefore MUST NOT query `app_users` or any authenticated locale preference. It may select presentation copy from the browser language list only. Unsupported or unavailable browser language data falls back to `en-IN`.

Browser locale selection is presentation-only. It MUST NOT be sent to the verification RPC and MUST NOT influence whether a token is valid, which reimbursement record is returned, or which fields are disclosed.

## Immutable / untranslated evidence

The following values remain verbatim database/API evidence and MUST NOT be translated, rewritten, normalized for display semantics, or inferred by the frontend:

- verification token;
- document ID and verification URL / QR payload;
- invoice number;
- invoice amount and currency meaning;
- therapist/practice names;
- verified qualification text;
- verified registration number and registration authority;
- verification timestamps and issuance timestamps as instants.

Locale-aware number/date formatting may alter presentation only; it MUST NOT alter underlying numeric or timestamp values.

## Disclosure boundary

Public verification remains deliberately narrow. It MUST NOT disclose patient identity, PAT identity, therapist-owned clinical chart identifiers, clinical notes/diagnoses/treatment data, private contact details, payment-account details, settlement data, advance-credit data, or insurer-specific decisions.

A valid token proves only that the public verification RPC found the immutable PhysioBill reimbursement-document record and returns the bounded professional/invoice facts defined by that RPC. It does not prove insurer approval, payment, reimbursement eligibility, authenticity outside the PhysioBill record, or any legal guarantee.

## Security invariants

- PAT != therapist-owned clinical chart.
- Linkage != clinical access.
- Locale != authorization.
- Locale != document validity.
- Locale != payment or settlement evidence.
- Database/RPC output remains authoritative over frontend presentation.
- No authenticated session is required or inferred by this public route.
- QR content remains the exact verification URL; only its accessible label may be localized by a caller.

## Acceptance

Repository acceptance requires the public verifier to preserve the same `verifyReimbursementDocument(token)` call and response fields while translating only labels, explanatory copy, status text, date formatting, currency formatting, and accessibility presentation.

Staging/database acceptance requires no migration for this UI-only slice. Existing verification RPC grants and disclosure shape must be rechecked before production-candidate freeze.
