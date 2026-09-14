# PhysioBill Regulatory + Meta Launch Checklist — India / Gujarat

Status: pre-production control document. This is an engineering/compliance checklist, not a legal opinion or certification.

## Regulatory sources reviewed

Authoritative sources:

- National Commission for Allied and Healthcare Professions Act, 2021 — India Code:
  https://www.indiacode.nic.in/handle/123456789/16824
- Gujarat State Allied and Healthcare Council:
  https://gsahc.in/
- Gujarat State Allied and Healthcare Council Act & Rules:
  https://gsahc.in/act-and-rules
- Guidelines for Prevention of Misleading Advertisements and Endorsements for Misleading Advertisements, 2022 — Department of Consumer Affairs:
  https://consumeraffairs.nic.in/latestnews/guidelines-prevention-misleading-advertisements-and-endorsements-misleading
- Digital Personal Data Protection Rules, 2025 and enforcement timeline — MeitY:
  https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa


### DPDP phased commencement status checked 14 September 2026

The final Digital Personal Data Protection Rules, 2025 were notified on 13 November 2025. The commencement notification is phased rather than all-at-once:

- Rules 1, 2 and 17–21 and the corresponding already-commenced Act provisions took effect on notification.
- Rule 4, and the Act provisions expressly scheduled at one year, are due one year after notification (13 November 2026).
- Rules 3, 5–16, 22 and 23, together with most core processing/consent/rights/children/security obligations scheduled at eighteen months, are due 13 May 2027.

PhysioBill is intentionally building the privacy notice, consent records, contact/grievance path, access/correction/deletion request language, security controls and child/dependent safeguards ahead of the later commencement dates. This document must not claim that every DPDP obligation is already in force on 13 September 2026.

The NCAHP schedule identifies the physiotherapy profession as Physiotherapist (ISCO 2264). Sections 55 to 57 of the Act address practice, false claims of registration, and misuse of titles. Gujarat currently regulates allied and healthcare professions through GSAHC.

GSAHC Rules, 2024 rule 9 provides for an online/live Gujarat State Allied and Healthcare Professionals Register and a registration application/certificate workflow. A PhysioBill “verified” badge therefore must never be represented as a substitute for entry in the applicable government register. Before a real professional profile is published, the submitted registration/credential facts must be checked against the current applicable authority or documentary evidence and any current transition instructions.

As checked on 14 September 2026, GSAHC's public site lists Physiotherapist under Physiotherapy Professional (ISCO 2264) and publishes the Gujarat State Allied and Healthcare Council Rules, 2024. Its current notices include the 5 February 2026 NCAHP public notice for physiotherapy and occupational-therapy professionals, the 18 July 2026 notice concerning use of the term “Allied and Healthcare”, and the 10 September 2026 Autonomous Board notification.

The 5 February 2026 NCAHP public notice confirms that Physiotherapist (ISCO 2264) may practise independently or as part of a multidisciplinary team within physiotherapy scope. It also expressly directs that physiotherapy professionals cannot prescribe medicines or provide allopathic treatment, drugs or medication outside that scope, and refers violations to section 59 of the NCAHP Act. PhysioBill therefore states this restriction explicitly in its Professional Standards instead of relying on a vague “scope of practice” reference.

## Conservative product rules

PhysioBill must not:

- create or publish a physiotherapist listing from unverified professional credentials;
- represent PhysioBill verification as government registration;
- advertise or use PhysioBill to prescribe medicines, provide allopathic treatment, drugs or medication outside lawful physiotherapy scope;
- publish a private home address merely for home-visit discovery;
- promise a cure, guaranteed relief, permanent result, miracle result or fixed recovery time;
- publish unsupported comparative claims such as best / No. 1;
- imply that booking itself creates clinical-record authority;
- expose a patient's clinical or financial information on a public profile;
- present provider-neutral payment / SMS / WhatsApp / telehealth foundations as an active external provider;
- send patient diagnoses, treatment details or clinical records to advertising platforms for targeting or conversion tracking.

## Public profile requirements

Before a profile may be discoverable:

1. professional account persona must be physiotherapist;
2. professional credential fields must be complete;
3. professional verification must be approved;
4. public display name, enabled service mode(s), and genuine broad service area(s) must be present;
5. professional must explicitly opt in to public discovery;
6. public copy must pass the application's obvious misleading-claim check;
7. final reviewer approval must reject false credentials, unsupported specialist/superlative claims and patient-identifying content.

## Patient / privacy safeguards

- Patient phone authentication and professional authentication remain separate.
- Patient OTP registration requires a Terms + Privacy acknowledgement.
- Professional creation requires Terms + Privacy + Professional Standards acknowledgement.
- New professional/patient account creation records the notice version in an RPC-only server-side acknowledgement table; the Auth provisioning trigger rejects new accounts that bypass the required acknowledgement.
- Public therapist discovery contains only bounded patient-safe professional data.
- Clinical access requires explicit linkage after the appropriate scheduling/onboarding workflow.
- Current release has no Meta Pixel or Meta Conversions API integration.
- Staging adds a noindex/nofollow robots directive at runtime so final real-user verification profiles are not intended for search indexing.
- A production operator identity and monitored privacy/grievance contact must be published before public production activation. The canonical production UI now fails closed if these values are absent.
- Real patient clinical data should not be used in staging final verification; use the professional's own account plus a consenting test identity and synthetic/minimal patient data.

## Meta advertising guardrails

Meta's advertising standards were rechecked on 14 September 2026 against Meta's current Advertising Standards pages for Personal Attributes, Unacceptable Business Practices, Health and Wellness, and its Business Tools prohibited-information guidance. They must still be checked again immediately before campaign launch because platform policies can change.

Current Meta controls relevant to PhysioBill:

- an ad must not assert or imply a viewer's health condition, disability, pain or other personal attribute;
- deceptive or exaggerated success claims are prohibited;
- health/wellness creative must not generate negative self-perception or use prohibited outcome claims;
- integrations must not send health information or provider/patient relationship information to Meta;
- the ad and destination must describe the same real service, and the public landing page must work without authentication or deceptive navigation.

Safe positioning:

- describe the service, e.g. "Find verified physiotherapy professionals for home visits, clinic visits and telephysiotherapy";
- use factual service-area and availability wording;
- use neutral rehabilitation / professional imagery;
- send ad traffic only to a functional public landing/discovery page.

Do not use:

- "Are you suffering from back pain?" / "Your knee problem..." or other wording that implies Meta/PhysioBill knows the viewer has a health condition;
- guaranteed clinical outcomes;
- before/after imagery designed to create negative self-perception;
- sensational injury/pain imagery;
- fake reviews or testimonials;
- sensitive patient data in Meta audiences, URL parameters, pixel events or conversion payloads.

Official Meta sources checked:

- https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/
- https://transparency.meta.com/policies/ad-standards/fraud-scams/unacceptable-business-practices/
- https://transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness/
- https://www.facebook.com/business/help/361948878201809

## Commercial comparison review

The current public comparison located was MyPhysioDesk (`myphysiodesk.com`). It is a commercial product, not a government regulator or legal authority. Its public appointment, patient-record, SOAP-note, exercise and billing features are useful only as a market-practice comparison. No legal or compliance claim was adopted from it, and no distinct canonical source for a product named exactly “PhysioDesk” was treated as evidence.

Useful patterns reviewed from PhysioDesk's India-facing public guidance include:

- use real business/service areas rather than locations that cannot actually be served;
- keep clinic/business information consistent and truthful;
- do not expose patient records, Aadhaar, PAN, bank details, OTPs or passwords in public/verification media;
- do not use patient photos without consent;
- collect genuine patient reviews rather than fabricated feedback;
- maintain treatment documentation and consent.

PhysioBill does not copy PhysioDesk's self-declared HIPAA/DISHA or other compliance badges. PhysioBill should not display a legal-compliance badge unless the underlying claim has been independently substantiated.

## Pre-production blockers

Before promotion to production and Meta campaign launch:

- final real-user staging journey must pass;
- real SMS OTP delivery must be configured and tested on the second patient phone;
- production professional email confirmation / recovery delivery must be reliable;
- production operator name and privacy/grievance contact must be published;
- the professional profile used in discovery must contain genuine/current credential and registration facts;
- production backup/export must exist before the 47 missing database migrations are applied;
- release security gate must be green on the frozen candidate (typecheck, production build, dependency audit, live headers/cache policy, MDN Observatory and OWASP ZAP passive baseline);
- after production deploy, HTTP Observatory, live headers and ZAP passive baseline must pass again;
- Meta ad creative and landing page must receive a final policy copy review immediately before campaign submission.
