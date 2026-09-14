begin;

create or replace function private.assign_invoice_identity()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  resolved_physio_id uuid;
  invoice_year integer;
  prefix text;
  next_sequence integer;
begin
  resolved_physio_id := private.current_physio_id();

  if tg_op = 'INSERT' then
    new.physio_id := resolved_physio_id;

    select upper(regexp_replace(coalesce(nullif(trim(p.invoice_prefix), ''), 'PB'), '[^A-Za-z0-9]', '', 'g'))
      into prefix
      from public.physiotherapist_profiles p
     where p.physio_id = resolved_physio_id;

    prefix := coalesce(nullif(prefix, ''), 'PB');
    invoice_year := extract(year from current_date)::integer;

    perform pg_advisory_xact_lock(hashtextextended(resolved_physio_id::text || ':' || prefix || ':' || invoice_year::text, 0));

    select coalesce(max(right(i.invoice_number, 6)::integer), 0) + 1
      into next_sequence
      from public.invoices i
     where i.physio_id = resolved_physio_id
       and i.invoice_number ~ ('^' || prefix || '-' || invoice_year::text || '-[0-9]{6}$');

    new.invoice_number := prefix || '-' || invoice_year::text || '-' || lpad(next_sequence::text, 6, '0');
    new.paid := 0;
  else
    if old.physio_id <> resolved_physio_id then
      raise exception 'Invoice does not belong to the authenticated physiotherapist.' using errcode = '42501';
    end if;

    if old.finalized then
      raise exception 'Finalized invoices are immutable. Use the correction workflow.' using errcode = '55000';
    end if;

    new.physio_id := old.physio_id;
    new.patient_id := old.patient_id;
    new.invoice_number := old.invoice_number;
    new.paid := old.paid;
    new.created_at := old.created_at;
  end if;

  new.fee := greatest(coalesce(new.fee, 0), 0);
  new.additional := greatest(coalesce(new.additional, 0), 0);
  new.discount := greatest(coalesce(new.discount, 0), 0);
  new.gst_rate := greatest(coalesce(new.gst_rate, 0), 0);
  new.total := round(greatest(0, (new.fee + new.additional - new.discount) * (1 + new.gst_rate / 100)), 2);

  if not coalesce(new.finalized, false) then
    new.status := 'Draft';
  elsif new.paid >= new.total then
    new.status := 'Paid';
  elsif new.paid > 0 then
    new.status := 'Part paid';
  else
    new.status := 'Outstanding';
  end if;

  return new;
end;
$$;

revoke all on function private.assign_invoice_identity() from public, anon, authenticated;

commit;
