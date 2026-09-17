begin;

-- Finalized-invoice correction/audit and payment mutation are privileged
-- operations. The browser may read owner-scoped history but must not be able
-- to manufacture authoritative audit or payment rows directly.

drop policy if exists invoice_audit_owner_insert on public.invoice_audit_entries;

revoke insert, update, delete on public.invoice_audit_entries from authenticated;
revoke insert, update, delete on public.payments from authenticated;

grant select on public.invoice_audit_entries to authenticated;
grant select on public.payments to authenticated;

commit;
