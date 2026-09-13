# Final Real-User Journey Verification

Run this on the canonical staging site before any production migration or merge.

Canonical staging: https://physiobill-independent-staging.pages.dev

Use a new professional identity you control and a separate browser/device for the patient identity. Do not reuse the existing QA professional or fixed test patient for this final journey unless a fallback test identity is explicitly needed.

## 1. Professional onboarding

1. Create a new professional account from Professional access.
2. Complete the required email confirmation if Auth requests it.
3. Sign in and confirm the professional workspace opens without a loop.
4. Complete Professional Profile with real test-safe professional details.
5. Complete Discovery Profile with display name, headline, at least one service mode and broad service area.
6. Submit/complete the intended verification workflow.
7. Using an authorized reviewer account, approve the professional.
8. Confirm the therapist becomes discoverable only after verification plus publish opt-in.

PASS only if the new account receives a PHY identity, remains a physio persona, and never receives patient authority.

## 2. Availability and public discovery

1. Publish at least one future availability window for an enabled service mode.
2. From a separate signed-out/private browser, search the public discovery page by matching city/service.
3. Confirm only patient-safe professional fields appear.
4. Confirm the intended future availability appears and no private profile, exact address, patient, clinical or financial information is exposed.

## 3. Patient registration from a second device

1. On another phone/browser, open Patient sign in.
2. Enter a real E.164-capable mobile number if live SMS is configured.
3. Receive and enter the six-digit OTP.
4. Confirm a new PAT identifier is issued only after phone confirmation.
5. Refresh the patient gateway and confirm the session restores.
6. Sign out and sign back in once to confirm the OTP/session lifecycle.

If live SMS is not yet configured, this section cannot be counted as a real-provider PASS. A fixed test OTP can verify application routing but does not verify delivery.

## 4. Appointment booking

1. As the patient, find the newly verified professional.
2. Choose the published future availability and request the appointment.
3. For a home visit, select only a broad declared service area; no exact GPS/address evidence should be inferred.
4. As the professional, open Requests and confirm the request appears.
5. Accept the request.
6. Return to the patient device and confirm the appointment shows Accepted.
7. Verify acceptance does not automatically expose a clinical chart.

## 5. Reschedule and cancellation

1. From the patient device, reschedule the accepted future appointment to another valid future slot.
2. Confirm the original accepted request remains historical and a linked new request is created rather than rewriting the original time.
3. Confirm the professional sees the reschedule request.
4. Complete the intended professional response.
5. Exercise one cancellation path and confirm no clinical, invoice or payment authority is created by scheduling state alone.

This closes the only browser regression that remained inconclusive during staging QA.

## 6. Clinical connection

1. From the accepted appointment, patient explicitly requests a clinical connection.
2. Professional reviews the request.
3. Link only the intended therapist-owned chart or deliberately create a new therapist-owned chart.
4. Confirm patient Linked clinical care exposes only patient-authorized summary information.
5. Confirm therapist-private assessments/notes remain private where intended.

## 7. Billing and payment destination

1. Professional creates or uses a manual payment destination.
2. Create a small test invoice for the linked patient using the normal professional workflow.
3. Finalize only when ready for the test.
4. Patient Financial summary should show only finalized/authorized patient-visible amounts.
5. Confirm provider settlement/KYC is not falsely represented as active.

## 8. Communications and telephysiotherapy

1. Patient saves communication preferences.
2. Confirm in-app event state can be loaded without an error.
3. If the accepted appointment is telephysiotherapy, materialize the intended provider-neutral session foundation.
4. Confirm both patient and professional see only their own session view.
5. Do not treat provider-neutral session metadata as proof that a real telehealth provider is active.

## 9. Persona and logout closeout

1. Patient attempts a professional route: must be denied.
2. Patient attempts Admin: must be denied.
3. Professional attempts a patient-only route: must be denied.
4. Admin/reviewer access works only for the authorized professional capability.
5. Perform logout and re-login for professional, patient and reviewer.
6. Refresh protected routes after login; no infinite loader, protected-content flash or silent wrong-persona redirect is acceptable.

## Final PASS condition

The release is eligible for production promotion only when:

- professional creation + verification + discovery: PASS;
- real patient OTP delivery + PAT provisioning: PASS, or explicitly deferred if the release intentionally remains on a non-live provider test;
- booking + professional response: PASS;
- future reschedule browser flow: PASS;
- explicit clinical connection: PASS;
- patient clinical/financial isolation: PASS;
- communications and applicable telephysiotherapy reads: PASS;
- all three personas restore/logout/re-login correctly;
- no new QA defect is open.

Record every failure before editing code. Fix only reproduced defects, redeploy staging, and retest the failed path plus adjacent regression.
