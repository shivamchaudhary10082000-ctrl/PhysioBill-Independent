# Send SMS Edge Function configuration

Server-side configuration required for the staging Send SMS Auth Hook adapter:

- `SEND_SMS_HOOK_SECRET`
- `MSG91_AUTH_KEY`
- `MSG91_FLOW_ID`
- `MSG91_OTP_VARIABLE`
- `MSG91_SENDER_ID` (optional; only when the selected MSG91 Flow expects the sender at API call time)

These values belong only in Supabase Edge Function secrets/configuration. None are browser `VITE_*` variables.

The future hosted Send SMS Auth Hook must invoke this function without Supabase JWT verification; Standard Webhooks signature verification is the request-authenticity boundary. Hosted hook creation, Phone Auth enablement, secret creation, and deployment are intentionally outside this implementation slice.
