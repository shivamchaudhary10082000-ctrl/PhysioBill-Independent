# SECURITY DEFINER exposure audit

## Scope

This bounded audit reviews executable `SECURITY DEFINER` functions in the exposed `public` schema of isolated staging before making any grant change.

## Locked invariants

- Database authority remains stronger than frontend visibility.
- Patient and physiotherapist personas remain isolated.
- PAT and PHY identities remain immutable and distinct from therapist-owned clinical charts.
- PAT != clinical chart. Linkage != clinical access.
- Physiotherapist ownership/RLS isolation remains authoritative for clinical and financial data.
- No grant change may widen clinical, financial, identity, appointment, reimbursement, payment, telehealth, or communication authority.

## Audit findings

- `PUBLIC` has no executable access to the audited `SECURITY DEFINER` functions.
- Anonymous execution is limited to intentional pre-auth/public read surfaces: verified therapist discovery, verified therapist availability, and reimbursement-document verification.
- Authenticated execution is used by intentional application RPCs that provide the database-authoritative persona/ownership boundary for patient and professional workflows.
- Service-only operations such as communication delivery-transition recording and invoice PDF artifact generation are not executable by anonymous or authenticated callers.
- `public` schema CREATE is not available to `PUBLIC`, `anon`, `authenticated`, or `service_role`; therefore callers cannot create shadow objects in `public` to hijack definer resolution.
- Existing function search paths are explicitly configured. Functions with an empty search path use schema-qualified references; functions requiring public/private objects pin their configured paths.

## Decision

No EXECUTE grant is revoked in this slice.

The Supabase advisor flags public/authenticated `SECURITY DEFINER` execution generically. Those warnings are review signals, not proof that these RPC grants are incorrect. Revoking the four intentional anonymous read/verification endpoints would break pre-auth therapist discovery or public reimbursement verification. Revoking authenticated execution broadly would break database-authoritative application boundaries and push authorization pressure toward the frontend, which is prohibited.

Any future grant reduction must be function-specific and must first prove an equivalent database-authoritative workflow remains available.

## Deferred items

- Account-level leaked-password protection remains an external/account configuration gate.
- Provider activation, secrets, webhooks, payment KYC, telehealth activation, Cloudflare settings, and production promotion remain external gates.
- Browser acceptance remains independent of this database audit.
