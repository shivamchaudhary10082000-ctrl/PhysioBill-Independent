alter table public.app_users
  add column preferred_locale text not null default 'en-IN';

alter table public.app_users
  add constraint app_users_preferred_locale_check
  check (preferred_locale = any (array['en-IN'::text, 'hi-IN'::text, 'gu-IN'::text]));

comment on column public.app_users.preferred_locale is
  'Presentation locale only. Must never be used for persona, authorization, clinical, financial, or identity decisions.';

create or replace function private.guard_app_user_identity_and_locale_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.created_at is distinct from old.created_at then
    raise exception 'App user identity and persona fields are immutable.' using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.guard_app_user_identity_and_locale_update() from public, anon, authenticated;

drop trigger if exists app_users_guard_identity_and_locale_update on public.app_users;
create trigger app_users_guard_identity_and_locale_update
before update on public.app_users
for each row
execute function private.guard_app_user_identity_and_locale_update();

revoke update on table public.app_users from anon, authenticated;
grant update (preferred_locale) on table public.app_users to authenticated;

drop policy if exists app_users_update_preferred_locale_self on public.app_users;
create policy app_users_update_preferred_locale_self
on public.app_users
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
