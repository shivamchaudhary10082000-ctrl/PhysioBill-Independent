# Session Resolution & Offline-Safe Readiness Audit

Status: architecture/security lock for the production-candidate frontend readiness pass.

## Scope

This audit covers the authenticated session-restoration boundary and current PWA/service-worker behavior on `futureweb-production-backend` after the patient return-route readiness checkpoint.

## Invariants preserved

- Database-resolved persona remains authoritative; the client does not infer patient/physiotherapist authority from route choice or local metadata.
- A patient session never becomes a physiotherapist session, and a physiotherapist session never becomes a patient session.
- PAT/PHY identity semantics remain unchanged.
- No clinical or financial payload may be made available merely because a cached application shell exists.
- Offline behavior must fail closed for authenticated data. Cached UI must not become cached authorization.

## Verified service-worker behavior

`public/sw.js` is intentionally conservative:

- navigation/document requests are network-first;
- failed navigations fall back only to `/offline.html`;
- authenticated application HTML is not cached for offline replay;
- only same-origin approved static assets are cacheable;
- requests carrying an `Authorization` header are excluded from static caching;
- API/Supabase traffic is not intercepted or cached by the service worker;
- cache entries marked `private` or `no-store` are not stored;
- old PhysioBill static caches are deleted on activation.

This is the correct baseline for clinical/financial safety. The PWA is therefore an install/offline-entry foundation, not an offline clinical workspace. Do not expand it to cache patient records, invoices, communication payloads, session/persona responses, or mutation queues without a separately reviewed encrypted/offline data architecture.

## Session-resolution behavior

`useAuthSession()` re-resolves the persisted account persona through the database-backed authority after session restoration/refresh and uses a generation guard so a stale async persona result cannot overwrite a newer auth state. Persona-resolution failure leaves `role = null` and surfaces an error instead of granting a route.

This remains fail-closed for authorization.

## Defect found: restoration-error masking on guarded routes

Several guarded route components evaluate `!auth.user` before `auth.error` after restoration completes. When `getAuthSession()` itself fails, `useAuthSession()` correctly records an error with `user = null`, but those guards can redirect to sign-in or remain on a loading surface before `SessionResolutionError` is rendered.

Observed affected patterns include:

- `PatientGatewayRoute`;
- the shared `PatientPersonaGate` used by patient appointments/communications;
- `ProfessionalWorkspaceRoute`;
- the shared `ProfessionalPersonaGate`;
- standalone patient clinical/financial route guards using the same `loading || !user` ordering.

Security impact: no privilege escalation was found. The route still fails closed and protected application content is not rendered. However, the failure is diagnostically wrong and can create redirect churn or an apparently endless loading state during network/Auth restoration faults, especially on weak mobile connectivity.

## Required remediation before production-candidate freeze

For every authenticated route guard, state precedence must be consistent:

1. configuration boundary;
2. active loading state;
3. session/persona restoration error;
4. absence of authenticated user -> sign-in redirect/loading handoff;
5. password-recovery routing where applicable;
6. database-resolved persona authorization;
7. protected surface rendering.

The redirect side effect must likewise not fire while `auth.error` is present. A restoration error is not equivalent to a confirmed signed-out state.

## Acceptance requirements for the remediation

Source-level tests/review must prove:

- confirmed signed-out users still reach the correct sign-in route;
- Auth/session restoration failures render the bounded session error state instead of redirecting as if signed out;
- persona-resolution failures never render patient/professional protected content;
- patient/professional cross-persona denial remains unchanged;
- password recovery remains physiotherapist-only;
- offline navigation continues to show the non-sensitive offline fallback rather than a cached authenticated surface.

Browser/runtime validation remains deferred until an available staging deployment can be exercised.

## Database impact

None. This audit does not change database authority, RLS, migrations, Supabase configuration, or production resources.
