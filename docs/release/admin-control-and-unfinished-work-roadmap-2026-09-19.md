# PhysioBill Admin Control and Unfinished Work Roadmap

Date: 19 September 2026

Status: engineering and operating plan; no feature activation, deployment, provider purchase, production change, or visual redesign is authorized by this document.

## Engineering continuation — 21 September 2026

The unfinished Admin control-plane candidate has now been reconciled locally onto remote branch head `241fbfa267da058964dadf646d5b00c70fd7fe2d`. The original candidate is also preserved in the recoverable git stash `codex-admin-control-plane-before-owner-mfa-reconcile-2026-09-21`. No migration was applied to staging or production, no site was deployed, no provider was purchased, and no real SMS or email was sent.

### Bugs found and resolved in the local candidate

| Defect found | Risk | Local resolution | Deployment state |
|---|---|---|---|
| The stale Admin portal routing replaced `/admin/mfa` and redirected signed-in Admins directly to `/admin`. | The broader portal could bypass the newer MFA screen. | Preserved `/admin/mfa`; every Admin portal section now resolves active database authority and requires an `aal2` session before rendering. | **Not deployed** |
| The broad capability migration did not grant `platform_owner` to the existing active owner. | The first owner could be locked out of capability administration immediately after migration. | Existing active `admin_role = 'owner'` memberships are bootstrapped into an active `platform_owner` grant. | **Not applied** |
| The broad RPC guard checked capability but not MFA assurance. | An AAL1 session with a capability could call privileged Admin RPCs. | `private.require_any_platform_admin_capability()` now rejects every session whose signed JWT assurance level is not `aal2`. | **Not applied** |
| The migration filename sorted before the newer owner/MFA migrations it depends on. | A fresh database could run the broad migration against the wrong schema order. | Recreated it with Supabase CLI as `20260921060438_admin_operations_control_plane_foundation.sql`. | **Not applied** |
| The owner/MFA access gateway recognized only legacy membership rows. | Future capability-only Admin users could not enroll or verify MFA. | `get_my_admin_access()` and pending-TOTP recovery now recognize active composable capability grants while retaining the legacy fallback. | **Not applied** |

### Verification evidence

- production TypeScript check and Vite/Cloudflare build passed with the staging environment shape;
- workflow YAML parsing and whitespace checks passed;
- the exact candidate migration and CI SQL assertions passed in a fresh PostgreSQL 17-compatible PGlite runtime;
- an AAL1 Admin session was denied, while AAL2 plus the required capability was allowed;
- the existing owner was automatically granted `platform_owner`;
- masked booking evidence retained patient public ID, therapist public ID and accepted status without clinical/contact data;
- `15 × ₹400 = ₹6,000` remained consistent across invoice total, paid/ledger total, issuance snapshot, reimbursement receipt source and completed PDF-artifact status;
- Admin audit and case-event ledgers rejected mutation; a patient persona and wrong-capability Admin were denied.

### Current release boundary

The original 79 staging migrations still reconcile exactly with the 79 migrations at the current remote head. The new Admin control-plane migration is a pending 80th local candidate and must not be described as live. The safe next engineering step is a hosted CI run and then a staging-only migration review/application; visual Admin pages should be previewed and approved before any Cloudflare Pages deployment. Production remains out of scope.

## Live prerequisite reconciliation — 20 September 2026

This section supersedes older evidence/status statements below where they conflict. It records the latest read-only staging checks against remote branch `origin/futureweb-production-backend` at `241fbfa267da058964dadf646d5b00c70fd7fe2d`. Production was not accessed or changed, no provider was purchased, and no real SMS or email was sent.

| Prerequisite | Current verified evidence | Status / next boundary |
|---|---|---|
| Correct staging project | Supabase project `nbsvrzypypmmuvlgdpln` is `PhysioBill Staging`, region `ap-south-1`, status `ACTIVE_HEALTHY`, PostgreSQL 17.6.1 | **PASS** |
| Migration reconciliation | Staging and the current remote branch each contain 79 migration names. A database-ledger-to-repository comparison found zero missing names and zero canonical SQL mismatches after removing comments, whitespace and `begin`/`commit` wrappers that Supabase does not preserve consistently. | **PASS: 79/79 migration SQL bodies reconcile.** Historic filename timestamps differ from live application timestamps, so names plus canonical SQL—not filename versions alone—are the comparison key. |
| Database advisors | The staging Security Advisor reports four warnings for anonymous execution of public `security definer` RPCs: therapist search, single/batch verified availability, and reimbursement-document verification. Direct inspection confirmed explicit `anon`/`authenticated` grants, revoked `PUBLIC` access, pinned search paths, and purpose-limited public/verification outputs without patient contact or clinical data. Twenty `RLS enabled, no policy` items are informational and appear consistent with deliberately private/service/RPC-only tables. | **REVIEWED EXCEPTIONS.** Preserve the four public RPCs for their intended public flows; do not suppress or rewrite them merely to clear an advisor label. Add performance indexes only from measured query plans/workload. |
| Reconciled local Admin migration | The former stale migration was moved after the owner/MFA migrations and repaired as `20260921060438_admin_operations_control_plane_foundation.sql`. | **LOCAL VERIFICATION PASS; DO NOT TREAT AS LIVE.** Hosted CI and explicit staging-only application/reconciliation remain required. |
| First Admin owner | One active staging Admin membership has `admin_role = owner` and capability `verification_reviewer`. Database guards protect the last active owner. | **PASS** |
| Admin MFA | The active owner has one verified TOTP factor and no pending factor. Current remote code includes `/admin/mfa`, recovery for interrupted enrollment, and `aal2` enforcement in privileged database functions. | **PASS for the first owner on staging.** Add another accountable owner/recovery process before production to avoid a one-person lockout risk. |
| Cloudflare traffic measurement | The live public staging page loads one Cloudflare Web Analytics beacon. The patient/private route loads zero analytics beacons. Current code limits analytics to public staging paths and excludes `/app`, `/admin`, `/patient`, `/auth`, and `/verify`. Cloudflare documents Web Analytics as available on all plans. | **PASS for privacy-scoped staging collection.** The Admin portal still needs a safe aggregate reporting integration; never expose a Cloudflare management token in the browser. |
| Cloudflare dashboard | Cloudflare's dashboard placed the cloud browser in a security-verification loop. The deployed beacon and headers were verified from the live site, but dashboard metrics/counts were not inspected. | **MANUAL ACCOUNT VIEW REQUIRED** to read current visitor totals. No setting change is required to prove collection is active. |
| Turnstile frontend | Live professional and patient Auth pages load the Cloudflare Turnstile runtime and create `cf-turnstile-response`; the live CSP permits only the required Cloudflare challenge origin. | **PASS for deployed client/runtime.** Matching Supabase Auth secret/config remains a private dashboard check; do not rotate or replace keys without an action-time approval. |
| Operator identity | Live Privacy and Terms pages publish service operator `Chaudhary Shivamkumar Shailesh` and grievance contact `rehabplatform.support@gmail.com`. | **TECHNICAL PASS; MANUAL LEGAL CONFIRMATION REQUIRED** that the exact legal identity is intended and the mailbox is continuously monitored. |
| Legal pages | Privacy, Terms and Professional Standards are live, dated 20 September 2026, and retain conservative clinical/advertising boundaries. | **DRAFT PASS, NOT LEGAL SIGN-OFF.** The Privacy Notice should explicitly disclose the active public-route Cloudflare Web Analytics collection before production if analytics remains enabled. This visible legal-text change was not made without approval. |
| SMS hook engineering | Staging `send-sms` Edge Function is `ACTIVE`, version 2, `verify_jwt=false` as required for the Auth Hook, and matches the repository's signed-webhook MSG91 adapter. An unsigned no-cost probe returned HTTP 401 `Invalid webhook`, proving the hook secret boundary is present. | **CODE/DEPLOYMENT PASS; DELIVERY BLOCKED.** No real SMS was requested. |
| India DLT / MSG91 | MSG91's current guidance requires Principal Entity registration, PE–TM chain, approved header/sender ID, approved content template, and mapping the DLT entity/header/template to the MSG91 Flow. The prepared OTP template candidate is `Use code {#var#} to sign in to PhysioBill. Do not share this code with anyone.` | **MANUAL/EXTERNAL.** SmartPing's current MSG91 help article states entity approval requires payment after KYC; no payment or registration was attempted. |
| SMTP | The application email flows are ready, but private SMTP configuration cannot be verified without authenticated Supabase Dashboard access. Supabase states its default SMTP is best-effort/non-production and restricted; production needs a custom SMTP host, port, username/password, From address, and a verified sending domain with SPF, DKIM and DMARC. | **MANUAL/EXTERNAL.** No provider account or credentials were created, and no email was sent. |

### Free work completed in this pass

- reconciled all 79 staging migration names and canonical SQL bodies with the current remote branch;
- confirmed the live staging owner assignment and verified TOTP factor;
- confirmed the deployed public-only Cloudflare analytics boundary and private-route exclusion;
- confirmed the live Turnstile frontend/runtime and CSP wiring;
- confirmed the published operator identity/contact;
- revalidated the deployed signed-webhook SMS adapter without sending a chargeable SMS;
- reviewed current Supabase, Cloudflare and MSG91 setup requirements;
- preserved every paid, credential-changing, production, visible-site and real-delivery action for explicit manual approval.

### Exact manual/provider packet — perform only after approval

1. **Operator/legal:** confirm the exact operator name, confirm ownership and monitoring of the grievance inbox, appoint a retention/privacy owner, and obtain qualified Indian legal review. Decide whether to approve the analytics disclosure wording before any visible legal-page change.
2. **DLT entity registration:** choose an operator DLT portal; prepare PAN, GST (if applicable), proof of identity, proof of address, authorization letter/company-authority evidence, registered mobile and email; complete KYC and approve the operator's quoted fee only after review.
3. **DLT messaging objects:** create/approve a six-character transactional header, the exact OTP content template and its DLT template ID; activate the PE–TM chain and add the approved entity/chain in MSG91.
4. **MSG91:** create the SMS template/Flow using the exact approved text, map DLT `{#var#}` to a named MSG91 variable such as `##OTP##`, map the DLT template ID and sender, obtain `MSG91_AUTH_KEY` and `MSG91_FLOW_ID`, add delivery credit, and enter secrets only through Supabase secret management.
5. **Supabase SMS:** verify Phone Auth enabled, phone auto-confirm disabled, the Send SMS Hook points to `/functions/v1/send-sms`, hook secrets match, and OTP expiry/resend/rate limits are conservative. Then approve exactly one real consenting second-phone test.
6. **SMTP:** choose a transactional provider and sending domain; verify the domain; publish SPF/DKIM/DMARC; obtain SMTP host/port/user/password and From address; enter them through Supabase's private SMTP settings; disable link tracking for Auth links where the provider supports it; approve one confirmation and one recovery delivery test.
7. **Cloudflare/Supabase private check:** manually inspect Web Analytics totals and confirm the Turnstile secret configured in Supabase Auth matches the deployed site key. Rotate keys only if the currently stored secret is known to have been exposed.

### Current visible issues held for approval

- The Privacy Notice does not explicitly describe the now-active public-route Cloudflare Web Analytics measurement.
- The invoice PDF typography defect recorded below remains intentionally unfixed because changing it alters document appearance.
- The broader Admin portal candidate changes navigation/screens. It is now reconciled with owner/MFA locally, but it remains undeployed and must receive a visual preview/approval before any Cloudflare Pages deployment.

## Local engineering checkpoint — 20 September 2026

Work completed in the local `futureweb-production-backend` release candidate after the original evidence checkpoint:

- general Admin portal shell with capability-specific navigation;
- composable Admin capabilities and protection against removing the final active platform owner;
- masked appointment supervision showing PAT → therapist, booking status and therapist response time;
- therapist operations list and the existing professional-verification workflow in one Admin portal;
- read-only invoice/ledger/issuance-snapshot/reimbursement/PDF-artifact consistency view;
- communication-intent and delivery-state health summary without phone numbers, OTPs, message bodies or provider secrets;
- complaints, safety, privacy, billing and technical case registry with controlled status transitions;
- aggregate legal/policy acknowledgement version supervision;
- append-only Admin audit history and append-only case-event history;
- owner-managed Admin capability grants with reason-required changes;
- launch-control screen that keeps external/manual gates visible instead of marking them complete;
- CI fixture coverage for capability denial, masking, Admin audit immutability, case separation, final-owner protection, and `15 × ₹400 = ₹6,000` across all billing representations.

Current truth: TypeScript checks, the production build, CSP generation, workflow YAML parsing and whitespace checks pass locally. The exact migration plus CI fixture also passes in a fresh PostgreSQL 17-compatible PGlite runtime. The reconciled work is saved in a local `futureweb-production-backend` commit. It has not been pushed, deployed or applied to staging/production, so GitHub CI has not run and the real staging migration ledger remains unchanged. The Admin portal remains a release candidate until the hosted migration CI job passes and the staging-only migration is explicitly reviewed and reconciled.

## Executive decision

PhysioBill should have a strong Admin control plane, but it must not become an unrestricted clinical superuser. Admin must be able to operate the marketplace, verify professionals, see traffic and booking state, resolve complaints, control public content, monitor service health, and reconstruct who did what. Routine Admin access must not expose clinical notes, diagnoses, OTP values, authentication secrets, full bank details, or unrestricted patient exports.

The correct premium-platform pattern is:

1. separate Admin capabilities instead of one universal password;
2. database-enforced permissions, not hidden buttons alone;
3. masked personal data by default;
4. immutable audit events for sensitive reads and every Admin write;
5. time-limited, reason-required emergency access for the exceptional case;
6. operational analytics separated from clinical and advertising data;
7. production changes kept in engineering/release controls rather than an arbitrary “edit the whole site” screen.

One owner may initially hold several capabilities, but the database must keep those capabilities separate so staff can later be added safely.

## Evidence checkpoint

This report was reconciled against working branch `futureweb-production-backend` at commit `e6bee5114504c43e1953ac2a1717bfaf7a0dc8bd`.

| Area | Current evidence | Honest status |
|---|---|---|
| Admin entry | `/admin/sign-in`, `/admin/verifications`, and review-detail routes exist | Implemented only for professional verification |
| Admin authority | `platform_admin_memberships` exists, but permits only `verification_reviewer` | Secure narrow foundation; not a general Admin system |
| Verification audit | Immutable verification request snapshots and event history exist; self-review is blocked | Implemented |
| Appointment authority | Patient requests and therapist accept/reject actions are server-authoritative; appointment identity/time snapshots are immutable | Implemented foundation |
| Admin booking oversight | No Admin booking list, timeline, search, dispute view, or case workflow exists | Not implemented |
| Therapist analytics | Self-scoped therapist operating analytics exist | Implemented for therapists, not Admin-wide operations |
| Site traffic | No site-traffic dashboard or privacy-safe visitor measurement was found in the app | Not implemented |
| Admin staff roles | No owner, support, privacy, security-auditor, or operations capabilities exist | Not implemented |
| Admin action audit | Verification has domain events, but there is no unified audit of Admin reads, exports, permission changes, or operational actions | Partial |
| Complaints/incidents | No Admin case-management workflow was found | Not implemented |
| Privacy requests | Public wording exists, but no Admin queue for access/correction/deletion/grievance requests was found | Not implemented |
| Professional rules | Terms, Privacy Notice, Professional Standards, and versioned account legal acknowledgement exist | Strong draft foundation; enforcement/version-management work remains |
| Admin MFA | No application-level requirement for a second factor/AAL2 was found on Admin routes | Not implemented |
| System health | No Admin surface for release version, migrations, provider health, failures, or security advisories exists | Not implemented |
| Database migrations | Repository contains 77 SQL migration files | Local code count confirmed; exact live staging ledger remains unconfirmed |
| Production manifest | Current promotion manifest contains the prior 48 post-baseline migrations and stops at `20260914064132...` | Stale: the three `20260917...` billing migrations are not listed |
| Billing consistency | Controlled test passed: 15 sessions × ₹400 = ₹6,000 in invoice, ledger, mediclaim preview, and downloaded PDF | Numeric requirement passed |
| Invoice PDF appearance | Downloaded PDF has excessive letter spacing/compressed typography | Open visual defect; intentionally not fixed without approval |
| Patient SMS OTP | Code is designed for Supabase phone Auth plus MSG91 Send SMS Hook | External MSG91/DLT configuration and real delivery test remain blocked |
| Final launch journey | A complete real professional + second-phone patient journey is documented | Still requires real provider configuration and final staging execution |

### Documentation drift to correct before production

- `docs/product-roadmap.md` still describes some identity, discovery, booking, credit, payment-destination, reimbursement, and analytics foundations as future work even though later migrations implement substantial parts of them.
- `docs/release/production-migration-manifest.txt` must not be used for promotion until its intended baseline and the three September billing migrations are reconciled against the live staging and production ledgers.
- The live staging ledger cannot be inferred from filenames. It must be read from the correct PhysioBill staging project before any production plan is frozen.

## Admin information boundary

“Everything in the hand of Admin” must mean control and accountability, not unrestricted healthcare-data browsing.

| Data class | Normal Admin access | Examples |
|---|---|---|
| Public | Full | Published therapist profile, broad service area, public availability |
| Operational | Full for the relevant capability | Booking state, timestamps, service mode, delivery failure, complaint status |
| Personal contact | Masked by default; reveal only for an assigned support case with a reason | Patient phone/email, therapist private contact |
| Financial operations | Summary and document/status access; no secrets | Invoice total/status, receipt existence, reimbursement-document status |
| Clinical/health | Denied by default | Diagnosis, assessment, treatment notes, private clinical documents |
| Authentication/secrets | Never displayed | OTP value, password, refresh token, service-role key, provider secret, full API key |
| Payment credentials | Never displayed in full | Bank account number, provider secret, settlement credential |

If a serious complaint cannot be resolved from operational evidence, “break-glass” access may be designed later. It must require a case ID, typed reason, narrow record target, short expiry, immutable audit event, and preferably second-person approval. It must never support casual browsing or bulk export.

## Required Admin capability model

The current single `verification_reviewer` capability should evolve into composable capabilities. Do not replace the immutable patient/physio persona with an “admin persona”; Admin remains an additional, separately authorized capability.

| Capability | May do | Must not do |
|---|---|---|
| `platform_owner` | Manage Admin memberships, high-risk settings, and release approvals | View clinical notes by default or reveal secrets |
| `operations_admin` | View operational dashboards, booking states, availability issues, and service incidents | Alter clinical or financial history |
| `verification_reviewer` | Review/revoke professional verification using submitted snapshots | Review own credentials or browse patient records |
| `support_agent` | Work assigned cases using masked identity and booking history | Bulk export, see clinical notes, manage Admins |
| `privacy_officer` | Process access/correction/deletion/grievance workflows | Rewrite immutable professional/financial records |
| `security_auditor` | Read security/audit evidence and access-denial trends | Change users, bookings, money, or content |
| `content_moderator` | Moderate public profile copy and safe site-content fields | Edit executable code, CSP, database policies, or deployments |
| `finance_reviewer` | View billing consistency, document state, corrections, and exceptions | Change finalized invoice history or payment credentials |

Every privileged RPC must resolve the signed-in user, check the exact capability on every request, deny by default, and return only the fields needed for that operation.

## Admin portal modules

### 1. Overview

Show a small operational dashboard:

- visitors, page views, popular public pages, referrer categories, and coarse geography;
- patient sign-ins/registrations, verified therapists, published therapists, and active therapists;
- appointment requests today, accepted, rejected, cancelled, expired, and pending response;
- acceptance rate, median therapist response time, and no-response count;
- open verification reviews, complaints, privacy requests, delivery failures, and system warnings;
- the deployed application version and last-known migration checkpoint.

“Unique visitors” is an estimate, not an exact count of people. Never join anonymous traffic data to diagnoses, appointment reasons, patient identities, or therapist-patient relationships.

### 2. Booking operations and dispute evidence

Admin needs a read-only booking registry and event timeline. The primary row should communicate the requested relationship clearly:

> Patient A → Therapist B · Home visit · Requested 09:10 · Accepted by therapist 09:24

The list needs date, therapist, patient-safe identifier, service mode, broad area, status, response age, and case flag filters. Patient name/contact should be masked until an authorized support case justifies reveal.

Required event fields:

- stable appointment/request ID and correlation ID;
- patient platform ID and therapist platform ID;
- masked display identity;
- requested slot snapshot, timezone, service mode, and broad service area;
- event type: requested, accepted, rejected, cancelled, reschedule requested, reschedule accepted/rejected, expired;
- actor type and actor ID;
- event time, previous state, resulting state, and safe reason code;
- related complaint/incident ID;
- no diagnosis, clinical note, OTP, or exact private home address.

Admin must not directly rewrite a historical appointment. Corrections must be new attributed events or narrowly defined operational actions with reason and audit evidence.

### 3. Therapist management

- pending verification queue and immutable review history;
- credential conflicts and expiry/recheck reminders where applicable;
- published/unpublished/suspended status;
- profile and advertising-claim moderation;
- service modes, broad service areas, availability health, response rate, cancellation rate, and complaints;
- rules acceptance version and required re-acceptance state;
- warning, temporary restriction, public delisting, suspension, and appeal workflow;
- no representation that PhysioBill verification replaces government registration.

### 4. Patient and support operations

- account status, PAT identifier, masked contact, consent/notice version, and last authentication status;
- booking history and operational communication-delivery state;
- clinical-link status only (`not requested`, `pending`, `linked`, `ended`) without clinical content;
- patient-visible financial document/status summary;
- support notes stored in the case, never inserted into the clinical chart;
- account restriction and recovery assistance through explicit, auditable workflows—never silent impersonation.

### 5. Complaints, safety, and incidents

- case ID, category, severity, reporter, affected booking/profile/document, owner, SLA, status, and outcome;
- evidence references with access restrictions;
- separate clinical-safety escalation from marketplace/support complaints;
- conflict-of-interest check and appeal history;
- legal/regulatory hold marker that blocks routine deletion;
- immutable event trail for assignments, reads, exports, decisions, and notifications.

### 6. Privacy and data-rights operations

- intake for access, correction, deletion, consent, and grievance requests;
- identity-verification state without storing excess identity documents;
- scoped data inventory, assigned owner, deadline, exceptions, approval, fulfillment, and evidence;
- retention/hold decision recorded separately from account status;
- export generation protected by expiry, encryption, and audit logging;
- no one-click unrestricted database export.

### 7. Billing and document operations

- invoice count/amount/status summaries and exception filters;
- invoice → ledger → receipt/reimbursement document → PDF consistency indicator;
- immutable finalized amounts and explicit correction/reversal evidence;
- PDF generation failures, artifact status, and re-generation control where safe;
- no interpretation of “billed” as “settled” without provider/payment evidence;
- no full bank account details, provider credentials, or secret payment configuration.

The regression case `15 × ₹400 = ₹6,000` should become an automated release test across all four representations.

### 8. Communications and provider health

- SMS/email template version, provider configured/not configured, delivery counts, failures, and last successful delivery;
- OTP request and verification event counts without the OTP value;
- rate-limit and abuse indicators;
- DLT entity/header/template/consent-template identifiers as configuration status, not editable secrets;
- provider keys stored only in server-side secret management.

### 9. Site content and public controls

Admin may control structured, safe content: contact details, operator identity, legal notice version, announcement/maintenance banner, support hours, public FAQ, approved profile content, and feature availability flags. It must not provide a raw HTML/JavaScript editor or the ability to change RLS, CSP, code, migrations, secrets, or production deployments from the browser.

### 10. Security, audit, and system health

- Admin sign-in history, failed attempts, active sessions, and MFA/AAL2 state;
- Admin membership and permission changes;
- every sensitive read, reveal, export, moderation action, financial review action, and break-glass request;
- application/API/database/function/storage health and recent errors;
- release version, environment label, migration drift state, backup status, and security-advisor findings;
- alerting for repeated authorization failures, bulk access, unusual exports, and privileged-account changes.

Infrastructure logs help diagnose services; an application-owned audit ledger is still required because the application knows the actor, capability, target, reason, case, and outcome.

## Professional rules and enforcement

The current Professional Standards page is a good conservative foundation. A stricter production package should be reviewed by qualified Indian counsel and the applicable professional authority, then versioned and enforced through the following controls.

### Required professional obligations

1. Provide truthful, current identity, qualifications, registration details, and service claims.
2. Practise only within lawful physiotherapy scope; do not prescribe medicines or claim authority outside that scope.
3. Do not promise cures, guaranteed relief, fixed recovery, “best/No. 1,” or unsupported specialist status.
4. Obtain and document appropriate patient consent; use minimum necessary patient information.
5. Keep clinical records accurate, attributable, timely, and private; never fabricate, backdate, or delete history to hide an error.
6. Keep availability, fees, service mode, broad service area, cancellation rules, and payment destination truthful and current.
7. Never expose patient identity, photos, testimonials, documents, or treatment information publicly without an appropriate lawful basis and specific permission.
8. Use patient communications only for care/operations covered by the relevant preference or lawful purpose; no unauthorized marketing.
9. Protect account access, use MFA when required, never share credentials, and report suspected compromise promptly.
10. Cooperate with credential rechecks, complaints, safety incidents, lawful privacy requests, and regulator/lawful-authority requests.
11. Do not divert, harass, discriminate against, impersonate, manipulate reviews for, or exploit patients through the platform.
12. Do not misuse invoices, receipts, reimbursement documents, signatures, registration numbers, or payment evidence.

### Enforcement model

- version the Terms, Privacy Notice, and Professional Standards separately;
- store immutable acceptance of each applicable version and timestamp;
- require re-acceptance before affected actions after a material update;
- use proportionate outcomes: education, warning, correction request, visibility restriction, temporary suspension, termination, or lawful escalation;
- provide reason, evidence reference, decision-maker, effective time, and appeal state;
- never let an Admin erase the underlying decision/audit history.

The current `account_legal_acknowledgements` foundation records a notice version and Terms/Privacy acknowledgement. A distinct Professional Standards version/acceptance and Admin-managed re-acceptance workflow still need to be designed.

## Delivery order: lowest added cost first

The ordering below prioritizes risk reduction and operational value before vendor spend.

### Stage 0 — documentation and release truth (`₹0` added vendor cost)

- keep this report as the master unfinished-work checkpoint;
- reconcile the 77 local migrations with the correct live staging ledger;
- update the production migration manifest only after staging truth is known;
- refresh the stale product roadmap and final journey checklist;
- record the billing numerical PASS and open PDF typography defect;
- choose the service-operator identity, monitored grievance email, retention policy owner, and first Admin account owners;
- have the professional rules/privacy/terms reviewed before public production.

Exit evidence: named owner/date for every external blocker; exact migration comparison; no ambiguous “done” items.

### Stage 1 — Admin security foundation (`₹0` added vendor cost on the existing stack)

- extend Admin memberships to composable capabilities;
- add Admin membership history and immutable application audit events;
- require reason codes for sensitive reveals/actions;
- enforce Admin MFA/AAL2 and short privileged sessions;
- add database authorization tests for each capability, cross-user denial, self-review denial, and audit immutability;
- retain the current one-persona-per-user model.

Exit evidence: negative authorization tests pass from anonymous, patient, therapist, wrong-capability, and revoked-Admin sessions.

### Stage 2 — read-only operations (`₹0` added vendor cost)

- build the Admin shell and overview;
- add booking registry/timeline, therapist directory, verification, patient-support summary, billing consistency summary, and communication-delivery summary;
- return purpose-built masked RPC results instead of exposing tables;
- add date/status/search pagination and rate limits;
- verify mobile and keyboard/screen-reader behavior.

Exit evidence: Admin can reconstruct “Patient A requested Therapist B; Therapist B accepted at time T” without clinical-data access.

### Stage 3 — privacy-safe traffic and funnel (`₹0` likely on current Cloudflare availability; verify account plan/configuration)

- enable Cloudflare Web Analytics for aggregate public-site performance/traffic if approved;
- create application-owned, low-cardinality funnel counters for discovery search, profile view, booking request, acceptance, rejection, cancellation, and completion where authoritative;
- never send patient/therapist IDs, diagnoses, appointment reasons, phone numbers, or booking relationships to public web analytics;
- fetch any external analytics into Admin only through a server-side scoped connector; never expose a Cloudflare API token to the browser;
- disclose the actual measurement in the Privacy Notice before production activation.

Exit evidence: daily traffic and booking-funnel totals appear in Admin, and payload inspection proves sensitive fields are absent.

### Stage 4 — controlled Admin actions (`₹0` added vendor cost)

- complaints/incidents, moderation, warnings, delisting/suspension, privacy requests, and structured site settings;
- approval steps for high-risk actions;
- append-only events instead of overwriting historical facts;
- notification and appeal states.

Exit evidence: every write produces an attributable audit event and unauthorized alternatives fail.

### Stage 5 — reliability and scale (`cost depends on traffic/retention`)

- pagination/index/load tests using synthetic data;
- provider-health alerts, error monitoring, backup/restore drills, log retention, and capacity thresholds;
- background aggregation so dashboards do not run large live scans;
- export controls and anomaly detection;
- review Supabase/Cloudflare plan limits before traffic grows.

Exit evidence: defined service levels, tested restore procedure, bounded query plans, and no dashboard path capable of leaking across tenants.

### Stage 6 — external/provider/legal gates (`not free or not safely estimable yet`)

- India DLT registration and approved SMS entity/header/template/consent setup;
- MSG91 account/Flow and Supabase Send SMS Hook secrets;
- production SMTP domain/provider, SPF, DKIM, DMARC, and delivery tests;
- Cloudflare Turnstile keys plus matching Supabase Auth configuration;
- legal review of operator terms, privacy, retention, grievances, professional standards, and enforcement;
- optional paid monitoring/log retention only when the free/current plan cannot meet the approved requirement.

No provider should be purchased merely because it is listed here. First obtain exact requirements and current quotations, then approve deliberately.

## Manual owner decisions and actions

| Decision/action | Why engineering cannot decide it | Blocks |
|---|---|---|
| Name the legal service operator | Legal/business identity decision | Public production |
| Create monitored privacy/grievance email | Requires an accountable human workflow | Public production and privacy requests |
| Approve Admin staff and capability assignments | Authority cannot be invented by code | Admin activation |
| Approve retention schedule and legal holds | Legal/professional/business judgment | Deletion, logs, complaints |
| Obtain professional/legal review | The app must not self-certify compliance | Enforceable production policies |
| Complete DLT + MSG91 setup | External registration, documents, templates, and possible payment | Real patient SMS OTP |
| Configure production SMTP | External domain/provider credentials | Reliable professional confirmation/recovery |
| Create Turnstile site/secret keys | External Cloudflare account action | Public Auth abuse protection |
| Decide whether to fix PDF typography | It changes document appearance | Visual PDF defect |
| Approve final brand after professional search | Trademark/business judgment | Rename, if any |

## Engineering backlog and acceptance evidence

| Priority | Work item | Acceptance evidence |
|---|---|---|
| P0 | Confirm exact staging migration ledger and reconcile all 77 local migrations | Exported ordered comparison from the correct PhysioBill staging project |
| P0 | Repair production migration manifest drift | Reviewed ordered manifest includes only migrations genuinely absent from production |
| P0 | Preserve billing regression | Automated test proves `15 × ₹400 = ₹6,000` across invoice, ledger, mediclaim receipt/preview, and PDF source |
| P0 | Decide/fix PDF typography after visual approval | Before/after render, numeric regression pass, approved screenshot/PDF |
| P0 | Admin capability schema and immutable audit ledger | SQL policy/function tests and tamper-negative tests |
| P0 | Admin MFA/AAL2 gate | Non-MFA Admin session denied; MFA session allowed and audited |
| P1 | Admin booking list and event timeline | Cross-persona tests plus requested/accepted/rescheduled/cancelled fixtures |
| P1 | Masked support identity and reason-required reveal | UI/API tests show masked default and logged narrow reveal |
| P1 | Therapist management/moderation | Verification, publish, delist, suspension, appeal, and conflict tests |
| P1 | Complaints/incidents | Complete case lifecycle with immutable events and restricted evidence |
| P1 | Privacy request workflow | Intake-to-closure test including retention/hold exception |
| P1 | Billing/document consistency dashboard | Injected mismatch is detected; no financial mutation authority is granted |
| P1 | Professional Standards version acceptance | New version blocks covered action until re-accepted; evidence remains queryable |
| P1 | Privacy-safe site settings | Only allow-listed fields update; code/CSP/secrets remain unreachable |
| P2 | Traffic overview | Cloudflare/app aggregates match test traffic within documented semantics |
| P2 | Booking funnel and therapist response analytics | Daily aggregates reconcile to authoritative appointment events |
| P2 | Communications/provider health | Delivery failures visible; OTP/secrets never returned |
| P2 | System/release health | Version, migration state, service checks, backup recency, and errors are visible |
| P2 | Scale/accessibility verification | Query plans, pagination, mobile, keyboard, and screen-reader checks pass |
| P3 | Break-glass workflow, only if justified | Two-person approval where practical, expiry, narrow access, alert, immutable audit |

## Explicitly prohibited Admin features

- unrestricted database/table browser;
- viewing OTPs, passwords, tokens, API keys, or provider secrets;
- routine access to clinical notes, diagnoses, assessments, or private treatment files;
- silent login/impersonation as a patient or therapist;
- editing or deleting audit events, finalized invoices, payment history, or historical booking snapshots;
- arbitrary SQL, raw HTML, JavaScript, CSP, RLS, migration, or deployment editors;
- bulk patient/therapist export by default;
- raw IP/device fingerprint surveillance presented as an exact person count;
- Meta Pixel, ad conversion events, or audience payloads containing health data or provider-patient relationships;
- browser use of the Supabase service-role key or any infrastructure management token;
- self-review of professional credentials or unilateral hidden suspension without recorded reason and appeal state.

## Residual site-work register

This register prevents provider-neutral foundations from being mistaken for finished public services.

| Timing | Unfinished item | Type | Completion condition |
|---|---|---|---|
| Launch-critical | Exact staging migration confirmation | Manual access + engineering verification | Correct staging project ledger exactly reconciles to the intended code set |
| Launch-critical | Production migration/backup plan | Manual approval + engineering | Verified backup/export, corrected ordered manifest, dry-run evidence, rollback decision |
| Launch-critical | Real patient OTP | External/manual + engineering | DLT/MSG91 approved, hook secrets installed safely, two-phone delivery/verification test passes |
| Launch-critical | Professional email delivery | External/manual + engineering | Verified SMTP domain/configuration and confirmation/recovery tests pass |
| Launch-critical | Auth abuse protection | External/manual + engineering | Matching Turnstile client/server keys and all Auth-flow tests pass |
| Launch-critical | Operator/privacy identity | Manual/legal | Real operator name and monitored grievance contact are published |
| Launch-critical | Legal/professional review | Manual/legal | Approved Terms, Privacy, Professional Standards, retention, complaints, and enforcement versions |
| Launch-critical | Final real-user staging journey | Manual + engineering verification | Professional, reviewer, second-phone patient, booking, linkage, billing, logout/re-login all pass |
| Launch-critical | Release-security gate | Engineering verification | Typecheck/build/audit/headers/cache/observatory/passive security checks pass on frozen candidate |
| Before growth | General Admin control plane | Engineering | Stages 1–4 in this report pass their acceptance evidence |
| Before growth | Traffic and conversion measurement | Engineering + configuration | Privacy-safe aggregate traffic and authoritative booking funnel are visible and disclosed |
| Before growth | Backup/restore and incident drills | Manual + engineering | Restore and incident playbooks are exercised, timed, and recorded |
| Before growth | Therapist analytics presentation acceptance | Engineering/QA | Browser, mobile, keyboard, and screen-reader checks pass |
| Before growth | Data retention/deletion automation | Legal decision + engineering | Approved schedule, holds, deletion jobs, reports, and audit evidence work |
| Before growth | Communications dispatch | Provider/manual + engineering | Preferences and event foundations connect to approved SMS/email/WhatsApp providers without leaking health data |
| Before growth | Payment-provider settlement | Business/legal/provider + engineering | Provider/KYC/webhooks/reconciliation exist; UI no longer describes billed totals as settlement |
| Before growth | Telephysiotherapy provider | Business/legal/provider + engineering | Approved provider, consent, session security, failure handling, and jurisdiction checks pass |
| Approval required | Invoice PDF typography | Visual engineering | User approves proposed appearance; regression and print/PDF comparisons pass |
| Approval required | Any Admin/site visual redesign | Visual engineering | Defect and before/after proposal are shown before implementation |
| Later/optional | Profile images and richer premium profiles | Product + storage/privacy | Moderation, consent, storage limits, accessibility, and deletion are designed first |
| Later/optional | Payment links/UPI intent/QR | Provider/business + engineering | Professional-owned destination and fraud/reconciliation model are approved |
| Later/optional | GST/GSTR and advanced exports | Accounting/legal + engineering | A qualified accounting requirement defines exact fields and calculations |
| Later/optional | Paid monitoring/log retention | Vendor + engineering | Current-plan evidence shows a real retention, alerting, or capacity gap |

Brand renaming is not part of this backlog until the owner approves a name after proper professional/trademark clearance. No candidate name should be deployed based only on an informal web search.

## Scale and premium-platform lessons adopted

- Stripe separates owner, Admin, IAM, analyst, developer, identity, and other roles; this supports capability separation instead of a shared all-powerful account.
- Shopify documents role-based staff access rather than treating every staff user as the owner.
- Cloudflare Web Analytics is available across plans and is positioned as privacy-preserving web analytics; it can provide aggregate site traffic without adding advertising trackers.
- Supabase Auth audit logs capture sign-in, sign-out, password, token, confirmation, and MFA events, while Supabase service logs cover Auth, API Gateway, Postgres, Storage, Edge Functions, and other services. These supplement—but do not replace—application booking/Admin audit events.
- OWASP recommends least privilege, deny-by-default, permission validation on every request, authorization tests, and logging all Admin/high-risk actions. It also warns against logging too much sensitive data.

## Source references

Technical sources below were rechecked on 19 September 2026. Regulatory references were carried forward from the repository's 14 September 2026 regulatory review and must be checked again by the responsible reviewer immediately before public launch.

- Cloudflare Web Analytics: https://developers.cloudflare.com/web-analytics/
- Cloudflare analytics data and metrics: https://developers.cloudflare.com/web-analytics/data-metrics/
- Stripe team roles: https://docs.stripe.com/get-started/account/teams/roles
- Shopify staff roles: https://help.shopify.com/en/manual/your-account/users/roles
- Supabase Auth audit logs: https://supabase.com/docs/guides/auth/audit-logs
- Supabase observability logs: https://supabase.com/docs/guides/observability/logs
- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- Digital Personal Data Protection Rules, 2025 (MeitY): https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa
- NCAHP Act, 2021 (India Code): https://www.indiacode.nic.in/handle/123456789/16824
- Gujarat State Allied and Healthcare Council: https://gsahc.in/

## Change-control rule

Before changing code, reproduce and record the problem. Before any change that alters the visible site, Admin interface, legal wording, or PDF appearance, present the defect and proposed visual/legal change for approval. Database/security fixes may be proposed separately but still require staging verification before promotion. Production remains untouched until the authorized staging gates pass.
