import { getSupabaseClient } from '@/lib/supabase';

export type InvoicePdfArtifactResponse = {
  signedUrl: string;
  artifact: {
    id: string;
    invoiceId: string;
    documentVersion: number;
    rendererVersion: string;
    sha256: string;
    byteSize: number;
  };
};

export async function requestPermanentInvoicePdf(invoiceId: string): Promise<InvoicePdfArtifactResponse> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('invoice-pdf', {
    body: { invoiceId },
  });
  if (error) throw error;
  if (!data?.signedUrl || !data?.artifact?.sha256) throw new Error('PDF generation failed.');
  return data as InvoicePdfArtifactResponse;
}

export function openPermanentInvoicePdfDownload(result: InvoicePdfArtifactResponse) {
  const anchor = document.createElement('a');
  anchor.href = result.signedUrl;
  anchor.rel = 'noopener';
  anchor.target = '_blank';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
