# Therapist Analytics Multilingual Boundary

## Scope

This bounded slice localizes the authenticated therapist operating-analytics presentation layer for the existing supported locales: `en-IN`, `hi-IN`, and `gu-IN`.

## Authority lock

Localization is presentation-only. It MUST NOT alter:

- physiotherapist persona resolution or authorization;
- PHY identity or any PAT identity;
- therapist ownership/RLS boundaries;
- the database-selected analytics period;
- database-computed counts, durations, invoice counts, or billed totals;
- treatment-episode semantics;
- patient/chart identity exposure rules;
- invoice/payment/revenue authority;
- any RPC name, arguments, grant, RLS policy, schema, trigger, or database mutation path.

The analytics RPC remains the sole authority for aggregate operating metrics. The frontend may translate labels and explanatory text and may format the already-returned numeric billed total using the selected locale. It must never recompute or reinterpret authoritative analytics.

## Financial meaning lock

`billedTotal` remains immutable issued-invoice value only. Localization must preserve the explicit warning that it is not proof of cash, bank, UPI, provider settlement, or collected revenue.

## Privacy lock

This analytics boundary continues to expose aggregate therapist-owned operating metrics only. Localization must not introduce patient names, PAT identifiers, chart identifiers, clinical narratives, or cross-owner data.

## Locale failure

Locale resolution is non-authoritative. If locale loading fails, the surface falls back to `en-IN`; analytics loading and authorization must remain independent of locale availability.

## Database impact

None. This slice changes no schema, RPC, RLS policy, trigger, grant, or migration history. No forward migration is justified for this UI-only boundary.

## Acceptance

Repository acceptance requires:

1. only the analytics page, analytics locale catalog, and this architecture lock to differ from the slice parent;
2. the therapist analytics database authority and grants to remain unchanged;
3. protected refs to remain unchanged;
4. staging migration history to remain unchanged;
5. browser/build locale acceptance to remain explicitly deferred if external deployment capacity is unavailable.
