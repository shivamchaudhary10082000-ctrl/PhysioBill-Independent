-- Patient invoice payment-instruction read boundary.
-- Payment destinations are instructions only; they are never settlement evidence.

create or replace function public.get_my_invoice_payment_instructions(p_invoice_id uuid)
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
    raise exception 'Patient payment-instruction access requires authentication.' using errcode = '42501';
  end if;

  select pp.id
    into v_platform_patient_id
    from public.app_users au
    join public.platform_patients pp on pp.user_id = au.id
   where au.id = v_user_id
     and au.role = 'patient';

  if v_platform_patient_id is null then
    raise exception 'Payment instructions are available only to patient accounts.' using errcode = '42501';
  end if;

  select jsonb_build_object(
           'invoiceId', i.id,
           'invoiceNumber', i.invoice_number,
           'physiotherapistPublicId', p.public_physio_id,
           'outstanding', greatest(i.total - i.paid, 0),
           'destination', case
             when d.id is null then null
             else jsonb_build_object(
               'destinationId', d.id,
               'type', d.destination_type,
               'label', d.display_label,
               'upiId', case when d.destination_type = 'upi' then d.upi_id else null end,
               'bankName', case when d.destination_type = 'bank' then d.bank_name else null end,
               'accountNumberDisplay', case when d.destination_type = 'bank' then d.account_number_display else null end,
               'ifscDisplay', case when d.destination_type = 'bank' then d.ifsc_display else null end,
               'providerCode', case when d.destination_type = 'provider' then d.provider_code else null end
             )
           end,
           'instructionOnly', true,
           'settlementEvidence', false
         )
    into v_result
    from public.invoices i
    join public.platform_patient_clinical_chart_links l
      on l.patient_id = i.patient_id
     and l.physio_id = i.physio_id
     and l.platform_patient_id = v_platform_patient_id
     and l.revoked_at is null
    join public.physiotherapists p on p.id = i.physio_id
    left join public.physiotherapist_payment_destinations d
      on d.physio_id = i.physio_id
     and d.status = 'active'
     and d.is_default
   where i.id = p_invoice_id
     and i.finalized
   limit 1;

  if v_result is null then
    raise exception 'Finalized linked invoice is unavailable.' using errcode = '42501';
  end if;

  return v_result;
end;
$$;

revoke all on function public.get_my_invoice_payment_instructions(uuid) from public;
revoke all on function public.get_my_invoice_payment_instructions(uuid) from anon;
grant execute on function public.get_my_invoice_payment_instructions(uuid) to authenticated;

comment on function public.get_my_invoice_payment_instructions(uuid) is
  'Returns the active default therapist-owned payment destination for one finalized invoice only when the signed-in patient has an active PAT-to-chart link. Destination data is instruction-only and does not prove payment or settlement.';
