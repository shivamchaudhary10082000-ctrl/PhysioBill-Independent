# Telephysiotherapy Multilingual Boundary

Status: locked for staging implementation.

## Purpose

Localize the existing patient and professional telephysiotherapy session surfaces without moving any scheduling, appointment, session, provider, clinical, financial, or persona authority into the frontend.

## Supported presentation locales

- `en-IN`
- `hi-IN`
- `gu-IN`

The authenticated user's existing preferred locale is presentation-only. Failure to resolve it falls back to `en-IN` and must not block authorization or session retrieval.

## Authority invariants

1. Telephysiotherapy sessions remain database-derived from the existing accepted-appointment/session foundation.
2. Locale cannot create, accept, cancel, reschedule, link, disclose, or mutate an appointment or telephysiotherapy session.
3. Patient and physiotherapist persona isolation remains enforced by the existing route/session boundary and database functions.
4. PAT and PHY identifiers remain immutable and are never translated or reformatted.
5. PAT identity is not a therapist-owned clinical chart. Telephysiotherapy presentation does not create clinical linkage or clinical access.
6. Linkage remains distinct from clinical access.
7. No video-room provider, meeting URL, provider token, recording, credential, KYC state, or external account is created or implied by this slice.
8. Provider activation remains `DEFERRED / EXTERNAL ACTIVATION PENDING`.
9. Database-supplied timestamps and timezone names remain authoritative. Locale may alter only date/time presentation.
10. Session UUIDs and all authoritative identifiers remain byte-for-byte unchanged.
11. No clinical or financial information is added to the telephysiotherapy read surface by localization.
12. Locale never becomes an argument to the telephysiotherapy database read functions or an authorization predicate.

## UI behavior

The route shell and session list may translate headings, navigation, accessibility labels, loading/error/empty states, scheduling labels, and provider-activation explanations. A locale lookup failure must fall back safely to English. Raw backend error text may remain untranslated when it carries diagnostic meaning.

## Acceptance

Repository acceptance requires the localized catalog and surfaces to preserve the existing telephysiotherapy RPC/read contracts unchanged. Database migration is not required unless schema, function, RLS, trigger, or grant semantics change. Browser/mobile/provider acceptance may be deferred when external deployment or provider gates are unavailable.
