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

export type MediclaimReceiptPdfOptions = {
  homeVisitTimings: string;
  referredBy: string;
  chiefComplaint: string;
  patientAge: string;
  patientGender: string;
  additionalNote: string;
  digitalStampDataUrl: string | null;
};

type MediclaimReceiptPdfResponse = {
  filename: string;
  pdfBase64: string;
  byteSize: number;
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

export async function requestMediclaimReceiptPdf(
  invoiceId: string,
  receipt: MediclaimReceiptPdfOptions,
): Promise<MediclaimReceiptPdfResponse> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('invoice-pdf', {
    body: {
      invoiceId,
      mode: 'mediclaim_receipt',
      receipt,
    },
  });
  if (error) throw error;
  if (!data?.pdfBase64 || !data?.filename) {
    throw new Error('Mediclaim receipt PDF generation failed.');
  }
  return data as MediclaimReceiptPdfResponse;
}

function pdfBlobFromBase64(pdfBase64: string) {
  const binary = window.atob(pdfBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: 'application/pdf' });
}

export function downloadMediclaimReceiptPdf(result: MediclaimReceiptPdfResponse) {
  const blob = pdfBlobFromBase64(result.pdfBase64);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = result.filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
