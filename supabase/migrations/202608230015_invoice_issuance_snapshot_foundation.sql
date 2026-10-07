begin;

alter table public.invoices
  add column if not exists finalized_at timestamptz;

create table if not exists public.invoice_issuance_snapshots (
  invoice_id uuid primary key,
  physio_id uuid not null,
  patient_id uuid not null,
  invoice_number text not null,
  snapshot_schema_version integer not null default 1 check (snapshot_schema_version > 0),
  issued_at timestamptz,
  captured_at timestamptz not null default now(),
  provenance text not null check (provenance in ('issued', 'legacy_backfill')),

  therapist_full_name text not null default '',
  therapist_title text not null default '',
  practice_name text not null default '',
  therapist_qualification text not null default '',
  therapist_registration text not null default '',
  therapist_phone text not null default '',
  therapist_email text not null default '',
  practice_address text not null default '',
  therapist_pan text not null default '',
  therapist_gstin text not null default '',
  therapist_logo_url text not null default '',

  patient_name text not null,
  patient_number text not null,
  patient_phone text not null default '',
  patient_email text not null default '',
  patient_address text not null default '',

  description text not null default '',
  sessions text not null default '',
  service_start_date date,
  service_end_date date,
  fee numeric(12,2) not null check (fee >= 0),
  additional numeric(12,2) not null check (additional >= 0),
  additional_description text not null default '',
  discount numeric(12,2) not null check (discount >= 0),
  gst_rate numeric(5,2) not null check (gst_rate >= 0),
  total numeric(12,2) not null check (total >= 0),
  payment_method text not null default '',

  foreign key (invoice_id, physio_id)
    references public.invoices(id, physio_id)
    on delete restrict,
  foreign key (patient_id, physio_id)
    references public.patients(id, physio_id)
    on delete restrict
);

create index if not exists invoice_issuance_snapshots_physio_idx
  on public.invoice_issuance_snapshots(physio_id);
create index if not exists invoice_issuance_snapshots_patient_physio_idx
  on public.invoice_issuance_snapshots(patient_id, physio_id);

alter table public.invoice_issuance_snapshots enable row level security;

revoke all privileges on table public.invoice_issuance_snapshots
  from public, anon, authenticated;
grant select on table public.invoice_issuance_snapshots to authenticated;

drop policy if exists invoice_issuance_snapshots_owner_select
  on public.invoice_issuance_snapshots;
create policy invoice_issuance_snapshots_owner_select
on public.invoice_issuance_snapshots
for select
to authenticated
using (private.owns_physio(physio_id));

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
    new.finalized_at := case when coalesce(new.finalized, false) then now() else null end;
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
      new.finalized_at := old.finalized_at;
    else
      new.paid := old.paid;
      new.finalized_at := case
        when not old.finalized and coalesce(new.finalized, false) then now()
        else null
      end;
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

revoke all privileges on function private.assign_invoice_identity()
  from public, anon, authenticated;

create or replace function private.capture_invoice_issuance_snapshot()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  if not new.finalized then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.finalized then
    return new;
  end if;

  insert into public.invoice_issuance_snapshots (
    invoice_id,
    physio_id,
    patient_id,
    invoice_number,
    snapshot_schema_version,
    issued_at,
    captured_at,
    provenance,
    therapist_full_name,
    therapist_title,
    practice_name,
    therapist_qualification,
    therapist_registration,
    therapist_phone,
    therapist_email,
    practice_address,
    therapist_pan,
    therapist_gstin,
    therapist_logo_url,
    patient_name,
    patient_number,
    patient_phone,
    patient_email,
    patient_address,
    description,
    sessions,
    service_start_date,
    service_end_date,
    fee,
    additional,
    additional_description,
    discount,
    gst_rate,
    total,
    payment_method
  )
  select
    new.id,
    new.physio_id,
    new.patient_id,
    new.invoice_number,
    1,
    new.finalized_at,
    now(),
    'issued',
    coalesce(pp.full_name, ''),
    coalesce(pp.title, ''),
    coalesce(ps.practice_name, ''),
    coalesce(pp.qualification, ''),
    coalesce(pp.registration, ''),
    coalesce(pp.phone, ''),
    coalesce(pp.email, ''),
    coalesce(pp.address, ''),
    coalesce(pp.pan, ''),
    coalesce(pp.gstin, ''),
    coalesce(pp.logo_url, ''),
    p.name,
    p.patient_number,
    coalesce(p.phone, ''),
    coalesce(p.email, ''),
    coalesce(p.address, ''),
    new.description,
    new.sessions,
    new.start_date,
    new.end_date,
    new.fee,
    new.additional,
    new.additional_description,
    new.discount,
    new.gst_rate,
    new.total,
    new.payment_method
  from public.patients p
  left join public.physiotherapist_profiles pp
    on pp.physio_id = new.physio_id
  left join public.physiotherapist_settings ps
    on ps.physio_id = new.physio_id
  where p.id = new.patient_id
    and p.physio_id = new.physio_id;

  if not found then
    raise exception 'Unable to capture invoice issuance snapshot.' using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all privileges on function private.capture_invoice_issuance_snapshot()
  from public, anon, authenticated;

drop trigger if exists invoices_capture_issuance_snapshot on public.invoices;
create trigger invoices_capture_issuance_snapshot
after insert or update on public.invoices
for each row
execute function private.capture_invoice_issuance_snapshot();

insert into public.invoice_issuance_snapshots (
  invoice_id,
  physio_id,
  patient_id,
  invoice_number,
  snapshot_schema_version,
  issued_at,
  captured_at,
  provenance,
  therapist_full_name,
  therapist_title,
  practice_name,
  therapist_qualification,
  therapist_registration,
  therapist_phone,
  therapist_email,
  practice_address,
  therapist_pan,
  therapist_gstin,
  therapist_logo_url,
  patient_name,
  patient_number,
  patient_phone,
  patient_email,
  patient_address,
  description,
  sessions,
  service_start_date,
  service_end_date,
  fee,
  additional,
  additional_description,
  discount,
  gst_rate,
  total,
  payment_method
)
select
  i.id,
  i.physio_id,
  i.patient_id,
  i.invoice_number,
  1,
  null,
  now(),
  'legacy_backfill',
  coalesce(pp.full_name, ''),
  coalesce(pp.title, ''),
  coalesce(ps.practice_name, ''),
  coalesce(pp.qualification, ''),
  coalesce(pp.registration, ''),
  coalesce(pp.phone, ''),
  coalesce(pp.email, ''),
  coalesce(pp.address, ''),
  coalesce(pp.pan, ''),
  coalesce(pp.gstin, ''),
  coalesce(pp.logo_url, ''),
  p.name,
  p.patient_number,
  coalesce(p.phone, ''),
  coalesce(p.email, ''),
  coalesce(p.address, ''),
  i.description,
  i.sessions,
  i.start_date,
  i.end_date,
  i.fee,
  i.additional,
  i.additional_description,
  i.discount,
  i.gst_rate,
  i.total,
  i.payment_method
from public.invoices i
join public.patients p
  on p.id = i.patient_id
 and p.physio_id = i.physio_id
left join public.physiotherapist_profiles pp
  on pp.physio_id = i.physio_id
left join public.physiotherapist_settings ps
  on ps.physio_id = i.physio_id
where i.finalized
  and not exists (
    select 1
    from public.invoice_issuance_snapshots s
    where s.invoice_id = i.id
  );

create or replace function private.reject_invoice_issuance_snapshot_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  raise exception 'Invoice issuance snapshots are immutable.' using errcode = '55000';
end;
$$;

revoke all privileges on function private.reject_invoice_issuance_snapshot_mutation()
  from public, anon, authenticated;

drop trigger if exists invoice_issuance_snapshots_reject_mutation
  on public.invoice_issuance_snapshots;
create trigger invoice_issuance_snapshots_reject_mutation
before update or delete on public.invoice_issuance_snapshots
for each row
execute function private.reject_invoice_issuance_snapshot_mutation();

commit;
