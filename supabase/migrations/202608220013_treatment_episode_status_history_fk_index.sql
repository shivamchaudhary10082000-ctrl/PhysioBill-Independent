begin;

create index treatment_episode_status_history_episode_owner_idx
  on public.treatment_episode_status_history (treatment_episode_id, physio_id, patient_id);

commit;
