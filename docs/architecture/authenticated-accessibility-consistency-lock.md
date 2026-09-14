# Authenticated accessibility consistency lock

## Scope

This bounded slice improves accessibility and mobile usability only on authenticated presentation surfaces.

Included changes:
- enlarge the persisted locale selector to a minimum ~44px touch target;
- expose loading, saving, and failure state to assistive technology without changing locale authority;
- improve horizontal professional navigation behavior for touch/trackpad overflow while preserving existing route links and persona gating.

## Frozen authority invariants

This slice MUST NOT change application authority.

- Supabase/database policy and RPC authority remain authoritative over frontend state.
- One Auth user remains one persona: patient OR physiotherapist.
- PAT and PHY public identities remain immutable.
- PAT is not a therapist-owned clinical chart identifier.
- Clinical-chart linkage is not clinical access authority.
- Accepted appointment state does not itself grant clinical access.
- Physiotherapist-owned clinical, billing, payment, and reimbursement data remain ownership/RLS isolated.
- Patient-visible clinical and financial access remains limited to existing database-authoritative read boundaries.
- No new clinical, financial, identity, provider, scheduling, communication-delivery, or payment authority is created by accessibility UI.

## Locale boundary

The selector continues to use the existing persisted preferred-locale database boundary. UI optimism must roll back to the previously resolved locale on failed persistence. Locale presentation must never authorize role changes or translate/rewrite authoritative clinical, financial, reimbursement, provider, or legal evidence.

## Navigation boundary

Professional quick navigation is discoverability only. Visibility of a link is not authorization. Every destination must continue to rely on the existing authenticated physiotherapist route/session boundary and downstream database authority.

## Acceptance

- touch target for locale selection is at least approximately 44px high;
- loading/saving/error state is announced without exposing data;
- professional navigation remains keyboard-focusable and horizontally operable on narrow screens;
- protected branches remain unchanged;
- no database migration is created unless database authority changes;
- browser/device acceptance may be deferred when external deployment limits block it, but must not be falsely claimed as passed.
