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

The NCAHP schedule identifies the physiotherapy profession as Physiotherapist (ISCO 2264). Gujarat currently regulates allied and healthcare professions through GSAHC. Public professional claims must therefore remain tied to genuine, supportable professional identity and current registration/credential facts.

## Conservative product rules

PhysioBill must not:

- create or publish a physiotherapist listing from unverified professional credentials;
- represent PhysioBill verification as government registration;
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
- Public therapist discovery contains only bounded patient-safe professional data.
- Clinical access requires explicit linkage after the appropriate scheduling/onboarding workflow.
- Current release has no Meta Pixel or Meta Conversions API integration.
- Staging adds a noindex/nofollow robots directive at runtime so final real-user verification profiles are not intended for search indexing.
- A production operator/grievance contact must be published before public production activation.
- Real patient clinical data should not be used in staging final verification; use the professional's own account plus a consenting test identity and synthetic/minimal patient data.

## Meta advertising guardrails

Meta's advertising standards must be checked again immediately before campaign launch because platform policies can change.

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

## PhysioDesk comparison review

PhysioDesk is a commercial product, not a government regulator. Its public guidance is useful only as a market-practice comparison.

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
- production backup/export must exist before the 46 missing database migrations are applied;
- release security gate must be green on the frozen candidate;
- after production deploy, HTTP Observatory, live headers and ZAP passive baseline must pass again;
- Meta ad creative and landing page must receive a final policy copy review immediately before campaign submission.
