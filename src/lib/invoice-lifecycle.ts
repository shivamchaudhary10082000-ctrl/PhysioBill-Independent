import { getSupabaseClient } from '@/lib/supabase';
import { resolveAuthenticatedPhysiotherapist } from '@/lib/workspace';

export async function loadArchivedInvoiceIds(): Promise<Set<string>> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('invoice_workspace_archives')
    .select('invoice_id')
    .eq('physio_id', bootstrap.physioId);

  if (error) throw error;
  return new Set((data ?? []).map((row) => String(row.invoice_id)));
}

export async function deleteDraftInvoice(invoiceId: string): Promise<void> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('physio_id', bootstrap.physioId)
    .eq('finalized', false)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Only unfinalized draft invoices can be permanently deleted.');
}

export async function archiveFinalizedInvoice(invoiceId: string): Promise<void> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id,finalized')
    .eq('id', invoiceId)
    .eq('physio_id', bootstrap.physioId)
    .maybeSingle();

  if (invoiceError) throw invoiceError;
  if (!invoice) throw new Error('Invoice not found.');
  if (!invoice.finalized) throw new Error('Draft invoices should be deleted instead of archived.');

  const { error } = await supabase
    .from('invoice_workspace_archives')
    .insert({ invoice_id: invoiceId, physio_id: bootstrap.physioId });

  if (error && error.code !== '23505') throw error;
}

export async function restoreArchivedInvoice(invoiceId: string): Promise<void> {
  const bootstrap = await resolveAuthenticatedPhysiotherapist();
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('invoice_workspace_archives')
    .delete()
    .eq('invoice_id', invoiceId)
    .eq('physio_id', bootstrap.physioId);

  if (error) throw error;
}
