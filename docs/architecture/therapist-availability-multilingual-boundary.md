# Therapist Availability Multilingual Boundary

## Scope

This lock applies only to the therapist-facing availability management presentation layer.

Supported UI locales remain:

- `en-IN`
- `hi-IN`
- `gu-IN`

The preferred locale is loaded through the existing locale preference boundary and failures fall back to `en-IN` without blocking scheduling access.

## Authority invariants

Localization is presentation only. It MUST NOT change or reinterpret:

- physiotherapist persona resolution or authorization;
- immutable PHY identity;
- patient PAT identity or PAT/chart separation;
- enabled therapist service-mode values (`home_visit`, `clinic_visit`, `telephysiotherapy`);
- availability-window UUIDs;
- absolute start/end timestamps submitted to the database;
- the detected IANA timezone name submitted with an availability window;
- the maximum-window, duration, future-horizon or duplicate-window validation semantics;
- the database RPC used to save availability;
- patient discovery eligibility or therapist verification state;
- appointment, clinical, invoice, payment or financial authority.

Translated service labels are display aliases only. The original database/service-mode enum value remains the submitted value.

## Scheduling safety

Published availability is scheduling evidence only. It MUST NOT by itself create or imply:

- an appointment or reservation;
- patient/therapist identity linkage;
- clinical chart linkage or clinical access;
- a treatment episode or clinical record;
- attendance or location proof;
- an invoice, payment, credit or financial entitlement.

The database remains authoritative for persisted availability and downstream appointment acceptance rules.

## Time handling

User-facing date/time formatting may follow the selected locale. Persistence remains based on ISO absolute timestamps plus the existing detected timezone name. Localization MUST NOT alter the represented instant.

## Failure behavior

Locale loading failure must degrade to English presentation only. It must never weaken validation, invent availability, bypass database errors, or convert a failed save into a successful UI state.

## Acceptance boundary

This slice changes no schema, RLS policy, grant, trigger, function or RPC. Therefore it requires no forward migration. Database migration, rollback and concurrency tests are intentionally not fabricated for a presentation-only change.

Browser/mobile language and layout acceptance remains a separate deployment/browser gate.
