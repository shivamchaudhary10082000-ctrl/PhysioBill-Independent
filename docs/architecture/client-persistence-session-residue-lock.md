# Client Persistence & Session Residue Security Lock

## Purpose

PhysioBill must not persist clinical, financial, appointment, platform-identity, or persona-sensitive application data in browser-owned storage outside the authentication mechanism required by Supabase Auth.

This lock applies to the production web application and patient/professional route surfaces.

## Authority boundaries preserved

- Supabase/Postgres remains the authority for application data, authorization, ownership, RLS, clinical access, and financial access.
- A PAT remains a platform patient identifier, not a therapist-owned clinical chart identifier.
- PAT and PHY identifiers remain immutable and persona-specific.
- A patient/clinical-chart linkage never grants clinical access by itself.
- Physiotherapist ownership and RLS isolation remain database-enforced.
- Browser storage must never become an authorization source or a cache of privileged application state.

## Allowed browser persistence

Supabase Auth may persist the authentication session required by the configured Supabase client. PhysioBill must not inspect, rewrite, rename, copy, or purge Supabase Auth storage keys as part of application-state cleanup.

Non-sensitive presentation preferences may only be persisted when separately reviewed and must never contain identity, clinical, financial, appointment, credential, access-token, or authorization facts.

## Retired sensitive storage

Historical/demo builds used the following PhysioBill-owned localStorage namespace for application state:

- `physiobill-demo-session`
- `physiobill-profile-*`
- `physiobill-patients-*`
- `physiobill-visits-*`
- `physiobill-invoices-*`

Those keys are retired. Current startup code must remove them before rendering the route tree. The cleanup is intentionally prefix-bounded so it cannot delete unrelated origin data or Supabase Auth session keys.

The legacy `PatientPortal` and `usePersistentState` code currently present in `App.tsx` is not routed by `PublicRouteBoundary`; it must not be made reachable in a future change. Any future removal/refactor of that dead code must preserve the production workspace behavior and must not weaken database authority.

## Prohibited future behavior

Without a separately reviewed security slice, do not add:

- localStorage/sessionStorage persistence of patients, visits, clinical records, invoices, payments, credit balances, reimbursement documents, appointments, locations, PAT/PHY identifiers, persona state, or authorization decisions;
- IndexedDB persistence of authenticated clinical or financial data;
- service-worker caching of authenticated application responses;
- offline mutation queues or background synchronization for clinical/financial writes;
- copied Supabase access/refresh tokens outside Supabase Auth's own storage mechanism;
- client-side role/persona flags used as an authorization source.

## Failure behavior

If localStorage is unavailable because of browser privacy or hardening settings, cleanup failure must not block the application and must not trigger a fallback/demo authorization path. The database-backed and Supabase Auth-backed route gates remain authoritative.

## Acceptance criteria

1. Application bootstrap removes only the retired PhysioBill-owned sensitive localStorage keys/prefixes.
2. Supabase Auth session persistence remains unchanged.
3. Current patient and professional production routes continue to use `useAuthSession` and database-backed read/write paths.
4. No schema, RPC, RLS, grant, trigger, PAT/PHY rule, linkage rule, clinical-access rule, or financial-access rule changes as part of this slice.
5. Browser acceptance must verify legacy keys are absent after startup and Supabase Auth remains functional; this is an external acceptance gate if a deployable staging build is unavailable.
