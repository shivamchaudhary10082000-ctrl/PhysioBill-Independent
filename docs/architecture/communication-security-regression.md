# Communication Security Regression

Scope: isolated PhysioBill Staging only. This lock records dynamic verification of communication preferences, recipient event reads, and provider delivery-transition authority. It does not authorize provider activation and it does not weaken the Security Constitution.

## Invariants

- Communication preferences are self-owned application-user state. No caller may target another app user.
- Patient communication event reads must resolve only the authenticated platform patient.
- Professional communication event reads must resolve only the authenticated physiotherapist.
- Communication events, preferences, and delivery transitions remain unavailable through direct authenticated table SELECT.
- External delivery transitions are server/provider-side state. Authenticated patient or physiotherapist clients must never record provider delivery state.
- Delivery transitions are append-only, attempt-scoped, state-machine constrained, consent-aware, and channel-preference-aware.
- Communication delivery status must never become clinical, financial, appointment, identity, PAT/PHY, linkage, attendance, or treatment authority.
- SMS/WhatsApp provider activation, credentials, KYC, templates, sender setup, webhooks, and live delivery remain external activation gates.

## Dynamic staging verification

The current isolated staging project was healthy through `20260901133318 — fix_telephysiotherapy_session_conflict_target` before this regression.

### Preference ownership and optimistic concurrency

Using a controlled patient persona inside a rollback transaction:

- `get_my_communication_preferences()` resolved only the authenticated application user.
- A valid `set_my_communication_preferences(true,false,'sms',current_revision)` update succeeded and returned revision `current_revision + 1` with active consent timestamp.
- Reusing the stale prior revision was rejected with SQLSTATE `40001`.
- The entire preference mutation was rolled back.

The API surface has no caller-supplied `app_user_id`; both read and write functions derive `auth.uid()` and allow only patient/physio personas.

### Patient/professional event persona isolation

Two synthetic communication events were inserted inside one rollback transaction against an existing accepted staging appointment: one patient-recipient event and one physiotherapist-recipient event.

- The owning patient could read the patient-recipient event through `get_my_patient_communication_events(100)`.
- The same patient invoking `get_my_professional_communication_events(100)` was rejected with SQLSTATE `42501` by professional persona resolution.
- The owning physiotherapist could read the physiotherapist-recipient event through `get_my_professional_communication_events(100)`.
- The same physiotherapist invoking `get_my_patient_communication_events(100)` was rejected with SQLSTATE `42501` by patient persona resolution.

The first harness attempt failed only because the authenticated role could not read a postgres-owned temporary probe table. No application assertion was reached and the transaction did not commit. The probe was rerun without that harness dependency and passed.

### Delivery-transition authority and state machine

A synthetic patient communication event and explicit SMS consent fixture were created inside a rollback transaction.

- An `authenticated` client attempting `record_communication_delivery_transition(...)` was rejected with SQLSTATE `42501` because authenticated has no EXECUTE grant on that function.
- `service_role` retains EXECUTE and successfully recorded the valid state chain: `queued -> dispatch_started -> accepted_by_provider -> delivered` for one attempt.
- The live function continues to validate active recipient consent and the preferred external channel before queueing.
- Terminal/ordering rules remain enforced by the existing function; delivery-transition rows remain append-only.

Grant inspection confirmed:

- authenticated direct SELECT on `communication_events`: false
- authenticated direct SELECT on `communication_preferences`: false
- authenticated direct SELECT on `communication_delivery_transitions`: false
- authenticated EXECUTE on `record_communication_delivery_transition(...)`: false
- service_role EXECUTE on `record_communication_delivery_transition(...)`: true

Post-rollback residue checks returned **0** synthetic communication events and **0** synthetic delivery-transition rows.

## Migration decision

No communication authorization defect was demonstrated. Creating a forward migration merely to manufacture progress would add unnecessary database risk, so no migration was created or applied for this regression-only checkpoint. Rollback safety was proven through transactional fixtures; optimistic concurrency was exercised through the preference revision guard; delivery ordering was exercised through the provider-side state machine.

## Advisor state

The Supabase Security Advisor still reports RLS-enabled/no-policy INFO notices for the three communication tables. This is intentional for the current RPC-only design because direct authenticated table grants are absent. Generic SECURITY DEFINER warnings remain for the authenticated self-authorizing communication read/preference RPCs. `record_communication_delivery_transition(...)` is not authenticated-executable; it is service-role-only. Leaked-password protection remains an external project configuration warning.

## Deferred / external activation pending

- live SMS provider activation and credentials
- live WhatsApp provider activation, template approval and credentials
- provider delivery webhooks and real provider status reconciliation
- browser/mobile/screen-reader acceptance of communications UI
- Supabase leaked-password protection
- Cloudflare/provider account-level production settings
- production authorization / promotion
- legal/business/regulatory facts or filings

None of these gates is represented as completed by this regression lock.
