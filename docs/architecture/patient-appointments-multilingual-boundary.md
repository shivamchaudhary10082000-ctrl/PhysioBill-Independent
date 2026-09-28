# Patient appointment multilingual boundary

## Locked scope

This slice localizes authority-neutral patient appointment presentation for the existing supported locales `en-IN`, `hi-IN`, and `gu-IN`.

## Permanent invariants

- Locale is presentation state only. It must never select persona, authorize a request, alter PAT/PHY identity, decide clinical linkage, modify service-area authority, calculate money, or change database state.
- Database status values, UUIDs, PAT/PHY identifiers, therapist-owned clinical-chart identity, immutable home-visit service-area evidence, invoice/payment evidence and authorization predicates are never translated or reformatted into new authoritative values.
- Appointment cancellation, rescheduling and clinical-linkage mutations continue to call the existing database-authoritative RPC/client boundaries unchanged.
- `home_visit` rescheduling continues to use the atomic home-visit reschedule authority; locale cannot route around that transaction.
- Failure to load locale must degrade to `en-IN` and must not block authentication or appointment access.
- Dates may be formatted using the selected locale, but the database-provided timezone remains authoritative.

## Acceptance

A locale implementation is acceptable only if changing locale changes text/presentation without changing request IDs, service modes, status values, database calls, authorization checks, clinical-linkage semantics, financial access, or scheduling outcomes.
