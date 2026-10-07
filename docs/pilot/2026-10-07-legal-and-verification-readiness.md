# Pilot legal + credential-verification readiness — 2026-10-07

This is a product/legal drafting baseline, not legal advice. Counsel-review items are isolated at the end rather than pretending every clause needs a lawyer.

## Current Indian privacy-law timing

As of 2026-10-07, the Digital Personal Data Protection Act, 2023 and Digital Personal Data Protection Rules, 2025 are in phased commencement.

- The 13 November 2025 notification brought specified institutional/administrative provisions into force immediately.
- The one-year tranche begins 13 November 2026 (including Act section 6(9) and DPDP Rule 4).
- Most core processing/notice/consent/security/data-principal provisions listed in the notification, plus DPDP Rules 3 and 5–16, begin 13 May 2027.
- DPDP Act section 44(2), which omits IT Act section 43A, is in that 18-month tranche. Therefore the current pilot should not behave as though the earlier SPDI framework has already disappeared.

Product decision: build the pilot to the higher practical standard now—clear notice, data minimisation, purpose limitation, security, access control, retention, correction/deletion workflow and grievance contact—without falsely stating that every future DPDP duty is already legally in force.

## Existing code that is worth keeping

The current Privacy Notice / Terms / Professional Standards already establish useful boundaries:
- discovery/scheduling/workspace rather than emergency or clinical-outcome guarantee;
- therapist responsibility for clinical decisions and lawful practice;
- booking does not automatically create clinical-record access;
- public profile content is separated from private patient/clinical/financial records;
- Cloudflare and Supabase are disclosed as service providers;
- advertising platforms should not receive diagnoses/clinical records merely for conversion tracking;
- a production operator name + monitored privacy/grievance contact are deliberately required before canonical production opens.

These should be revised rather than discarded.

## Launch document inventory

### Must exist before public pilot
1. Privacy Notice
2. General Terms of Use
3. Patient enquiry/booking notice + consent acknowledgement
4. Physiotherapist Pilot Terms
5. Clinical Responsibility / Platform Role disclaimer
6. Credential Verification Policy
7. Review Policy
8. Professional Profile / Advertising Policy
9. Data Retention & Deletion Policy
10. Account deletion/request process
11. Grievance/contact mechanism
12. Acceptable Use rules (can be a section of Terms)

### Conditional
- Cookie/tracking disclosure: only for cookies/analytics actually used.
- Telephysiotherapy terms: only if telephysiotherapy remains publicly enabled. Recommendation for the Surat home-physio pilot: hide/defer telephysio rather than expanding the legal surface.

## Core platform role wording

**Platform role**
PhysioBill is a technology platform for discovering physiotherapy professionals, sending care enquiries or appointment requests, and providing practice-management tools. PhysioBill is not an emergency service and does not itself diagnose a patient, prescribe treatment, guarantee that a particular physiotherapist is suitable for a person, or guarantee any clinical outcome.

**Clinical responsibility**
Each physiotherapist is independently responsible for determining whether they are legally and professionally permitted to provide the requested service, conducting their own assessment and red-flag screening, obtaining informed consent, deciding whether treatment is appropriate, maintaining required records, making referrals where appropriate, and providing care within their lawful scope of practice.

**Emergency wording**
Do not use PhysioBill for emergencies or symptoms that may need urgent medical assessment. Seek appropriate emergency or medical care instead.

## Minimum patient enquiry notice

Before submission, show a short plain-language notice:

> We use the information in this enquiry to understand the requested physiotherapy service, identify an appropriate participating physiotherapist, contact you about the request, and operate the pilot safely. An enquiry is not a diagnosis, treatment plan, emergency service, or confirmed appointment. Do not include detailed medical records unless specifically requested later for care by the treating professional.

For the initial public enquiry collect only:
- patient/requester name;
- mobile/contact method;
- age band or age only if operationally needed;
- Surat area/locality;
- home-visit requirement;
- broad reason/category (e.g. neuro, post-operative, orthopaedic/MSK, geriatric, sports/other);
- preferred timing;
- optional doctor/referral note only where relevant;
- optional accessibility/caregiver logistics.

Do **not** request full diagnosis histories, imaging, prescriptions or clinical documents in the lead form.

## Enquiry routing standard

Pilot default:
1. Enquiry is visible to the platform operator/admin first.
2. Match against service area, broad category, care mode and availability.
3. Share the minimum useful enquiry details with no more than 1–3 suitable participating therapists.
4. Patient-facing notice must explain that selected participating physiotherapists may receive these details for the purpose of responding.
5. Target first human response: within 2 working hours during published pilot hours; never imply guaranteed response.
6. If no therapist accepts, tell the patient promptly rather than leaving the request pending indefinitely.
7. Only after a therapist accepts should the workflow request/create the authenticated patient/clinical linkage needed for records, visits and billing.

## Credential badge decision

### Public badge: **Credentials Reviewed**
Do not use “NCAHP Registered Physiotherapist”, “Government Verified”, “Licensed by PhysioBill”, or a government-style seal as the generic platform badge.

Public tooltip/expanded definition:

> **Credentials Reviewed** means PhysioBill reviewed identity and professional documents submitted for this profile, including the physiotherapy qualification and any professional registration details displayed on the profile. It does not mean government endorsement, a guarantee of current legal eligibility to practise, clinical quality, suitability for a particular patient, or treatment outcome. Patients should review the displayed professional details before requesting care.

### Verification checklist
A public profile may receive `Credentials Reviewed` only when all applicable checks are completed and recorded with reviewer + date:
1. identity matches the person controlling the account;
2. physiotherapy degree/qualification document reviewed;
3. institution/university details are plausible and consistent with the document;
4. contact ownership is verified through the configured account process;
5. any registration authority/number shown publicly is supported by a certificate and, when a reliable official register/search is available, checked against it;
6. experience claims used in prominent public copy are supported where reasonably verifiable or clearly framed as self-declared;
7. profile contains no unsupported specialist/superlative/guaranteed-outcome claims.

If a specific official registration is verified, display it factually as a field, for example:
`Professional registration: [exact council/authority] · [number] · checked [date]`
Do not transform that into a broader NCAHP/government endorsement badge.

## NCAHP / Gujarat position relevant to wording

Gujarat has a Gujarat State Allied and Healthcare Council and lists Physiotherapist as a profession under the NCAHP framework. The NCAHP Registration of Allied and Healthcare Professionals Regulations, 2026 were notified in September 2026 and create State/Central registration processes and UID-based registration. Implementation is recent and the platform must verify the actual current certificate/register entry for each individual rather than assuming all physiotherapists possess a particular NCAHP-status label.

## Reviews

Eligibility: a review invitation should follow a care interaction that the platform can reasonably link to the reviewer/patient request or that the operator can otherwise substantiate.

Rules:
- no fabricated/staff/friend reviews presented as patient experience;
- no incentives conditional on positive sentiment;
- no importing third-party reviews without lawful permission;
- moderation may remove threats, hate, spam, private clinical/identity details, unrelated content or demonstrably fraudulent content;
- disagreement/negative sentiment alone is not grounds for removal;
- therapist may submit one professional response subject to privacy and conduct rules;
- the badge/review score does not guarantee quality or outcomes.

## Retention/deletion baseline for the pilot

Create and maintain a data inventory before public launch. Each category needs an owner, purpose, access role and retention trigger.

Suggested pilot defaults to take to counsel (not statutory universal periods):
- unconverted public enquiries: review for deletion/anonymisation after 90 days unless there is a documented operational/legal reason to retain longer;
- account/profile records: while account is active plus a short closure/admin period;
- verification evidence: while public verification is relied on plus a defensible audit period;
- security/audit logs: fixed short security period appropriate to incident investigation;
- clinical/financial records: do **not** apply an arbitrary platform deletion timer; retention must follow the treating professional’s applicable professional/legal/financial obligations.

Account deletion must distinguish:
- public profile removal;
- authentication account closure;
- deletion/anonymisation of platform-owned lead/account data where allowed;
- therapist-held clinical/financial records that cannot lawfully or safely be erased merely because the app account closes.

## LEGAL COUNSEL CHECK REQUIRED

Ask Indian counsel only the following high-value questions before a public pilot:
1. Confirm the privacy-law transition position on the planned launch date, including current application of IT Act section 43A/SPDI Rules and the phased DPDP Act/Rules dates.
2. Review the exact patient enquiry consent/notice, particularly sharing lead details with selected independent physiotherapists and the controller/data-fiduciary roles between platform and therapist.
3. Confirm whether, given actual product operation, the platform is an intermediary/e-commerce entity or otherwise triggers specific IT Rules / Consumer Protection e-commerce grievance/disclosure duties.
4. Confirm the appropriate clinical-record retention responsibility and any Gujarat/NCAHP-specific record obligations applicable to participating physiotherapists.
5. Confirm the wording/criteria of `Credentials Reviewed` and the exact way current Gujarat/NCAHP registration status should be displayed.
6. Review the independent-contractor/platform-role provisions so the product does not accidentally represent that the platform is the treating healthcare provider.
7. Review review-moderation and professional-advertising standards, including testimonials and patient consent.
8. If telephysio is later re-enabled publicly, separately review telephysiotherapy scope, consent, jurisdiction, recordkeeping and advertising wording before launch.
