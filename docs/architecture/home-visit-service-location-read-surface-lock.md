# Home-Visit Service-Location Read Surface Lock

## Scope

This bounded slice exposes the already-authoritative immutable coarse home-visit service-area snapshot on the patient and physiotherapist appointment read surfaces. It introduces no new location collection, exact-address field, GPS signal, attendance inference, clinical authority, financial authority, or identity authority.

## Locked authority

- `public.home_visit_service_location_snapshots` remains database authority for the immutable scheduling snapshot.
- Frontend code reads snapshots only through `public.get_my_home_visit_service_locations()`.
- The RPC self-resolves the authenticated persona and returns only that patient's snapshots or that physiotherapist's snapshots.
- Anonymous and `service_role` execution remain revoked; authenticated execution remains the intended boundary.
- Direct table access remains revoked and RLS remains enabled.
- No frontend identifier or displayed location may be trusted as authorization input.

## Security Constitution invariants

- PAT and PHY identities remain immutable and persona-isolated.
- PAT is not a therapist-owned clinical chart identifier.
- Appointment scheduling is not clinical-chart linkage.
- Linkage is not clinical access.
- A service-area snapshot is not identity evidence and cannot establish or change a persona.
- A service-area snapshot is not exact address or GPS data and cannot prove presence, attendance, treatment, fraud, invoice validity, payment, or settlement.
- Physiotherapist ownership and database/RLS/RPC boundaries remain authoritative over frontend presentation.
- No clinical or financial data is joined to, inferred from, or unlocked by the service-area snapshot.

## Presentation contract

For a `home_visit` appointment, the UI may display only the already-normalized coarse snapshot fields: locality, city, state, and country code. It must label them as declared service-area scheduling evidence and explicitly state that they are not exact-location, attendance, identity, clinical, invoice, or payment proof.

If no authorized snapshot is returned, the UI may say that no coarse service-area snapshot is available for that scheduling record. It must not infer a location from therapist profile text, patient address, IP data, browser geolocation, or another appointment.

Clinic and telephysiotherapy appointments must not display home-visit service-area evidence.

## Change boundary

This slice is presentation-only. The existing database read authority and strict frontend normalizer were sufficient, so adding another table, RPC, grant, migration, or duplicate source of truth would weaken rather than improve the architecture.
