# Home-Visit Service-Location Security Regression

## Scope

This bounded staging regression validates the existing home-visit coarse service-area authority without adding exact-location, attendance, identity, clinical, financial, settlement or fraud-clearance authority.

## Verified staging checkpoint

Isolated PhysioBill Staging was verified `ACTIVE_HEALTHY` with migration history ending at `20260901133318 — fix_telephysiotherapy_session_conflict_target` before this regression.

## Locked authority

- `public.set_my_home_visit_service_area(uuid, uuid)` remains the patient-only mutation boundary.
- The RPC resolves the authenticated platform patient from database identity, scopes the appointment request to that patient, requires `home_visit`, requires `requested` status, and requires the selected active service area to belong to the appointment's already-fixed physiotherapist.
- `public.home_visit_service_location_snapshots` remains immutable scheduling provenance. A second call with the same service area is idempotent; attempted rebinding to a different area is rejected.
- `public.get_my_home_visit_service_locations()` self-resolves patient or physiotherapist persona and returns only snapshots belonging to that patient or physiotherapist.
- Direct client access to `home_visit_service_location_snapshots` remains denied; authenticated access is through the bounded RPC only.
- The snapshot schema contains only platform/appointment/physio/source identifiers plus coarse `locality`, `city`, `state`, `country_code`, evidence metadata and timestamps. It contains no exact address, latitude, longitude, GPS, device-attestation or attendance field.

## Dynamic staging regression

A rollback-only two-patient/two-physiotherapist matrix was executed with temporary home-visit availability windows, service areas and appointment requests.

The following passed:

- Patient A bound Patient A's own pending home-visit request to Physiotherapist A's active service area.
- Repeating the same bind returned the same snapshot identity, preserving idempotency.
- Patient A attempting to bind Patient B's request was rejected with SQLSTATE `P0002`.
- Patient A attempting to bind a fresh Patient-A/Physiotherapist-A request to Physiotherapist B's service area was rejected with SQLSTATE `P0002`.
- Attempted rebinding of Patient A's existing snapshot to a different Physiotherapist-A service area was rejected with SQLSTATE `23514`.
- Patient A read exactly Patient A's snapshot and zero Patient B snapshots through `get_my_home_visit_service_locations()`.
- Patient B read exactly Patient B's snapshot and zero Patient A snapshots.
- Physiotherapist A read exactly Physiotherapist A's snapshot and zero Physiotherapist B snapshots.
- Physiotherapist B read exactly Physiotherapist B's snapshot and zero Physiotherapist A snapshots.
- An authenticated patient direct-table SELECT against `home_visit_service_location_snapshots` was denied with insufficient privilege.

The first test attempt intentionally exposed only an assertion mismatch: after a snapshot already exists, the immutability guard rejects a different service-area identifier before foreign-area ownership is evaluated. The transaction aborted and post-error residue was verified as zero. The corrected matrix separated the fresh foreign-area case from immutable rebinding and then passed completely.

All fixtures ran inside transactions and were rolled back. Post-test residue checks returned zero temporary appointment requests, snapshots and service areas.

## Security Constitution conclusions

- PAT and PHY identities remain immutable and persona-isolated.
- The service-area UUID is scheduling metadata, not identity evidence.
- A coarse service-location snapshot is not a therapist-owned clinical chart and creates no clinical linkage or clinical access.
- A coarse service-location snapshot creates no invoice, payment, settlement or reimbursement authority.
- No exact-location, presence, attendance, treatment-completion or fraud-clearance claim may be inferred from this boundary.
- Exact-location/geofencing/device-attestation anti-fraud remains a separate deferred provider/privacy/security slice and must not be simulated from locality/city/state/country data.

## Migration decision

No authorization or integrity defect was demonstrated. Therefore no forward database migration was created or applied merely to manufacture schema activity. Migration rollback and migration-concurrency testing are not applicable to this regression-only checkpoint; transactional rollback, owner/persona isolation, immutability and idempotency were tested directly instead.

## Deferred / external activation pending

- exact-location/geofencing/device-attestation anti-fraud
- browser/mobile/PWA runtime verification of the service-location presentation
- provider/account-level activation not required for this database boundary
- production authorization and promotion
