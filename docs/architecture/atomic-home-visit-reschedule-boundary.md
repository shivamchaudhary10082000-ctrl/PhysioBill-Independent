# Atomic Home-Visit Reschedule Boundary

## Purpose

Home-visit rescheduling must not produce a replacement appointment that lacks the immutable coarse therapist service-area snapshot required before acceptance.

## Locked invariants

- Supabase Auth and the database remain the authority for the authenticated patient persona.
- PAT and PHY identities remain immutable and mutually exclusive.
- A platform patient identity is not a physiotherapist-owned clinical chart.
- Appointment scheduling, service-area evidence, chart linkage, clinical access, invoicing, and payment authority remain separate domains.
- Rescheduling never rewrites the source appointment scheduling snapshot.
- A home-visit replacement must use the same physiotherapist and the same `home_visit` service mode as the source appointment.
- The source appointment must already have an immutable home-visit service-area snapshot.
- The source snapshot's internal `source_service_area_id` is never exposed to the patient UI by this slice.
- Reuse of that service-area identifier is allowed only after the existing database binder revalidates that the area still belongs to the same physiotherapist and remains active.
- The replacement appointment request, fresh immutable coarse service-area snapshot, and any cancellation of the accepted source appointment must succeed or fail as one PostgreSQL transaction.
- If service-area validation or snapshot insertion fails, the replacement request and source cancellation roll back.
- Clinic-visit and telephysiotherapy rescheduling continue through the existing generic reschedule authority and are not broadened by this boundary.
- Coarse service-area evidence is scheduling metadata only. It is not identity evidence, an exact address, GPS/geofencing evidence, attendance proof, proof of treatment, clinical-access authority, invoice authority, or payment/settlement proof.

## Database composition

`public.request_home_visit_appointment_reschedule(p_request_id, p_availability_window_id)` composes two existing database-authoritative operations inside one transaction:

1. `public.request_patient_appointment_reschedule(...)` retains existing source-row locking, future-time validation, same-physiotherapist/service-mode enforcement, availability locking, request limits, active-replacement uniqueness, and immutable scheduling history.
2. `public.set_my_home_visit_service_area(...)` revalidates active physiotherapist ownership of the prior declared service area and creates the fresh immutable replacement snapshot.

The wrapper itself resolves the authenticated appointment patient, locks the source request, requires `home_visit`, and refuses a source record with no service-area snapshot.

## Privilege boundary

- `anon`: no execute.
- `authenticated`: execute, with authorization resolved inside the database.
- `service_role`: no explicit execute grant from this application migration.
- The function is `SECURITY DEFINER` with an empty `search_path`, and its composed authorities perform the ownership/persona checks.

## Failure behavior

A stale or disabled therapist service area is a hard failure, not a reason to silently move the patient to another area. The patient must create a fresh home-visit booking if the previously declared area is no longer valid. This prevents frontend convenience from becoming location or scheduling authority.
