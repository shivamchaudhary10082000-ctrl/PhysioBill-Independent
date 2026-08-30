import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import {
  loadInvoiceIssuanceSnapshot,
  type InvoiceIssuanceSnapshot,
} from '@/lib/invoice-issuance-snapshots';
import {
  openPermanentInvoicePdfDownload,
  requestPermanentInvoicePdf,
} from '@/lib/invoice-document-artifacts';
import { ReimbursementDocumentPanel } from '@/Components/ReimbursementDocumentPanel';

const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));

function servicePeriod(snapshot: InvoiceIssuanceSnapshot) {
  if (!snapshot.serviceStartDate && !snapshot.serviceEndDate) return '';
  if (snapshot.serviceStartDate && snapshot.serviceStartDate === snapshot.serviceEndDate) {
    return dateLabel(`${snapshot.serviceStartDate}T00:00:00`);
  }
  const start = snapshot.serviceStartDate ? dateLabel(`${snapshot.serviceStartDate}T00:00:00`) : '—';
  const end = snapshot.serviceEndDate ? dateLabel(`${snapshot.serviceEndDate}T00:00:00`) : '—';
  return `${start} – ${end}`;
}

function OptionalLine({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return <p className="text-sm"><span className="font-semibold">{label}:</span> {value}</p>;
}

function IssuedInvoiceSheet({ snapshot }: { snapshot: InvoiceIssuanceSnapshot }) {
  const providerVisible = useMemo(() => [
    snapshot.therapistFullName,
    snapshot.therapistTitle,
    snapshot.practiceName,
    snapshot.therapistQualification,
    snapshot.therapistRegistration,
    snapshot.therapistRegistrationAuthority,
    snapshot.therapistPhone,
    snapshot.therapistEmail,
    snapshot.practiceAddress,
    snapshot.therapistPan,
    snapshot.therapistGstin,
  ].some((value) => value.trim()), [snapshot]);

  const period = servicePeriod(snapshot);

  return (
    <article className="print-sheet mx-auto max-w-[900px] rounded-2xl border bg-white p-6 text-slate-900 shadow-sm sm:p-9">
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-teal-700">PhysioBill</p>
          <h1 className="mt-2 text-3xl font-extrabold">Invoice</h1>
          <p className="mt-2 text-sm text-slate-500">{snapshot.invoiceNumber}</p>
        </div>
        <div className="text-left sm:text-right">
          {snapshot.issuedAt ? (
            <><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Issued on</p><p className="mt-1 font-semibold">{dateLabel(snapshot.issuedAt)}</p></>
          ) : (
            <p className="max-w-xs text-sm font-medium text-slate-600">Issue date unavailable for this legacy invoice.</p>
          )}
        </div>
      </div>

      <div className="grid gap-8 border-b border-slate-200 py-6 md:grid-cols-2">
        {providerVisible && <section>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Provider</p>
          <div className="mt-3 space-y-1.5">
            {snapshot.practiceName && <p className="text-lg font-extrabold">{snapshot.practiceName}</p>}
            {snapshot.therapistFullName && <p className="font-bold">{snapshot.therapistFullName}</p>}
            {snapshot.therapistTitle && <p className="text-sm">{snapshot.therapistTitle}</p>}
            <OptionalLine label="Qualification" value={snapshot.therapistQualification} />
            <OptionalLine label="Registration" value={snapshot.therapistRegistration} />
            <OptionalLine label="Registration authority" value={snapshot.therapistRegistrationAuthority} />
            {snapshot.professionalVerificationStatus === 'verified' && (
              <p className="text-sm font-semibold text-teal-700">Professional credentials verified by PhysioBill</p>
            )}
            <OptionalLine label="Address" value={snapshot.practiceAddress} />
            <OptionalLine label="Phone" value={snapshot.therapistPhone} />
            <OptionalLine label="Email" value={snapshot.therapistEmail} />
            <OptionalLine label="PAN" value={snapshot.therapistPan} />
            <OptionalLine label="GSTIN" value={snapshot.therapistGstin} />
          </div>
        </section>}

        <section className={providerVisible ? '' : 'md:col-span-2'}>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Patient</p>
          <div className="mt-3 space-y-1.5">
            <p className="text-lg font-extrabold">{snapshot.patientName}</p>
            <p className="text-sm font-semibold">{snapshot.patientNumber}</p>
            <OptionalLine label="Address" value={snapshot.patientAddress} />
            <OptionalLine label="Phone" value={snapshot.patientPhone} />
            <OptionalLine label="Email" value={snapshot.patientEmail} />
          </div>
        </section>
      </div>

      <section className="py-6">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Service details</p>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid gap-3 bg-slate-50 p-4 sm:grid-cols-[1.8fr_.6fr_1fr]">
            <div><p className="text-xs text-slate-500">Description</p><p className="mt-1 font-bold">{snapshot.description || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Sessions</p><p className="mt-1 font-bold">{snapshot.sessions || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Service period</p><p className="mt-1 font-bold">{period || '—'}</p></div>
          </div>
          <div className="divide-y divide-slate-200 px-4">
            <div className="flex justify-between gap-4 py-3"><span>Fee</span><strong>{money(snapshot.fee)}</strong></div>
            {snapshot.additional > 0 && <div className="flex justify-between gap-4 py-3"><span>{snapshot.additionalDescription ? `Additional · ${snapshot.additionalDescription}` : 'Additional'}</span><strong>{money(snapshot.additional)}</strong></div>}
            {snapshot.discount > 0 && <div className="flex justify-between gap-4 py-3"><span>Discount</span><strong>-{money(snapshot.discount)}</strong></div>}
            <div className="flex justify-between gap-4 py-3"><span>GST</span><strong>{snapshot.gstRate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%</strong></div>
            <div className="flex justify-between gap-4 py-4 text-lg"><span className="font-extrabold">Total</span><strong>{money(snapshot.total)}</strong></div>
          </div>
        </div>
      </section>

      <p className="border-t border-slate-200 pt-5 text-xs text-slate-500">This document is rendered from the preserved invoice issuance record.</p>
    </article>
  );
}

export function IssuedInvoiceDocument({ invoiceId, onBack }: { invoiceId: string; onBack: () => void }) {
  const [snapshot, setSnapshot] = useState<InvoiceIssuanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSnapshot(null);
    setPdfError(null);
    loadInvoiceIssuanceSnapshot(invoiceId)
      .then((loaded) => {
        if (!active) return;
        if (!loaded) setError('Issued invoice details are unavailable.');
        else setSnapshot(loaded);
      })
      .catch(() => {
        if (active) setError('Issued invoice details are unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [invoiceId]);

  const downloadPermanentPdf = async () => {
    setPdfBusy(true);
    setPdfError(null);
    try {
      const result = await requestPermanentInvoicePdf(invoiceId);
      openPermanentInvoicePdfDownload(result);
    } catch {
      setPdfError('PDF generation failed. Please try again.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"><ArrowLeft size={16} /> Back to invoice</button>
        {snapshot && <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={pdfBusy} onClick={() => void downloadPermanentPdf()} className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold text-primary hover:bg-secondary disabled:opacity-50"><Download size={16} /> {pdfBusy ? 'Generating PDF…' : 'Download permanent PDF'}</button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Printer size={16} /> Print / Save as PDF</button>
        </div>}
      </div>
      {pdfError && <div role="alert" className="no-print rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{pdfError}</div>}
      {loading && <div className="rounded-2xl border bg-card p-6 text-sm font-semibold text-muted-foreground">Loading issued invoice…</div>}
      {!loading && error && <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{error}</div>}
      {!loading && snapshot && <>
        <IssuedInvoiceSheet snapshot={snapshot} />
        <ReimbursementDocumentPanel invoiceId={invoiceId} />
      </>}
    </div>
  );
}
