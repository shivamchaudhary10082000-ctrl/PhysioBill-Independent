# Frontend Patient Return-Route Readiness Lock

## Scope

This bounded production-candidate readiness slice covers authenticated patient deep-link restoration after passwordless sign-in. It does not change database authorization, Supabase schema, provider configuration, production infrastructure, or any protected branch.

## Defect found

Patient-only route guards correctly redirect unauthenticated users to `/patient/sign-in` with a `returnTo` parameter. The return-target normalizer still allowed only the older patient gateway and appointments paths. Consequently, valid deep-links to newer patient surfaces were discarded after successful OTP authentication and the user was returned to `/patient` instead.

Affected valid patient surfaces were:

- `/patient/communications`
- `/patient/clinical-care`
- `/patient/financial-summary`
- `/patient/telephysiotherapy`

## Locked correction

`normalizePatientReturnTarget()` now allowlists every currently routed patient surface above while retaining the existing same-origin and exact-path protections. The correction does not permit arbitrary patient subpaths, professional routes, admin routes, protocol-relative URLs, backslash redirects, alternate origins, or scheme-bearing decoded values.

## Security invariants preserved

- Patient and physiotherapist personas remain isolated.
- The return target is navigation state only and grants no database authority.
- PAT identity is not created, changed, merged, or inferred by this change.
- PAT remains distinct from therapist-owned clinical charts.
- Clinical linkage remains distinct from clinical access.
- Professional `/app` routes are not valid patient return targets.
- Admin routes are not valid patient return targets.
- External/open redirects remain rejected.
- Database/RPC/RLS authority remains unchanged.

## Acceptance evidence

Source inspection confirms all newly allowlisted paths are explicit patient routes in `PublicRouteBoundary`, and patient-only route guards already use these paths as their `returnToPath` values. The commit diff changes only the explicit patient return-path allowlist.

No database migration is required or appropriate for this frontend-only correction. Isolated staging migration history therefore remains unchanged at `20260901163305_retire_disabled_service_mode_availability`.

Runtime/browser acceptance remains DEFERRED / EXTERNAL ACTIVATION PENDING until an accepted staging frontend deployment is available. SMS provider activation is also deferred; the correction itself is independent of SMS provider credentials because it affects post-authentication navigation normalization only.
