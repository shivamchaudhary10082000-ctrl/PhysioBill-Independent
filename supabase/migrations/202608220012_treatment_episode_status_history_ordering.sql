begin;

alter table public.treatment_episode_status_history
  add column event_order bigint generated always as identity;

alter table public.treatment_episode_status_history
  add constraint treatment_episode_status_history_event_order_key unique (event_order);

drop index public.treatment_episode_status_history_episode_timeline_idx;
create index treatment_episode_status_history_episode_timeline_idx
  on public.treatment_episode_status_history (treatment_episode_id, event_order);

commit;
