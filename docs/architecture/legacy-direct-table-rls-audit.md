# Legacy Direct-Table RLS and Ownership Audit

Checkpoint base: `ad9bf496a28e9d12812e6101ca0dfa83779f05e7`

Scope: isolated PhysioBill Staging and `futureweb-production-backend` only. No production resource is authorized by this lock.

## Security invariants preserved

- One authenticated application user resolves to one persona boundary.
- PAT and PHY identifiers remain immutable and distinct.
- A PAT is not a therapist-owned clinical chart.
- Patient ↔ clinical-chart linkage is not clinical access authority.
- Therapist-owned clinical and financial records remain database-owned and RLS-constrained.
- Frontend state never becomes ownership or authorization authority.

## Inspected legacy tables

The direct-table boundary was inspected for:

- `patients`
- `visits`
- `clinical_records`
- `invoices`
- `payments`

All five tables use authenticated ownership policies based on `private.owns_physio(physio_id)`. `patients`, `visits`, `clinical_records`, and `invoices` use both `USING` and `WITH CHECK` ownership predicates for writable operations. `payments` permits authenticated SELECT and INSERT only; correction/reversal remains outside ordinary direct UPDATE/DELETE access.

`private.owns_physio(uuid)` is `SECURITY DEFINER`, has a fixed search path, and authorizes only when the target physiotherapist row is owned by `auth.uid()`.

## Cross-owner structural enforcement

Ownership is not enforced only by RLS. The inspected schema also binds dependent rows to the same therapist owner through composite foreign keys:

- visits → `(patient_id, physio_id)`
- clinical records → `(patient_id, physio_id)` and `(visit_id, physio_id)`
- invoices → `(patient_id, physio_id)`
- payments → `(invoice_id, physio_id)` and `(patient_id, physio_id)`
- visits → treatment episode ownership tuple

This prevents an authenticated physiotherapist from creating an owned child row that points at another physiotherapist's patient, visit, invoice, or episode merely by guessing an identifier.

Identity triggers add a second enforcement layer:

- `assign_visit_identity()` derives the current physiotherapist and validates patient/episode ownership.
- `assign_clinical_record_identity()` derives physiotherapist/patient ownership from the owned visit.
- `assign_invoice_identity()` derives the current physiotherapist and preserves immutable owner/patient identity on update.
- `assign_payment_identity()` derives the current physiotherapist and patient from a locked owned finalized invoice.

## Dynamic staging evidence

Transactional role impersonation was executed against staging and rolled back.

Using an existing physiotherapist-A authenticated identity:

- own patient rows visible: **1**
- physiotherapist-B patient rows visible: **0**
- physiotherapist-B visits visible: **0**
- physiotherapist-B clinical records visible: **0**
- physiotherapist-B invoices visible: **0**
- physiotherapist-B payments visible: **0**

Using an existing patient-persona authenticated identity against the same legacy direct tables:

- patients visible: **0**
- visits visible: **0**
- clinical records visible: **0**
- invoices visible: **0**
- payments visible: **0**

These tests verify direct-table SELECT isolation. They do not replace the separate RPC-level patient clinical/financial access tests, which intentionally expose bounded linked-patient read models rather than legacy therapist-owned tables.

## Verdict

No direct-table authorization defect was proven in this bounded slice. A migration would therefore add risk without fixing a demonstrated problem and was intentionally not created or applied.

The accepted state is:

- therapist A cannot directly read therapist B legacy clinical/financial rows in the tested boundary;
- patient personas cannot directly read the therapist-owned legacy tables;
- dependent-row owner consistency is enforced by composite foreign keys plus identity triggers;
- payment direct mutation remains narrower than the other legacy tables.

## Remaining adversarial work

Before production freeze, extend the dynamic matrix from SELECT isolation into rejected cross-owner INSERT/UPDATE/DELETE attempts and RPC-level patient-A/patient-B and therapist-A/therapist-B mutation tests. Any concrete defect must be fixed through a committed forward migration and rollback/concurrency regression before acceptance.
