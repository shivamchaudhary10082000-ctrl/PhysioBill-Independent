begin;

create table if not exists public.invoice_workspace_archives (
  invoice_id uuid primary key,
  physio_id uuid not null,
  archived_at timestamptz not null default now(),
  foreign key (invoice_id, physio_id)
    references public.invoices(id, physio_id)
    on delete cascade
);

create index if not exists invoice_workspace_archives_physio_idx
  on public.invoice_workspace_archives(physio_id, archived_at desc);

alter table public.invoice_workspace_archives enable row level security;

revoke all privileges on table public.invoice_workspace_archives
  from public, anon, authenticated;
grant select, insert, delete on table public.invoice_workspace_archives
  to authenticated;

drop policy if exists invoice_workspace_archives_owner_select
  on public.invoice_workspace_archives;
create policy invoice_workspace_archives_owner_select
on public.invoice_workspace_archives
for select
to authenticated
using (private.owns_physio(physio_id));

drop policy if exists invoice_workspace_archives_owner_insert
  on public.invoice_workspace_archives;
create policy invoice_workspace_archives_owner_insert
on public.invoice_workspace_archives
for insert
to authenticated
with check (private.owns_physio(physio_id));

drop policy if exists invoice_workspace_archives_owner_delete
  on public.invoice_workspace_archives;
create policy invoice_workspace_archives_owner_delete
on public.invoice_workspace_archives
for delete
to authenticated
using (private.owns_physio(physio_id));

commit;
