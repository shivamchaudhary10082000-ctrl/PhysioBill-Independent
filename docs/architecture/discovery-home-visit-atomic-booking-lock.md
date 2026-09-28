# Discovery → Home Visit Atomic Booking Boundary

Status: architecture lock

## Purpose

Bind patient home-visit booking from verified therapist discovery to the database-authoritative atomic `request_home_visit_appointment` operation.

## Locked invariants

- A home-visit availability window MUST NOT be requested through the generic appointment-request client path.
- The patient must explicitly choose one service-area identifier emitted by verified therapist discovery before a home-visit request can be submitted.
- The chosen service-area identifier is coarse scheduling evidence only. It is not identity, exact GPS/location proof, attendance proof, clinical access, invoice authority, payment authority, fraud verdict, or professional verification authority.
- The database remains authoritative for validating that the service area is active and belongs to the physiotherapist attached to the requested availability window.
- The atomic database function remains authoritative for creating both the appointment request and immutable service-area snapshot in one transaction. Frontend sequencing must never recreate the old request-then-bind partial-failure path.
- Clinic and telephysiotherapy requests continue using their existing appointment authority and are not forced through the home-visit RPC.
- Authentication persona checks remain mandatory. A professional session cannot create a patient appointment request.
- Appointment request != accepted appointment.
- Accepted appointment != clinical chart linkage.
- PAT != therapist-owned clinical chart.
- Linkage != unrestricted clinical access.
- PAT/PHY identifiers remain immutable and persona-isolated.
- Physiotherapist ownership and RLS boundaries remain database-authoritative.
- No home-visit selection grants clinical, financial, payment, identity, or attendance authority.

## UI requirements

- When home-visit availability is present, service areas are presented as an explicit single-choice control.
- The request action remains disabled until a service area has been deliberately selected.
- The UI states that the selected area is coarse scheduling evidence and does not prove exact location or attendance.
- Home-visit requests call `requestHomeVisitAppointment(availabilityWindowId, serviceAreaId)` only.
- Non-home-visit requests call the existing generic appointment client.
- Failure of the atomic request must not be represented as a successful appointment request.

## Deferred external activation

Exact-location capture, device attestation, geofencing, route tracking, provider anti-fraud services, and production/browser acceptance are separate future boundaries and must not be inferred from this slice.
