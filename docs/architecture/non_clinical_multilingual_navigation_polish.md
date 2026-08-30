# Non-Clinical Multilingual Navigation Polish

## Scope

This slice extends the existing persisted presentation locale into the professional quick-navigation surface. It is presentation-only and does not create new database, clinical, financial, identity, payment, communication-delivery, or provider authority.

## Security lock

- Locale remains presentation-only and cannot change authorization or persona resolution.
- PAT and PHY identities remain immutable and distinct.
- PAT remains distinct from therapist-owned clinical charts.
- Patient/chart linkage remains distinct from clinical access.
- Professional routes remain protected by the existing authenticated physiotherapist persona gate.
- Database ownership and RLS remain authoritative for all clinical, financial, appointment, analytics, communication, and payment-destination data.
- Translation keys apply only to non-authoritative navigation/status presentation in this slice.
- Clinical free text, diagnoses, reimbursement evidence, invoice snapshots, payment evidence, legal declarations, and provider credentials are not translated or transformed.

## Locale behavior

The supported presentation locales remain:

- `en-IN`
- `hi-IN`
- `gu-IN`

Professional navigation labels and their accessible navigation label are resolved through semantic keys. The frame loads the persisted preference and listens for the existing `physiobill:locale-changed` event so the navigation updates immediately after an authenticated user changes language. Failure to load the preference falls back to English without changing any authorization state.

## Acceptance boundary

Static review must confirm that only presentation labels change and all professional destinations retain their existing route/persona gates. Canonical browser/build acceptance may remain deferred when the external deployment provider is unavailable or rate-limited.
