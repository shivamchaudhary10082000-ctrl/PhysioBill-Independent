begin;

create table public.account_legal_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  account_role text not null check (account_role in ('physio', 'patient')),
  notice_version text not null check (
    char_length(btrim(notice_version)) between 1 and 64
  ),
  terms_acknowledged boolean not null,
  privacy_notice_acknowledged boolean not null,
  professional_standards_acknowledged boolean not null default false,
  source text not null default 'signup' check (source in ('signup')),
  acknowledged_at timestamptz not null default now(),
  unique (user_id, notice_version)
);

alter table public.account_legal_acknowledgements enable row level security;

revoke all on table public.account_legal_acknowledgements
  from public, anon, authenticated;
grant select on table public.account_legal_acknowledgements to service_role;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  account_type text;
  persisted_role text;
  new_physio_id uuid;
  legal_notice_version text;
  legal_acknowledged boolean;
begin
  account_type := private.resolve_initial_auth_account_type(new.raw_user_meta_data);

  legal_notice_version := btrim(coalesce(new.raw_user_meta_data ->> 'legal_notice_version', ''));
  legal_acknowledged :=
    case
      when account_type = 'physio' then
        lower(coalesce(new.raw_user_meta_data ->> 'professional_terms_acknowledged', 'false')) = 'true'
      when account_type = 'patient' then
        lower(coalesce(new.raw_user_meta_data ->> 'patient_terms_acknowledged', 'false')) = 'true'
      else false
    end;

  if legal_notice_version = ''
     or char_length(legal_notice_version) > 64
     or not legal_acknowledged then
    raise exception 'Current Terms and Privacy acknowledgement is required before account creation.'
      using errcode = '22023';
  end if;

  insert into public.app_users (id, role)
  values (new.id, account_type)
  on conflict (id) do nothing;

  select au.role
    into persisted_role
    from public.app_users au
   where au.id = new.id;

  if persisted_role is distinct from account_type then
    raise exception 'Auth identity provisioning role conflict.'
      using errcode = '23514';
  end if;

  insert into public.account_legal_acknowledgements (
    user_id,
    account_role,
    notice_version,
    terms_acknowledged,
    privacy_notice_acknowledged,
    professional_standards_acknowledged,
    source
  )
  values (
    new.id,
    account_type,
    legal_notice_version,
    true,
    true,
    account_type = 'physio',
    'signup'
  )
  on conflict (user_id, notice_version) do nothing;

  if account_type = 'patient' then
    if exists (
      select 1
        from public.physiotherapists p
       where p.user_id = new.id
    ) then
      raise exception 'Patient Auth identity cannot own a physiotherapist identity.'
        using errcode = '23514';
    end if;

    return new;
  end if;

  insert into public.physiotherapists (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  select p.id
    into new_physio_id
    from public.physiotherapists p
   where p.user_id = new.id;

  if new_physio_id is null then
    raise exception 'Unable to resolve physiotherapist identity during Auth provisioning.'
      using errcode = '23514';
  end if;

  insert into public.physiotherapist_profiles (physio_id, email)
  values (new_physio_id, coalesce(new.email, ''))
  on conflict (physio_id) do nothing;

  insert into public.physiotherapist_settings (physio_id)
  values (new_physio_id)
  on conflict (physio_id) do nothing;

  return new;
end;
$$;

revoke all privileges on function public.handle_new_auth_user()
  from public, anon, authenticated;
grant execute on function public.handle_new_auth_user() to service_role;

commit;
