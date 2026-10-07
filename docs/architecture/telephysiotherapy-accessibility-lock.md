# Telephysiotherapy Accessibility Boundary

Status: LOCKED

This slice improves the authenticated telephysiotherapy patient/professional presentation layer only. It does not activate a video provider or change appointment, identity, clinical, attendance, payment, or settlement authority.

## Permanent invariants

- Supabase/Postgres remains the authority for telephysiotherapy session eligibility and persona-scoped reads.
- A telephysiotherapy session foundation may exist only through the accepted-appointment database boundary already implemented.
- Provider state remains `external_activation_pending` until a separately authorized external activation is completed.
- A provider room, URL, token, webhook, recording, join event, or provider attendance signal can never become appointment, identity, clinical-access, invoice, payment, settlement, or reimbursement authority.
- Patient and physiotherapist personas remain isolated. A patient session cannot render the professional surface and a physiotherapist session cannot render the patient surface.
- PAT and PHY identities remain immutable. PAT is not a therapist-owned clinical chart. Appointment acceptance is not chart linkage. Linkage is not unrestricted clinical access.
- Physiotherapist ownership/RLS isolation and zero unauthorized clinical or financial access remain mandatory.

## UX/accessibility requirements

- Primary telephysiotherapy navigation and refresh actions use a 44px-class minimum touch target.
- Keyboard-operable actions expose visible focus treatment.
- Loading and failure states are announced semantically without making UI state authoritative.
- Refresh is disabled while the current read is in flight to reduce duplicate requests.
- Long session identifiers and time labels must render safely on narrow screens.
- Session dates/times respect the database-provided timezone when possible.
- Decorative icons are hidden from assistive technology when adjacent text already provides meaning.

## Non-goals

This slice does not create provider rooms, credentials, recordings, attendance evidence, new database functions, migrations, grants, RLS policies, service-location authority, production changes, or legal/provider commitments.
