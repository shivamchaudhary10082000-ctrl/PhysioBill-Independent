# Staging Migration Ledger Provenance Lock

## Purpose

PhysioBill staging has a historical difference between repository migration filename timestamps and the version timestamps recorded by the Supabase migration service. This document freezes the correct interpretation so future work does not replay already-applied DDL merely to make numeric prefixes look identical.

## Current verified staging checkpoint

Isolated project: `PhysioBill Staging` (`nbsvrzypypmmuvlgdpln`).

Latest applied migration at this lock:

- staging version `20260831134114`
- migration name `atomic_home_visit_appointment_reschedule`
- repository file `supabase/migrations/20260831193000_atomic_home_visit_appointment_reschedule.sql`

Recent explicit mappings:

| Repository migration | Staging history version | Migration name |
| --- | --- | --- |
| `20260831150000_verified_therapist_service_area_identifier.sql` | `20260831092848` | `verified_therapist_service_area_identifier` |
| `20260831163000_atomic_home_visit_appointment_request.sql` | `20260831103711` | `atomic_home_visit_appointment_request` |
| `20260831193000_atomic_home_visit_appointment_reschedule.sql` | `20260831134114` | `atomic_home_visit_appointment_reschedule` |

Earlier migrations also include application-time versions that differ from repository filename prefixes. This is historical provenance, not evidence that the DDL is missing.

## Locked rules

1. Never replay an already-applied migration only to align a staging migration-history number with a repository filename timestamp.
2. Migration identity is established by the committed migration name, reviewed SQL content, dependency order, and verified resulting database contract—not by assuming the numeric prefix must equal the staging service timestamp.
3. Before any future schema write, re-read the live staging migration ledger and the exact committed migration SQL from the current working branch.
4. Apply only genuinely forward DDL. Do not fabricate empty or duplicate migrations as cosmetic ledger repairs.
5. If repository and staging provenance cannot be established confidently, stop that schema slice and treat the discrepancy as a release-blocking investigation item rather than mutating the ledger.
6. Production migration history must not be inspected or changed under this staging lock. Production remains separately authorized only.
7. No migration-ledger operation may weaken persona isolation, PAT/PHY immutability, patient-versus-clinical-chart separation, linkage-versus-clinical-access separation, therapist ownership/RLS isolation, or financial/clinical authorization boundaries.

## Acceptance evidence for this lock

At creation, `futureweb-production-backend` was verified at `d09ebd55c552942046bc856fbb6964450e60f928`; `main` remained `761fd532d82babdae316bb8b49f7afad76bb849d`; `futureweb-dh-repair` remained `a968daf795f4928def36ada5666ad0d5965193bc`; and PhysioBill Staging reported `ACTIVE_HEALTHY` with its ledger ending at `20260831134114 atomic_home_visit_appointment_reschedule`.

This slice intentionally makes no database change. Therefore no forward migration, rollback test, or concurrency test is applicable. The outcome is a provenance/operational safety lock that prevents duplicate DDL from being introduced in later slices.
