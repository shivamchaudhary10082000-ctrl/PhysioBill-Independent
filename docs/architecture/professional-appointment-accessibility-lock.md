# Professional Appointment Accessibility Boundary

This slice is presentation-only. It hardens the authenticated physiotherapist appointment-request and clinical-onboarding surface for mobile, keyboard and assistive-technology use without changing scheduling, identity, clinical, linkage, financial or authorization authority.

## Locked invariants

- Supabase/Postgres remains authoritative for appointment state, availability, clinical-link requests, patient-chart ownership and access decisions.
- One Auth user remains one persona. Patient and physiotherapist routes and authorities remain isolated.
- PAT and PHY identifiers remain immutable platform identities. PAT is not a therapist-owned clinical chart identifier.
- Appointment acceptance is not clinical-chart linkage. Clinical-chart linkage is not clinical access beyond the database-authorized boundary.
- Existing clinical charts remain physiotherapist-owned and RLS-isolated. No automatic chart matching by name, phone, PAT or scheduling history is introduced.
- Creating a new chart remains an explicit therapist action through the existing database-authoritative workflow; another therapist's chart is never copied or merged.
- No invoice, payment, reimbursement, credit, clinical-note or patient-record authority is added by this slice.

## UI changes allowed by this lock

- Raise actionable controls to a minimum 44px-class touch target.
- Add visible keyboard focus treatment.
- Expose loading/saving/status state through semantic ARIA attributes and live regions.
- Mark decorative icons as hidden from assistive technology.
- Make long public identifiers wrap safely on narrow screens.
- Preserve deliberate chart selection and confirmation requirements.

## Explicitly out of scope

No RPC contract, migration, RLS policy, database grant, appointment transition rule, linkage rule, clinical access rule, provider integration, payment behavior, production configuration or production data may change in this slice.
