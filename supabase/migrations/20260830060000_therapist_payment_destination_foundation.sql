begin;

create table if not exists public.physiotherapist_payment_destinations (
  id uuid primary key default gen_random_uuid(),
  physio_id uuid not null references public.physiotherapists(id) on delete cascade,
  destination_type text not null check (destination_type in ('upi', 'bank', 'provider')),
  display_label text not null default '',
  upi_id text,
  bank_name text,
  account_number_display text,
  ifsc_display text,
  provider_code text,
  provider_destination_ref text,
  status text not null default 'draft' check (status in ('draft', 'active', 'external_activation_pending', 'disabled')),
  is_default boolean not null default false,
  created_by_user_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, physio_id),
  check (
    destination_type <> 'provider'
    or (
      status in ('external_activation_pending', 'disabled')
      and upi_id is null
      and bank_name is null
      and account_number_display is null
      and ifsc_display is null
    )
  ),
  check (
    status <> 'active'
    or destination_type <> 'upi'
    or length(trim(coalesce(upi_id, ''))) > 0
  ),
  check (
    status <> 'active'
    or destination_type <> 'bank'
    or (
      length(trim(coalesce(bank_name, ''))) > 0
      and length(trim(coalesce(account_number_display, ''))) > 0
      and length(trim(coalesce(ifsc_display, ''))) > 0
    )
  ),
  check (not is_default or status = 'active')
);

create index if not exists physiotherapist_payment_destinations_physio_idx
  on public.physiotherapist_payment_destinations (physio_id, status, created_at);

create unique index if not exists physiotherapist_payment_destinations_one_default_idx
  on public.physiotherapist_payment_destinations (physio_id)
  where is_default and status = 'active';

alter table public.physiotherapist_payment_destinations enable row level security;
revoke all on table public.physiotherapist_payment_destinations from public, anon, authenticated;

create or replace function private.lock_payment_destination_owner(target_physio_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('payment-destination:' || target_physio_id::text, 0));
end;
$$;

revoke all on function private.lock_payment_destination_owner(uuid) from public, anon, authenticated;

create or replace function public.list_my_payment_destinations()
returns table (
  id uuid,
  destination_type text,
  display_label text,
  upi_id text,
  bank_name text,
  account_number_display text,
  ifsc_display text,
  provider_code text,
  status text,
  is_default boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  resolved_physio_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  resolved_physio_id := private.current_physio_id();

  return query
  select d.id,
         d.destination_type,
         d.display_label,
         d.upi_id,
         d.bank_name,
         d.account_number_display,
         d.ifsc_display,
         d.provider_code,
         d.status,
         d.is_default,
         d.created_at,
         d.updated_at
    from public.physiotherapist_payment_destinations d
   where d.physio_id = resolved_physio_id
   order by d.is_default desc, d.created_at asc, d.id asc;
end;
$$;

revoke all on function public.list_my_payment_destinations() from public, anon;
grant execute on function public.list_my_payment_destinations() to authenticated;

create or replace function public.save_my_manual_payment_destination(
  p_destination_id uuid,
  p_destination_type text,
  p_display_label text,
  p_upi_id text,
  p_bank_name text,
  p_account_number_display text,
  p_ifsc_display text,
  p_make_default boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  resolved_physio_id uuid;
  resolved_user_id uuid;
  saved_id uuid;
  normalized_type text;
  normalized_label text;
  normalized_upi text;
  normalized_bank_name text;
  normalized_account_display text;
  normalized_ifsc text;
begin
  resolved_user_id := auth.uid();
  if resolved_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  resolved_physio_id := private.current_physio_id();
  perform private.lock_payment_destination_owner(resolved_physio_id);

  normalized_type := lower(trim(coalesce(p_destination_type, '')));
  normalized_label := trim(coalesce(p_display_label, ''));
  normalized_upi := nullif(trim(coalesce(p_upi_id, '')), '');
  normalized_bank_name := nullif(trim(coalesce(p_bank_name, '')), '');
  normalized_account_display := nullif(trim(coalesce(p_account_number_display, '')), '');
  normalized_ifsc := nullif(upper(trim(coalesce(p_ifsc_display, ''))), '');

  if normalized_type not in ('upi', 'bank') then
    raise exception 'Only manual UPI or bank destinations can be managed here.' using errcode = '22023';
  end if;

  if normalized_label = '' then
    raise exception 'Payment destination label is required.' using errcode = '22023';
  end if;

  if normalized_type = 'upi' and normalized_upi is null then
    raise exception 'UPI ID is required for an active UPI destination.' using errcode = '22023';
  end if;

  if normalized_type = 'bank' and (normalized_bank_name is null or normalized_account_display is null or normalized_ifsc is null) then
    raise exception 'Bank name, account display, and IFSC display are required for an active bank destination.' using errcode = '22023';
  end if;

  if p_destination_id is null then
    insert into public.physiotherapist_payment_destinations (
      physio_id,
      destination_type,
      display_label,
      upi_id,
      bank_name,
      account_number_display,
      ifsc_display,
      provider_code,
      provider_destination_ref,
      status,
      is_default,
      created_by_user_id
    ) values (
      resolved_physio_id,
      normalized_type,
      normalized_label,
      case when normalized_type = 'upi' then normalized_upi else null end,
      case when normalized_type = 'bank' then normalized_bank_name else null end,
      case when normalized_type = 'bank' then normalized_account_display else null end,
      case when normalized_type = 'bank' then normalized_ifsc else null end,
      null,
      null,
      'active',
      false,
      resolved_user_id
    )
    returning id into saved_id;
  else
    update public.physiotherapist_payment_destinations d
       set destination_type = normalized_type,
           display_label = normalized_label,
           upi_id = case when normalized_type = 'upi' then normalized_upi else null end,
           bank_name = case when normalized_type = 'bank' then normalized_bank_name else null end,
           account_number_display = case when normalized_type = 'bank' then normalized_account_display else null end,
           ifsc_display = case when normalized_type = 'bank' then normalized_ifsc else null end,
           provider_code = null,
           provider_destination_ref = null,
           status = 'active',
           updated_at = now()
     where d.id = p_destination_id
       and d.physio_id = resolved_physio_id
       and d.destination_type in ('upi', 'bank')
     returning d.id into saved_id;

    if saved_id is null then
      raise exception 'Payment destination was not found for this physiotherapist.' using errcode = '42501';
    end if;
  end if;

  if coalesce(p_make_default, false)
     or not exists (
       select 1
         from public.physiotherapist_payment_destinations d
        where d.physio_id = resolved_physio_id
          and d.status = 'active'
          and d.is_default
     ) then
    update public.physiotherapist_payment_destinations
       set is_default = false,
           updated_at = now()
     where physio_id = resolved_physio_id
       and is_default;

    update public.physiotherapist_payment_destinations
       set is_default = true,
           updated_at = now()
     where id = saved_id
       and physio_id = resolved_physio_id
       and status = 'active';
  end if;

  return saved_id;
end;
$$;

revoke all on function public.save_my_manual_payment_destination(uuid, text, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.save_my_manual_payment_destination(uuid, text, text, text, text, text, text, boolean) to authenticated;

create or replace function public.disable_my_payment_destination(p_destination_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  resolved_physio_id uuid;
  disabled_was_default boolean;
  replacement_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  resolved_physio_id := private.current_physio_id();
  perform private.lock_payment_destination_owner(resolved_physio_id);

  select d.is_default
    into disabled_was_default
    from public.physiotherapist_payment_destinations d
   where d.id = p_destination_id
     and d.physio_id = resolved_physio_id
     and d.destination_type in ('upi', 'bank')
   for update;

  if disabled_was_default is null then
    raise exception 'Payment destination was not found for this physiotherapist.' using errcode = '42501';
  end if;

  update public.physiotherapist_payment_destinations d
     set status = 'disabled',
         is_default = false,
         updated_at = now()
   where d.id = p_destination_id
     and d.physio_id = resolved_physio_id;

  if disabled_was_default then
    select d.id
      into replacement_id
      from public.physiotherapist_payment_destinations d
     where d.physio_id = resolved_physio_id
       and d.status = 'active'
       and d.destination_type in ('upi', 'bank')
     order by d.created_at asc, d.id asc
     limit 1
     for update;

    if replacement_id is not null then
      update public.physiotherapist_payment_destinations
         set is_default = true,
             updated_at = now()
       where id = replacement_id
         and physio_id = resolved_physio_id;
    end if;
  end if;
end;
$$;

revoke all on function public.disable_my_payment_destination(uuid) from public, anon;
grant execute on function public.disable_my_payment_destination(uuid) to authenticated;

comment on table public.physiotherapist_payment_destinations is
  'Therapist-owned payment destination configuration. Provider-managed activation remains an external/manual gate; this table stores no provider secret.';

comment on column public.physiotherapist_payment_destinations.provider_destination_ref is
  'Reserved for a future server-side provider reference. Authenticated manual-destination RPCs always keep this NULL.';

commit;
