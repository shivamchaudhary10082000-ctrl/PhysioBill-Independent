begin;

create table public.patient_credit_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  physio_id uuid not null references public.physiotherapists(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  entry_type text not null check (entry_type in ('advance_received', 'refund', 'adjustment')),
  amount numeric(12,2) not null check (amount <> 0),
  reason text not null default '',
  occurred_at timestamptz not null default now(),
  recorded_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  constraint patient_credit_ledger_entry_shape check (
    (entry_type = 'advance_received' and amount > 0)
    or (entry_type = 'refund' and amount < 0)
    or (entry_type = 'adjustment' and amount <> 0 and btrim(reason) <> '')
  )
);

create index patient_credit_ledger_entries_owner_patient_time_idx
  on public.patient_credit_ledger_entries (physio_id, patient_id, occurred_at, id);

alter table public.patient_credit_ledger_entries enable row level security;
revoke all on table public.patient_credit_ledger_entries from public, anon, authenticated;

create or replace function private.reject_patient_credit_ledger_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Patient credit ledger entries are append-only.' using errcode = '42501';
end;
$$;

create trigger patient_credit_ledger_entries_append_only
before update or delete on public.patient_credit_ledger_entries
for each row execute function private.reject_patient_credit_ledger_mutation();

create or replace function public.record_patient_credit_ledger_entry(
  p_patient_id uuid,
  p_entry_type text,
  p_amount numeric,
  p_reason text default '',
  p_occurred_at timestamptz default now()
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
  v_current_balance numeric(12,2);
  v_new_balance numeric(12,2);
  v_entry public.patient_credit_ledger_entries%rowtype;
begin
  if v_user_id is null then
    raise exception 'Credit ledger recording requires authentication.' using errcode = '42501';
  end if;

  v_physio_id := private.current_physio_id();

  perform 1
    from public.patients p
   where p.id = p_patient_id
     and p.physio_id = v_physio_id
   for update;

  if not found then
    raise exception 'Patient chart is not owned by the authenticated physiotherapist.' using errcode = '42501';
  end if;

  if p_entry_type not in ('advance_received', 'refund', 'adjustment') then
    raise exception 'Unsupported credit ledger entry type.' using errcode = '22023';
  end if;

  if p_amount is null or round(p_amount, 2) = 0 then
    raise exception 'Credit ledger amount must be non-zero.' using errcode = '22023';
  end if;

  if p_amount <> round(p_amount, 2) then
    raise exception 'Credit ledger amount may contain at most two decimal places.' using errcode = '22023';
  end if;

  if p_entry_type = 'advance_received' and p_amount <= 0 then
    raise exception 'Advance receipts must be positive.' using errcode = '22023';
  end if;

  if p_entry_type = 'refund' and p_amount >= 0 then
    raise exception 'Refunds must be negative.' using errcode = '22023';
  end if;

  if p_entry_type = 'adjustment' and btrim(coalesce(p_reason, '')) = '' then
    raise exception 'Adjustments require a reason.' using errcode = '22023';
  end if;

  if p_occurred_at is null or p_occurred_at > now() + interval '5 minutes' then
    raise exception 'Credit ledger occurrence time is invalid.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_physio_id::text || ':' || p_patient_id::text, 0));

  select coalesce(sum(e.amount), 0)::numeric(12,2)
    into v_current_balance
    from public.patient_credit_ledger_entries e
   where e.physio_id = v_physio_id
     and e.patient_id = p_patient_id;

  v_new_balance := (v_current_balance + p_amount)::numeric(12,2);

  if v_new_balance < 0 then
    raise exception 'Credit ledger balance cannot become negative.' using errcode = '23514';
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
    p_patient_id,
    p_entry_type,
    p_amount,
    btrim(coalesce(p_reason, '')),
    p_occurred_at,
    v_user_id
  ) returning * into v_entry;

  return jsonb_build_object(
    'entryId', v_entry.id,
    'patientId', v_entry.patient_id,
    'entryType', v_entry.entry_type,
    'amount', v_entry.amount,
    'reason', v_entry.reason,
    'occurredAt', v_entry.occurred_at,
    'balance', v_new_balance
  );
end;
$$;

revoke all on function public.record_patient_credit_ledger_entry(uuid, text, numeric, text, timestamptz) from public, anon;
grant execute on function public.record_patient_credit_ledger_entry(uuid, text, numeric, text, timestamptz) to authenticated;

create or replace function public.list_patient_credit_ledger(p_patient_id uuid)
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
    raise exception 'Credit ledger access requires authentication.' using errcode = '42501';
  end if;

  v_physio_id := private.current_physio_id();

  if not exists (
    select 1 from public.patients p
     where p.id = p_patient_id
       and p.physio_id = v_physio_id
  ) then
    raise exception 'Patient chart is not owned by the authenticated physiotherapist.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'patientId', p_patient_id,
    'balance', coalesce(sum(e.amount), 0),
    'entries', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'entryId', e.id,
          'entryType', e.entry_type,
          'amount', e.amount,
          'reason', e.reason,
          'occurredAt', e.occurred_at
        ) order by e.occurred_at, e.id
      ) filter (where e.id is not null),
      '[]'::jsonb
    )
  )
    into v_result
    from public.patient_credit_ledger_entries e
   where e.physio_id = v_physio_id
     and e.patient_id = p_patient_id;

  return coalesce(v_result, jsonb_build_object('patientId', p_patient_id, 'balance', 0, 'entries', '[]'::jsonb));
end;
$$;

revoke all on function public.list_patient_credit_ledger(uuid) from public, anon;
grant execute on function public.list_patient_credit_ledger(uuid) to authenticated;

create or replace function public.list_my_credit_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_platform_patient_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Patient credit access requires authentication.' using errcode = '42501';
  end if;

  select pp.id
    into v_platform_patient_id
    from public.app_users au
    join public.platform_patients pp on pp.user_id = au.id
   where au.id = v_user_id
     and au.role = 'patient';

  if v_platform_patient_id is null then
    raise exception 'Patient credit access is available only to patient accounts.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(item order by linked_at desc, link_id), '[]'::jsonb)
    into v_result
    from (
      select
        l.id as link_id,
        l.linked_at,
        jsonb_build_object(
          'linkId', l.id,
          'linkedAt', l.linked_at,
          'physiotherapistPublicId', p.public_physio_id,
          'balance', coalesce((
            select sum(e.amount)
              from public.patient_credit_ledger_entries e
             where e.physio_id = l.physio_id
               and e.patient_id = l.patient_id
          ), 0),
          'entries', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'entryId', e.id,
                'entryType', e.entry_type,
                'amount', e.amount,
                'reason', e.reason,
                'occurredAt', e.occurred_at
              ) order by e.occurred_at desc, e.id desc
            )
              from public.patient_credit_ledger_entries e
             where e.physio_id = l.physio_id
               and e.patient_id = l.patient_id
          ), '[]'::jsonb)
        ) as item
      from public.platform_patient_clinical_chart_links l
      join public.physiotherapists p on p.id = l.physio_id
      where l.platform_patient_id = v_platform_patient_id
        and l.revoked_at is null
    ) linked_credits;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all on function public.list_my_credit_summary() from public, anon;
grant execute on function public.list_my_credit_summary() to authenticated;

commit;
