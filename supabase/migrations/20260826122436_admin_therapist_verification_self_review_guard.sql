begin;

create or replace function private.reject_professional_verification_self_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.decided_by is not null
     and exists (
       select 1
         from public.physiotherapists p
        where p.id = new.physio_id
          and p.user_id = new.decided_by
     ) then
    raise exception 'A verification reviewer cannot review their own professional verification.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.reject_professional_verification_self_review() from public, anon, authenticated;

drop trigger if exists professional_verification_requests_reject_self_review
  on public.professional_verification_requests;

create trigger professional_verification_requests_reject_self_review
before insert or update of decided_by
on public.professional_verification_requests
for each row
execute function private.reject_professional_verification_self_review();

commit;