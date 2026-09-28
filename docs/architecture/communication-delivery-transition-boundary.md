# Communication Delivery Transition Boundary

## Scope

This slice adds a provider-neutral, append-only audit boundary for future external communication transport. It does not activate SMS, WhatsApp, templates, credentials, provider accounts, scheduled dispatch, or delivery webhooks.

## Authority rules

- `communication_events` remains the semantic appointment/reminder intent authority.
- `communication_preferences` remains the recipient consent/channel-preference authority.
- Delivery transitions are transport evidence only. `queued`, `accepted_by_provider`, `delivered`, `failed`, or `suppressed` can never change appointment, patient/physiotherapist identity, clinical linkage/access, invoice/payment, or reimbursement authority.
- PAT and PHY identities remain immutable and distinct. PAT is not a therapist-owned clinical chart. Linkage is not clinical access.
- The database, not the frontend or a messaging provider, decides whether an external transition may be recorded.

## Data minimization

The transition ledger stores only the communication-event reference, bounded channel (`sms`/`whatsapp`), attempt number, bounded transport state, bounded outcome class, database ordering sequence, and timestamp. It stores no phone number, destination address, message body, provider identifier, provider payload, credential, secret, clinical data, or financial data.

## Access and mutation boundary

- RLS is enabled and direct table privileges are revoked from `public`, `anon`, `authenticated`, and `service_role`.
- UPDATE and DELETE are rejected by immutable triggers.
- The only write RPC is service-role-only and is intended for a future server-side adapter.
- Queueing requires the recipient's current explicit communication preference and matching channel.
- State transitions are serialized by locking the immutable source communication event; a monotonic database sequence gives deterministic transition order.
- Terminal attempts cannot be advanced further.

## Deferred external activation

Provider KYC, secrets, approved templates, actual dispatch, delivery callbacks, scheduled workers, and provider-specific identifiers remain DEFERRED / EXTERNAL ACTIVATION PENDING. No provider-reported state is treated as proof of clinical care, payment, identity, appointment completion, or financial settlement.
