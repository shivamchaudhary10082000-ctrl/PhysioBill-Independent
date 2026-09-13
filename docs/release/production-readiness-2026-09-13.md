# PhysioBill Production Readiness — 2026-09-13

Status: **STAGING RELEASE CANDIDATE — CODE/SECURITY/LEGAL PREP COMPLETE; FINAL REAL-USER VERIFICATION + EXTERNAL DELIVERY CONFIG REQUIRED BEFORE PRODUCTION PROMOTION**

This document freezes the current release posture for `futureweb-production-backend`. It does not authorize a merge to `main` or a production database migration by itself.

## Release invariants

- Cloudflare Pages remains the deployment authority.
- One Supabase Auth user resolves to one persisted PhysioBill persona.
- Patient and physiotherapist personas remain mutually exclusive.
- PAT/PHY identifiers remain immutable.
- Booking does not create clinical access.
- Clinical linkage remains explicit and database-authorized.
- Therapist-owned clinical and financial records remain owner-isolated.
- Production must not receive staging Auth users, fixed staging OTPs, staging provider settings, or staging Supabase credentials.

## Staging acceptance completed

The canonical staging application has passed browser regression for:

- professional login, session restoration, logout and re-login;
- patient OTP login, patient gateway, protected patient surfaces, logout and re-login;
- reviewer/Admin authorization, logout and re-login;
- patient ↔ professional ↔ Admin wrong-persona isolation;
- password-recovery separation;
- locale persistence English → Hindi → Gujarati → English across refresh and re-login;
- discovery-profile persistence;
- availability publication;
- appointment-request read/refresh;
- communications/preferences;
- patient and professional telephysiotherapy reads;
- patient clinical-care boundary;
- patient financial-summary boundary;
- professional payment-destination create/default behavior;
- Admin verification queue.

The browser-only future-appointment reschedule path remains reserved for the final real-user journey because the existing accepted staging fixture is already in the past. The database rescheduling authority and lineage behavior were verified separately.

## Confirmed defects repaired during final regression

1. Communication-event read RPCs were incorrectly marked `STABLE` while their persona resolvers take row locks. Both patient and professional functions are now `VOLATILE` through staging migration `fix_communication_event_rpc_volatility`.
2. Telephysiotherapy read RPCs had the same PostgREST/read-only mismatch. Both are now `VOLATILE` through staging migration `fix_telephysiotherapy_read_rpc_volatility`.

Both fixes passed browser retest and cross-persona SQL rejection probes.

## Public legal / advertising launch controls

The release candidate now also includes:

- public Privacy Notice, Terms of Use and Professional & Advertising Standards pages;
- explicit professional signup acknowledgement of Terms, Privacy Notice and Professional Standards;
- explicit patient Terms + Privacy acknowledgement before requesting the first SMS OTP;
- versioned acknowledgement metadata on newly created Auth identities;
- public-profile guidance plus blocking of obvious guaranteed-cure / fixed-result / unsupported “best / No. 1” claims;
- a conservative public disclaimer explaining that PhysioBill verification is platform review and does not replace government/professional registration;
- configurable production service-operator name and privacy/grievance email;
- a fail-closed production launch gate if that operator identity/contact is absent;
- branch-aware robots behavior: staging/preview builds emit noindex + Disallow, while the main production build switches to index/follow + Allow;
- no Meta Pixel or Meta Conversions API integration in this release, preventing health/clinical details from being sent to Meta by application tracking code.

The regulatory control checklist records the NCAHP/GSAHC, consumer-advertising and DPDP phased-commencement review, plus a market-practice comparison with PhysioDesk. PhysioDesk is not treated as a regulator and its self-declared compliance badges are not copied.

## Web-security release gate

The release candidate has an automated GitHub release-security gate covering:

- TypeScript typecheck;
- production Vite build;
- generated Cloudflare CSP/security-header assertions;
- production dependency audit at HIGH severity or above;
- canonical staging live-header verification;
- MDN HTTP Observatory;
- OWASP ZAP passive baseline.

Current accepted result:

- dependency audit: **0 vulnerabilities**;
- MDN HTTP Observatory: **A+ / 135 / 12 of 12 tests passed**;
- OWASP ZAP passive baseline: **0 FAIL alerts**;
- live CSP/HSTS/clickjacking/MIME/referrer/permissions/COOP/CORP headers present;
- live CSP image policy reduced to same-origin/data/blob only.

The CSP intentionally allows inline CSS styles because the current React/UI stack uses runtime inline styles. Script execution remains restricted to `'self'` unless Turnstile is explicitly enabled.

## Supabase security posture

Staging security regression has confirmed:

- RPC-only sensitive tables deny direct anonymous and authenticated CRUD;
- patient/professional communication and telephysiotherapy read functions reject the wrong persona with SQLSTATE `42501`;
- clinical, financial, payment-destination, appointment, service-location, analytics and verification boundaries are database-authoritative;
- anonymous `SECURITY DEFINER` access is limited to intentionally public discovery/availability and bounded reimbursement verification surfaces;
- no committed service-role, Twilio, payment-provider or equivalent server secret was found in repository search.

Supabase Security Advisor still reports generic RPC-only / `SECURITY DEFINER` review warnings and leaked-password protection disabled. Those are release notes, not evidence of an authorization bypass.

## Production database promotion gap

Production Supabase project: `PhysioBill`.

Production currently ends at migration name `verified_therapist_discovery_location_pairing`.

Staging contains **46 later migrations** that must be promoted, in staging order, only after final real-user verification passes:

1. therapist_discovery_profile_verification_request_foundation
2. admin_therapist_verification_authority
3. admin_therapist_verification_self_review_guard
4. global_platform_identity_roots
5. platform_patient_clinical_chart_linkage
6. linkage_row_id_immutability
7. patient_clinical_chart_linkage_workflow_authority
8. harden_linkage_verification_concurrency
9. patient_passwordless_auth_confirmation_provisioning
10. therapist_availability_foundation
11. verified_therapist_availability_batch
12. patient_appointment_request_authority
13. harden_appointment_acceptance_authority
14. appointment_request_read_models
15. fix_appointment_read_rpc_postgrest_volatility
16. harden_appointment_republished_slot_acceptance
17. accepted_appointment_cancellation_boundary
18. safe_appointment_rescheduling_boundary
19. accepted_appointment_clinical_linkage_gate
20. fix_appointment_clinical_linkage_read_rpc_volatility
21. safe_new_clinical_chart_onboarding
22. patient_clinical_access_read_boundary
23. patient_financial_visibility_boundary
24. patient_advance_credit_ledger_foundation
25. invoice_credit_application_authority
26. invoice_credit_application_reversal_authority
27. therapist_payment_destination_foundation
28. invoice_payment_instruction_read_boundary
29. professional_reimbursement_document_verification_foundation
30. therapist_operating_analytics_authority
31. telephysiotherapy_session_foundation
32. home_visit_service_location_snapshot_foundation
33. communication_reminder_event_foundation
34. multilingual_locale_preference_foundation
35. communication_preferences_consent_foundation
36. communication_delivery_transition_foundation
37. verified_therapist_service_area_identifier
38. atomic_home_visit_appointment_request
39. atomic_home_visit_appointment_reschedule
40. harden_clinical_linkage_accepted_appointment_only
41. fix_reimbursement_document_conflict_target
42. fix_telephysiotherapy_session_conflict_target
43. harden_therapist_discovery_availability_concurrency
44. retire_disabled_service_mode_availability
45. fix_communication_event_rpc_volatility
46. fix_telephysiotherapy_read_rpc_volatility

Production already contains equivalent early migrations named `phase2_initial_schema_fixed` and `phase4_invoice_authority`; they must not be re-applied as duplicate baseline migrations.

Production already contains application data. Promotion therefore requires a backup/export checkpoint before schema mutation. The Supabase organization is currently on the Free plan, so point-in-time recovery must not be assumed.

## Promotion order after final verification

1. Freeze the accepted release-candidate commit.
2. Record production row-count and health baseline.
3. Obtain a production backup/export checkpoint.
4. Apply only the 46 missing migration names above in order.
5. Run production migration-ledger and security-advisor checks.
6. Verify production persona/ownership smoke probes.
7. Confirm Cloudflare production environment points to the production Supabase project and production publishable key.
8. Merge the frozen candidate to `main`.
9. Wait for Cloudflare production deployment success.
10. Run the same HTTP Observatory / ZAP / live-header gate against production.
11. Perform a final non-destructive smoke test.
12. Only then declare production live.

## External activation gates

These cannot be completed from repository/database code alone and must not be represented as complete until configured and verified:

- real patient SMS OTP delivery requires an approved/configured SMS provider;
- reliable professional confirmation/password-recovery email should use production SMTP rather than development/default delivery limits;
- production CAPTCHA requires a Turnstile site key plus matching server-side secret/configuration before `VITE_AUTH_CAPTCHA_ENABLED=true`;
- Supabase leaked-password protection should be enabled if available for the account/plan;
- payment-provider settlement, telehealth-provider activation, WhatsApp delivery and exact-location/device-attestation remain separate production slices.

## Repository release controls

Current GitHub metadata reports the repository as **public**, and the repository rulesets endpoint reports **no rulesets**.

No server secret was found in repository search, so public visibility has not demonstrated a credential leak. Before production promotion, governance should decide whether the repository should be private and whether `main` should have an enforced pull-request/ruleset boundary.

## Go / no-go rule

**Do not promote to production until the final real-user journey passes and the SMS/auth delivery path needed for that test is available.**

At the handoff into that journey, the remaining blockers are intentionally external/operational rather than untested application code:

1. configure a real SMS delivery provider for patient OTP on staging, then production;
2. configure reliable professional confirmation/recovery email delivery for production;
3. provide the real production operator name and monitored privacy/grievance email;
4. verify the first real professional's current registration/credential facts using the applicable authority and an auditable review method/reference;
5. run the two-device real-user journey, including the previously unexercised future reschedule path;
6. only after that PASS, perform the production backup, 46 ordered migrations, production environment binding, merge/deploy and post-deploy security scans.
