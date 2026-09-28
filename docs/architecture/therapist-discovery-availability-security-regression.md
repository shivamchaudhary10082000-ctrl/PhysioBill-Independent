# Therapist Discovery, Service-Area, and Availability Security Regression

Status: staging-accepted database slice; browser/runtime acceptance deferred.

## Invariants

- Therapist self-service mutations resolve the authenticated physiotherapist from `auth.uid()`; callers do not supply an authority-bearing `physio_id`.
- Patient personas cannot mutate therapist discovery profiles or therapist availability.
- Anonymous discovery and availability expose only therapists that are both discoverable and professionally verified.
- Public discovery exposes bounded professional/discovery fields only; it does not expose patient, clinical, appointment-private, payment, or settlement data.
- Discovery/service-mode changes and availability publication share a per-therapist row lock on `public.physiotherapists` so concurrent writes for one therapist serialize.
- Removing a service mode retires its active future availability. Re-enabling that mode does not resurrect stale slots; an explicit availability republish is required.
- Direct client table mutation remains denied; intended public reads are RPC-only.

## Staging regression evidence

Starting repository checkpoint: `3f93bf131a26439220fdfe4504921a6b7459dda3`.

Staging project: `nbsvrzypypmmuvlgdpln` (`PhysioBill Staging`, `ACTIVE_HEALTHY`).

Forward migrations applied from exact committed SQL:

1. `harden_therapist_discovery_availability_concurrency`
   - committed migration: `supabase/migrations/20260901165000_harden_therapist_discovery_availability_concurrency.sql`
   - staging migration version: `20260901163146`
   - adds the common per-therapist `FOR UPDATE` serialization boundary to both profile/service-mode and availability saves.

2. `retire_disabled_service_mode_availability`
   - committed migration: `supabase/migrations/20260901170000_retire_disabled_service_mode_availability.sql`
   - retires active future windows for removed service modes so stale slots cannot reappear after a later re-enable.

Dynamic transactional tests used existing staging identities and rolled back all synthetic profile/service-area/availability changes.

Passed:

- verified + discoverable therapist appeared in anonymous location/service-mode discovery;
- unverified therapist remained absent even when self-marked discoverable;
- verified therapist availability was visible anonymously only for an enabled service mode;
- unverified therapist availability remained hidden;
- patient persona calls to `save_my_therapist_discovery_profile(...)` and `save_my_therapist_availability(...)` were rejected with SQLSTATE `42501`;
- direct authenticated mutation of discovery tables was denied by table privileges;
- stale-slot regression reproduced before the second migration (`resurrected_after_reenable = 1`);
- after the second migration, re-enabling without republishing returned `resurrected_after_reenable = 0`;
- explicit republish after re-enable returned one visible window, preserving the intended positive path;
- transactional EXECUTE revocation rollback restored authenticated execution;
- `anon` has no EXECUTE on therapist mutation RPCs;
- both mutation functions retain `SET search_path = ''` and the shared therapist-row `FOR UPDATE` lock.

## Concurrency acceptance

The defect was structural: two self-service mutation families touched shared `physiotherapist_service_modes` / availability state without a common serialization boundary. Both now lock the same therapist identity row before reading or mutating that shared state. This makes conflicting profile/service-mode and availability saves for one therapist serialize under PostgreSQL row locking. Cross-therapist operations remain independent because they lock different therapist rows.

A true two-session timing/contention harness was not available in this run, so no claim is made that wall-clock blocking behavior was directly observed. The database lock boundary, rollback behavior, sequential state transitions, stale-slot prevention, grants, and persona isolation were verified directly in staging.

## Security Advisor

No new advisor category was introduced by these migrations. Existing findings remain the previously reviewed RPC-only RLS informational notices and intentional public/authenticated `SECURITY DEFINER` RPC warnings. Public discovery/availability warnings are intentional because those RPCs are the bounded anonymous discovery API. Supabase leaked-password protection remains an external configuration gate.

## Deferred / external activation pending

- browser/mobile/PWA/screen-reader staging acceptance;
- SMS/WhatsApp provider activation/KYC/secrets;
- real payment-provider activation/KYC/secrets/settlement;
- telehealth-provider activation;
- exact-location/geofencing/device-attestation anti-fraud;
- Cloudflare/account-level settings;
- Supabase leaked-password protection;
- production authorization and production promotion;
- legal/business facts, filings, paid-account acceptance, or irreversible provider terms.
