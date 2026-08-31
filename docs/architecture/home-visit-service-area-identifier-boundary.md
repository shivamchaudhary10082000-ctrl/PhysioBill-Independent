# Home-Visit Service-Area Identifier Boundary

This bounded slice connects verified therapist discovery to the existing home-visit service-location authority without turning location metadata into a trust signal.

## Locked invariants

- The database remains authoritative for therapist verification, active service areas, appointment ownership, persona resolution, and service-area snapshot creation.
- Discovery may expose an active therapist service-area UUID only alongside the already-public coarse locality/city/state/country data for the same verified therapist.
- The service-area UUID is scheduling metadata only. It is not identity evidence, GPS evidence, attendance proof, proof of treatment, clinical authority, invoice authority, payment authority, settlement authority, or fraud clearance.
- A patient may bind only an active service area belonging to the physiotherapist already fixed on that patient's pending home-visit appointment request.
- The resulting home-visit service-location snapshot remains immutable.
- A home-visit appointment cannot be accepted without the required snapshot.
- PAT and PHY identities remain immutable and isolated. PAT is not a therapist-owned clinical chart, and appointment/service-location state does not create clinical linkage or access.
- Physiotherapist clinical/financial ownership and RLS boundaries are unchanged.
- No production environment, secret, provider account, Cloudflare setting, DNS, legal fact, or paid service is part of this slice.

## Scope completed here

1. `search_verified_therapists` now includes the authoritative active service-area UUID inside each existing coarse service-area object.
2. The frontend discovery normalizer rejects service-area objects unless the UUID and coarse location fields are structurally valid.
3. A dedicated client boundary calls the existing database-authoritative `set_my_home_visit_service_area` and read RPCs without direct table access.

## Explicitly not completed here

The discovery booking UI is not yet permitted to claim end-to-end home-visit area binding until it passes the selected UUID into the client boundary after appointment creation and handles partial failure visibly. Browser acceptance remains external/deferred where deployment is unavailable.
