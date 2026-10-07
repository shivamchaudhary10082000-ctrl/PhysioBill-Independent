-- Therapist operating analytics authority.
-- Aggregate-only, therapist-scoped read model. No patient identifiers are returned.
-- Financial metric is immutable billed total from issuance snapshots and is not settlement evidence.

create or replace function public.get_my_therapist_operating_analytics(
  p_period_start date,
  p_period_end_exclusive date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_physio_id uuid;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_period_start is null or p_period_end_exclusive is null
     or p_period_end_exclusive <= p_period_start then
    raise exception 'Analytics period must have a valid start and exclusive end date.' using errcode = '22023';
  end if;

  if p_period_end_exclusive - p_period_start > 366 then
    raise exception 'Analytics period cannot exceed 366 days.' using errcode = '22023';
  end if;

  v_physio_id := private.current_physio_id();

  with
  visit_stats as (
    select
      count(*)::bigint as visits,
      count(distinct v.patient_id)::bigint as patients_treated,
      count(*) filter (where v.treatment_episode_id is null)::bigint as unlinked_visits,
      coalesce(sum(v.duration_minutes), 0)::bigint as total_minutes,
      coalesce(round(avg(v.duration_minutes)::numeric, 1), 0)::numeric as average_minutes
    from public.visits v
    where v.physio_id = v_physio_id
      and v.visit_date >= p_period_start
      and v.visit_date < p_period_end_exclusive
  ),
  latest_status as (
    select distinct on (h.treatment_episode_id)
      h.treatment_episode_id,
      h.to_status
    from public.treatment_episode_status_history h
    where h.physio_id = v_physio_id
      and h.changed_at < (p_period_end_exclusive::timestamp at time zone 'UTC')
    order by h.treatment_episode_id, h.changed_at desc, h.event_order desc
  ),
  status_stats as (
    select
      count(*) filter (where ls.to_status = 'ONGOING')::bigint as ongoing_at_period_end
    from latest_status ls
  ),
  outcome_stats as (
    select
      count(*) filter (where h.to_status = 'RECOVERED_DISCHARGED')::bigint as recovered_discharged,
      count(*) filter (where h.to_status = 'LEFT_DISCONTINUED')::bigint as left_discontinued
    from public.treatment_episode_status_history h
    where h.physio_id = v_physio_id
      and h.changed_at >= (p_period_start::timestamp at time zone 'UTC')
      and h.changed_at < (p_period_end_exclusive::timestamp at time zone 'UTC')
  ),
  episode_stats as (
    select count(*)::bigint as new_episodes
    from public.treatment_episodes e
    where e.physio_id = v_physio_id
      and e.started_at >= p_period_start
      and e.started_at < p_period_end_exclusive
  ),
  invoice_stats as (
    select
      count(*)::bigint as finalized_invoices,
      coalesce(sum(s.total), 0)::numeric as billed_total
    from public.invoice_issuance_snapshots s
    where s.physio_id = v_physio_id
      and s.issued_at >= (p_period_start::timestamp at time zone 'UTC')
      and s.issued_at < (p_period_end_exclusive::timestamp at time zone 'UTC')
  )
  select jsonb_build_object(
    'periodStart', p_period_start,
    'periodEndExclusive', p_period_end_exclusive,
    'patientsTreated', vs.patients_treated,
    'visits', vs.visits,
    'unlinkedVisits', vs.unlinked_visits,
    'totalTreatmentMinutes', vs.total_minutes,
    'averageVisitMinutes', vs.average_minutes,
    'newEpisodes', es.new_episodes,
    'ongoingAtPeriodEnd', ss.ongoing_at_period_end,
    'recoveredDischarged', os.recovered_discharged,
    'leftDiscontinued', os.left_discontinued,
    'finalizedInvoices', ins.finalized_invoices,
    'billedTotal', ins.billed_total,
    'billedTotalIsSettlementEvidence', false
  )
  into v_result
  from visit_stats vs
  cross join status_stats ss
  cross join outcome_stats os
  cross join episode_stats es
  cross join invoice_stats ins;

  return v_result;
end;
$$;

revoke all on function public.get_my_therapist_operating_analytics(date, date) from public;
revoke all on function public.get_my_therapist_operating_analytics(date, date) from anon;
grant execute on function public.get_my_therapist_operating_analytics(date, date) to authenticated;
