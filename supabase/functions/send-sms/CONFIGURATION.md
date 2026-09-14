# Send SMS Edge Function configuration

Server-side configuration required for the staging Send SMS Auth Hook adapter:

- `SEND_SMS_HOOK_SECRET`
- `MSG91_AUTH_KEY`
- `MSG91_FLOW_ID`
- `MSG91_OTP_VARIABLE`
- `MSG91_SENDER_ID` (optional; only when the selected MSG91 Flow expects the sender at API call time)

These values belong only in Supabase Edge Function secrets/configuration. None are browser `VITE_*` variables.

The hosted Send SMS Auth Hook must invoke this function without Supabase JWT verification; Standard Webhooks signature verification is the request-authenticity boundary. The deployed staging function is deliberately `verify_jwt=false`; unsigned requests are still rejected by the webhook-signature check.

## India / MSG91 activation checklist

Do not enable live delivery until all of the following are true:

1. The real service operator is registered as the Principal Entity required for Indian SMS delivery.
2. The operator has an approved DLT header/sender ID and an approved OTP content template.
3. The approved Principal Entity ID, header and DLT template ID are mapped in MSG91.
4. A MSG91 Flow uses the exact approved text and maps its OTP placeholder to the configured `MSG91_OTP_VARIABLE`.
5. The MSG91 account has delivery credit and an active server-side auth key.
6. The five secrets above are present in the staging Edge Function environment.
7. Supabase Auth Phone sign-in is enabled, phone auto-confirm is disabled, and the hosted Send SMS Hook points to `/functions/v1/send-sms` with the matching hook secret.
8. OTP expiry and resend/rate limits are reviewed before the real-phone test.

Conservative DLT template candidate (the DLT-approved wording and MSG91 Flow text must match exactly):

> Use code {#var#} to sign in to PhysioBill. Do not share this code with anyone.

Official sources: Supabase Send SMS Hook and Phone Sign-in documentation, TRAI's Advice to Senders, and MSG91's DLT registration/Flow mapping documentation. A real OTP request is the final provider acceptance test and may incur an SMS charge; do not run it without explicit approval.
