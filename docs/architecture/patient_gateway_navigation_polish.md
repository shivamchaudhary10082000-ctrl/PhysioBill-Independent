# Patient gateway navigation polish — architecture lock

## Scope

This slice improves authenticated patient navigation only. It does not add or alter database authority, authentication authority, clinical authority, financial authority, provider delivery, or production configuration.

## Locked invariants

- The patient gateway is presentation and navigation only; it is never an authorization source.
- Every linked patient surface must continue enforcing its own authenticated patient persona boundary.
- A PAT identity is not a therapist-owned clinical chart.
- Linkage is not clinical access. Clinical access continues to depend on the database-authoritative accepted-appointment/linkage/access rules already implemented.
- Financial summaries remain database-authoritative and must not imply payment settlement beyond their existing evidence boundary.
- Telephysiotherapy navigation must not imply that an external meeting provider, room, recording, or credential has been activated.
- Communications navigation must not imply SMS/WhatsApp/provider delivery. In-app semantic events remain distinct from external delivery evidence.
- The gateway must not cache, duplicate, infer, or locally authorize sensitive clinical or financial data.
- Physiotherapist-only routes remain inaccessible to a patient persona.

## UX acceptance

- The authenticated patient can discover therapist search, appointment requests, in-app updates/reminders, telephysiotherapy, linked clinical care, and financial summary from one gateway.
- Mobile tap targets remain at least approximately 44px high.
- Keyboard focus is visibly represented on gateway actions.
- Decorative icons are hidden from assistive technology and the navigation region is labelled.
- Long public patient identifiers do not force horizontal overflow.

## Deferred / external activation pending

Browser acceptance, provider-backed telephysiotherapy rooms, external SMS/WhatsApp delivery, payment-provider activation, production deployment/configuration, and legal/business decisions remain outside this slice.
