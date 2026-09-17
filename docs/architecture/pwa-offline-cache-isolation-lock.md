# PWA / Offline Cache Isolation Lock

## Scope

This lock governs service-worker and installable-PWA behavior for PhysioBill. Offline support is limited to a non-sensitive static fallback and immutable/public build assets. It must never become an offline copy of authenticated application state.

## Security invariants

1. Authenticated clinical, patient, appointment, identity, professional-verification, financial, payment, reimbursement, communication, location, telephysiotherapy, or analytics data MUST NOT be written to Cache Storage by the service worker.
2. Navigation/document requests are network-only. When the network is unavailable, the service worker may return only the static `/offline.html` document. It MUST NOT return a previously viewed authenticated route or HTML application shell from cache.
3. Supabase/API requests, RPC responses, Edge Function responses, auth endpoints, and any cross-origin request are never service-worker cached.
4. The only runtime-cacheable same-origin resources are hashed build assets under `/assets/` whose request destination is `script`, `style`, `font`, or `image`, plus the explicit static PWA files `/offline.html`, `/favicon.svg`, and `/manifest.webmanifest`.
5. Runtime caching is forbidden for responses that are unsuccessful, opaque/non-basic, marked `private` or `no-store`, or use `Vary: *`.
6. Requests carrying an `Authorization` header are never served from or written to the service-worker cache.
7. Cache names remain under the `physiobill-static-` prefix. Activation removes older caches under that prefix so superseded code/static assets do not remain authoritative.
8. The offline page must contain no patient, therapist, appointment, clinical, financial, token, identifier, or account-specific data and must not imply that clinical or financial workflows can safely continue offline.
9. Offline support MUST NOT weaken the Security Constitution: one Auth user = one persona; PAT/PHY identity remains immutable; PAT != therapist-owned clinical chart; linkage != clinical access; database authority and physiotherapist ownership/RLS remain authoritative; zero unauthorized clinical or financial access.
10. Future offline mutation queues, background sync of patient/clinical/financial data, IndexedDB persistence of sensitive records, or cached authenticated HTML/API responses require a separate explicit architecture/security slice and adversarial acceptance before implementation.

## Acceptance criteria

- `sw.js` has an explicit allowlist rather than a general same-origin caching strategy.
- Documents/navigation remain network-only with static offline fallback only.
- API/auth/cross-origin requests are untouched by the service worker.
- Static responses with privacy/no-store directives are not cached.
- A cache-version bump accompanies service-worker behavior changes.
- Browser acceptance must verify that after viewing authenticated patient and therapist surfaces, going offline does not reveal previously viewed authenticated content and Cache Storage contains only approved static resources.

## Deferred acceptance

Real browser/mobile/PWA/offline inspection is DEFERRED / EXTERNAL ACTIVATION PENDING while deployment/browser acceptance is unavailable. Code-level hardening may proceed, but this document does not claim full PWA acceptance until those tests are run.
