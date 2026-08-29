begin;

create table public.invoice_credit_application_reversals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.invoice_credit_applications(id) on delete restrict,
  physio_id uuid not null references public.physiotherapists(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  restoring_credit_ledger_entry_id uuid not null unique references public.patient_credit_ledger_entries(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  reason text not null check (length(btrim(reason)) > 0),
  reversed_by_user_id uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint invoice_credit_application_reversals_invoice_physio_fkey
    foreign key (invoice_id, physio_id) references public.invoices(id, physio_id) on delete restrict
);

create index invoice_credit_application_reversals_owner_invoice_idx
  on public.invoice_credit_application_reversals (physio_id, invoice_id, created_at, id);
create index invoice_credit_application_reversals_owner_patient_idx
  on public.invoice_credit_application_reversals (physio_id, patient_id, created_at, id);

alter table public.invoice_credit_application_reversals enable row level security;
revoke all on table public.invoice_credit_application_reversals from public, anon, authenticated;

create or replace function private.reject_invoice_credit_application_reversal_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Invoice credit application reversals are append-only.' using errcode = '42501';
end;
$$;

create trigger invoice_credit_application_reversals_append_only
before update or delete on public.invoice_credit_application_reversals
for each row execute function private.reject_invoice_credit_application_reversal_mutation();

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
  v_credit_reversed numeric(12,2);
  v_effective_credit numeric(12,2);
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

  select coalesce(sum(r.amount), 0)::numeric(12,2)
    into v_credit_reversed
    from public.invoice_credit_application_reversals r
   where r.invoice_id = target_invoice_id
     and r.physio_id = target_physio_id;

  v_effective_credit := (v_credit_applied - v_credit_reversed)::numeric(12,2);
  if v_effective_credit < 0 then
    raise exception 'Credit application reversals cannot exceed applied credit.' using errcode = '22003';
  end if;

  v_effective_settled := (v_external_paid + v_effective_credit)::numeric(12,2);

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

create or replace function public.reverse_invoice_credit_application(
  p_application_id uuid,
  p_reason text
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
  v_application public.invoice_credit_applications%rowtype;
  v_invoice public.invoices%rowtype;
  v_ledger_entry public.patient_credit_ledger_entries%rowtype;
  v_reversal public.invoice_credit_application_reversals%rowtype;
begin
  if v_user_id is null then
    raise exception 'Reversing an invoice credit application requires authentication.' using errcode = '42501';
  end if;

  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'A reversal reason is required.' using errcode = '22023';
  end if;

  v_physio_id := private.current_physio_id();

  select * into v_application
    from public.invoice_credit_applications a
   where a.id = p_application_id
     and a.physio_id = v_physio_id
   for update;

  if v_application.id is null then
    raise exception 'Credit application does not belong to the authenticated physiotherapist.' using errcode = '42501';
  end if;

  select * into v_invoice
    from public.invoices i
   where i.id = v_application.invoice_id
     and i.physio_id = v_physio_id
   for update;

  if v_invoice.id is null or not v_invoice.finalized then
    raise exception 'Credit application invoice is unavailable or is not finalized.' using errcode = '55000';
  end if;

  perform 1
    from public.patients p
   where p.id = v_application.patient_id
     and p.physio_id = v_physio_id
   for update;

  if not found then
    raise exception 'Credit application patient chart is not owned by the authenticated physiotherapist.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_physio_id::text || ':' || v_application.patient_id::text, 0));

  if exists (
    select 1
      from public.invoice_credit_application_reversals r
     where r.application_id = v_application.id
  ) then
    raise exception 'This invoice credit application has already been reversed.' using errcode = '23505';
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
    v_application.patient_id,
    'adjustment',
    v_application.amount,
    'Reversal of invoice credit application: ' || btrim(p_reason),
    now(),
    v_user_id
  ) returning * into v_ledger_entry;

  insert into public.invoice_credit_application_reversals (
    application_id,
    physio_id,
    patient_id,
    invoice_id,
    restoring_credit_ledger_entry_id,
    amount,
    reason,
    reversed_by_user_id
  ) values (
    v_application.id,
    v_physio_id,
    v_application.patient_id,
    v_application.invoice_id,
    v_ledger_entry.id,
    v_application.amount,
    btrim(p_reason),
    v_user_id
  ) returning * into v_reversal;

  perform private.reconcile_invoice_from_payments(v_application.invoice_id, v_physio_id);

  return jsonb_build_object(
    'reversalId', v_reversal.id,
    'applicationId', v_application.id,
    'invoiceId', v_application.invoice_id,
    'patientId', v_application.patient_id,
    'amount', v_reversal.amount,
    'restoringCreditLedgerEntryId', v_ledger_entry.id,
    'reason', v_reversal.reason,
    'createdAt', v_reversal.created_at
  );
end;
$$;

revoke all on function public.reverse_invoice_credit_application(uuid, text) from public, anon;
grant execute on function public.reverse_invoice_credit_application(uuid, text) to authenticated;

create or replace function public.list_invoice_credit_application_reversals(p_invoice_id uuid)
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
    raise exception 'Invoice credit reversal access requires authentication.' using errcode = '42501';
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
      'reversalId', r.id,
      'applicationId', r.application_id,
      'invoiceId', r.invoice_id,
      'patientId', r.patient_id,
      'amount', r.amount,
      'restoringCreditLedgerEntryId', r.restoring_credit_ledger_entry_id,
      'reason', r.reason,
      'createdAt', r.created_at
    ) order by r.created_at, r.id
  ), '[]'::jsonb)
    into v_result
    from public.invoice_credit_application_reversals r
   where r.physio_id = v_physio_id
     and r.invoice_id = p_invoice_id;

  return v_result;
end;
$$;

revoke all on function public.list_invoice_credit_application_reversals(uuid) from public, anon;
grant execute on function public.list_invoice_credit_application_reversals(uuid) to authenticated;

commit;
