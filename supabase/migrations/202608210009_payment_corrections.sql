begin;

create table if not exists public.payment_corrections (
  id uuid primary key default gen_random_uuid(),
  physio_id uuid not null references public.physiotherapists(id) on delete cascade,
  invoice_id uuid not null,
  patient_id uuid not null,
  original_payment_id uuid not null,
  transaction_type text not null check (transaction_type in ('correction', 'reversal')),
  amount numeric(12,2) not null check (amount > 0),
  reason text not null check (length(trim(reason)) > 0),
  recorded_by_user_id uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint payment_corrections_invoice_physio_fkey
    foreign key (invoice_id, physio_id) references public.invoices(id, physio_id) on delete restrict,
  constraint payment_corrections_payment_physio_fkey
    foreign key (original_payment_id, physio_id) references public.payments(id, physio_id) on delete restrict
);

create index if not exists payment_corrections_invoice_idx
  on public.payment_corrections (physio_id, invoice_id, created_at desc);
create index if not exists payment_corrections_payment_idx
  on public.payment_corrections (physio_id, original_payment_id, created_at desc);

alter table public.payment_corrections enable row level security;

drop policy if exists payment_corrections_owner_select on public.payment_corrections;
create policy payment_corrections_owner_select
on public.payment_corrections
for select
to authenticated
using (private.owns_physio(physio_id));

drop policy if exists payment_corrections_owner_insert on public.payment_corrections;
create policy payment_corrections_owner_insert
on public.payment_corrections
for insert
to authenticated
with check (private.owns_physio(physio_id));

grant select, insert on public.payment_corrections to authenticated;
revoke update, delete on public.payment_corrections from authenticated;

create or replace function private.assign_payment_correction_identity()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  resolved_physio_id uuid;
  resolved_user_id uuid;
  payment_row public.payments%rowtype;
  invoice_row public.invoices%rowtype;
  already_corrected numeric;
  remaining_reversible numeric;
begin
  resolved_physio_id := private.current_physio_id();
  resolved_user_id := auth.uid();

  if new.amount is null or new.amount <= 0 then
    raise exception 'Correction amount must be greater than zero.' using errcode = '22003';
  end if;

  if new.transaction_type not in ('correction', 'reversal') then
    raise exception 'Unsupported payment correction type.' using errcode = '22023';
  end if;

  if length(trim(coalesce(new.reason, ''))) = 0 then
    raise exception 'A reason is required for every payment correction or reversal.' using errcode = '23514';
  end if;

  select * into payment_row
    from public.payments p
   where p.id = new.original_payment_id
     and p.physio_id = resolved_physio_id
   for update;

  if payment_row.id is null then
    raise exception 'Original payment does not belong to the authenticated physiotherapist.' using errcode = '42501';
  end if;

  select * into invoice_row
    from public.invoices i
   where i.id = payment_row.invoice_id
     and i.physio_id = resolved_physio_id
   for update;

  if invoice_row.id is null then
    raise exception 'Payment invoice does not belong to the authenticated physiotherapist.' using errcode = '42501';
  end if;

  select coalesce(sum(c.amount), 0)
    into already_corrected
    from public.payment_corrections c
   where c.original_payment_id = payment_row.id
     and c.physio_id = resolved_physio_id;

  remaining_reversible := payment_row.amount - already_corrected;

  if remaining_reversible <= 0 then
    raise exception 'This payment has already been fully reversed or corrected.' using errcode = '22003';
  end if;

  if new.amount > remaining_reversible then
    raise exception 'Correction exceeds the remaining reversible amount.' using errcode = '22003';
  end if;

  if new.transaction_type = 'reversal' and new.amount <> remaining_reversible then
    raise exception 'A reversal must reverse the full remaining reversible amount.' using errcode = '22003';
  end if;

  new.physio_id := resolved_physio_id;
  new.invoice_id := payment_row.invoice_id;
  new.patient_id := payment_row.patient_id;
  new.recorded_by_user_id := resolved_user_id;
  new.reason := trim(new.reason);
  new.created_at := now();
  return new;
end;
$$;

revoke all on function private.assign_payment_correction_identity() from public, anon, authenticated;

drop trigger if exists payment_corrections_assign_identity on public.payment_corrections;
create trigger payment_corrections_assign_identity
before insert on public.payment_corrections
for each row
execute function private.assign_payment_correction_identity();

create or replace function private.reconcile_invoice_from_payments(target_invoice_id uuid, target_physio_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  gross_paid numeric;
  corrected_amount numeric;
  effective_paid numeric;
begin
  select coalesce(sum(p.amount), 0)
    into gross_paid
    from public.payments p
   where p.invoice_id = target_invoice_id
     and p.physio_id = target_physio_id
     and p.status in ('recorded', 'succeeded');

  select coalesce(sum(c.amount), 0)
    into corrected_amount
    from public.payment_corrections c
   where c.invoice_id = target_invoice_id
     and c.physio_id = target_physio_id;

  effective_paid := gross_paid - corrected_amount;

  if effective_paid < 0 then
    raise exception 'Payment corrections cannot produce a negative effective paid amount.' using errcode = '22003';
  end if;

  perform set_config('physiobill.payment_reconcile', 'on', true);

  update public.invoices i
     set paid = effective_paid,
         status = case
           when effective_paid >= i.total then 'Paid'
           when effective_paid > 0 then 'Partially Paid'
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

create or replace function private.after_payment_correction_reconcile()
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

revoke all on function private.after_payment_correction_reconcile() from public, anon, authenticated;

drop trigger if exists payment_corrections_reconcile_invoice on public.payment_corrections;
create trigger payment_corrections_reconcile_invoice
after insert on public.payment_corrections
for each row
execute function private.after_payment_correction_reconcile();

commit;
