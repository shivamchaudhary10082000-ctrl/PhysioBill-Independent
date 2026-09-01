# Public therapist discovery results multilingual boundary

## Scope

This lock governs localization of `/find-physio` result cards, availability presentation, appointment-request feedback, and zero-result recovery UX.

## Authority invariants

Localization is presentation-only. It MUST NOT alter:

- `physio_id`, availability-window IDs, service-area IDs, appointment IDs, PAT, or PHY values;
- verified registration authority/number, qualification evidence, or database verification state;
- canonical therapist service modes (`home_visit`, `clinic`, `telephysiotherapy`);
- service-area locality/city evidence returned by the database;
- timezone names or availability start/end instants;
- therapist discoverability filtering or published-availability authority;
- patient-vs-professional persona enforcement;
- `request_patient_appointment` / home-visit appointment mutation semantics;
- clinical linkage, clinical chart ownership, financial access, invoice/payment authority, or any downstream authorization.

PAT remains distinct from a therapist-owned clinical chart. Appointment acceptance or linkage does not itself grant clinical access. Public discovery must never expose private patient, clinical, or financial data.

## Locale behavior

The anonymous page may derive presentation locale from browser language only. Supported presentation locales are `en-IN`, `hi-IN`, and `gu-IN`, with safe fallback to `en-IN`.

Locale must never be passed as an authorization input or used to choose different database records. Database facts such as professional names, registration numbers, qualifications, locality/city strings, UUIDs, and timezone identifiers remain untranslated data.

## Appointment request safety

The localized request UI must preserve all existing guards:

1. unauthenticated users are redirected to patient sign-in;
2. a professional persona cannot create a patient appointment request;
3. home visits require an active service-area identifier;
4. a request remains pending until therapist acceptance;
5. creating or accepting an appointment grants neither clinical nor payment access.

## Acceptance

Before production candidate freeze, browser testing must cover all supported locales plus fallback, verify canonical URL/search values remain unchanged, and confirm no localized path bypasses persona, service-area, availability, clinical-access, or financial-access boundaries.
