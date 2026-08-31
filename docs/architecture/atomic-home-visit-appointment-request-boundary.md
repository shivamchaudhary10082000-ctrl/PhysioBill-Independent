# Atomic home-visit appointment request boundary

Status: architecture lock

## Purpose

Home-visit booking must not leave a pending appointment request without its required therapist service-area snapshot when the second client operation fails. The database therefore owns one atomic operation that creates the appointment request and binds the coarse service-area snapshot in the same PostgreSQL transaction.

## Locked authority model

- `request_patient_appointment(uuid)` remains the scheduling authority for validating the authenticated patient persona, rate limits, verified/discoverable physiotherapist, enabled service mode, active future availability, and immutable appointment scheduling snapshot.
- `set_my_home_visit_service_area(uuid, uuid)` remains the service-location authority for validating that the request belongs to the authenticated platform patient, is a pending `home_visit`, and that the selected service area is active and owned by the appointment physiotherapist.
- `request_home_visit_appointment(uuid, uuid)` may compose those two authorities only. It must not duplicate or weaken their checks.
- PostgreSQL transaction semantics are the rollback boundary: if service-area binding fails for any reason, creation of the appointment request must roll back with it.
- Anonymous callers have no execution authority. The operation is available only to `authenticated`, and the underlying patient-persona resolver remains authoritative.

## Security Constitution invariants

- One Auth user remains one persona: patient or physiotherapist, never both.
- PAT and PHY identities remain immutable and are not accepted as caller-supplied authority.
- A PAT is not a therapist-owned clinical chart.
- Appointment creation is scheduling only. It does not create a clinical chart, patient-chart linkage, treatment episode, invoice, payment, credit, attendance evidence, or clinical/financial access.
- A service-area UUID is coarse scheduling metadata only. It is not patient identity, GPS evidence, proof of attendance, proof of treatment, clinical authority, invoice authority, payment authority, or fraud adjudication.
- The immutable service-location snapshot remains required before a home-visit appointment can be accepted.
- Physiotherapist ownership and RLS/data-API isolation remain unchanged.
- Database authority takes precedence over frontend state. The frontend may submit identifiers but cannot establish ownership, verification, persona, service eligibility, or access.

## Concurrency and rollback

The atomic wrapper runs both existing SECURITY DEFINER authorities within one database transaction. Existing row locks and unique indexes continue to serialize/deny conflicting appointment requests. A failure in the service-area step aborts the statement and rolls back the preceding appointment insert; no compensating client delete is permitted or required.

## Deferred boundaries

Precise GPS, arrival/attendance verification, external maps/geocoding, payment providers, telehealth providers, SMS/WhatsApp transport, browser acceptance, production promotion, and legal/business facts remain outside this slice and require their own explicitly bounded activation work.