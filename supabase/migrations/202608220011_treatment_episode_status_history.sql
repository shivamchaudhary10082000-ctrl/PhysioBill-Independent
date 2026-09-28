begin;

create table public.treatment_episode_status_history (
  id uuid primary key default gen_random_uuid(),
  physio_id uuid not null,
  patient_id uuid not null,
  treatment_episode_id uuid not null,
  event_type text not null,
  from_status text,
  to_status text not null,
  changed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  constraint treatment_episode_status_history_episode_owner_fk
    foreign key (treatment_episode_id, physio_id, patient_id)
    references public.treatment_episodes (id, physio_id, patient_id)
    on delete restrict,
  constraint treatment_episode_status_history_event_type_check
    check (event_type in ('INITIAL_STATE','STATUS_TRANSITION','BACKFILL_STATE')),
  constraint treatment_episode_status_history_from_status_check
    check (
      from_status is null
      or from_status in ('LEGACY_UNSPECIFIED','ONGOING','RECOVERED_DISCHARGED','LEFT_DISCONTINUED')
    ),
  constraint treatment_episode_status_history_to_status_check
    check (to_status in ('LEGACY_UNSPECIFIED','ONGOING','RECOVERED_DISCHARGED','LEFT_DISCONTINUED')),
  constraint treatment_episode_status_history_event_semantics_check
    check (
      (event_type = 'INITIAL_STATE' and from_status is null and to_status = 'ONGOING')
      or
      (event_type = 'BACKFILL_STATE' and from_status is null)
      or
      (
        event_type = 'STATUS_TRANSITION'
        and from_status is not null
        and (
          (from_status = 'ONGOING' and to_status in ('RECOVERED_DISCHARGED','LEFT_DISCONTINUED'))
          or
          (from_status = 'LEGACY_UNSPECIFIED' and to_status in ('ONGOING','RECOVERED_DISCHARGED','LEFT_DISCONTINUED'))
        )
      )
    )
);

create index treatment_episode_status_history_owner_period_idx
  on public.treatment_episode_status_history (physio_id, changed_at, patient_id);
create index treatment_episode_status_history_episode_timeline_idx
  on public.treatment_episode_status_history (treatment_episode_id, changed_at, recorded_at, id);

alter table public.treatment_episode_status_history enable row level security;

create policy treatment_episode_status_history_owner_select
  on public.treatment_episode_status_history
  for select
  to authenticated
  using (private.owns_physio(physio_id));

revoke all on public.treatment_episode_status_history from public, anon, authenticated;
grant select on public.treatment_episode_status_history to authenticated;

create or replace function private.append_treatment_episode_status_history()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.treatment_episode_status_history (
      physio_id,
      patient_id,
      treatment_episode_id,
      event_type,
      from_status,
      to_status,
      changed_at
    ) values (
      new.physio_id,
      new.patient_id,
      new.id,
      'INITIAL_STATE',
      null,
      new.status,
      new.status_changed_at
    );
  elsif new.status is distinct from old.status then
    insert into public.treatment_episode_status_history (
      physio_id,
      patient_id,
      treatment_episode_id,
      event_type,
      from_status,
      to_status,
      changed_at
    ) values (
      new.physio_id,
      new.patient_id,
      new.id,
      'STATUS_TRANSITION',
      old.status,
      new.status,
      new.status_changed_at
    );
  end if;

  return new;
end;
$$;

revoke all on function private.append_treatment_episode_status_history() from public, anon, authenticated;

create trigger treatment_episode_status_history_append
  after insert or update on public.treatment_episodes
  for each row execute function private.append_treatment_episode_status_history();

create or replace function private.reject_treatment_episode_status_history_mutation()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  raise exception 'Treatment Episode status history is append-only.' using errcode = '42501';
end;
$$;

revoke all on function private.reject_treatment_episode_status_history_mutation() from public, anon, authenticated;

create trigger treatment_episode_status_history_no_update
  before update on public.treatment_episode_status_history
  for each row execute function private.reject_treatment_episode_status_history_mutation();

create trigger treatment_episode_status_history_no_delete
  before delete on public.treatment_episode_status_history
  for each row execute function private.reject_treatment_episode_status_history_mutation();

-- Conservative backfill: preserve only the current state and timestamp that the
-- existing treatment_episodes row can actually prove. A current Ongoing row is
-- treated as a genuine initial state only when no post-creation mutation is
-- evidenced by its authoritative timestamps. All other existing rows are stored
-- as BACKFILL_STATE with an unknown prior state rather than inventing history.
insert into public.treatment_episode_status_history (
  physio_id,
  patient_id,
  treatment_episode_id,
  event_type,
  from_status,
  to_status,
  changed_at
)
select
  te.physio_id,
  te.patient_id,
  te.id,
  case
    when te.status = 'ONGOING'
      and te.status_changed_at = te.created_at
      and te.updated_at = te.created_at
      then 'INITIAL_STATE'
    else 'BACKFILL_STATE'
  end,
  null,
  te.status,
  te.status_changed_at
from public.treatment_episodes te;

commit;
