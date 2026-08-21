begin;

alter table public.invoices drop constraint if exists invoices_status_check;
update public.invoices set status = 'Partially Paid' where status = 'Part paid';
alter table public.invoices add constraint invoices_status_check
check (status in ('Draft', 'Outstanding', 'Partially Paid', 'Paid'));

alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
check (method in ('Cash', 'UPI', 'Bank Transfer', 'Other'));

grant select, insert on public.payments to authenticated;
revoke update, delete on public.payments from authenticated;

drop policy if exists payments_owner_insert on public.payments;
create policy payments_owner_insert
on public.payments
for insert
to authenticated
with check (private.owns_physio(physio_id));

create or replace function private.assign_payment_identity()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  resolved_physio_id uuid;
  resolved_user_id uuid;
  invoice_row public.invoices%rowtype;
begin
  resolved_physio_id := private.current_physio_id();
  resolved_user_id := auth.uid();

  if new.amount is null or new.amount <= 0 then
    raise exception 'Payment amount must be greater than zero.' using errcode = '22003';
  end if;

  if new.method not in ('Cash', 'UPI', 'Bank Transfer', 'Other') then
    raise exception 'Unsupported payment method.' using errcode = '22023';
  end if;

  select * into invoice_row
    from public.invoices i
   where i.id = new.invoice_id
     and i.physio_id = resolved_physio_id
   for update;

  if invoice_row.id is null then
    raise exception 'Invoice does not belong to the authenticated physiotherapist.' using errcode = '42501';
  end if;

  if not invoice_row.finalized then
    raise exception 'Payments can only be recorded against finalized invoices.' using errcode = '55000';
  end if;

  if invoice_row.paid + new.amount > invoice_row.total then
    raise exception 'Payment would exceed the invoice total.' using errcode = '22003';
  end if;

  new.physio_id := resolved_physio_id;
  new.patient_id := invoice_row.patient_id;
  new.status := 'recorded';
  new.provider := null;
  new.provider_payment_id := null;
  new.provider_connected_account_id := null;
  new.recorded_by_user_id := resolved_user_id;
  new.recorded_at := coalesce(new.recorded_at, now());
  new.created_at := now();
  return new;
end;
$$;

revoke all on function private.assign_payment_identity() from public, anon, authenticated;

drop trigger if exists payments_assign_identity on public.payments;
create trigger payments_assign_identity
before insert on public.payments
for each row
execute function private.assign_payment_identity();

create or replace function private.reconcile_invoice_from_payments(target_invoice_id uuid, target_physio_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  reconciled_paid numeric;
begin
  select coalesce(sum(p.amount), 0)
    into reconciled_paid
    from public.payments p
   where p.invoice_id = target_invoice_id
     and p.physio_id = target_physio_id
     and p.status in ('recorded', 'succeeded');

  perform set_config('physiobill.payment_reconcile', 'on', true);

  update public.invoices i
     set paid = reconciled_paid,
         status = case
           when reconciled_paid >= i.total then 'Paid'
           when reconciled_paid > 0 then 'Partially Paid'
           else 'Outstanding'
         end,
         updated_at = now()
   where i.id = target_invoice_id
     and i.physio_id = target_physio_id
     and i.finalized;

  perform set_config('physiobill.payment_reconcile', 'off', true);
end;
$$;

revoke all on function private.reconcile_invoice_from_payments(uuid, uuid) from public, anon, authenticated;

create or replace function private.after_payment_insert_reconcile()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  perform private.reconcile_invoice_from_payments(new.invoice_id, new.physio_id);
  return new;
end;
$$;

revoke all on function private.after_payment_insert_reconcile() from public, anon, authenticated;

drop trigger if exists payments_reconcile_invoice on public.payments;
create trigger payments_reconcile_invoice
after insert on public.payments
for each row
execute function private.after_payment_insert_reconcile();

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
  payment_reconcile boolean;
begin
  resolved_physio_id := private.current_physio_id();
  payment_reconcile := coalesce(current_setting('physiobill.payment_reconcile', true), 'off') = 'on';

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

    if old.finalized and not payment_reconcile then
      raise exception 'Finalized invoices are immutable. Use the correction workflow.' using errcode = '55000';
    end if;

    new.physio_id := old.physio_id;
    new.patient_id := old.patient_id;
    new.invoice_number := old.invoice_number;
    new.created_at := old.created_at;

    if payment_reconcile then
      new.description := old.description;
      new.sessions := old.sessions;
      new.start_date := old.start_date;
      new.end_date := old.end_date;
      new.fee := old.fee;
      new.additional := old.additional;
      new.additional_description := old.additional_description;
      new.discount := old.discount;
      new.gst_rate := old.gst_rate;
      new.total := old.total;
      new.payment_method := old.payment_method;
      new.finalized := old.finalized;
    else
      new.paid := old.paid;
    end if;
  end if;

  if not payment_reconcile then
    new.fee := greatest(coalesce(new.fee, 0), 0);
    new.additional := greatest(coalesce(new.additional, 0), 0);
    new.discount := greatest(coalesce(new.discount, 0), 0);
    new.gst_rate := greatest(coalesce(new.gst_rate, 0), 0);
    new.total := round(greatest(0, (new.fee + new.additional - new.discount) * (1 + new.gst_rate / 100)), 2);
  end if;

  if not coalesce(new.finalized, false) then
    new.status := 'Draft';
  elsif new.paid >= new.total then
    new.status := 'Paid';
  elsif new.paid > 0 then
    new.status := 'Partially Paid';
  else
    new.status := 'Outstanding';
  end if;

  return new;
end;
$$;

revoke all on function private.assign_invoice_identity() from public, anon, authenticated;

commit;
