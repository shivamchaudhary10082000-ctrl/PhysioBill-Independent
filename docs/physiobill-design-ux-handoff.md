# PhysioBill design and UX handoff — staging baseline

Status: approved visual direction, staging only.  
Brand: PhysioBill. REHIVO is not authorized for use.  
Architecture/authentication: unchanged by this design pass.

## 1. Sitemap and screen inventory

### Public
- `/` — landing + therapist search entry
- `/find-physio` — therapist discovery/results + availability + appointment request entry
- `/privacy` — privacy notice
- `/terms` — terms of use
- `/professional-standards` — professional standards
- `/verify/reimbursement/:token` — reimbursement document verification
- `/patient/sign-in` — patient SMS OTP
- `/professional/sign-in` — professional password / email OTP
- `/admin/sign-in` — admin sign-in

### Patient
- `/patient` — patient home/gateway
- `/patient/appointments` — appointment requests and lifecycle
- `/patient/communications` — reminders and communication preferences
- `/patient/clinical-care` — explicitly linked clinical care
- `/patient/financial-summary` — authorized financial view
- `/patient/telephysiotherapy` — telephysiotherapy session foundation

### Professional
- `/app/dashboard` / `/app` — workspace home
- `/app/patients` — patient directory
- `/app/visits` — visits / treatment sessions
- `/app/clinical-records` — clinical records
- `/app/invoices` and invoice document surfaces
- `/app/financial-ledger` — financial workspace
- `/app/profile` — professional profile
- `/app/discovery-profile` — public discovery profile + credential request
- `/app/availability` — availability management
- `/app/appointment-requests` — request/accept/reject/reschedule/cancel workflow
- `/app/payment-destinations` — therapist-owned payment instructions
- `/app/analytics` — treatment/operating analytics
- `/app/communications` — professional communications
- `/app/telephysiotherapy` — telephysiotherapy session foundation
- `/app/settings` — settings

### Admin
- `/admin/verifications` — verification queue
- `/admin/verifications/:requestId` — credential review and audit history

## 2. Mobile-first wireframes

Baseline viewport: 360 x 800 Android. Minimum practical width: 320px.

### Landing
```
[PhysioBill]                  [Professional sign in]

Credential-checked physiotherapy
Find a physiotherapist,
closer to you.
Short support copy.

[Service mode             v]
[City                        ]
[Area optional                ]
[ Find physiotherapists       ]

Credential checks first
Location-aware
Simple by design

[Public legal/help footer]
```

### Discovery result
```
[< Back]             [Professional sign in]

Find care that fits your location
[Service] [City] [Area]
[ Search ]

[PT initials / photo slot]
[Credential checked]
Dr / therapist name
Qualification
City / service area
[Home visit] [Clinic] [Telephysio]

Headline / clinic
Credential details
Upcoming availability
[ Request this time ]

Request is not confirmed until accepted.
```

### Professional public profile/result detail
Current architecture uses discovery cards rather than a separate public profile route. The visual profile block must therefore remain compatible with the existing card model.

```
[Photo or initials]  Name
                     Credential checked
Qualification
City / service modes

Professional headline
Clinic name (if any)
Short bio

Credential details
Registration authority + number

Service areas
Availability
[ Request appointment ]
```

Photo is a future-compatible slot. Current discovery payload has no profile-photo field, so use initials until a photo field is explicitly approved.

### Appointment request
```
Therapist name
Service mode
Selected area (home visit only)

Available time
Date · time · timezone

Important:
Requested ≠ confirmed
No clinical/payment access created.

[ Request this time ]
```

### Patient home
```
[PhysioBill]                         [Sign out]

Patient
Your care, in one private place.

[Find a physiotherapist]
[Appointments]
[Updates & reminders]
[Telephysiotherapy]
[Clinical care]
[Financial summary]
```

### Professional home
```
[PhysioBill]                 [Account / sign out]
[horizontal text navigation]

Good morning / workspace heading

Primary work
[Appointment requests]
[Patients]
[Visits]
[Invoices]

Today / attention
small summary cards only

Recent activity / next actions
```

Avoid a dense KPI dashboard.

### Patient record
```
[< Patients]
Patient name
Patient no. · contact

[Overview] [Visits] [Clinical] [Financial]

Key demographics / address
Clinical relationship status
Recent visits
Invoices

Private therapist notes are visually separated
and never marked patient-visible by default.
```

### Invoice
```
PhysioBill
INVOICE                         Invoice no.

Professional
Name / qualification
Registration no.
Contact

Patient
Name / patient no.
Address

Service
Description
Sessions: 15
Rate: ₹400

RATE × SESSIONS
₹400 × 15 = ₹6,000

Additional / discount / GST
TOTAL: ₹6,000

Payment status is evidence-based,
not inferred from payment instructions.
```

### Mediclaim receipt
```
[PhysioBill]          Professional details
                      Registration No.

Date                    Receipt No.
Patient name             Patient no.
Age / gender             Contact
Address

Service / chief complaint
Service period

------------------------------------------------
# | Description | Days | Price/day | Amount
1 | Physio      | 15   | ₹400      | ₹6,000
------------------------------------------------

Rate × sessions     ₹400 × 15 = ₹6,000

[stamp area]          Subtotal
                      Paid/advance
                      TOTAL DUE

                      Signature
```

Receipt number currently uses the immutable finalized invoice number. Do not invent an unrelated number without an approved data model.

### Admin verification review
```
[< Verification queue]

Immutable request vN           [Pending]

Professional name
Qualification
Registration no.
Authority
Jurisdiction
Country / region

[Conflict warning if present]

Reviewer decision
Verification method
Safe reference
Decision reason

[Approve] [Reject] [Require resubmission]

Verification history
```

## 3. Approved visual system

Light:
- canvas #F7F8F6
- surface #FFFFFF
- soft surface #F1F3F1
- raised #FCFCFB
- border #DDE2DE
- strong border #C8D0CA
- primary text #17201B
- secondary text #56625A
- muted decorative text #7A867E
- primary brand #174D3B
- hover #123D30
- brand soft #E7F0EB
- restrained accent #B58A52
- success #216E4A
- warning #8A5A18
- destructive #A63A3A
- info #315D76

Dark:
- canvas #101512
- surface #171D19
- surface soft #1D2520
- raised #222A25
- border #303A33
- strong border #455047
- primary text #F2F5F2
- secondary #B9C2BB
- muted #89948C
- primary brand #85B49E
- hover #9BC4B1
- brand soft #20352C
- accent #C7A16D

Fonts:
- English/UI: Inter
- Hindi: Noto Sans Devanagari
- Gujarati: Noto Sans Gujarati
- mono identifiers: DM Mono

Use the darker secondary text rather than #7A867E for essential small text because the lighter muted value does not meet WCAG AA at normal sizes on the approved canvas.

## 4. Invoice / receipt / PDF requirements

Required visual information:
- professional name
- qualification
- registration number
- registration authority when available
- patient identity
- patient address where captured
- invoice/receipt number
- issued date
- service description
- number of sessions/days
- per-session/day rate
- explicit arithmetic: rate x sessions = service amount
- additional charges, discount and GST only when applicable
- total
- paid/advance
- total due
- optional stamp area
- signature line

The web receipt already carries registration number and uses the immutable invoice number as the receipt number.

### Multilingual PDF status

Web UI typography supports English, Hindi and Gujarati.

The current server PDF renderer is NOT multilingual-safe yet. It uses PDF standard Helvetica and deliberately rejects non-ASCII text through `safeText()`. Therefore Hindi/Gujarati content must NOT be claimed as PDF-compatible yet.

Before multilingual PDF is marked ready, staging must implement and test Unicode font embedding/shaping for both Devanagari and Gujarati, then verify:
- patient names
- addresses
- service descriptions
- notes
- mixed English + Hindi/Gujarati strings
- wrapping
- printed/downloaded PDF output

This is a known release gap, not a visual-design uncertainty.

## 5. Accessibility and speed

Target WCAG 2.1/2.2 AA for normal interface use.

Rules:
- primary/secondary text contrast >= 4.5:1
- large text >= 3:1
- visible keyboard focus
- controls at least 44px on coarse-pointer/mobile use
- labels remain visible above inputs
- errors are not indicated by colour alone
- no protected-content flash during auth resolution
- reduced-motion preference respected
- status changes use appropriate live regions
- mobile tables collapse to cards where required
- body copy should normally remain >= 14px; core body 16px
- no horizontal scrolling for core workflows at 360px
- avoid layout shifts and heavy visual effects
- prefer skeletons over page-blocking spinners
- avoid decorative image payloads on critical workflows
- keep icon library consistent (Lucide)
- keep external font families limited and use preconnect
- no autoplay video or unnecessary animation

Performance target for a mid-range Android device:
- useful first screen appears quickly on a normal 4G connection
- core interaction controls are available without waiting for decorative assets
- route surfaces avoid large image dependencies
- loading/error states remain usable on slow connections

## 6. Public search/share identity

Search result/profile preview design:
- photo if an approved public photo field exists; otherwise initials
- professional display name
- qualification
- city / coarse service area
- service modes
- “Credential checked” badge
- short headline
- no ratings unless a real ratings system is later created
- no unsupported “specialist/expert” labels
- no government-style seal

Social/share preview target:
- PhysioBill brand
- professional display name
- city
- service modes
- neutral line such as “View physiotherapy services and availability on PhysioBill.”

Current SPA architecture has static page metadata and no public photo field/dedicated profile URL suitable for a per-professional Open Graph card. Do not fake dynamic share metadata. Add it only when a stable public profile URL and approved public photo field exist.

## 7. Open product decisions — recommendation

### Non-India patient login
Current phone normalization already accepts a full international E.164-style number beginning with +, while Indian 10-digit numbers default to +91.

Recommendation: KEEP this capability. Do not alter login architecture. Before advertising international support, confirm the selected SMS provider actually delivers to each supported country. A country selector can be a later UX enhancement.

### Booking for a parent or child
Current patient terms already allow a user to state they are lawfully acting for the patient, but there is no dedicated dependent/guardian identity model.

Recommendation: DO NOT launch a full child/dependent booking feature by implication. For v1, keep the existing lawful-representative acknowledgement but do not add a “child account” UI until guardian/dependent consent, DOB, relationship and access rules are explicitly designed.

### Manual invoice payment
The backend already has an auditable `recordPayment()` flow with amount, method, time and notes, followed by invoice reconciliation.

Recommendation: expose/retain “Record payment” rather than a bare “Mark paid” switch. It should support partial payments and Cash / UPI / Bank Transfer / Other. The invoice becomes Paid only when recorded payments reconcile to the total.

### Reminder channel
Current communication preferences support external channel values: none, SMS, WhatsApp. Email is not part of the current external reminder preference model.

Recommendation for v1: SMS first after the real SMS provider/DLT path is proven, because SMS is already needed for patient OTP. Keep WhatsApp as a later opt-in channel after template/provider approval. Do not invent an email reminder channel without extending the communication model.

### Telephysiotherapy
Telephysiotherapy is NOT live video today.

Current state:
- appointment-linked session foundation exists
- patient/professional session lists exist
- provider state is `external_activation_pending`
- no Zoom, Google Meet, Jitsi, WebRTC, WhatsApp call or other video provider is integrated

Recommendation: present telephysiotherapy as “activation pending” until a video provider is intentionally selected, privacy/security reviewed and tested. Do not show a “Join video call” button yet.

## 8. Design implementation boundaries

This pass must not:
- rename PhysioBill
- introduce REHIVO
- merge patient/professional/admin experiences
- change authentication methods
- turn booking into payment evidence
- turn booking into clinical authorization
- imply government verification
- imply PhysioBill processes or settles money
- modify production
- merge to main
- alter futureweb-dh-repair

All visual changes are staging-branch only.
