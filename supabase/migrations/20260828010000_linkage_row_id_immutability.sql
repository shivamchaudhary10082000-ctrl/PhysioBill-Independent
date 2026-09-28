begin;

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

  if old.id is distinct from new.id
     or old.platform_patient_id is distinct from new.platform_patient_id
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

commit;
