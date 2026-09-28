create table public.communication_delivery_transitions (
  id uuid primary key default gen_random_uuid(),
  transition_sequence bigint generated always as identity unique,
  communication_event_id uuid not null references public.communication_events(id) on delete restrict,
  channel text not null check (channel in ('sms','whatsapp')),
  attempt_no integer not null check (attempt_no between 1 and 20),
  state text not null check (state in ('queued','dispatch_started','accepted_by_provider','delivered','failed','suppressed')),
  outcome_class text not null default 'none' check (outcome_class in ('none','consent_missing','channel_mismatch','provider_unavailable','provider_rejected','network_error','rate_limited','unknown')),
  recorded_at timestamptz not null default now(),
  constraint communication_delivery_transition_outcome_check check (
    (state in ('queued','dispatch_started','accepted_by_provider','delivered') and outcome_class='none')
    or (state='suppressed' and outcome_class in ('consent_missing','channel_mismatch'))
    or (state='failed' and outcome_class in ('provider_unavailable','provider_rejected','network_error','rate_limited','unknown'))
  ),
  unique (communication_event_id, channel, attempt_no, state)
);

create index communication_delivery_transitions_event_idx
  on public.communication_delivery_transitions(communication_event_id, channel, attempt_no, transition_sequence);

alter table public.communication_delivery_transitions enable row level security;
revoke all privileges on table public.communication_delivery_transitions from public, anon, authenticated, service_role;

create function private.reject_communication_delivery_transition_mutation()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  raise exception 'Communication delivery transitions are append-only.' using errcode='23514';
end;
$$;

revoke all privileges on function private.reject_communication_delivery_transition_mutation() from public, anon, authenticated, service_role;

create trigger communication_delivery_transitions_immutable_update
before update on public.communication_delivery_transitions
for each row execute function private.reject_communication_delivery_transition_mutation();

create trigger communication_delivery_transitions_immutable_delete
before delete on public.communication_delivery_transitions
for each row execute function private.reject_communication_delivery_transition_mutation();

create function public.record_communication_delivery_transition(
  p_communication_event_id uuid,
  p_channel text,
  p_attempt_no integer,
  p_state text,
  p_outcome_class text default 'none'
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_event public.communication_events%rowtype;
  v_app_user_id uuid;
  v_updates boolean;
  v_reminders boolean;
  v_preferred_channel text;
  v_consented_at timestamptz;
  v_opted_in boolean;
  v_existing_state text;
  v_transition_id uuid;
  v_channel text := lower(trim(coalesce(p_channel,'')));
  v_state text := lower(trim(coalesce(p_state,'')));
  v_outcome text := lower(trim(coalesce(p_outcome_class,'none')));
begin
  if p_communication_event_id is null or p_attempt_no is null then
    raise exception 'Event and attempt number are required' using errcode='22004';
  end if;

  if v_channel not in ('sms','whatsapp') then
    raise exception 'Unsupported channel' using errcode='22023';
  end if;

  if p_attempt_no < 1 or p_attempt_no > 20 then
    raise exception 'Attempt number out of range' using errcode='22023';
  end if;

  if v_state not in ('queued','dispatch_started','accepted_by_provider','delivered','failed','suppressed') then
    raise exception 'Unsupported transition state' using errcode='22023';
  end if;

  select *
  into v_event
  from public.communication_events
  where id=p_communication_event_id
  for update;

  if not found then
    raise exception 'Communication event not found' using errcode='P0002';
  end if;

  if v_event.recipient_persona='patient' then
    select pp.user_id
    into v_app_user_id
    from public.platform_patients pp
    where pp.id=v_event.platform_patient_id;
  elsif v_event.recipient_persona='physio' then
    select ph.user_id
    into v_app_user_id
    from public.physiotherapists ph
    where ph.id=v_event.physio_id;
  end if;

  if v_app_user_id is null then
    raise exception 'Recipient application identity unavailable' using errcode='42501';
  end if;

  select
    cp.appointment_updates_opt_in,
    cp.appointment_reminders_opt_in,
    cp.preferred_external_channel,
    cp.consented_at
  into v_updates, v_reminders, v_preferred_channel, v_consented_at
  from public.communication_preferences cp
  where cp.app_user_id=v_app_user_id;

  v_opted_in := coalesce(
    case
      when v_event.event_type in ('appointment_reminder_24h','appointment_reminder_2h') then v_reminders
      else v_updates
    end,
    false
  ) and v_consented_at is not null;

  if v_state='queued' then
    if not v_opted_in then
      raise exception 'External communication consent is not active' using errcode='42501';
    end if;

    if v_preferred_channel is distinct from v_channel then
      raise exception 'Requested channel does not match recipient preference' using errcode='42501';
    end if;

    if v_outcome <> 'none' then
      raise exception 'Queued transition cannot carry outcome class' using errcode='22023';
    end if;

    if exists(
      select 1
      from public.communication_delivery_transitions t
      where t.communication_event_id=v_event.id
        and t.channel=v_channel
        and t.attempt_no=p_attempt_no
    ) then
      raise exception 'Attempt already exists' using errcode='23505';
    end if;
  elsif v_state='suppressed' then
    if v_opted_in and v_preferred_channel=v_channel then
      raise exception 'Suppression is invalid while consent and channel are active' using errcode='22023';
    end if;

    v_outcome := case when not v_opted_in then 'consent_missing' else 'channel_mismatch' end;

    if exists(
      select 1
      from public.communication_delivery_transitions t
      where t.communication_event_id=v_event.id
        and t.channel=v_channel
        and t.attempt_no=p_attempt_no
    ) then
      raise exception 'Attempt already exists' using errcode='23505';
    end if;
  else
    select t.state
    into v_existing_state
    from public.communication_delivery_transitions t
    where t.communication_event_id=v_event.id
      and t.channel=v_channel
      and t.attempt_no=p_attempt_no
    order by t.transition_sequence desc
    limit 1;

    if v_existing_state is null then
      raise exception 'Attempt must be queued before transport transitions' using errcode='23514';
    end if;

    if v_existing_state in ('delivered','failed','suppressed') then
      raise exception 'Attempt is already terminal' using errcode='23514';
    end if;

    if v_state='dispatch_started' and v_existing_state <> 'queued' then
      raise exception 'dispatch_started requires queued' using errcode='23514';
    end if;

    if v_state='accepted_by_provider' and v_existing_state <> 'dispatch_started' then
      raise exception 'accepted_by_provider requires dispatch_started' using errcode='23514';
    end if;

    if v_state='delivered' and v_existing_state <> 'accepted_by_provider' then
      raise exception 'delivered requires accepted_by_provider' using errcode='23514';
    end if;

    if v_state in ('dispatch_started','accepted_by_provider','delivered') and v_outcome <> 'none' then
      raise exception 'Non-terminal success transition cannot carry outcome class' using errcode='22023';
    end if;

    if v_state='failed' and v_outcome not in ('provider_unavailable','provider_rejected','network_error','rate_limited','unknown') then
      raise exception 'Failed transition requires a bounded failure class' using errcode='22023';
    end if;
  end if;

  insert into public.communication_delivery_transitions(
    communication_event_id,
    channel,
    attempt_no,
    state,
    outcome_class
  )
  values(
    v_event.id,
    v_channel,
    p_attempt_no,
    v_state,
    v_outcome
  )
  returning id into v_transition_id;

  return v_transition_id;
end;
$$;

revoke all privileges on function public.record_communication_delivery_transition(uuid,text,integer,text,text) from public, anon, authenticated, service_role;
grant execute on function public.record_communication_delivery_transition(uuid,text,integer,text,text) to service_role;

comment on table public.communication_delivery_transitions is
  'Append-only provider-neutral transport evidence. Stores no phone numbers, message bodies, provider identifiers, secrets, clinical data, payment data, or identity authority.';
comment on column public.communication_delivery_transitions.transition_sequence is
  'Database-ordered transport transition sequence; not provider evidence or application authority.';
comment on function public.record_communication_delivery_transition(uuid,text,integer,text,text) is
  'Service-role-only transport audit recorder. Consent/channel checks gate queueing; transport states never alter appointment, identity, clinical, or financial authority.';
