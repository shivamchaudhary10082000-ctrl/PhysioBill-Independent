# Therapist Discovery Profile Multilingual Boundary

## Purpose

Localize the therapist discovery-profile management surface for `en-IN`, `hi-IN`, and `gu-IN` without moving any identity, verification, discovery, service-area, clinical, or financial authority into presentation code.

## Locked authority invariants

- Locale is presentation preference only. It cannot select persona, grant authorization, change RLS outcomes, or alter RPC routing.
- Professional verification status remains database/system-managed. The UI may display localized status labels but cannot mark a physiotherapist verified, alter review state, or edit verified credential snapshots.
- Verified qualification, registration number, registration authority, and all other verified credential evidence remain byte-for-byte authoritative data. Only surrounding labels are localized.
- Therapist service-mode enum values remain the existing database values. Localization changes display labels only.
- Service-area locality, city, state, country code, and any database identifiers remain authoritative values and are never translated or reformatted for storage.
- Public discoverability remains governed by the existing saved opt-in, professional verification boundary, listing completeness rules, database/RLS authority, and public discovery RPCs. Localized wording cannot make an unverified therapist discoverable.
- `save_my_therapist_discovery_profile` and `request_my_professional_verification` remain the existing mutation authorities. This slice does not add direct privileged writes or bypass those RPC boundaries.
- Locale loading failure falls back to `en-IN`. Locale failure must never block or manufacture authentication, verification, discoverability, or mutation success.
- PAT/PHY platform identity, patient-to-chart linkage, clinical access, financial access, invoice/payment authority, and therapist ownership boundaries are outside this surface and remain unchanged.

## Patient-safety and privacy boundary

The patient preview continues to expose only the existing discovery-safe draft fields and verified professional evidence already allowed by the discovery model. It does not add exact address, GPS, patient identity, clinical information, financial information, or private professional data.

## Acceptance rules

This slice is acceptable only if:

1. `en-IN`, `hi-IN`, and `gu-IN` alter presentation only.
2. Verification and discoverability decisions remain unchanged.
3. Service-mode enum values and service-area storage payloads are unchanged.
4. No database schema, RLS, grant, trigger, or RPC contract is changed.
5. No production environment or protected branch is modified.
6. Build/browser validation may be deferred when external deployment capacity is unavailable, but it must not be falsely reported as passed.
