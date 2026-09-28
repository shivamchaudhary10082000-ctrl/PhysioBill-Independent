begin;

alter table public.patients
  add column if not exists sex text not null default '',
  add column if not exists occupation text not null default '',
  add column if not exists referred boolean not null default false,
  add column if not exists clinical_category text not null default '';

alter table public.patients
  drop constraint if exists patients_clinical_category_check;

alter table public.patients
  add constraint patients_clinical_category_check
  check (clinical_category in ('', 'Ortho', 'Neuro', 'Pedia', 'Geriatrics'));

alter table public.clinical_records
  add column if not exists chief_complaint text not null default '',
  add column if not exists previous_treatment text not null default '',
  add column if not exists past_history text not null default '',
  add column if not exists family_history text not null default '',
  add column if not exists other_medical_conditions text not null default '',
  add column if not exists bp text not null default '',
  add column if not exists thyroid text not null default '',
  add column if not exists diabetes text not null default '',
  add column if not exists allergies text not null default '',
  add column if not exists other_illness text not null default '',
  add column if not exists current_medications text not null default '',
  add column if not exists pain_scale smallint,
  add column if not exists pain_type text not null default '',
  add column if not exists posture text not null default '',
  add column if not exists diagnosis text not null default '',
  add column if not exists treatment_plan text not null default '';

alter table public.clinical_records
  drop constraint if exists clinical_records_pain_scale_check;

alter table public.clinical_records
  add constraint clinical_records_pain_scale_check
  check (pain_scale is null or pain_scale between 0 and 10);

create index if not exists clinical_records_patient_visit_idx
  on public.clinical_records (patient_id, visit_id);

commit;
