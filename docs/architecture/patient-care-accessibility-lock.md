# Patient care accessibility boundary lock

## Scope

This bounded slice improves presentation and interaction accessibility on the authenticated patient appointment and clinical-care surfaces only.

## Frozen authority invariants

- Supabase/database authority remains the source of truth for appointment, clinical-linkage, clinical-record and financial decisions.
- One authenticated application user remains exactly one persona: patient or physiotherapist.
- PAT and PHY public identities remain immutable and are not derived from display state.
- A PAT platform identity is not a therapist-owned clinical chart.
- Appointment acceptance is not clinical linkage.
- Clinical linkage is not unrestricted clinical access.
- Patient clinical visibility remains limited to the existing database-authorized patient clinical read model.
- Physiotherapist ownership and RLS isolation remain unchanged.
- No patient-side UI state grants clinical, invoice, payment, reimbursement or professional-workspace authority.

## Changes allowed in this slice

- Minimum 44px-class touch targets for patient scheduling and navigation actions.
- Visible keyboard focus treatment.
- Accessible busy, loading, success and failure announcements.
- Expanded-state semantics for replacement-time controls.
- Decorative icon hiding from assistive technology.
- Narrow-screen wrapping and overflow hardening for patient-visible text and identifiers.

## Explicit non-goals

This slice does not change database schema, migrations, RLS, grants, RPCs, appointment state transitions, clinical-linkage workflow, chart ownership, patient clinical read authority, invoices, payment destinations, reimbursement evidence or provider integrations.

## Acceptance boundary

Repository/static review may establish implementation consistency. Real-device, browser, keyboard and screen-reader acceptance remains an external acceptance gate until a deployable staging build is available. No deferred browser gate may be described as passed.
