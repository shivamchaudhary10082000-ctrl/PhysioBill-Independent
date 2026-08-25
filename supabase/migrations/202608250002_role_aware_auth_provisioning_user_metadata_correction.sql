begin;

-- Phase 5.1 correction: choose the initial account persona from Auth user
-- metadata that is present on the auth.users INSERT lifecycle.
--
-- Supabase signUp options.data and Admin createUser user_metadata populate
-- auth.users.raw_user_meta_data. This metadata is user-editable later, so it
-- is used ONLY by the existing AFTER INSERT trigger. public.app_users.role is
-- authoritative after provisioning; no Auth UPDATE trigger is introduced.
--
-- Missing account_type remains physiotherapist-only compatibility for older
-- signup clients. New application signup sends account_type explicitly.
create or replace function private.resolve_initial_auth_account_type(metadata jsonb)
returns text
language plpgsql
immutable
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  requested_account_type text;
begin
  if metadata is null or not (metadata ? 'account_type') then
    return 'physio';
  end if;

  requested_account_type := metadata ->> 'account_type';

  if requested_account_type in ('physio', 'patient') then
    return requested_account_type;
  end if;

  raise exception 'Unsupported account_type for Auth provisioning.'
    using errcode = '22023';
end;
$$;

revoke all privileges on function private.resolve_initial_auth_account_type(jsonb)
  from public, anon, authenticated;

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
begin
  account_type := private.resolve_initial_auth_account_type(new.raw_user_meta_data);

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
