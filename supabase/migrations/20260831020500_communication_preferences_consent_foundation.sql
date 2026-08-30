-- Communication preferences / consent foundation
-- Provider-neutral, non-clinical, non-financial authority.

create table if not exists public.communication_preferences (
  app_user_id uuid primary key references public.app_users(id) on delete cascade,
  appointment_updates_opt_in boolean not null default false,
  appointment_reminders_opt_in boolean not null default false,
  preferred_external_channel text not null default 'none',
  consent_version integer not null default 1,
  consented_at timestamptz,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_preferences_channel_check
    check (preferred_external_channel in ('none', 'sms', 'whatsapp')),
  constraint communication_preferences_consent_version_check
    check (consent_version >= 1),
  constraint communication_preferences_revision_check
    check (revision >= 1),
  constraint communication_preferences_opt_in_consistency_check
    check (
      (
        appointment_updates_opt_in = false
        and appointment_reminders_opt_in = false
        and preferred_external_channel = 'none'
        and consented_at is null
      )
      or
      (
        (appointment_updates_opt_in = true or appointment_reminders_opt_in = true)
        and preferred_external_channel in ('sms', 'whatsapp')
        and consented_at is not null
      )
    )
);

alter table public.communication_preferences enable row level security;

revoke all on table public.communication_preferences from public;
revoke all on table public.communication_preferences from anon;
revoke all on table public.communication_preferences from authenticated;

create or replace function public.get_my_communication_preferences()
returns table (
  appointment_updates_opt_in boolean,
  appointment_reminders_opt_in boolean,
  preferred_external_channel text,
  consent_version integer,
  consented_at timestamptz,
  revision bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.app_users au
    where au.id = v_user_id
      and au.role in ('patient', 'physio')
  ) then
    raise exception 'Unsupported application persona' using errcode = '42501';
  end if;

  insert into public.communication_preferences (app_user_id)
  values (v_user_id)
  on conflict (app_user_id) do nothing;

  return query
  select
    cp.appointment_updates_opt_in,
    cp.appointment_reminders_opt_in,
    cp.preferred_external_channel,
    cp.consent_version,
    cp.consented_at,
    cp.revision,
    cp.updated_at
  from public.communication_preferences cp
  where cp.app_user_id = v_user_id;
end;
$$;

create or replace function public.set_my_communication_preferences(
  p_appointment_updates_opt_in boolean,
  p_appointment_reminders_opt_in boolean,
  p_preferred_external_channel text,
  p_expected_revision bigint
)
returns table (
  appointment_updates_opt_in boolean,
  appointment_reminders_opt_in boolean,
  preferred_external_channel text,
  consent_version integer,
  consented_at timestamptz,
  revision bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_revision bigint;
  v_any_opt_in boolean;
  v_channel text := lower(trim(coalesce(p_preferred_external_channel, '')));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_appointment_updates_opt_in is null
     or p_appointment_reminders_opt_in is null
     or p_expected_revision is null then
    raise exception 'Explicit preferences and expected revision are required' using errcode = '22004';
  end if;

  if not exists (
    select 1
    from public.app_users au
    where au.id = v_user_id
      and au.role in ('patient', 'physio')
  ) then
    raise exception 'Unsupported application persona' using errcode = '42501';
  end if;

  insert into public.communication_preferences (app_user_id)
  values (v_user_id)
  on conflict (app_user_id) do nothing;

  select cp.revision
  into v_current_revision
  from public.communication_preferences cp
  where cp.app_user_id = v_user_id
  for update;

  if v_current_revision <> p_expected_revision then
    raise exception 'Communication preferences changed; refresh before saving'
      using errcode = '40001';
  end if;

  v_any_opt_in := p_appointment_updates_opt_in or p_appointment_reminders_opt_in;

  if v_any_opt_in and v_channel not in ('sms', 'whatsapp') then
    raise exception 'An external channel is required when external communications are enabled'
      using errcode = '22023';
  end if;

  if not v_any_opt_in then
    v_channel := 'none';
  end if;

  update public.communication_preferences cp
  set appointment_updates_opt_in = p_appointment_updates_opt_in,
      appointment_reminders_opt_in = p_appointment_reminders_opt_in,
      preferred_external_channel = v_channel,
      consented_at = case when v_any_opt_in then now() else null end,
      revision = cp.revision + 1,
      updated_at = now()
  where cp.app_user_id = v_user_id;

  return query
  select
    cp.appointment_updates_opt_in,
    cp.appointment_reminders_opt_in,
    cp.preferred_external_channel,
    cp.consent_version,
    cp.consented_at,
    cp.revision,
    cp.updated_at
  from public.communication_preferences cp
  where cp.app_user_id = v_user_id;
end;
$$;

revoke all on function public.get_my_communication_preferences() from public;
revoke all on function public.get_my_communication_preferences() from anon;
grant execute on function public.get_my_communication_preferences() to authenticated;

revoke all on function public.set_my_communication_preferences(boolean, boolean, text, bigint) from public;
revoke all on function public.set_my_communication_preferences(boolean, boolean, text, bigint) from anon;
grant execute on function public.set_my_communication_preferences(boolean, boolean, text, bigint) to authenticated;

comment on table public.communication_preferences is
  'Provider-neutral external communication preferences. Stores no address/phone/provider/template, clinical, or financial data.';
comment on column public.communication_preferences.app_user_id is
  'Auth/application user root only; does not represent PAT/PHY or therapist-owned clinical chart identity.';
comment on column public.communication_preferences.consent_version is
  'Version of the application consent semantics, not an external provider template/version.';
comment on column public.communication_preferences.revision is
  'Optimistic concurrency token; callers must refresh before overwriting a newer preference state.';
