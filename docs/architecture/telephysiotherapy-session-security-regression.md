# Telephysiotherapy Session Security Regression Lock

Scope: `futureweb-production-backend` and isolated PhysioBill Staging only. Production resources, provider activation, secrets, paid accounts and legal acceptance remain outside this lock.

## Frozen authority boundary

- A telephysiotherapy session may be materialized only by the physiotherapist who owns the source appointment.
- The source appointment must already be `accepted` and have canonical `service_mode = 'telephysiotherapy'`.
- Appointment acceptance is scheduling provenance only; it does not create patient clinical access, chart linkage, payment authority or provider authority.
- Patient and physiotherapist personas remain mutually exclusive.
- PAT identity remains distinct from therapist-owned clinical charts.
- Telephysiotherapy session rows remain provider-neutral immutable scheduling metadata.
- `provider_state = 'external_activation_pending'` is not evidence that any telehealth provider has been activated.
- Direct anonymous/authenticated table reads are denied; bounded RPCs remain the application boundary.

## Defect found and repaired

The first legitimate-owner staging probe against `ensure_my_telephysiotherapy_session(uuid)` failed with PostgreSQL `42702` because the function `RETURNS TABLE` exposes an output parameter named `appointment_request_id`, making the original `ON CONFLICT (appointment_request_id)` target ambiguous in PL/pgSQL.

Committed forward migration:

`supabase/migrations/20260901133000_fix_telephysiotherapy_session_conflict_target.sql`

Staging recorded the exact applied migration as:

`20260901133318 — fix_telephysiotherapy_session_conflict_target`

The migration changes only conflict handling to the pre-existing unique constraint `telephysiotherapy_sessions_appointment_request_id_key`. It does not change persona resolution, appointment ownership, accepted-status checks, service-mode checks, row immutability, grants, clinical authority or financial authority.

## Dynamic staging regression

A rollback-only fixture matrix used two controlled patient personas, two controlled physiotherapist personas, two accepted telephysiotherapy appointments and one requested-but-unaccepted telephysiotherapy appointment.

Passed:

- Physiotherapist A successfully materialized a session for Physiotherapist A's accepted telephysiotherapy appointment.
- Repeating the same owner call returned the same session identifier, proving idempotent one-session-per-appointment behavior.
- Physiotherapist A attempting to materialize Physiotherapist B's accepted appointment was rejected with SQLSTATE `P0002`.
- A requested-but-unaccepted telephysiotherapy appointment was rejected with SQLSTATE `22023`.
- A patient persona attempting the professional materialization RPC was rejected with SQLSTATE `42501`.
- Physiotherapist B successfully materialized Physiotherapist B's own accepted telephysiotherapy appointment.
- Patient A could read its own temporary session and not Patient B's session.
- Patient B could read its own temporary session and not Patient A's session.
- Physiotherapist A could read its own temporary session and not Physiotherapist B's session.
- After rollback, `telephysiotherapy_sessions` contained zero test-created rows.

## Table and grant boundary

Post-migration checks confirm:

- `anon` cannot execute `ensure_my_telephysiotherapy_session(uuid)`.
- `authenticated` can execute the RPC and must still pass its internal physiotherapist-persona and ownership checks.
- `anon` cannot execute either patient/professional telephysiotherapy self-read RPC.
- `authenticated` can execute those bounded read RPCs and remains persona-filtered internally.
- Neither `anon` nor `authenticated` has direct SELECT on `telephysiotherapy_sessions`.
- The table update/delete trigger still rejects mutation with SQLSTATE `42501`.
- A transactional EXECUTE-revocation rollback probe restored the authenticated grant successfully.
- The live function body contains the named unique-constraint conflict target after rollback testing.

## Concurrency boundary

`ensure_my_telephysiotherapy_session()` locks the owner-scoped appointment row `FOR UPDATE` before materialization, and `telephysiotherapy_sessions_appointment_request_id_key` enforces one session per appointment. The post-fix repeated-call regression returned the same session. No parallel provider activation or mutable session-state workflow is authorized by this foundation.

## Security Advisor state

The post-migration Supabase Security Advisor introduced no new defect specific to this repair. It continues to report intentional RPC-only RLS/no-policy informational findings and review warnings for authenticated/public `SECURITY DEFINER` RPCs. These are not being silenced through broad grants or weakened authorization. Supabase leaked-password protection remains an external configuration gate.

## Deferred / external activation pending

The following remain explicitly incomplete:

- real telehealth-provider activation and provider credentials
- browser/mobile/session UX acceptance
- provider webhook/callback design
- provider-specific meeting-room lifecycle
- SMS/WhatsApp delivery provider activation
- real payment-provider activation
- exact-location/device-attestation anti-fraud
- Cloudflare/account-level production settings
- leaked-password protection configuration
- production promotion/authorization
- legal/business/regulatory decisions

This lock does not authorize or imply completion of any deferred external gate.
