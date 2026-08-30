# PWA / offline-safe foundation

## Architecture lock

This slice adds installability and static-shell resilience without creating an offline clinical or financial authority.

Permanent boundaries for this foundation:

- Service worker caching is limited to same-origin build assets and explicitly public static files.
- Authenticated route HTML under `/app/*`, `/patient/*`, and `/auth/*` is never written to the service-worker cache.
- Supabase Auth, REST, Realtime, Storage, Edge Function, payment-provider, telehealth-provider, SMS, WhatsApp, and other API traffic is never cached by the service worker.
- Clinical records, patient identity data, appointment payloads, invoice/ledger/payment data, reimbursement artifacts, PAT/PHY identity, and authorization decisions must never be persisted by this service worker.
- Navigation remains network-authoritative. When offline, the app returns a static, data-free offline document rather than a stale authenticated page.
- No clinical, financial, appointment, identity, or provider mutation becomes offline-writable in this slice.
- Existing database authority, RLS, persona isolation, and immutable platform identity rules remain unchanged.
- A future offline-data feature requires a separate threat model, explicit data classification, encryption/key-lifecycle design, conflict semantics, audit behavior, and fresh architecture approval.

## Update behavior

The worker does not force `skipWaiting()`. A newly installed worker waits for the normal browser lifecycle instead of taking control in the middle of an active clinical/financial session with a potentially different asset graph.

Static cache versions are explicit. Activation deletes only older PhysioBill static caches; it does not touch unrelated browser caches.

## Acceptance requirements

1. Production build can register `/sw.js` under scope `/`.
2. `/manifest.webmanifest`, `/offline.html`, and `/favicon.svg` are cacheable public assets.
3. A same-origin navigation failure returns only `/offline.html`.
4. `/assets/*` may be cached after a successful same-origin response.
5. Requests outside the explicit static allowlist pass through untouched.
6. No database migration is required for this slice.
