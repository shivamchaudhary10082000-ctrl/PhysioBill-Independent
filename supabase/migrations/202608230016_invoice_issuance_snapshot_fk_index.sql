create index if not exists invoice_issuance_snapshots_invoice_physio_idx
  on public.invoice_issuance_snapshots(invoice_id, physio_id);
