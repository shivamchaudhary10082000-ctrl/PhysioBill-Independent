# Professional Cross-Surface Navigation Polish

## Scope

This slice is presentation/navigation only. It adds a compact cross-surface professional navigation frame around existing secured `/app/*` routes.

It does not add database authority, clinical access, financial authority, payment settlement logic, provider activation, or new external integrations.

## Security lock

- The quick-navigation frame renders only after the existing authenticated session resolves to the `physio` persona.
- Patient sessions, unauthenticated sessions, password-recovery sessions, and session-resolution failures receive no professional quick-navigation surface.
- Every destination remains protected by its existing route/persona gate and database authority. Navigation visibility is not authorization.
- PAT remains distinct from therapist-owned clinical charts.
- Patient/chart linkage remains distinct from clinical access.
- PAT/PHY identity immutability is unchanged.
- Physiotherapist ownership and RLS isolation remain database-authoritative.
- No clinical, patient, invoice, payment, communication, analytics, or provider payload is cached or copied into the navigation frame.
- Payment destinations remain configuration only and do not prove settlement.
- Telephysiotherapy remains provider-activation pending and the navigation link does not provision a room or token.

## UX behavior

The professional frame exposes direct access to:

- Overview
- Appointment requests
- Availability
- Discovery profile
- Analytics
- Communications
- Telephysiotherapy
- Payment destinations

Links use a minimum 44px interaction height, horizontal overflow on narrow screens, keyboard-visible focus, and `aria-current="page"` for the active destination.

## Acceptance boundary

Code review/static verification can confirm route coverage and persona conditions. Canonical browser acceptance remains deferred when the external deployment provider is unavailable or rate-limited.
