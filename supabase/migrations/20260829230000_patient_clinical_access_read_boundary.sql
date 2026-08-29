begin;

-- Patient clinical access is a deliberately narrow read model.
-- PAT identity + active therapist-owned chart linkage is required.
-- This does not grant direct table access and intentionally excludes therapist-private notes,
-- subjective/objective assessment detail, past/family history, authorization fields,
-- invoices, payments, or another therapist's chart.
create or replace function public.list_my_clinical_care_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_platform_patient_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Patient clinical access requires authentication.' using errcode = '42501';
  end if;

  select pp.id
    into v_platform_patient_id
    from public.app_users au
    join public.platform_patients pp on pp.user_id = au.id
   where au.id = v_user_id
     and au.role = 'patient';

  if v_platform_patient_id is null then
    raise exception 'Patient clinical access is available only to patient accounts.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(chart_summary order by linked_at desc, link_id), '[]'::jsonb)
    into v_result
    from (
      select
        l.id as link_id,
        l.linked_at,
        p.public_physio_id,
        jsonb_build_object(
          'linkId', l.id,
          'linkedAt', l.linked_at,
          'physiotherapistPublicId', p.public_physio_id,
          'episodes', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'episodeId', e.id,
                'title', e.title,
                'category', e.category,
                'startedAt', e.started_at,
                'status', e.status,
                'statusChangedAt', e.status_changed_at,
                'visits', coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'visitId', v.id,
                      'visitNumber', v.visit_number,
                      'visitDate', v.visit_date,
                      'durationMinutes', v.duration_minutes,
                      'treatment', v.treatment,
                      'exercises', v.exercises,
                      'clinicalSummary', case when cr.id is null then null else jsonb_build_object(
                        'diagnosis', cr.diagnosis,
                        'treatmentPlan', cr.treatment_plan,
                        'homeExerciseProgram', cr.hep
                      ) end
                    ) order by v.visit_date desc, v.id desc
                  )
                  from public.visits v
                  left join public.clinical_records cr
                    on cr.visit_id = v.id
                   and cr.patient_id = l.patient_id
                   and cr.physio_id = l.physio_id
                  where v.patient_id = l.patient_id
                    and v.physio_id = l.physio_id
                    and v.treatment_episode_id = e.id
                ), '[]'::jsonb)
              ) order by e.started_at desc, e.id desc
            )
            from public.treatment_episodes e
            where e.patient_id = l.patient_id
              and e.physio_id = l.physio_id
          ), '[]'::jsonb)
        ) as chart_summary
      from public.platform_patient_clinical_chart_links l
      join public.physiotherapists p on p.id = l.physio_id
      where l.platform_patient_id = v_platform_patient_id
        and l.revoked_at is null
    ) linked_charts;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all privileges on function public.list_my_clinical_care_summary()
  from public, anon, authenticated, service_role;
grant execute on function public.list_my_clinical_care_summary() to authenticated;

commit;
