# PhysioBill Phase 2 Production Architecture

## Goal
Move the independent physiotherapist workspace from demo/localStorage identity and data to real authentication, Postgres persistence, and server-enforced tenant isolation while preserving the existing React/Vite UI and business workflows.

## Recommended stack
- Frontend: existing React 19 + Vite + Wouter + TanStack Query
- Hosting: existing Vercel project
- Authentication: Supabase Auth
- Database: Supabase Postgres
- Authorization: Postgres Row Level Security (RLS)
- CRUD API: Supabase Data API through `@supabase/supabase-js`, authenticated with the signed-in user's JWT
- Privileged server operations: Vercel Functions only where browser-direct CRUD is inappropriate (future WhatsApp sends, webhooks, admin operations, payment-provider callbacks)

This avoids introducing separate auth, database, API and deployment vendors for the V1 physiotherapist workflow.

## Security boundary
React route guards are UX only. They are not authorization.

Every physiotherapist-owned row carries a `physio_id`. Database RLS verifies that the authenticated `auth.uid()` maps to that physiotherapist before SELECT/INSERT/UPDATE/DELETE is permitted.

A user must not be able to gain access by changing a URL, request body, `physio_id`, `patient_id`, invoice amount, or browser storage.

## Domain model
- `auth.users`: Supabase authentication identity
- `app_users`: application role record, keyed to `auth.users`
- `physiotherapists`: one production physiotherapist identity per V1 authenticated user
- `physiotherapist_profiles`: provider/practice identity and non-secret payout-display metadata
- `physiotherapist_settings`: practice preferences
- `patients`: physiotherapist-owned patient records; optional future `user_id` for a patient login
- `physio_patient_relationships`: explicit physio ↔ patient relationship for future patient portal authorization
- `visits`: physiotherapist-owned treatment visits
- `clinical_records`: future SOAP/goal/plan/treatment/HEP expansion attached to a visit
- `invoices`: physiotherapist-owned invoice lifecycle and totals
- `invoice_audit_entries`: immutable invoice audit history
- `payments`: payment records separate from invoice correction history; gateway fields remain nullable until an India-supported connected-account provider is chosen

## Ownership rules
1. `app_users`: authenticated user may read only their own application-user row.
2. `physiotherapists`: user may read only the physiotherapist row where `user_id = auth.uid()`.
3. Profile/settings: accessible only when the row's `physio_id` belongs to `auth.uid()`.
4. Patients: CRUD only when `patients.physio_id` belongs to `auth.uid()`.
5. Relationships: CRUD only for the authenticated physiotherapist's own relationship rows.
6. Visits/clinical records: CRUD only when `physio_id` belongs to `auth.uid()`; patient/visit foreign keys additionally prevent orphan records.
7. Invoices: CRUD only for the authenticated physiotherapist's own rows. Invoice numbers are unique per physiotherapist.
8. Invoice audit: readable by the owner. Client-side UPDATE/DELETE is intentionally not granted; production correction should be moved behind a database RPC/server operation so correction reason, changed fields and audit insertion happen transactionally.
9. Payments: readable by the owner. Payment mutation will later be moved behind a server operation; no payment gateway is selected in Phase 2.

## Authentication model
V1 signup creates a physiotherapist account only. A database trigger provisions:
- `app_users(role = 'physio')`
- `physiotherapists`
- default `physiotherapist_profiles`
- default `physiotherapist_settings`

Patient authentication is deferred. `patients.user_id` remains nullable for future portal linkage.

## Migration sequence
1. Establish schema, constraints and RLS before application CRUD.
2. Add Supabase browser client and environment-variable contract.
3. Replace demo auth adapter with Supabase session adapter while preserving UI routing.
4. Add repository/data-access functions for profile/settings/patients/visits/invoices.
5. Hydrate WorkspaceController from authenticated backend queries rather than `usePersistentState`.
6. Migrate write paths one domain at a time: profile/settings → patients → visits → invoices.
7. Move finalized-invoice correction and audit creation into a transactional server/database operation.
8. Add manual payment recording as a server-authorized operation; do not add payment gateway settlement yet.
9. Remove localStorage as authoritative storage only after each backend domain is verified.
10. Add WhatsApp reminder server function after patient/invoice ownership is fully backend-enforced.

## Phase 2 implementation order
1. Schema + RLS + signup provisioning
2. Supabase client/env contract
3. Real physiotherapist signup/login/logout/session
4. Authenticated physiotherapist bootstrap/profile/settings query
5. Patient CRUD
6. Visit + clinical-record CRUD
7. Invoice CRUD + server-controlled correction/audit
8. Manual payment records + outstanding computation
9. WhatsApp reminder server endpoint
10. Security verification with two physiotherapist accounts proving cross-tenant access is denied

## Deliberately deferred
- Patient authentication/portal productionization
- Payment gateway/provider selection
- Connected-account settlement
- Central PhysioBill collection and redistribution
- Enterprise RBAC/organizations
