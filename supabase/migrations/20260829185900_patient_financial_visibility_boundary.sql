begin;

create or replace function public.list_my_financial_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_platform_patient_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Patient financial access requires authentication.' using errcode = '42501';
  end if;

  select pp.id
    into v_platform_patient_id
    from public.app_users au
    join public.platform_patients pp on pp.user_id = au.id
   where au.id = v_user_id
     and au.role = 'patient';

  if v_platform_patient_id is null then
    raise exception 'Patient financial access is available only to patient accounts.' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(summary order by linked_at desc, link_id), '[]'::jsonb)
    into v_result
    from (
      select
        l.id as link_id,
        l.linked_at,
        p.public_physio_id,
        jsonb_build_object(
          'linkId', l.id,
          'linkedAt', l.linked_at,
          'physiotherapistPublicId', p.public_physio_id,
          'totals', jsonb_build_object(
            'finalizedInvoiced', coalesce((
              select sum(i.total)
                from public.invoices i
               where i.patient_id = l.patient_id
                 and i.physio_id = l.physio_id
                 and i.finalized
            ), 0),
            'effectivePaid', coalesce((
              select sum(i.paid)
                from public.invoices i
               where i.patient_id = l.patient_id
                 and i.physio_id = l.physio_id
                 and i.finalized
            ), 0),
            'outstanding', coalesce((
              select sum(greatest(i.total - i.paid, 0))
                from public.invoices i
               where i.patient_id = l.patient_id
                 and i.physio_id = l.physio_id
                 and i.finalized
            ), 0)
          ),
          'invoices', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'invoiceId', i.id,
                'invoiceNumber', i.invoice_number,
                'description', i.description,
                'sessions', i.sessions,
                'startDate', i.start_date,
                'endDate', i.end_date,
                'total', i.total,
                'paid', i.paid,
                'outstanding', greatest(i.total - i.paid, 0),
                'status', i.status,
                'finalizedAt', i.finalized_at,
                'payments', coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'paymentId', pay.id,
                      'amount', pay.amount,
                      'method', pay.method,
                      'status', pay.status,
                      'recordedAt', pay.recorded_at,
                      'corrections', coalesce((
                        select jsonb_agg(
                          jsonb_build_object(
                            'correctionId', pc.id,
                            'transactionType', pc.transaction_type,
                            'amount', pc.amount,
                            'reason', pc.reason,
                            'createdAt', pc.created_at
                          ) order by pc.created_at, pc.id
                        )
                          from public.payment_corrections pc
                         where pc.original_payment_id = pay.id
                           and pc.patient_id = l.patient_id
                           and pc.physio_id = l.physio_id
                           and pc.invoice_id = i.id
                      ), '[]'::jsonb)
                    ) order by pay.recorded_at, pay.id
                  )
                    from public.payments pay
                   where pay.invoice_id = i.id
                     and pay.patient_id = l.patient_id
                     and pay.physio_id = l.physio_id
                     and pay.status in ('recorded', 'succeeded')
                ), '[]'::jsonb)
              ) order by coalesce(i.finalized_at, i.created_at) desc, i.id desc
            )
              from public.invoices i
             where i.patient_id = l.patient_id
               and i.physio_id = l.physio_id
               and i.finalized
          ), '[]'::jsonb)
        ) as summary
      from public.platform_patient_clinical_chart_links l
      join public.physiotherapists p on p.id = l.physio_id
      where l.platform_patient_id = v_platform_patient_id
        and l.revoked_at is null
    ) linked_financials;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all on function public.list_my_financial_summary() from public, anon;
grant execute on function public.list_my_financial_summary() to authenticated;

commit;
