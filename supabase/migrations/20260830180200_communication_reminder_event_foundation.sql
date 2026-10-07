begin;

create table public.communication_events (
  id uuid primary key default gen_random_uuid(),
  recipient_persona text not null,
  platform_patient_id uuid references public.platform_patients(id) on delete restrict,
  physio_id uuid references public.physiotherapists(id) on delete restrict,
  appointment_request_id uuid not null references public.patient_appointment_requests(id) on delete restrict,
  event_type text not null,
  scheduled_for timestamptz not null,
  payload_version integer not null default 1,
  transport_policy text not null default 'in_app_plus_external_when_configured',
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  constraint communication_events_recipient_persona_check check (recipient_persona in ('patient','physio')),
  constraint communication_events_recipient_shape_check check (
    (recipient_persona='patient' and platform_patient_id is not null and physio_id is null)
    or (recipient_persona='physio' and physio_id is not null and platform_patient_id is null)
  ),
  constraint communication_events_event_type_check check (event_type in (
    'appointment_requested','appointment_reschedule_requested','appointment_accepted',
    'appointment_rejected','appointment_cancelled','appointment_reminder_24h','appointment_reminder_2h'
  )),
  constraint communication_events_payload_version_check check (payload_version = 1),
  constraint communication_events_transport_policy_check check (transport_policy='in_app_plus_external_when_configured'),
  constraint communication_events_dedupe_key_length_check check (char_length(dedupe_key) between 1 and 180)
);

create index communication_events_patient_due_idx on public.communication_events(platform_patient_id, scheduled_for desc) where platform_patient_id is not null;
create index communication_events_physio_due_idx on public.communication_events(physio_id, scheduled_for desc) where physio_id is not null;
create index communication_events_appointment_idx on public.communication_events(appointment_request_id, scheduled_for);

alter table public.communication_events enable row level security;
revoke all privileges on table public.communication_events from public, anon, authenticated, service_role;

create function private.reject_communication_event_mutation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  raise exception 'Communication events are immutable.' using errcode='23514';
end; $$;
revoke all privileges on function private.reject_communication_event_mutation() from public, anon, authenticated, service_role;

create trigger communication_events_immutable_update before update on public.communication_events for each row execute function private.reject_communication_event_mutation();
create trigger communication_events_immutable_delete before delete on public.communication_events for each row execute function private.reject_communication_event_mutation();

create function private.enqueue_appointment_communication_events()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  v_now timestamptz := now();
  v_cancel_recipient text;
begin
  if tg_op='INSERT' then
    insert into public.communication_events(recipient_persona,physio_id,appointment_request_id,event_type,scheduled_for,dedupe_key)
    values('physio',new.physio_id,new.id,
      case when new.reschedules_request_id is null then 'appointment_requested' else 'appointment_reschedule_requested' end,
      new.requested_at,
      'appointment:'||new.id::text||':physio:'||case when new.reschedules_request_id is null then 'requested' else 'reschedule_requested' end)
    on conflict(dedupe_key) do nothing;
    return new;
  end if;

  if old.status='requested' and new.status='accepted' then
    insert into public.communication_events(recipient_persona,platform_patient_id,appointment_request_id,event_type,scheduled_for,dedupe_key)
    values('patient',new.platform_patient_id,new.id,'appointment_accepted',coalesce(new.responded_at,v_now),'appointment:'||new.id::text||':patient:accepted')
    on conflict(dedupe_key) do nothing;

    if new.starts_at - interval '24 hours' > v_now then
      insert into public.communication_events(recipient_persona,platform_patient_id,appointment_request_id,event_type,scheduled_for,dedupe_key)
      values('patient',new.platform_patient_id,new.id,'appointment_reminder_24h',new.starts_at-interval '24 hours','appointment:'||new.id::text||':patient:reminder_24h') on conflict(dedupe_key) do nothing;
      insert into public.communication_events(recipient_persona,physio_id,appointment_request_id,event_type,scheduled_for,dedupe_key)
      values('physio',new.physio_id,new.id,'appointment_reminder_24h',new.starts_at-interval '24 hours','appointment:'||new.id::text||':physio:reminder_24h') on conflict(dedupe_key) do nothing;
    end if;

    if new.starts_at - interval '2 hours' > v_now then
      insert into public.communication_events(recipient_persona,platform_patient_id,appointment_request_id,event_type,scheduled_for,dedupe_key)
      values('patient',new.platform_patient_id,new.id,'appointment_reminder_2h',new.starts_at-interval '2 hours','appointment:'||new.id::text||':patient:reminder_2h') on conflict(dedupe_key) do nothing;
      insert into public.communication_events(recipient_persona,physio_id,appointment_request_id,event_type,scheduled_for,dedupe_key)
      values('physio',new.physio_id,new.id,'appointment_reminder_2h',new.starts_at-interval '2 hours','appointment:'||new.id::text||':physio:reminder_2h') on conflict(dedupe_key) do nothing;
    end if;
  elsif old.status='requested' and new.status='rejected' then
    insert into public.communication_events(recipient_persona,platform_patient_id,appointment_request_id,event_type,scheduled_for,dedupe_key)
    values('patient',new.platform_patient_id,new.id,'appointment_rejected',coalesce(new.responded_at,v_now),'appointment:'||new.id::text||':patient:rejected') on conflict(dedupe_key) do nothing;
  elsif old.status<> 'cancelled' and new.status='cancelled' then
    v_cancel_recipient := case when new.cancelled_by='patient' then 'physio' else 'patient' end;
    if v_cancel_recipient='patient' then
      insert into public.communication_events(recipient_persona,platform_patient_id,appointment_request_id,event_type,scheduled_for,dedupe_key)
      values('patient',new.platform_patient_id,new.id,'appointment_cancelled',coalesce(new.cancelled_at,v_now),'appointment:'||new.id::text||':patient:cancelled') on conflict(dedupe_key) do nothing;
    else
      insert into public.communication_events(recipient_persona,physio_id,appointment_request_id,event_type,scheduled_for,dedupe_key)
      values('physio',new.physio_id,new.id,'appointment_cancelled',coalesce(new.cancelled_at,v_now),'appointment:'||new.id::text||':physio:cancelled') on conflict(dedupe_key) do nothing;
    end if;
  end if;
  return new;
end; $$;
revoke all privileges on function private.enqueue_appointment_communication_events() from public, anon, authenticated, service_role;

create trigger patient_appointment_requests_90_communication_events
after insert or update on public.patient_appointment_requests
for each row execute function private.enqueue_appointment_communication_events();

create function public.get_my_patient_communication_events(p_limit integer default 50)
returns table(event_id uuid,appointment_request_id uuid,event_type text,scheduled_for timestamptz,service_mode text,starts_at timestamptz,ends_at timestamptz,timezone_name text)
language plpgsql stable security definer set search_path='' as $$
declare v_patient_id uuid; v_limit integer;
begin
  v_patient_id := private.resolve_authenticated_appointment_patient();
  v_limit := least(greatest(coalesce(p_limit,50),1),100);
  return query
  select e.id,e.appointment_request_id,e.event_type,e.scheduled_for,r.service_mode,r.starts_at,r.ends_at,r.timezone_name
  from public.communication_events e join public.patient_appointment_requests r on r.id=e.appointment_request_id
  where e.recipient_persona='patient' and e.platform_patient_id=v_patient_id and r.platform_patient_id=v_patient_id
  order by e.scheduled_for desc,e.id desc limit v_limit;
end; $$;
revoke all privileges on function public.get_my_patient_communication_events(integer) from public, anon, authenticated, service_role;
grant execute on function public.get_my_patient_communication_events(integer) to authenticated;

create function public.get_my_professional_communication_events(p_limit integer default 50)
returns table(event_id uuid,appointment_request_id uuid,event_type text,scheduled_for timestamptz,service_mode text,starts_at timestamptz,ends_at timestamptz,timezone_name text)
language plpgsql stable security definer set search_path='' as $$
declare v_physio_id uuid; v_limit integer;
begin
  v_physio_id := private.resolve_authenticated_appointment_physio();
  v_limit := least(greatest(coalesce(p_limit,50),1),100);
  return query
  select e.id,e.appointment_request_id,e.event_type,e.scheduled_for,r.service_mode,r.starts_at,r.ends_at,r.timezone_name
  from public.communication_events e join public.patient_appointment_requests r on r.id=e.appointment_request_id
  where e.recipient_persona='physio' and e.physio_id=v_physio_id and r.physio_id=v_physio_id
  order by e.scheduled_for desc,e.id desc limit v_limit;
end; $$;
revoke all privileges on function public.get_my_professional_communication_events(integer) from public, anon, authenticated, service_role;
grant execute on function public.get_my_professional_communication_events(integer) to authenticated;

comment on table public.communication_events is 'Immutable provider-neutral communication intents derived from appointment authority. Contains no phone numbers, message bodies, provider identifiers, clinical data, settlement evidence, or transport secrets.';

commit;
