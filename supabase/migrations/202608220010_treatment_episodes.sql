create table public.treatment_episodes (
  id uuid primary key default gen_random_uuid(),
  physio_id uuid not null,
  patient_id uuid not null,
  title text not null default '',
  category text not null default 'Other',
  started_at date not null,
  status text not null default 'ONGOING' check (status in ('LEGACY_UNSPECIFIED','ONGOING','RECOVERED_DISCHARGED','LEFT_DISCONTINUED')),
  status_changed_at timestamptz not null default now(),
  discharge_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint treatment_episodes_patient_owner_fk foreign key (patient_id, physio_id)
    references public.patients (id, physio_id) on delete cascade,
  constraint treatment_episodes_owner_key unique (id, physio_id, patient_id),
  constraint treatment_episodes_category_check check (category in ('Ortho','Neuro','Cardio','Rehab','Pedia','Geriatrics','Other'))
);

create unique index treatment_episodes_one_ongoing_per_patient
  on public.treatment_episodes (physio_id, patient_id)
  where status = 'ONGOING';
create index treatment_episodes_patient_history_idx
  on public.treatment_episodes (physio_id, patient_id, started_at desc, created_at desc);

alter table public.treatment_episodes enable row level security;
create policy treatment_episodes_owner_all
  on public.treatment_episodes
  for all
  to authenticated
  using (private.owns_physio(physio_id))
  with check (private.owns_physio(physio_id));

grant select, insert, update on public.treatment_episodes to authenticated;
revoke delete on public.treatment_episodes from authenticated;

-- Existing Visits prove treatment occurred and therefore can truthfully establish
-- the start of one historical episode per Patient. Their old status cannot be
-- inferred, so it is backfilled as LEGACY_UNSPECIFIED until the therapist acts.
insert into public.treatment_episodes (
  physio_id, patient_id, title, category, started_at, status, status_changed_at, discharge_note
)
select
  p.physio_id,
  p.id,
  coalesce(nullif(btrim(p.condition), ''), 'Historical physiotherapy episode'),
  case
    when p.clinical_category in ('Ortho','Neuro','Cardio','Rehab','Pedia','Geriatrics') then p.clinical_category
    else 'Other'
  end,
  min(v.visit_date),
  'LEGACY_UNSPECIFIED',
  now(),
  ''
from public.patients p
join public.visits v
  on v.patient_id = p.id and v.physio_id = p.physio_id
group by p.physio_id, p.id, p.condition, p.clinical_category;

alter table public.visits add column treatment_episode_id uuid;

alter table public.visits
  add constraint visits_treatment_episode_owner_fk
  foreign key (treatment_episode_id, physio_id, patient_id)
  references public.treatment_episodes (id, physio_id, patient_id)
  on delete restrict;

create index visits_treatment_episode_idx on public.visits (treatment_episode_id, visit_date);

-- The existing Visit identity trigger requires an authenticated browser actor.
-- Disable it only for this controlled historical linkage update.
alter table public.visits disable trigger visits_assign_identity;
update public.visits v
set treatment_episode_id = te.id
from public.treatment_episodes te
where te.physio_id = v.physio_id
  and te.patient_id = v.patient_id
  and te.status = 'LEGACY_UNSPECIFIED'
  and te.started_at = (
    select min(v2.visit_date)
    from public.visits v2
    where v2.physio_id = v.physio_id and v2.patient_id = v.patient_id
  );
alter table public.visits enable trigger visits_assign_identity;

create or replace function private.prepare_treatment_episode()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  resolved_physio_id uuid;
begin
  resolved_physio_id := private.current_physio_id();

  if tg_op = 'INSERT' then
    new.physio_id := resolved_physio_id;
    if not exists (
      select 1 from public.patients p
      where p.id = new.patient_id and p.physio_id = resolved_physio_id
    ) then
      raise exception 'Patient does not belong to the authenticated physiotherapist.' using errcode = '42501';
    end if;
    if new.status <> 'ONGOING' then
      raise exception 'New treatment episodes must start as Ongoing.' using errcode = '23514';
    end if;
    new.title := btrim(new.title);
    if new.title = '' then
      raise exception 'Treatment episode title is required.' using errcode = '23514';
    end if;
    new.discharge_note := '';
    new.status_changed_at := now();
  else
    if old.physio_id <> resolved_physio_id then
      raise exception 'Treatment episode does not belong to the authenticated physiotherapist.' using errcode = '42501';
    end if;
    new.physio_id := old.physio_id;
    new.patient_id := old.patient_id;
    new.title := old.title;
    new.category := old.category;
    new.started_at := old.started_at;
    new.created_at := old.created_at;

    if old.status in ('RECOVERED_DISCHARGED','LEFT_DISCONTINUED') and new.status <> old.status then
      raise exception 'Completed treatment episode status cannot be rewritten. Start a new episode instead.' using errcode = '23514';
    end if;

    if new.status <> old.status then
      if old.status not in ('ONGOING','LEGACY_UNSPECIFIED')
         or new.status not in ('ONGOING','RECOVERED_DISCHARGED','LEFT_DISCONTINUED') then
        raise exception 'Invalid treatment episode status transition.' using errcode = '23514';
      end if;
      new.status_changed_at := now();
    else
      new.status_changed_at := old.status_changed_at;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_treatment_episode() from public;
revoke all on function private.prepare_treatment_episode() from anon;
grant execute on function private.prepare_treatment_episode() to authenticated;

create trigger treatment_episodes_prepare
before insert or update on public.treatment_episodes
for each row execute function private.prepare_treatment_episode();

-- Preserve Visit numbering/date/ownership behavior and add only episode linkage.
-- New Visits attach to the Patient's current Ongoing episode. If none exists,
-- the real Visit date starts a new Ongoing episode using the Patient condition
-- and category as the initial episode snapshot.
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
  resolved_episode_id uuid;
  patient_condition text;
  patient_category text;
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

    if new.treatment_episode_id is not null then
      select te.id into resolved_episode_id
      from public.treatment_episodes te
      where te.id = new.treatment_episode_id
        and te.physio_id = resolved_physio_id
        and te.patient_id = new.patient_id
        and te.status = 'ONGOING';
      if resolved_episode_id is null then
        raise exception 'Visit must belong to an Ongoing treatment episode for this Patient.' using errcode = '23514';
      end if;
    else
      select te.id into resolved_episode_id
      from public.treatment_episodes te
      where te.physio_id = resolved_physio_id
        and te.patient_id = new.patient_id
        and te.status = 'ONGOING'
      order by te.started_at desc, te.created_at desc
      limit 1;

      if resolved_episode_id is null then
        select p.condition, p.clinical_category
          into patient_condition, patient_category
        from public.patients p
        where p.id = new.patient_id and p.physio_id = resolved_physio_id;

        if not found then
          raise exception 'Patient does not belong to the authenticated physiotherapist.' using errcode = '42501';
        end if;

        insert into public.treatment_episodes (
          physio_id, patient_id, title, category, started_at, status
        ) values (
          resolved_physio_id,
          new.patient_id,
          coalesce(nullif(btrim(patient_condition), ''), 'Physiotherapy treatment'),
          case when patient_category in ('Ortho','Neuro','Cardio','Rehab','Pedia','Geriatrics') then patient_category else 'Other' end,
          new.visit_date,
          'ONGOING'
        ) returning id into resolved_episode_id;
      end if;
    end if;

    new.treatment_episode_id := resolved_episode_id;
  else
    if old.physio_id <> resolved_physio_id then
      raise exception 'Visit does not belong to the authenticated physiotherapist.' using errcode = '42501';
    end if;
    new.physio_id := old.physio_id;
    new.visit_number := old.visit_number;
    new.patient_id := old.patient_id;
    new.visit_date := old.visit_date;
    new.treatment_episode_id := old.treatment_episode_id;
  end if;

  return new;
end;
$$;

revoke all on function private.assign_visit_identity() from public;
revoke all on function private.assign_visit_identity() from anon;
grant execute on function private.assign_visit_identity() to authenticated;
