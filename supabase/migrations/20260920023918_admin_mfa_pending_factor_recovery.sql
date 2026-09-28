create or replace function public.get_my_pending_admin_totp_factor()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select f.id
  from auth.mfa_factors f
  where f.user_id = (select auth.uid())
    and f.factor_type = 'totp'
    and f.status = 'unverified'
    and exists (
      select 1
      from public.platform_admin_memberships pam
      where pam.user_id = f.user_id
        and pam.is_active
    )
  order by f.created_at desc
  limit 1;
$$;

revoke all on function public.get_my_pending_admin_totp_factor()
  from public, anon, authenticated;
grant execute on function public.get_my_pending_admin_totp_factor()
  to authenticated;
