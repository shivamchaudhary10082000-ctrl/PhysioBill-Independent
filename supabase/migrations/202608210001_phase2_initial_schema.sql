begin;

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'physio' check (role in ('physio', 'patient')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.physiotherapists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.physiotherapist_profiles (
  physio_id uuid primary key references public.physiotherapists(id) on delete cascade,
  full_name text not null default '',
  title text not null default 'Physiotherapist',
  qualification text not null default '',
  registration text not null default '',
  pan text not null default '',
  gstin text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  logo_url text not null default '',
  upi_name text not null default '',
  upi_id text not null default '',
  bank_name text not null default '',
  account_number_display text not null default '',
  ifsc_display text not null default '',
  invoice_prefix text not null default 'PB',
  payment_account_id text,
  payment_account_status text not null default 'not_connected' check (payment_account_status in ('not_connected', 'pending', 'connected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.physiotherapist_settings (
  physio_id uuid primary key references public.physiotherapists(id) on delete cascade,
  practice_name text not null default '',
  default_payment text not null default 'Select payment method',
  footer_note text not null default 'Thank you for choosing independent physiotherapy care.',
  show_gst boolean not null default false,
  date_format text not null default 'DD MMM YYYY',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  physio_id uuid not null references public.physiotherapists(id) on delete cascade,
  user_id uuid unique references public.app_users(id) on delete set null,
  patient_number text not null,
  name text not null,
  phone text not null default '', email text not null default '', address text not null default '', age text not null default '', condition text not null default '', referring_doctor text not null default '', referral_date date, insurance_tpa text not null default '', policy_member_id text not null default '', notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (physio_id, patient_number), unique (id, physio_id)
);

create table if not exists public.physio_patient_relationships (
  id uuid primary key default gen_random_uuid(), physio_id uuid not null references public.physiotherapists(id) on delete cascade, patient_id uuid not null, status text not null default 'active' check (status in ('active', 'inactive')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (physio_id, patient_id), foreign key (patient_id, physio_id) references public.patients(id, physio_id) on delete cascade
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(), physio_id uuid not null references public.physiotherapists(id) on delete cascade, patient_id uuid not null, visit_number text not null, visit_date date not null, treatment text not null default '', modalities text not null default '', exercises text not null default '', duration_minutes integer check (duration_minutes is null or duration_minutes >= 0), notes text not null default '', "authorization" text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (physio_id, visit_number), unique (id, physio_id), foreign key (patient_id, physio_id) references public.patients(id, physio_id) on delete restrict
);

create table if not exists public.clinical_records (
  id uuid primary key default gen_random_uuid(), physio_id uuid not null references public.physiotherapists(id) on delete cascade, patient_id uuid not null, visit_id uuid not null, subjective text not null default '', objective text not null default '', assessment text not null default '', goals text not null default '', plan text not null default '', treatment text not null default '', hep text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (visit_id), foreign key (patient_id, physio_id) references public.patients(id, physio_id) on delete restrict, foreign key (visit_id, physio_id) references public.visits(id, physio_id) on delete cascade
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(), physio_id uuid not null references public.physiotherapists(id) on delete cascade, patient_id uuid not null, invoice_number text not null, description text not null default '', sessions text not null default '', start_date date, end_date date, fee numeric(12,2) not null default 0 check (fee >= 0), additional numeric(12,2) not null default 0 check (additional >= 0), additional_description text not null default '', discount numeric(12,2) not null default 0 check (discount >= 0), gst_rate numeric(5,2) not null default 0 check (gst_rate >= 0), total numeric(12,2) not null default 0 check (total >= 0), paid numeric(12,2) not null default 0 check (paid >= 0 and paid <= total), payment_method text not null default 'Select payment method', finalized boolean not null default false, status text not null default 'Draft' check (status in ('Draft', 'Outstanding', 'Part paid', 'Paid')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (physio_id, invoice_number), unique (id, physio_id), foreign key (patient_id, physio_id) references public.patients(id, physio_id) on delete restrict
);

create table if not exists public.invoice_audit_entries (
  id uuid primary key default gen_random_uuid(), physio_id uuid not null references public.physiotherapists(id) on delete cascade, invoice_id uuid not null, action text not null check (action in ('correction', 'edit', 'payment')), reason text not null, changed_at timestamptz not null default now(), changed_by_user_id uuid references public.app_users(id) on delete set null, changed_fields text[] not null default '{}', before_data jsonb not null default '{}'::jsonb, after_data jsonb not null default '{}'::jsonb, foreign key (invoice_id, physio_id) references public.invoices(id, physio_id) on delete cascade
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(), physio_id uuid not null references public.physiotherapists(id) on delete cascade, invoice_id uuid not null, patient_id uuid not null, amount numeric(12,2) not null check (amount > 0), method text not null default '', status text not null default 'recorded' check (status in ('recorded', 'pending', 'succeeded', 'failed', 'refunded')), provider text, provider_payment_id text, provider_connected_account_id text, notes text not null default '', recorded_by_user_id uuid references public.app_users(id) on delete set null, recorded_at timestamptz not null default now(), created_at timestamptz not null default now(), foreign key (invoice_id, physio_id) references public.invoices(id, physio_id) on delete restrict, foreign key (patient_id, physio_id) references public.patients(id, physio_id) on delete restrict
);

create index if not exists patients_physio_id_idx on public.patients(physio_id);
create index if not exists visits_physio_id_patient_id_idx on public.visits(physio_id, patient_id);
create index if not exists invoices_physio_id_patient_id_idx on public.invoices(physio_id, patient_id);
create index if not exists invoice_audit_physio_invoice_idx on public.invoice_audit_entries(physio_id, invoice_id, changed_at desc);
create index if not exists payments_physio_invoice_idx on public.payments(physio_id, invoice_id, recorded_at desc);

create or replace function public.owns_physio(target_physio_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.physiotherapists p where p.id = target_physio_id and p.user_id = auth.uid()); $$;
revoke all on function public.owns_physio(uuid) from public;
grant execute on function public.owns_physio(uuid) to authenticated;

create or replace function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path = public as $$ declare new_physio_id uuid; begin insert into public.app_users (id, role) values (new.id, 'physio') on conflict (id) do nothing; insert into public.physiotherapists (user_id) values (new.id) on conflict (user_id) do update set updated_at = now() returning id into new_physio_id; insert into public.physiotherapist_profiles (physio_id, email) values (new_physio_id, coalesce(new.email, '')) on conflict (physio_id) do nothing; insert into public.physiotherapist_settings (physio_id) values (new_physio_id) on conflict (physio_id) do nothing; return new; end; $$;
revoke all on function public.handle_new_auth_user() from public;
create or replace trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_auth_user();

alter table public.app_users enable row level security;
alter table public.physiotherapists enable row level security;
alter table public.physiotherapist_profiles enable row level security;
alter table public.physiotherapist_settings enable row level security;
alter table public.patients enable row level security;
alter table public.physio_patient_relationships enable row level security;
alter table public.visits enable row level security;
alter table public.clinical_records enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_audit_entries enable row level security;
alter table public.payments enable row level security;

create policy app_users_select_self on public.app_users for select to authenticated using (id = auth.uid());
create policy physiotherapists_select_self on public.physiotherapists for select to authenticated using (user_id = auth.uid());
create policy profiles_owner_all on public.physiotherapist_profiles for all to authenticated using (public.owns_physio(physio_id)) with check (public.owns_physio(physio_id));
create policy settings_owner_all on public.physiotherapist_settings for all to authenticated using (public.owns_physio(physio_id)) with check (public.owns_physio(physio_id));
create policy patients_owner_all on public.patients for all to authenticated using (public.owns_physio(physio_id)) with check (public.owns_physio(physio_id));
create policy relationships_owner_all on public.physio_patient_relationships for all to authenticated using (public.owns_physio(physio_id)) with check (public.owns_physio(physio_id));
create policy visits_owner_all on public.visits for all to authenticated using (public.owns_physio(physio_id)) with check (public.owns_physio(physio_id));
create policy clinical_records_owner_all on public.clinical_records for all to authenticated using (public.owns_physio(physio_id)) with check (public.owns_physio(physio_id));
create policy invoices_owner_all on public.invoices for all to authenticated using (public.owns_physio(physio_id)) with check (public.owns_physio(physio_id));
create policy invoice_audit_owner_select on public.invoice_audit_entries for select to authenticated using (public.owns_physio(physio_id));
create policy invoice_audit_owner_insert on public.invoice_audit_entries for insert to authenticated with check (public.owns_physio(physio_id) and changed_by_user_id = auth.uid() and length(trim(reason)) > 0);
create policy payments_owner_select on public.payments for select to authenticated using (public.owns_physio(physio_id));

commit;
