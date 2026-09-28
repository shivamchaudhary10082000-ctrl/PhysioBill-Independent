# Communication Preferences Settings UI Boundary

Status: architecture locked for isolated staging.

## Purpose

Expose the existing provider-neutral communication consent authority inside both authenticated communications surfaces without activating an external messaging provider.

## Invariants

- The UI may call only `get_my_communication_preferences()` and `set_my_communication_preferences(...)` for preferences.
- The database resolves the authenticated application user; the browser never supplies another user, PAT, PHY, patient-chart, therapist, appointment, clinical, or financial identifier for this preference write.
- Patient and physiotherapist routes keep their existing persona gates.
- PAT != therapist-owned clinical chart; linkage != clinical access.
- Preferences grant no booking, clinical, financial, identity, reimbursement, admin, or provider authority.
- External updates/reminders remain opt-in and disabled by default.
- SMS/WhatsApp selection records preference/consent only. It does not activate provider delivery and is not evidence of delivery.
- In-app communication events remain available independently of external-message opt-in state.
- Optimistic concurrency revision from the database must be sent back unchanged; stale updates are surfaced and refreshed rather than overwritten.
- No phone number, message/template content, clinical text, financial data, provider credential, provider account ID, or secret is introduced by this UI.

## Acceptance boundary

Accept when the working branch contains the typed RPC adapter and authenticated settings UI, the repository/staging migration versions remain aligned, staging table privileges remain closed, anonymous RPC execution remains denied, and protected refs remain unchanged. Browser acceptance may remain deferred if the external deployment quota is unavailable.
