begin;

create table public.platform_patient_clinical_chart_links (
  id uuid primary key default gen_random_uuid(),
  platform_patient_id uuid not null,
  patient_id uuid not null,
  physio_id uuid not null,
  linked_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint platform_patient_clinical_chart_links_platform_patient_fkey
    foreign key (platform_patient_id)
    references public.platform_patients(id)
    on delete restrict,
  constraint platform_patient_clinical_chart_links_patient_owner_fkey
    foreign key (patient_id, physio_id)
    references public.patients(id, physio_id)
    on delete restrict,
  constraint platform_patient_clinical_chart_links_revoked_at_check
    check (revoked_at is null or revoked_at >= linked_at)
);

create unique index platform_patient_clinical_chart_links_one_active_per_chart_idx
  on public.platform_patient_clinical_chart_links (patient_id, physio_id)
  where revoked_at is null;

create index platform_patient_clinical_chart_links_platform_patient_idx
  on public.platform_patient_clinical_chart_links (platform_patient_id, linked_at desc);

create index platform_patient_clinical_chart_links_active_platform_patient_idx
  on public.platform_patient_clinical_chart_links (platform_patient_id, physio_id, patient_id)
  where revoked_at is null;

create or replace function private.enforce_platform_patient_clinical_chart_link_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Platform patient clinical chart links cannot be deleted.'
      using errcode = '55000';
  end if;

  if old.platform_patient_id is distinct from new.platform_patient_id
     or old.patient_id is distinct from new.patient_id
     or old.physio_id is distinct from new.physio_id
     or old.linked_at is distinct from new.linked_at then
    raise exception 'Platform patient clinical chart link identity is immutable.'
      using errcode = '55000';
  end if;

  if old.revoked_at is not null then
    raise exception 'Revoked platform patient clinical chart links are immutable.'
      using errcode = '55000';
  end if;

  if new.revoked_at is null then
    raise exception 'The only permitted link update is active to revoked.'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_platform_patient_clinical_chart_link_lifecycle()
from public, anon, authenticated, service_role;

create trigger platform_patient_clinical_chart_links_lifecycle_guard
before update or delete on public.platform_patient_clinical_chart_links
for each row
execute function private.enforce_platform_patient_clinical_chart_link_lifecycle();

alter table public.platform_patient_clinical_chart_links enable row level security;

revoke all privileges on table public.platform_patient_clinical_chart_links
from public, anon, authenticated, service_role;

commit;
