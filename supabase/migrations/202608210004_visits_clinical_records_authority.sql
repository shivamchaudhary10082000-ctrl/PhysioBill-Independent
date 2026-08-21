begin;

create or replace function private.current_physio_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  resolved_physio_id uuid;
begin
  select p.id
    into resolved_physio_id
    from public.physiotherapists p
   where p.user_id = (select auth.uid());

  if resolved_physio_id is null then
    raise exception 'Authenticated physiotherapist workspace not found.' using errcode = '42501';
  end if;

  return resolved_physio_id;
end;
$$;

revoke all on function private.current_physio_id() from public, anon, authenticated;

create or replace function private.assign_visit_identity()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  resolved_physio_id uuid;
  visit_year integer;
  next_sequence integer;
begin
  resolved_physio_id := private.current_physio_id();

  if tg_op = 'INSERT' then
    new.physio_id := resolved_physio_id;
    visit_year := extract(year from new.visit_date)::integer;

    perform pg_advisory_xact_lock(hashtextextended(resolved_physio_id::text || ':' || visit_year::text, 0));

    select coalesce(max(right(v.visit_number, 6)::integer), 0) + 1
      into next_sequence
      from public.visits v
     where v.physio_id = resolved_physio_id
       and v.visit_number ~ ('^VIS-' || visit_year::text || '-[0-9]{6}$');

    new.visit_number := 'VIS-' || visit_year::text || '-' || lpad(next_sequence::text, 6, '0');
  else
    if old.physio_id <> resolved_physio_id then
      raise exception 'Visit does not belong to the authenticated physiotherapist.' using errcode = '42501';
    end if;

    new.physio_id := old.physio_id;
    new.visit_number := old.visit_number;
    new.patient_id := old.patient_id;
    new.visit_date := old.visit_date;
  end if;

  return new;
end;
$$;

revoke all on function private.assign_visit_identity() from public, anon, authenticated;

drop trigger if exists visits_assign_identity on public.visits;
create trigger visits_assign_identity
before insert or update on public.visits
for each row
execute function private.assign_visit_identity();

create or replace function private.assign_clinical_record_identity()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  resolved_physio_id uuid;
  resolved_patient_id uuid;
begin
  resolved_physio_id := private.current_physio_id();

  if tg_op = 'UPDATE' then
    new.visit_id := old.visit_id;
  end if;

  select v.patient_id
    into resolved_patient_id
    from public.visits v
   where v.id = new.visit_id
     and v.physio_id = resolved_physio_id;

  if resolved_patient_id is null then
    raise exception 'Clinical record visit does not belong to the authenticated physiotherapist.' using errcode = '42501';
  end if;

  new.physio_id := resolved_physio_id;
  new.patient_id := resolved_patient_id;
  return new;
end;
$$;

revoke all on function private.assign_clinical_record_identity() from public, anon, authenticated;

drop trigger if exists clinical_records_assign_identity on public.clinical_records;
create trigger clinical_records_assign_identity
before insert or update on public.clinical_records
for each row
execute function private.assign_clinical_record_identity();

drop trigger if exists visits_set_updated_at on public.visits;
create trigger visits_set_updated_at
before update on public.visits
for each row
execute function public.set_updated_at();

drop trigger if exists clinical_records_set_updated_at on public.clinical_records;
create trigger clinical_records_set_updated_at
before update on public.clinical_records
for each row
execute function public.set_updated_at();

commit;
