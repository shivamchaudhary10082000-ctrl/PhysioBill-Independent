# Therapist Analytics Security Regression

Scope: isolated PhysioBill Staging only. This lock records dynamic verification of the therapist operating-analytics boundary.

## Invariants

- Therapist analytics must resolve the authenticated physiotherapist from database authority; no caller-supplied therapist identifier is accepted.
- Analytics must aggregate only rows whose `physio_id` equals the resolved physiotherapist.
- Patients must not execute therapist analytics successfully.
- Analytics is descriptive only. It must not mutate clinical or financial records, grant clinical access, establish identity/linkage, or represent settlement/payment evidence.
- `billedTotal` is billing aggregation only; `billedTotalIsSettlementEvidence` must remain false.

## Dynamic staging verification

The live function `get_my_therapist_operating_analytics(date,date)` is `SECURITY DEFINER`, authenticated-executable, and calls `private.current_physio_id()` after requiring `auth.uid()`.

Its aggregate inputs are explicitly scoped to the resolved `v_physio_id` across visits, treatment episode status history, treatment episodes, and invoice issuance snapshots.

A bounded dynamic regression used two controlled physiotherapist personas for the period `2026-08-01` through exclusive `2026-09-02`:

- Physiotherapist A successfully obtained only a self-scoped aggregate object.
- Physiotherapist B independently obtained only a self-scoped aggregate object.
- The function exposes no `p_physio_id` or equivalent target parameter, so neither caller can request another therapist's analytics through this RPC surface.
- A patient persona invoking the same RPC was rejected with SQLSTATE `42501` because no physiotherapist workspace could be resolved.
- Returned analytics kept `billedTotalIsSettlementEvidence = false`.

The probes were read-only and transactional; no persistent fixture or data mutation was required.

## Migration decision

No authorization or aggregation-scope defect was demonstrated. No forward migration was created or applied. Adding a migration without a proven defect would create unnecessary database churn.

## Remaining analytics acceptance

- browser/mobile presentation acceptance remains pending
- screen-reader/accessibility acceptance remains pending
- future analytics dimensions must preserve the same resolved-owner rule
- any future settlement, payment-provider, or payout analytics require a separate authority boundary and must not reinterpret billed totals as settlement evidence
