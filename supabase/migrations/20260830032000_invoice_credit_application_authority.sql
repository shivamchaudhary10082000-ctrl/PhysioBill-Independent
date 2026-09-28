begin;

create table public.invoice_credit_applications (
  id uuid primary key default gen_random_uuid(),
  physio_id uuid not null references public.physiotherapists(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  credit_ledger_entry_id uuid not null unique references public.patient_credit_ledger_entries(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  applied_by_user_id uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint invoice_credit_applications_invoice_physio_fkey
    foreign key (invoice_id, physio_id) references public.invoices(id, physio_id) on delete restrict
);

create index invoice_credit_applications_owner_invoice_idx
  on public.invoice_credit_applications (physio_id, invoice_id, created_at, id);
create index invoice_credit_applications_owner_patient_idx
  on public.invoice_credit_applications (physio_id, patient_id, created_at, id);

alter table public.invoice_credit_applications enable row level security;
revoke all on table public.invoice_credit_applications from public, anon, authenticated;

create or replace function private.reject_invoice_credit_application_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Invoice credit applications are append-only.' using errcode = '42501';
end;
$$;

create trigger invoice_credit_applications_append_only
before update or delete on public.invoice_credit_applications
for each row execute function private.reject_invoice_credit_application_mutation();

create or replace function private.reconcile_invoice_from_payments(target_invoice_id uuid, target_physio_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gross_paid numeric(12,2);
  v_corrected_amount numeric(12,2);
  v_external_paid numeric(12,2);
  v_credit_applied numeric(12,2);
  v_effective_settled numeric(12,2);
begin
  select coalesce(sum(p.amount), 0)::numeric(12,2)
    into v_gross_paid
    from public.payments p
   where p.invoice_id = target_invoice_id
     and p.physio_id = target_physio_id
     and p.status in ('recorded', 'succeeded');

  select coalesce(sum(c.amount), 0)::numeric(12,2)
    into v_corrected_amount
    from public.payment_corrections c
   where c.invoice_id = target_invoice_id
     and c.physio_id = target_physio_id;

  v_external_paid := (v_gross_paid - v_corrected_amount)::numeric(12,2);
  if v_external_paid < 0 then
    raise exception 'Payment corrections cannot produce a negative effective paid amount.' using errcode = '22003';
  end if;

  select coalesce(sum(a.amount), 0)::numeric(12,2)
    into v_credit_applied
    from public.invoice_credit_applications a
   where a.invoice_id = target_invoice_id
     and a.physio_id = target_physio_id;

  v_effective_settled := (v_external_paid + v_credit_applied)::numeric(12,2);

  perform set_config('physiobill.payment_reconcile', 'on', true);

  update public.invoices i
     set paid = v_effective_settled,
         status = case
           when v_effective_settled >= i.total then 'Paid'
           when v_effective_settled > 0 then 'Partially Paid'
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

create or replace function public.apply_patient_credit_to_invoice(
  p_invoice_id uuid,
  p_amount numeric
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_physio_id uuid;
  v_invoice public.invoices%rowtype;
  v_credit_balance numeric(12,2);
  v_outstanding numeric(12,2);
  v_ledger_entry public.patient_credit_ledger_entries%rowtype;
  v_application public.invoice_credit_applications%rowtype;
begin
  if v_user_id is null then
    raise exception 'Applying patient credit requires authentication.' using errcode = '42501';
  end if;

  v_physio_id := private.current_physio_id();

  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'Credit application amount must be positive with at most two decimal places.' using errcode = '22023';
  end if;

  select * into v_invoice
    from public.invoices i
   where i.id = p_invoice_id
     and i.physio_id = v_physio_id
   for update;

  if v_invoice.id is null then
    raise exception 'Invoice does not belong to the authenticated physiotherapist.' using errcode = '42501';
  end if;

  if not v_invoice.finalized then
    raise exception 'Credit may only be applied to a finalized invoice.' using errcode = '55000';
  end if;

  perform 1
    from public.patients p
   where p.id = v_invoice.patient_id
     and p.physio_id = v_physio_id
   for update;

  if not found then
    raise exception 'Invoice patient chart is not owned by the authenticated physiotherapist.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_physio_id::text || ':' || v_invoice.patient_id::text, 0));

  select coalesce(sum(e.amount), 0)::numeric(12,2)
    into v_credit_balance
    from public.patient_credit_ledger_entries e
   where e.physio_id = v_physio_id
     and e.patient_id = v_invoice.patient_id;

  v_outstanding := greatest((v_invoice.total - v_invoice.paid)::numeric(12,2), 0);

  if v_outstanding <= 0 then
    raise exception 'Invoice is already fully settled.' using errcode = '22003';
  end if;

  if p_amount > v_credit_balance then
    raise exception 'Credit application exceeds the patient credit balance.' using errcode = '22003';
  end if;

  if p_amount > v_outstanding then
    raise exception 'Credit application exceeds the invoice outstanding amount.' using errcode = '22003';
  end if;

  insert into public.patient_credit_ledger_entries (
    physio_id,
    patient_id,
    entry_type,
    amount,
    reason,
    occurred_at,
    recorded_by_user_id
  ) values (
    v_physio_id,
    v_invoice.patient_id,
    'adjustment',
    -p_amount,
    'Applied to finalized invoice ' || v_invoice.invoice_number,
    now(),
    v_user_id
  ) returning * into v_ledger_entry;

  insert into public.invoice_credit_applications (
    physio_id,
    patient_id,
    invoice_id,
    credit_ledger_entry_id,
    amount,
    applied_by_user_id
  ) values (
    v_physio_id,
    v_invoice.patient_id,
    v_invoice.id,
    v_ledger_entry.id,
    p_amount,
    v_user_id
  ) returning * into v_application;

  perform private.reconcile_invoice_from_payments(v_invoice.id, v_physio_id);

  return jsonb_build_object(
    'applicationId', v_application.id,
    'invoiceId', v_invoice.id,
    'patientId', v_invoice.patient_id,
    'amount', v_application.amount,
    'remainingCreditBalance', (v_credit_balance - p_amount)::numeric(12,2),
    'remainingInvoiceOutstanding', (v_outstanding - p_amount)::numeric(12,2),
    'creditLedgerEntryId', v_ledger_entry.id
  );
end;
$$;

revoke all on function public.apply_patient_credit_to_invoice(uuid, numeric) from public, anon;
grant execute on function public.apply_patient_credit_to_invoice(uuid, numeric) to authenticated;

create or replace function public.list_invoice_credit_applications(p_invoice_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_physio_id uuid;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Invoice credit application access requires authentication.' using errcode = '42501';
  end if;

  v_physio_id := private.current_physio_id();

  if not exists (
    select 1 from public.invoices i
     where i.id = p_invoice_id
       and i.physio_id = v_physio_id
  ) then
    raise exception 'Invoice does not belong to the authenticated physiotherapist.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'applicationId', a.id,
      'invoiceId', a.invoice_id,
      'patientId', a.patient_id,
      'amount', a.amount,
      'creditLedgerEntryId', a.credit_ledger_entry_id,
      'createdAt', a.created_at
    ) order by a.created_at, a.id
  ), '[]'::jsonb)
    into v_result
    from public.invoice_credit_applications a
   where a.physio_id = v_physio_id
     and a.invoice_id = p_invoice_id;

  return v_result;
end;
$$;

revoke all on function public.list_invoice_credit_applications(uuid) from public, anon;
grant execute on function public.list_invoice_credit_applications(uuid) to authenticated;

commit;
