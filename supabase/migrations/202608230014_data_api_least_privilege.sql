begin;

-- The established migration path and every current application object in
-- public/private are owned by postgres. Supabase-managed supabase_admin
-- defaults are intentionally left unchanged.

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Remove that
-- global default only for future functions created by the application owner,
-- then retain the existing service-role default for future public functions.
alter default privileges for role postgres
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- Remove the permissive current-object grants before adding only the bounded
-- authenticated capabilities used by the production repositories.
revoke all privileges on table
  public.app_users,
  public.physiotherapists,
  public.physiotherapist_profiles,
  public.physiotherapist_settings,
  public.patients,
  public.physio_patient_relationships,
  public.visits,
  public.clinical_records,
  public.invoices,
  public.invoice_audit_entries,
  public.payments,
  public.payment_corrections,
  public.treatment_episodes,
  public.treatment_episode_status_history
from public, anon, authenticated;

grant select on table public.app_users to authenticated;
grant select on table public.physiotherapists to authenticated;
grant select, update on table public.physiotherapist_profiles to authenticated;
grant select, update on table public.physiotherapist_settings to authenticated;
grant select, insert, update, delete on table public.patients to authenticated;
grant select, insert, update, delete on table public.visits to authenticated;
grant select, insert, update, delete on table public.clinical_records to authenticated;
grant select, insert, update on table public.invoices to authenticated;
grant select on table public.invoice_audit_entries to authenticated;
grant select, insert on table public.payments to authenticated;
grant select, insert on table public.payment_corrections to authenticated;
grant select, insert, update on table public.treatment_episodes to authenticated;
grant select on table public.treatment_episode_status_history to authenticated;

-- The only application sequence is internal to authoritative status-history
-- ordering and is never a direct Data API capability.
revoke all privileges on sequence
  public.treatment_episode_status_history_event_order_seq
from public, anon, authenticated;

-- These functions are trigger-only. private.owns_physio(uuid) deliberately
-- keeps its authenticated EXECUTE grant because RLS policies require it.
revoke execute on function public.set_updated_at()
  from public, anon, authenticated;
revoke execute on function private.assign_visit_identity()
  from public, anon, authenticated;
revoke execute on function private.prepare_treatment_episode()
  from public, anon, authenticated;

create or replace function private.reject_finalized_invoice_delete()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  if old.finalized then
    raise exception 'Finalized invoices cannot be deleted.' using errcode = '55000';
  end if;

  return old;
end;
$$;

revoke all privileges on function private.reject_finalized_invoice_delete()
  from public, anon, authenticated;

drop trigger if exists invoices_reject_finalized_delete on public.invoices;
create trigger invoices_reject_finalized_delete
before delete on public.invoices
for each row
execute function private.reject_finalized_invoice_delete();

commit;
