# Patient Financial Accessibility Boundary

## Scope

This slice hardens mobile, keyboard, loading/error and sensitive-data presentation behavior for the authenticated patient financial summary and payment-instruction surfaces only.

## Frozen authority invariants

- Supabase remains authoritative for patient financial visibility, invoice status, payment evidence, advance/credit balances and therapist payment destinations.
- The frontend must not infer financial access from booking, appointment acceptance, PAT identity, or route presence.
- PAT identity is immutable and is not a therapist-owned clinical chart.
- A platform-patient-to-chart linkage is not itself unrestricted clinical or financial access; database authority decides which actively linked records are visible.
- Physiotherapist ownership and RLS isolation remain intact.
- Payment instructions are destination information only. Displaying UPI, bank or provider-managed destination data must never mark an invoice paid, prove settlement, create a payment, consume credit, or mutate invoice authority.
- Advance/credit remains ledger evidence separate from external payment evidence except through separately authorized database operations.
- No clinical notes, draft invoices, provider secrets, provider identifiers, or therapist-private financial data may be exposed by this presentation layer.

## Accessibility behavior

- Loading and failure states are announced through semantic live/status or alert regions.
- Primary route and payment-instruction actions use a 44px-class minimum touch target and visible keyboard focus.
- Long invoice numbers, public IDs, payment destination values, descriptions and ledger reasons wrap instead of forcing narrow-screen overflow.
- Decorative icons are hidden from assistive technology where their adjacent text already conveys the meaning.
- Payment-instruction loading exposes busy state and prevents duplicate activation while the database-authoritative read is in flight.

## Explicit non-goals

This slice does not change database schema, RLS, grants, RPC behavior, patient/physiotherapist persona rules, PAT/PHY identity, appointment authority, clinical access, invoice state, payment state, credit application, reimbursement evidence, provider activation, secrets, production configuration, or legal/business facts.
