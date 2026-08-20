begin;

create schema if not exists private;

create or replace function private.owns_physio(target_physio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.physiotherapists p
    where p.id = target_physio_id
      and p.user_id = (select auth.uid())
  );
$$;

revoke all on function private.owns_physio(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.owns_physio(uuid) to authenticated;

alter policy profiles_owner_all on public.physiotherapist_profiles
  using (private.owns_physio(physio_id))
  with check (private.owns_physio(physio_id));
alter policy settings_owner_all on public.physiotherapist_settings
  using (private.owns_physio(physio_id))
  with check (private.owns_physio(physio_id));
alter policy patients_owner_all on public.patients
  using (private.owns_physio(physio_id))
  with check (private.owns_physio(physio_id));
alter policy relationships_owner_all on public.physio_patient_relationships
  using (private.owns_physio(physio_id))
  with check (private.owns_physio(physio_id));
alter policy visits_owner_all on public.visits
  using (private.owns_physio(physio_id))
  with check (private.owns_physio(physio_id));
alter policy clinical_records_owner_all on public.clinical_records
  using (private.owns_physio(physio_id))
  with check (private.owns_physio(physio_id));
alter policy invoices_owner_all on public.invoices
  using (private.owns_physio(physio_id))
  with check (private.owns_physio(physio_id));
alter policy invoice_audit_owner_select on public.invoice_audit_entries
  using (private.owns_physio(physio_id));
alter policy payments_owner_select on public.payments
  using (private.owns_physio(physio_id));

drop function public.owns_physio(uuid);

-- Trigger-only provisioning function: never expose it through the Data API.
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

commit;
