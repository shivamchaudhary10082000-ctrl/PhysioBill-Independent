# Communication multilingual UX boundary

## Scope

This slice localizes only presentation text for the authenticated communications center and communication-consent controls in the already-supported `en-IN`, `hi-IN`, and `gu-IN` locales.

## Locked authority boundaries

- Locale preference remains presentation-only and must never participate in authentication, persona resolution, PAT/PHY identity, appointment authority, clinical linkage/access, invoicing, credit, payment, reimbursement, or verification decisions.
- PAT remains distinct from every therapist-owned clinical chart. Linkage remains distinct from clinical access.
- Patient and physiotherapist communication-event reads continue through the existing persona-scoped database RPCs. Frontend text does not create authorization.
- Communication consent remains database-authoritative and revision-guarded. Localization must not change consent state or bypass expected-revision concurrency handling.
- SMS/WhatsApp selection is a preference only. It does not activate a provider and is not evidence of queueing, acceptance, delivery, or appointment state.
- Transport/delivery evidence remains provider-neutral and cannot become clinical, financial, identity, or appointment authority.

## Translation boundary

Safe to localize:

- navigation and headings;
- explanatory status copy;
- reminder/event semantic labels;
- service-mode presentation labels;
- communication preference labels and non-authoritative notices.

Not generically translated by this slice:

- clinical observations, diagnoses, assessments, plans, or therapist-authored clinical free text;
- invoice/reimbursement snapshots or other immutable financial/legal evidence;
- provider payloads, identifiers, webhook evidence, or transport diagnostics;
- database or backend concurrency/security error strings whose exact operational meaning must remain intact.

## Runtime behavior

The communications surface reacts to the existing `physiobill:locale-changed` event, so persisted locale changes update safe presentation text without changing the active authenticated persona or re-authorizing data.

Unknown semantic/service values fall back to their stored value rather than inventing a translated meaning.
