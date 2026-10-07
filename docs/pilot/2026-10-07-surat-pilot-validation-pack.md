# Surat pilot validation pack — 2026-10-07

## Pilot objective

Do not optimise for feature count. Prove whether PhysioBill (or a later-cleared REHIVO brand) can create at least one repeated behaviour:
1. bring a physiotherapist suitable patient demand;
2. save meaningful practice-administration time; or
3. remove a recurring practice-management pain strongly enough that therapists voluntarily return.

Pilot scope: **Surat home physiotherapy**, initially free, approximately 10 independent physiotherapists.

## Current-product pilot audit

### KEEP
- persona/security separation between patient, professional and Admin;
- public therapist discovery foundation;
- public professional profiles with qualification/registration fields;
- service areas and availability foundation;
- professional appointment-request inbox and accept/reject actions;
- explicit clinical-chart linkage rather than silently turning every booking into a chart;
- patient/visit/invoice/payment-ledger core workspace;
- production disclosure gate that refuses public canonical launch without real operator + grievance contact;
- release-security/Admin-control checks and existing RLS/security hardening.

### FIX BEFORE PILOT
1. **Public demand dead-end:** profile booking requires authenticated patient identity; the configured patient path depends on SMS OTP, while the UI itself handles the SMS-provider-not-enabled state. For a no-paid-provider pilot, create a minimal public enquiry path that does not require a patient account. Convert to authenticated scheduling/clinical linkage only later.
2. Replace generic public “Verified professional / Verified physiotherapist” badges with **Credentials Reviewed** and the defined verification explanation.
3. Refocus public copy from generic home/clinic/online discovery to **Surat home physiotherapy first**. Keep architecture reusable, but do not make the pilot look nationwide.
4. Hide/de-emphasise telephysiotherapy for this pilot unless it receives separate legal/product approval.
5. Add a privacy-light enquiry funnel measurement path: CTA → enquiry submitted → matched → therapist response → booking/visit outcome. Pageview analytics alone are not enough.
6. Confirm public operator name + monitored privacy/grievance channel before any production launch.
7. Complete one fresh real-device journey on the deployed staging build after any blocker fixes.

### HIDE / DISABLE FOR PILOT
Do not delete the implementation; remove it from the primary pilot story where feasible:
- telephysiotherapy entry points;
- professional analytics as a selling point;
- multilingual expansion beyond what is already stable;
- sophisticated Admin finance/case/governance areas not required to route the first enquiries;
- advanced communications/provider promises when no real provider is configured;
- payment-provider language beyond manual professional-owned payment destinations.

### DELETE ONLY IF CLEARLY SAFE
Nothing. Deletion creates risk without improving validation. Freeze nonessential surfaces; do not spend time cleaning architecture for aesthetic purity.

### LATER / EVIDENCE REQUIRED
- AI assistant;
- nationwide discovery;
- paid SMS/WhatsApp automation;
- payment gateway;
- complex dashboards;
- advanced analytics;
- new patient modules;
- additional language expansion;
- telemedicine/video integration;
- large CMS;
- paid plans/pricing experiments;
- referral commissions/per-patient fees;
- full rebrand/logo system.

## Recommended minimum public enquiry flow

Patient lands → selects/opens therapist or asks for matching → submits low-data enquiry → Admin/operator checks suitability → 1–3 suitable pilot therapists receive minimum necessary details → therapist accepts/declines → patient is contacted → if proceeding, create/verify patient identity and formal appointment → therapist decides clinical linkage → visit → invoice/payment tracking → follow-up.

### Enquiry fields
Required:
- requester/patient name;
- mobile number;
- Surat locality;
- home visit yes/no;
- broad category/reason;
- preferred time window;
- acknowledgement of privacy/lead-sharing notice.

Optional only when useful:
- age or age band;
- doctor/referral context;
- caregiver/accessibility logistics;
- free-text note with a visible warning not to upload/send detailed clinical records at enquiry stage.

### Matching
- operator/Admin sees first;
- filter by Surat locality/service area + broad category + home-visit availability;
- send to 1 suitable therapist first where confidence is high, or up to 3 when needed;
- record who received it and when;
- no response after the pilot response window becomes a measurable `no_response`, not an invisible failure;
- declined requests return to matching queue;
- patient gets an honest status if nobody is available.

## Therapist pilot value proposition

**Create a professional profile, receive suitable patient enquiries when available, and manage the practical side of your physiotherapy work in one place. The Surat pilot is currently free. No patient volume or earnings are guaranteed.**

## Recruitment messages

### Short WhatsApp/DM
Hi Dr. [Name] — I’m running a small **free Surat pilot** for independent physiotherapists. The idea is simple: a professional profile for patient discovery, suitable home-physio enquiries when available, and basic patient/visit/invoice management in one place. I’m limiting the first pilot to about 10 therapists and I’m not promising patient numbers. Before onboarding, I want to understand how you actually manage enquiries and patients today. Would you be open to a 15–20 minute walkthrough of your current process?

### Longer explanation
I’m testing PhysioBill as a Surat-first physiotherapy platform rather than just a billing app. On the patient side, the goal is to help people find an appropriate physiotherapist and send a genuine enquiry. On the professional side, the goal is to reduce the mess around enquiries, patient records, visits, billing and follow-up.

The pilot is ₹0. There is no paid plan to buy and no guarantee of leads. I’m deliberately keeping it small because the question is not whether I can add more software features—it is whether the existing product solves a real problem strongly enough that therapists use it without repeated reminders.

If you join, I’ll first ask you to show me your real current workflow. Then we can create/review your professional profile and, when suitable patient enquiries come in, see whether the platform actually helps.

## Therapist FAQ

**Is the pilot free?** Yes. The initial Surat pilot is ₹0.

**Will I definitely get patients?** No. Suitable enquiries will be routed when available; no patient volume, earnings or conversion is guaranteed.

**Do I have to stop using WhatsApp or my current records?** No. The pilot is measuring whether PhysioBill becomes useful enough to replace or reduce parts of your current workflow naturally.

**What will patients see?** Only approved public professional-profile information such as name, reviewed credentials, services, broad service areas and published availability. Private patient/clinical/financial records are not public-profile content.

**Does “Credentials Reviewed” mean government endorsement?** No. It means the platform reviewed the defined identity/professional documents for that profile. Any specific professional registration displayed should be checked separately and shown factually.

**Can I decline an enquiry?** Yes. Suitability, scope, availability and clinical decisions remain with the physiotherapist.

**Who is responsible for treatment?** The treating physiotherapist remains responsible for professional/clinical decisions, consent, documentation, referrals and care within lawful scope.

**Will the pilot become paid later?** Possibly, but no pricing decision should be made until repeat value is demonstrated. Pilot participation does not commit the therapist to a future paid plan.

## Onboarding questionnaire

### Professional identity/profile
- full professional name;
- preferred public display name;
- mobile/email for account/contact;
- primary physiotherapy qualification;
- institution/university;
- current professional registration authority/number/certificate if applicable;
- years of experience claim and evidence where available;
- languages actually used with patients;
- broad practice focus (do not force unsupported “specialist” titles);
- home-visit areas in Surat;
- normal working days/time windows;
- services the therapist genuinely provides;
- clinic name/address only if relevant and consented for public display;
- public bio/headline;
- profile photo optional; no fabricated patient imagery.

### Current workflow baseline
- average new enquiries per month;
- sources of enquiries;
- scheduling method;
- patient-record method;
- visit tracking method;
- billing/invoice method;
- payment/pending-payment tracking;
- follow-up method;
- cancellation/no-show handling;
- biggest repeated frustration;
- what is forgotten or duplicated;
- tools currently used and why.

## Pilot terms acknowledgement — onboarding checkbox summary

Therapist confirms that:
- submitted identity/credential/profile information is truthful and current;
- only lawful professional titles, registration claims and services are used;
- public discovery does not guarantee enquiries or income;
- the therapist independently decides whether to accept a request and remains responsible for care;
- patient information is used only for lawful care/administration and not copied into public marketing without appropriate authority;
- no fabricated reviews or misleading outcome claims are submitted;
- the platform may pause/remove public visibility if credential information cannot be substantiated or policy is materially breached;
- pilot feedback/usage may be analysed in aggregated/non-identifying form to evaluate the product;
- the therapist can leave the pilot subject to legitimate record/security retention requirements.

## Behavioural interview guide

Start with: **“Show me exactly what you currently do after a new patient contacts you.”**

Do not demo the product first.

Follow the actual last patient journey:
1. Where did that person find you?
2. What did they send/say first?
3. What did you ask next?
4. Where did you record their name/number/problem?
5. How did you choose the visit time?
6. Where was the appointment stored?
7. What did you do after the first visit?
8. Where did you write clinical notes?
9. How did you count visits/packages?
10. How did you decide/record the fee?
11. Did you issue an invoice/receipt? Show the real process if possible.
12. How did you know whether payment was pending?
13. How did you remember follow-up?
14. What happens if they cancel or do not answer?
15. What happens after discharge?
16. Which part do you hate, postpone, forget or duplicate?
17. What workaround have you already created?
18. When did this last cause a real problem?
19. What would happen if you did nothing about it?
20. How do you currently get new patients, and which source actually produces good-fit cases?

Then ask:
- “Show me the last time you used WhatsApp/Excel/diary/software for this.”
- “What makes you go back to that tool?”
- “What would make you stop using a new tool after the first week?”
- “If a platform brought you a suitable patient but you still returned to your old system, what would be the reason?”

Avoid:
- “Would you use this?”
- “Do you like this feature?”
- “Would AI help?”
- “Would you pay ₹X?” before observed recurring value.

## Post-use feedback form

After a real enquiry/visit:
- Did the enquiry match your service area? yes/no
- Was the category appropriate? yes/no
- How quickly did you respond?
- Accepted / declined / no response
- If declined, why?
- Did the patient book?
- Did an actual visit occur?
- What did you use PhysioBill for after the enquiry?
- What did you still do on WhatsApp/diary/Excel?
- What took longer than your old method?
- What was easier?
- Did you add any of your own existing patients? how many?
- Have you returned to PhysioBill without being reminded? why/why not?
- What is the one thing that would make you stop using it?

## Pilot tracker definition

### Therapist table
`therapist_id, onboarded_date, category, service_areas, credentials_reviewed, profile_live, first_login, last_active, enquiries_received, enquiries_responded, enquiries_accepted, completed_visits_from_platform, own_patients_added, visits_recorded, invoices_created, active_day_7, active_day_30, would_pay_signal, interview_notes, primary_pain, churn_reason`

### Enquiry table
`enquiry_id, submitted_at, locality, broad_category, preferred_window, source, matched_therapist_ids, first_routed_at, first_response_at, status, decline_reason, booked_at, visit_confirmed_at, patient_followup_status`

Do not store detailed diagnosis in the metrics table.

### Weekly scorecard
- therapists onboarded / target 10;
- therapists with live reviewed profiles;
- genuine enquiries / target first 20, then 20–50;
- % enquiries successfully matched;
- median time to first therapist response;
- therapist response rate;
- enquiry → accepted rate;
- accepted → booked rate;
- booked → confirmed visit rate;
- therapists with ≥1 relevant enquiry;
- therapists active at 7 days and 30 days;
- therapists who added ≥1 own existing patient;
- therapists recording visits/invoices after platform-sourced case;
- explicit `would genuinely pay` signals only after real use.

Useful learning target—not a pass/fail fiction:
10 onboarded → 8 receive relevant enquiries → 6 accept/treat → 5 keep using practice tools → 3 add existing patients → 2–3 express genuine willingness to pay.

## Surat patient-acquisition plan

### Stage 1 — before public SEO expansion
- onboard enough therapist supply first (at least 5–7 credible profiles covering major Surat areas/categories);
- make enquiry path work without paid SMS;
- publish real operator/privacy/grievance information;
- complete mobile journey QA;
- then invite patient demand.

### Stage 2 — highest-value local pages only
Start with 5 useful pages, not hundreds:
1. Home Physiotherapy in Surat
2. Home Physiotherapist in Vesu
3. Home Physiotherapist in Adajan
4. Stroke Rehabilitation / Neuro Physiotherapy at Home in Surat
5. Post-operative / Knee Replacement Physiotherapy at Home in Surat

Add Althan, Citylight, Bhatar and other location pages only when there is actual therapist coverage and distinct useful local content.

Each page should contain:
- who this type of service may be relevant for (educational, not diagnosis);
- what a home visit generally involves;
- what information to have ready;
- when urgent/medical assessment may be more appropriate;
- how therapist credentials are reviewed;
- currently served areas or a transparent availability check;
- one primary CTA: **Find a Physiotherapist** / **Request Home Physiotherapy**;
- no copied/thin locality swaps.

### Stage 3 — no-paid-ad demand channels
1. Professional referral network: orthopaedic/neuro physicians, surgeons, discharge coordinators, local clinics, senior-care networks—ask for appropriate referral awareness, not kickbacks.
2. Former-patient/family referrals by participating therapists with consent and non-spam messaging.
3. Therapist-owned local social content answering real questions and linking to the relevant patient page.
4. Google indexing/Search Console after the canonical public site is legally/operationally ready.
5. Google Business opportunities only for legitimate eligible real-world business/practice entities; do not create misleading virtual-location listings.

### Content questions worth publishing
- When is home physiotherapy appropriate after knee replacement?
- When can stroke rehabilitation continue at home?
- What should families look for when choosing a home physiotherapist?
- When should someone contact a physiotherapist after surgery?

Primary acquisition KPI: **genuine enquiries**, followed by matched/booked/completed visits—not pageviews.

## Decision gates

### Name
If professional clearance finds material REHIVO conflict: kill the name.

### Therapist pain
If interviews show no repeated painful job the product improves: freeze development; do not invent features to rescue the idea.

### Patient acquisition
If qualified demand does not appear: test positioning/channel/coverage before adding software.

### Behaviour
If therapists accept patients but abandon the workspace: interview the abandonment. Do not assume another dashboard fixes it.

### Monetisation
Only test pricing after repeated voluntary behaviour. No referral commissions/per-patient fee without separate legal/ethical review.
