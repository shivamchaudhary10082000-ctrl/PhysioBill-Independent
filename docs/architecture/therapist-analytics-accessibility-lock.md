# Therapist Analytics Accessibility Boundary Lock

Status: accepted bounded implementation boundary for `futureweb-production-backend`.

## Purpose

Improve the professional operating-analytics surface for mobile, keyboard, assistive-technology, loading/error clarity, and narrow-screen resilience without changing analytics authority or broadening data visibility.

## Frozen authority rules

- Therapist operating analytics remain database-authoritative and self-resolving to the authenticated physiotherapist.
- The frontend may select a bounded reporting period and render aggregate results only; it must not derive cross-therapist, patient-identity, clinical-access, payment, settlement, or reimbursement authority.
- Aggregate patient counts do not grant access to patient identity or clinical charts.
- Billed totals remain immutable invoice issuance-snapshot value only and are not proof of collection, bank receipt, UPI receipt, provider settlement, or revenue realization.
- PAT and PHY identities remain immutable and persona-separated.
- PAT is not a therapist-owned clinical chart; linkage is not clinical access.
- Physiotherapist ownership/RLS isolation and database authority remain unchanged.
- No analytics presentation state may mutate clinical or financial records.

## Accessibility and UX rules

- Date inputs and primary actions use approximately 44px minimum targets and visible keyboard focus.
- While analytics are loading, the reporting controls remain disabled to prevent duplicate or ambiguous requests.
- Invalid local date ranges are rejected before an analytics request is sent; this is presentation validation only and does not replace database validation.
- Loading and error states are exposed semantically to assistive technology.
- Metric cards must tolerate long localized or numeric content on narrow screens without horizontal overflow.
- Decorative metric icons are hidden from assistive technology.

## Database impact

None. This slice changes no schema, migration, RLS policy, RPC, grant, trigger, identity rule, clinical rule, or financial authority. No migration is to be created merely to accompany a presentation-only change.

## Deferred acceptance

Real-browser, mobile-device, keyboard, screen-reader, and PWA acceptance remain external staging gates when deployment capacity is available. These gates must not be falsely reported as passed.
