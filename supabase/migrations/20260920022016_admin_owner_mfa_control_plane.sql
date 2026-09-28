alter table public.platform_admin_memberships
  add column if not exists admin_role text not null default 'reviewer';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.platform_admin_memberships'::regclass
      and conname = 'platform_admin_memberships_admin_role_check'
  ) then
    alter table public.platform_admin_memberships
      add constraint platform_admin_memberships_admin_role_check
      check (admin_role in ('owner', 'reviewer'));
  end if;
end;
$$;

create or replace function private.current_admin_aal()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1');
$$;

revoke all on function private.current_admin_aal()
  from public, anon, authenticated;

create or replace function private.is_active_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.platform_admin_memberships pam
     where pam.user_id = (select auth.uid())
       and pam.admin_role = 'owner'
       and pam.is_active
  );
$$;

revoke all on function private.is_active_platform_owner()
  from public, anon, authenticated;

create or replace function private.require_active_platform_owner()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not private.is_active_platform_owner() then
    raise exception 'Active platform-owner authority is required.'
      using errcode = '42501';
  end if;

  if private.current_admin_aal() <> 'aal2' then
    raise exception 'Admin multi-factor authentication is required.'
      using errcode = '42501';
  end if;

  return v_user_id;
end;
$$;

revoke all on function private.require_active_platform_owner()
  from public, anon, authenticated;

create or replace function private.require_active_verification_reviewer()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not private.is_active_verification_reviewer() then
    raise exception 'Active verification-reviewer authority is required.'
      using errcode = '42501';
  end if;

  if private.current_admin_aal() <> 'aal2' then
    raise exception 'Admin multi-factor authentication is required.'
      using errcode = '42501';
  end if;

  return v_user_id;
end;
$$;

revoke all on function private.require_active_verification_reviewer()
  from public, anon, authenticated;

create or replace function public.get_my_admin_access()
returns table (
  capability text,
  admin_role text,
  current_aal text,
  mfa_required boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pam.capability,
    pam.admin_role,
    private.current_admin_aal(),
    true
  from public.platform_admin_memberships pam
  where pam.user_id = (select auth.uid())
    and pam.is_active
  limit 1;
$$;

revoke all on function public.get_my_admin_access()
  from public, anon, authenticated;
grant execute on function public.get_my_admin_access()
  to authenticated;
