# PhysioBill Part 2 — External / Operational Readiness

Date checked: 14 September 2026  
Baseline candidate: `d2c3ddba06399e6c3b33fecefce0b1e1b6826a9e`  
Scope: staging only; no production promotion or production Supabase mutation.

## Candidate verification

The Part 2 delta was applied directly after the frozen Part 1 candidate. One additional staging hardening migration was later added; no architecture change was introduced. With the canonical staging Supabase URL and public publishable key, TypeScript typecheck, the Vite production build, CSP generation, dependency audit (`0` vulnerabilities) and `git diff --check` pass. The only build diagnostic is the already-known non-blocking large-chunk performance warning.

The release handoff must use the exact GitHub commit at the head of `futureweb-production-backend`; no commit on `main` or `futureweb-dh-repair` is authorized or changed by this work.

## Current disposition

**PART 2 BLOCKED — real provider/account configuration and operator identity are still required.**

The application boundaries are ready for those values. They must not be marked operational until the external account configuration and one real delivery test pass.

## Patient SMS OTP

- Staging Supabase project `nbsvrzypypmmuvlgdpln` is `ACTIVE_HEALTHY`.
- The public Auth settings endpoint reports Phone Auth enabled and phone auto-confirm disabled.
- The `send-sms` Edge Function is active at version 2 with Supabase JWT verification disabled as required for an HTTP Auth Hook.
- A deliberately unsigned empty POST receives HTTP 401 rather than the missing-hook-secret HTTP 500 path. This proves that the deployed function has a syntactically valid Send SMS hook secret and rejects unsigned callers.
- The deployed function matches the repository's Standard Webhooks signature-verification and MSG91 Flow adapter.
- No real OTP was requested, so no SMS charge was incurred.
- The private Auth Hook selection and the presence/validity of the MSG91 auth key, Flow ID, OTP variable and optional sender ID still require authenticated account inspection and then a real phone test.
- India launch requires the real operator's TRAI/DLT Principal Entity registration, approved header and OTP template, and correct PE/header/template mapping in MSG91.

Status: **BLOCKED — external MSG91/DLT credentials, funded delivery and final hook verification are absent or not yet proven.**

## Professional email confirmation and recovery

- Public Auth settings report Email Auth enabled and email auto-confirm disabled.
- Application signup and password recovery use the professional email flow only.
- Supabase's default SMTP is not production delivery: it is restricted to project-team addresses, currently documented at two messages per hour, and has no SLA.
- Production requires a custom SMTP provider, verified sending domain, From address, host, port, username and password; SPF, DKIM and DMARC should be configured, and provider link tracking should be disabled for Auth links.
- The current private SMTP configuration has not been authenticated and inspected.

Status: **BLOCKED — production SMTP credentials/domain verification and a confirmation/recovery delivery test are required.**

## CAPTCHA / Cloudflare Turnstile

- Supabase officially supports Cloudflare Turnstile for signup, sign-in and password-reset abuse protection.
- CAPTCHA is recommended before a public/advertised launch because SMS and email endpoints create direct abuse and cost risk.
- Staging currently renders no Turnstile iframe. Its live CSP contains `script-src 'self'` and `frame-src 'none'`, so frontend and CSP are consistently in the disabled state.
- The frontend already passes `captchaToken` consistently for patient OTP requests, professional signup/sign-in/recovery and Admin sign-in.
- `VITE_AUTH_CAPTCHA_ENABLED=false` is now explicit in `.env.example`. CAPTCHA must remain false until a Turnstile widget exists and the same secret is saved in Supabase Auth.
- Activation requires the Cloudflare site key in the frontend, the matching secret in Supabase Auth, `VITE_AUTH_CAPTCHA_ENABLED=true`, a fresh staging build/CSP, and testing of every affected Auth form.

Status: **READY IN CODE, BLOCKED ON EXTERNAL TURNSTILE KEYS AND SERVER CONFIGURATION.**

## Persona separation

- Patient identity uses `signInWithOtp({ phone, channel: 'sms' })`, records `account_type: patient`, and verifies with `verifyOtp(..., type: 'sms')`.
- Professional signup/sign-in/recovery uses email/password and `resetPasswordForEmail`, with `account_type: physio` at creation.
- After Auth, persisted `app_users.role` and patient identity RPC checks enforce the persona boundary; metadata is not trusted as authorization.

Status: **PASS.**

## Operator and privacy contact

- Production routes fail closed unless both `VITE_PUBLIC_OPERATOR_NAME` and `VITE_PUBLIC_CONTACT_EMAIL` are configured.
- Privacy and Terms pages publish the configured values.
- Staging intentionally has neither real value and remains usable because it is a non-production Pages host.

Status: **BLOCKED — exact legal operator name and monitored privacy/grievance email are required.**

## Regulatory review

Current official sources rechecked on 14 September 2026:

- NCAHP Act / India Code and NCAHP/GSAHC profession material: Physiotherapist is ISCO 2264; platform verification is not government registration.
- NCAHP public notice dated 5 February 2026: physiotherapists may practise independently within physiotherapy scope, but cannot prescribe medicines or provide allopathic treatment, drugs or medication outside that scope. The public Professional Standards now state this explicitly.
- GSAHC: current site publishes the 2024 Rules, 5 February and 18 July 2026 public notices, and a 10 September 2026 Autonomous Board notification.
- Department of Consumer Affairs: unsupported, exaggerated and misleading claims remain prohibited; public profiles and ads must therefore avoid cure guarantees, superlatives and fixed recovery promises.
- Final DPDP Rules, 2025: Rules 1, 2 and 17–21 commenced on 13 November 2025; Rule 4 is scheduled for 13 November 2026; Rules 3, 5–16, 22 and 23 are scheduled for 13 May 2027. PhysioBill continues to prepare ahead of the later phases without falsely claiming all provisions are already in force.
- The exact-name PhysioDesk product located in the current public review is `physiodesk.com.br`, a Brazilian commercial physiotherapy platform. Its public Terms and Privacy Policy are framed around Brazil's LGPD. It is treated only as a product-practice comparison and not as an Indian legal authority; PhysioBill adopts no Brazilian or unsupported compliance badge from it.

Status: **PASS, subject to final professional credential review and normal legal counsel where required.**

## Meta Ads review

Meta's current Personal Attributes, Unacceptable Business Practices, Health and Wellness, and prohibited-information guidance were rechecked on 14 September 2026.

The first campaign must:

- describe the service without asserting that the viewer has pain, disease or disability;
- avoid guaranteed, miraculous, comparative or fixed-time clinical outcomes;
- use neutral non-identifying creative with no patient record, treatment document or unconsented patient image;
- land on the working public landing/discovery page, not a private Auth or clinical route;
- keep Meta Pixel and Conversions API disabled;
- never put health information, appointment reason, provider/patient relationship, phone number, PAT/PHY ID or clinical data in URLs, audiences or Meta events.

Approved candidate copy is maintained in `docs/release/meta-ad-launch-copy.md`.

Status: **PASS FOR COPY/RULES; CAMPAIGN PUBLISHING REMAINS OUT OF SCOPE.**

## Staging privacy state

- Canonical staging returns `private, no-store` and a CSP restricted to staging Supabase ref `nbsvrzypypmmuvlgdpln`.
- Page metadata is `noindex, nofollow, noarchive, nosnippet`; `robots.txt` disallows all crawling.
- No Meta Pixel or Conversions API script is rendered.
- Final real-user testing must use the professional's own staging account and a consenting second-phone test identity with synthetic/minimal patient data. No real patient clinical record is required.

Status: **PASS.**

## Exact remaining human actions

1. Complete authenticated Supabase Dashboard access so private Auth Hook, SMTP, redirect and CAPTCHA settings can be read.
2. Provide the exact production service-operator legal name and monitored privacy/grievance email.
3. Create/verify the India DLT + MSG91 sender/template/Flow and approve any required payment before secrets are installed or a real OTP is sent.
4. Choose and verify a production email sending domain/provider, then provide its SMTP settings through a secure secret-entry path.
5. Create a Cloudflare Turnstile widget for the staging and eventual production hosts, then provide site/secret keys through the correct public/secret configuration paths.
6. Run the final two-phone professional/patient journey only after delivery configuration is complete.

No production migration or promotion is authorized by this document.
