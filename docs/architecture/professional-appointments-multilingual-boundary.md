# Professional Appointment Multilingual Boundary

## Purpose

This lock permits authority-neutral multilingual presentation on the authenticated professional appointment and clinical-onboarding surface without allowing locale to participate in identity, authorization, scheduling, linkage, clinical, financial, or service-location decisions.

## Frozen invariants

1. Locale is presentation state only. The supported locale preference may change labels, explanatory copy, confirmations, accessibility text, and date/clock formatting, but it must never alter the authenticated persona, authorization outcome, database mutation, RPC selection, row ownership, or RLS decision.
2. Locale loading is non-blocking. Failure to load the stored preference falls back to `en-IN`; scheduling and clinical-onboarding authority must remain usable according to the authenticated database session.
3. PAT and PHY identity values are immutable authority data. PAT remains the platform-patient identifier and must be rendered byte-for-byte. It is never translated, reformatted, inferred, or treated as a therapist-owned clinical-chart identifier.
4. `PAT != therapist-owned clinical chart`. Existing clinical-chart IDs, patient numbers, patient names, and other therapist-owned chart data remain database-supplied facts. Translation must not create an automatic match or identity inference.
5. Clinical linkage remains explicit. A professional must deliberately choose the correct therapist-owned chart after independent patient verification, or deliberately create a new therapist-owned chart. Locale cannot auto-select, auto-match, merge, copy, or convert a chart.
6. `linkage != clinical access`. Translation does not change the accepted-appointment and clinical-linkage gates already enforced by database authority. No presentation string can grant clinical visibility or mutation authority.
7. Appointment state and mutation routing remain database-authoritative. `requested`, `accepted`, `rejected`, and `cancelled` are canonical database states; translated status labels are display derivatives only. The existing secured appointment response/cancellation RPC paths remain unchanged.
8. Service mode and timezone remain authority data. Translated service-mode labels are presentation derivatives only. Appointment times may be formatted using the preferred locale, but the database-provided timezone remains authoritative.
9. Home-visit service-location evidence is not reinterpreted by locale. The immutable coarse locality/city/state/country snapshot remains scheduling evidence only and not exact address, GPS/attendance, identity evidence, clinical access, treatment evidence, invoice authority, or payment proof. Stored location values are displayed as supplied; only surrounding explanatory labels may be translated.
10. Clinical onboarding form labels may be translated, but submitted field values are user-entered clinical/administrative facts and are not machine-translated or semantically rewritten before database submission.
11. Financial, invoice, payment-destination, reimbursement-document, and clinical-record authority are out of scope. This slice creates no new access to any of them.
12. Stable backend/audit reasons may remain canonical rather than locale-dependent. Presentation localization must not make stored audit semantics vary with the user's current language.

## Implementation boundary

- `src/lib/professional-appointments-locale.ts` contains the presentation catalog for `en-IN`, `hi-IN`, and `gu-IN`.
- `src/pages/ProfessionalAppointmentRequestsPage.tsx` loads the existing preferred-locale authority independently and falls back safely to `en-IN`.
- Date/time formatting uses the selected locale while preserving the database-supplied appointment timezone.
- Existing appointment, cancellation, clinical-linkage, chart-creation, home-visit evidence, and ownership calls are unchanged.

## Acceptance requirements

Repository acceptance requires the locale layer to compile without widening any database/API type or changing any mutation call. Staging security acceptance remains the pre-existing database boundary: authenticated self-authorized RPCs only, protected ownership/RLS behavior unchanged, and no new schema/RPC/grant introduced by this slice.

Browser/mobile/keyboard/screen-reader language acceptance is an external deployment/browser gate and must be recorded as **DEFERRED / EXTERNAL ACTIVATION PENDING** whenever the staging frontend cannot be exercised. A deferred browser gate does not permit weakening database or identity invariants.
