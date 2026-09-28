# Public therapist search multilingual boundary

## Scope

This bounded slice localizes the shared public therapist search controls for supported locales `en-IN`, `hi-IN`, and `gu-IN` without changing discovery, verification, availability, appointment, clinical, or financial authority.

The shared search control is used by public entry/discovery surfaces. Locale is selected from an explicitly supplied supported locale when present; otherwise the browser language is used with `en-IN` fallback. No authenticated profile lookup is required for this anonymous control.

## Locked authority invariants

- Locale changes presentation only. It MUST NOT change `city`, `locality`, or `mode` query semantics.
- Stored/service RPC enum values remain `home_visit`, `clinic`, and `telephysiotherapy`; translated labels are never sent as authority-bearing values.
- The generated `/find-physio` URL continues to carry normalized canonical service-mode values and user-entered location text only.
- Professional verification state and verified therapist visibility remain database-authoritative.
- Service-area identifiers remain database-authoritative; translated UI must never synthesize or infer an identifier from city/locality text.
- Published availability remains database-authoritative. UI language must never imply availability that was not returned by the verified availability read boundary.
- Appointment creation remains patient-persona-only and database-authorized.
- PAT and PHY identities remain immutable and disjoint.
- PAT is not a therapist-owned clinical chart; linkage is not clinical access.
- Discovery and appointment presentation grants no clinical or financial access.
- No provider, payment, telehealth, communication, or production activation is introduced by this slice.

## Data minimization

The public search form does not query authenticated identity or private patient/professional records. Browser locale detection is local presentation behavior only. Location strings remain coarse discovery inputs; they are not evidence of exact user location, attendance, or entitlement to a home visit.

## Acceptance boundary

Repository acceptance requires:

1. all service-mode option values remain canonical enums;
2. URL generation remains unchanged apart from translated visible labels;
3. blank-city validation remains local-only and does not issue a search;
4. English fallback remains available for unsupported browser languages;
5. no database schema, RLS, grants, RPCs, triggers, migrations, secrets, or production configuration change.

Browser/mobile language acceptance remains external/deferred when deployment capacity is unavailable. The broader `TherapistDiscoveryPage` still contains English presentation copy and therefore is not claimed fully multilingual by this slice.
