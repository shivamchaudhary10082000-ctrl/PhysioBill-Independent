# Communication Preferences / Consent Boundary

Status: architecture locked for isolated staging.

## Purpose

Persist a signed-in application user's optional external appointment communication preferences without activating any delivery provider.

## Invariants

- `app_user_id` is the authentication/application root only. It does not replace PAT/PHY identifiers and is not a therapist-owned clinical chart identifier.
- Patient and physiotherapist persona isolation remains unchanged.
- PAT != therapist-owned clinical chart.
- Linkage != clinical access.
- No communication preference may grant clinical, financial, booking, identity, or administrative authority.
- In-app appointment events remain database-authoritative and are not disabled by this preference record.
- External appointment updates/reminders are opt-in only and default off.
- Enabling external communication requires an explicit provider-neutral channel choice (`sms` or `whatsapp`) and records the consent time.
- Disabling all external communication clears the channel back to `none` and clears the active consent timestamp.
- No phone number, provider account ID, template/message body, clinical data, payment data, invoice data, location data, or secret is stored in this table.
- Direct browser table privileges are denied. Authenticated callers use self-scoped RPCs only.
- Anonymous callers cannot execute the RPCs.
- Preference writes use an expected revision and reject stale updates to prevent silent lost-update concurrency.
- Provider KYC, credentials, templates, delivery attempts, and real SMS/WhatsApp activation remain deferred external gates.

## Acceptance boundary

The foundation is accepted only when the exact committed migration is applied to isolated staging, table privileges remain closed, anonymous RPC execution is denied, authenticated self-scoped reads/writes work under simulated JWT identity, stale revision writes fail, and rollback testing leaves no persistent fixture row.
