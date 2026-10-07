# Mobile accessibility consistency lock

## Scope

This bounded slice improves interaction accessibility without changing application authority, data access, identity, clinical, financial, appointment, communication, payment, or provider behavior.

## Locked invariants

- Database authority remains unchanged.
- Patient and physiotherapist personas remain isolated.
- PAT and PHY identifiers remain immutable identity roots.
- PAT is not a therapist-owned clinical chart.
- Clinical linkage does not grant clinical access by itself.
- Physiotherapist ownership and RLS boundaries remain authoritative.
- No clinical or financial payload is cached, broadened, or exposed by this slice.
- Protected branches and production infrastructure remain untouched.

## Accessibility changes

- The injected patient-directory clear-search control now exposes an approximately 44px touch target instead of a 32px target.
- The search field reserves enough trailing space for that larger control so text cannot sit underneath it.
- The clear control has an explicit accessible name and visible keyboard focus treatment.
- Pressing Escape while the patient search contains text clears the search and returns focus to the search field.

## Acceptance boundary

Static source review and repository integrity can be completed autonomously. Browser, touch-device, keyboard, and assistive-technology acceptance remain deferred until an executable staging deployment is available.

No database migration is required because this slice introduces no schema or database-authority change.
