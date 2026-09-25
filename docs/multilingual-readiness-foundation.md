# Multilingual readiness foundation

## Locked boundary

- Supported presentation locales begin with `en-IN`, `hi-IN`, and `gu-IN`.
- Locale is a presentation preference only. It must never participate in persona selection, authorization, clinical linkage, financial calculations, invoice authority, payment settlement, or PAT/PHY identity.
- `app_users.id`, `app_users.role`, and `app_users.created_at` remain immutable. Only `preferred_locale` is directly mutable by the authenticated row owner through column-level UPDATE privilege plus RLS.
- Communication rows continue storing stable semantic `event_type` values and no localized message body. Translation happens at presentation/delivery time.
- Unknown or malformed locale values fall back to `en-IN` in the client.
- External SMS/WhatsApp template approval, provider-specific language template IDs, and provider delivery credentials remain deferred.

## Initial semantic catalog

The first catalog covers the appointment communication event types already enforced by the database: request, reschedule request, accepted, rejected, cancelled, 24-hour reminder, and 2-hour reminder.

This foundation intentionally does not translate clinical free text, diagnoses, treatment records, legal declarations, invoice snapshots, or reimbursement evidence. Those require separate domain-specific review rather than automatic string substitution.
