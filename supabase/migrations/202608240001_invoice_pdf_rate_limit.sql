create table public.invoice_pdf_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.invoice_pdf_rate_limits enable row level security;

revoke all on table public.invoice_pdf_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.invoice_pdf_rate_limits to service_role;

create or replace function public.check_invoice_pdf_rate_limit(
  p_user_id uuid,
  p_limit integer default 30,
  p_window_seconds integer default 60
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  request_count integer,
  window_started_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_now timestamptz := now();
  v_window_started_at timestamptz;
  v_request_count integer;
  v_elapsed_seconds numeric;
begin
  if p_user_id is null then
    raise exception 'User ID is required.' using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 1000 then
    raise exception 'Rate limit is out of range.' using errcode = '22023';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'Rate-limit window is out of range.' using errcode = '22023';
  end if;

  insert into public.invoice_pdf_rate_limits as limits (
    user_id,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    p_user_id,
    v_now,
    1,
    v_now
  )
  on conflict (user_id) do update
    set window_started_at = case
          when extract(epoch from (v_now - limits.window_started_at)) >= p_window_seconds
            then v_now
          else limits.window_started_at
        end,
        request_count = case
          when extract(epoch from (v_now - limits.window_started_at)) >= p_window_seconds
            then 1
          else limits.request_count + 1
        end,
        updated_at = v_now
  returning invoice_pdf_rate_limits.window_started_at,
            invoice_pdf_rate_limits.request_count
    into v_window_started_at, v_request_count;

  v_elapsed_seconds := greatest(0, extract(epoch from (v_now - v_window_started_at)));

  allowed := v_request_count <= p_limit;
  retry_after_seconds := case
    when allowed then 0
    else greatest(1, ceil(p_window_seconds - v_elapsed_seconds)::integer)
  end;
  request_count := v_request_count;
  window_started_at := v_window_started_at;
  return next;
end;
$function$;

revoke all on function public.check_invoice_pdf_rate_limit(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.check_invoice_pdf_rate_limit(uuid, integer, integer) to service_role;
