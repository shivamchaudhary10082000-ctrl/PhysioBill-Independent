import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, FileCheck2, Printer, Trash2, Upload } from 'lucide-react';
import { PhysioBillBrand } from '@/Components/PhysioBillBrand';
import {
  loadInvoiceIssuanceSnapshot,
  type InvoiceIssuanceSnapshot,
} from '@/lib/invoice-issuance-snapshots';
import {
  downloadMediclaimReceiptPdf,
  openPermanentInvoicePdfDownload,
  requestMediclaimReceiptPdf,
  requestPermanentInvoicePdf,
} from '@/lib/invoice-document-artifacts';
import { loadInvoice, type ProductionInvoice } from '@/lib/invoices';
import { ReimbursementDocumentPanel } from '@/Components/ReimbursementDocumentPanel';

const money = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));

function servicePeriod(snapshot: InvoiceIssuanceSnapshot) {
  if (!snapshot.serviceStartDate && !snapshot.serviceEndDate) return '';
  if (snapshot.serviceStartDate && snapshot.serviceStartDate === snapshot.serviceEndDate) {
    return dateLabel(`${snapshot.serviceStartDate}T00:00:00`);
  }
  const start = snapshot.serviceStartDate
    ? dateLabel(`${snapshot.serviceStartDate}T00:00:00`)
    : '—';
  const end = snapshot.serviceEndDate
    ? dateLabel(`${snapshot.serviceEndDate}T00:00:00`)
    : '—';
  return `${start} – ${end}`;
}

function parseQuantity(sessions: string) {
  const match = sessions.trim().match(/^(\d+(?:\.\d+)?)/);
  const value = match ? Number(match[1]) : 1;
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function OptionalLine({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <p className="text-[11px] leading-5 sm:text-xs">
      <span className="font-bold">{label}:</span> {value}
    </p>
  );
}

function IssuedInvoiceSheet({
  snapshot,
  invoice,
  homeVisitTimings,
  referredBy,
  chiefComplaint,
  patientAge,
  patientGender,
  additionalNote,
  digitalStamp,
}: {
  snapshot: InvoiceIssuanceSnapshot;
  invoice: ProductionInvoice | null;
  homeVisitTimings: string;
  referredBy: string;
  chiefComplaint: string;
  patientAge: string;
  patientGender: string;
  additionalNote: string;
  digitalStamp: string | null;
}) {
  const providerVisible = useMemo(
    () =>
      [
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
      ].some((value) => value.trim()),
    [snapshot],
  );

  const period = servicePeriod(snapshot);
  const paid = Math.max(0, invoice?.paid ?? 0);
  const balance = Math.max(0, snapshot.total - paid);
  const subtotal = Math.max(0, snapshot.fee + snapshot.additional);
  const quantity = parseQuantity(snapshot.sessions);
  const unitPrice = quantity > 1 ? snapshot.fee / quantity : snapshot.fee;
  const providerName = snapshot.therapistFullName.trim();
  const providerCredentialLine = [
    snapshot.therapistTitle,
    snapshot.therapistQualification,
  ]
    .filter((value) => value.trim())
    .join(' · ');

  return (
    <article className="print-sheet mediclaim-receipt mx-auto max-w-[900px] overflow-hidden rounded-2xl border bg-white text-slate-900 shadow-sm">
      <section className="grid gap-5 px-6 pb-5 pt-6 sm:grid-cols-[.9fr_1.1fr] sm:px-8 sm:pt-8">
        <div className="flex items-start">
          <PhysioBillBrand
            className="items-start"
            markClassName="h-20 w-20 sm:h-24 sm:w-24"
            wordmarkClassName="[&>span:first-child]:text-[28px] sm:[&>span:first-child]:text-[34px]"
            suffix={
              <span className="mt-1 block text-[8px] font-bold uppercase tracking-[.22em] text-slate-500 sm:text-[9px]">
                Physiotherapy · recovery · better living
              </span>
            }
          />
        </div>

        {providerVisible && (
          <div className="border-t border-slate-200 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            {providerName && <h1 className="text-lg font-extrabold text-[#0b5cad]">{providerName}</h1>}
            {providerCredentialLine && (
              <p className="mt-1 text-sm font-bold">{providerCredentialLine}</p>
            )}
            <OptionalLine label="Registration No." value={snapshot.therapistRegistration} />
            <OptionalLine
              label="Registration authority"
              value={snapshot.therapistRegistrationAuthority}
            />
            <OptionalLine label="Phone" value={snapshot.therapistPhone} />
            <OptionalLine label="Email" value={snapshot.therapistEmail} />
            <OptionalLine label="Address" value={snapshot.practiceAddress} />
            <OptionalLine label="Home Visit Timings" value={homeVisitTimings} />
            {snapshot.therapistGstin.trim() && (
              <OptionalLine label="GSTIN" value={snapshot.therapistGstin} />
            )}
          </div>
        )}
      </section>

      <div className="flex h-3">
        <div className="w-3/5 bg-[#0b5cad]" />
        <div className="w-2/5 bg-[#0ba7a5]" />
      </div>

      <section className="space-y-4 px-6 py-6 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="text-sm"><span className="font-bold">Date:</span> {snapshot.issuedAt ? dateLabel(snapshot.issuedAt) : '—'}</p>
          <p className="text-sm sm:text-right"><span className="font-bold">Receipt No.:</span> {snapshot.invoiceNumber}</p>
        </div>

        <div className="grid gap-x-5 gap-y-3 border-y border-slate-200 py-4 sm:grid-cols-2">
          <p className="text-sm"><span className="font-bold">Patient Name:</span> {snapshot.patientName}</p>
          <p className="text-sm"><span className="font-bold">Patient No.:</span> {snapshot.patientNumber}</p>
          {patientAge.trim() && <p className="text-sm"><span className="font-bold">Age:</span> {patientAge.trim()}</p>}
          {patientGender.trim() && <p className="text-sm"><span className="font-bold">Gender:</span> {patientGender.trim()}</p>}
          <OptionalLine label="Contact Number" value={snapshot.patientPhone} />
          <OptionalLine label="Address" value={snapshot.patientAddress} />
          {referredBy.trim() && <p className="text-sm sm:col-span-2"><span className="font-bold">Referred By Dr.:</span> {referredBy.trim()}</p>}
          <p className="text-sm sm:col-span-2">
            <span className="font-bold">Chief Complaint / Service:</span>{' '}
            {chiefComplaint.trim() || snapshot.description || '—'}
          </p>
          {period && (
            <p className="text-sm sm:col-span-2">
              <span className="font-bold">Service period:</span> {period}
            </p>
          )}
          {additionalNote.trim() && (
            <p className="text-sm sm:col-span-2">
              <span className="font-bold">Additional note:</span> {additionalNote.trim()}
            </p>
          )}
        </div>

        <div className="overflow-hidden border border-slate-300">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead className="bg-sky-50 text-[#0b396f]">
              <tr>
                <th className="w-14 border-b border-r border-slate-300 px-2 py-2 text-center">Sr. No.</th>
                <th className="border-b border-r border-slate-300 px-3 py-2 text-left">Description</th>
                <th className="w-24 border-b border-r border-slate-300 px-2 py-2 text-center">Days</th>
                <th className="w-28 border-b border-r border-slate-300 px-2 py-2 text-right">Price / Day</th>
                <th className="w-28 border-b border-slate-300 px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-r border-slate-300 px-2 py-3 text-center">1</td>
                <td className="border-r border-slate-300 px-3 py-3 font-semibold">{snapshot.description || 'Physiotherapy treatment'}</td>
                <td className="border-r border-slate-300 px-2 py-3 text-center">{snapshot.sessions || '1'}</td>
                <td className="border-r border-slate-300 px-2 py-3 text-right">{money(unitPrice)}</td>
                <td className="px-2 py-3 text-right">{money(snapshot.fee)}</td>
              </tr>
              {snapshot.additional > 0 && (
                <tr className="border-t border-slate-200">
                  <td className="border-r border-slate-300 px-2 py-3 text-center">2</td>
                  <td className="border-r border-slate-300 px-3 py-3">
                    {snapshot.additionalDescription || 'Additional service / charge'}
                  </td>
                  <td className="border-r border-slate-300 px-2 py-3 text-center">1</td>
                  <td className="border-r border-slate-300 px-2 py-3 text-right">{money(snapshot.additional)}</td>
                  <td className="px-2 py-3 text-right">{money(snapshot.additional)}</td>
                </tr>
              )}
              {[0, 1, 2, 3].map((row) => (
                <tr key={row} className="border-t border-slate-200">
                  <td className="h-9 border-r border-slate-300" />
                  <td className="border-r border-slate-300" />
                  <td className="border-r border-slate-300" />
                  <td className="border-r border-slate-300" />
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-5 sm:grid-cols-[1fr_1.05fr]">
          <div className="min-h-36 rounded-xl border border-slate-300 p-3">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
              {digitalStamp ? 'Digital stamp' : 'Stamp area · digital or physical'}
            </p>
            {digitalStamp ? (
              <img
                src={digitalStamp}
                alt="Therapist digital stamp"
                className="mt-3 max-h-28 max-w-full object-contain"
              />
            ) : (
              <p className="mt-10 text-center text-xs text-slate-400">
                Leave blank to apply a physical stamp after printing.
              </p>
            )}
          </div>

          <div>
            <div className="overflow-hidden rounded-xl border border-slate-300 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-200 bg-sky-50 px-4 py-2.5">
                <span className="font-semibold">Subtotal</span><strong>{money(subtotal)}</strong>
              </div>
              {snapshot.discount > 0 && (
                <div className="flex justify-between gap-4 border-b border-slate-200 px-4 py-2.5">
                  <span>Discount</span><strong>-{money(snapshot.discount)}</strong>
                </div>
              )}
              {snapshot.gstRate > 0 && (
                <div className="flex justify-between gap-4 border-b border-slate-200 px-4 py-2.5">
                  <span>GST ({snapshot.gstRate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%)</span>
                  <strong>{money(Math.max(0, snapshot.total - subtotal + snapshot.discount))}</strong>
                </div>
              )}
              <div className="flex justify-between gap-4 border-b border-slate-200 px-4 py-2.5">
                <span>Invoice total</span><strong>{money(snapshot.total)}</strong>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-200 px-4 py-2.5">
                <span>Paid / Advance</span><strong>{money(paid)}</strong>
              </div>
              <div className="flex justify-between gap-4 bg-sky-50 px-4 py-3 text-base">
                <span className="font-extrabold">Total Due</span><strong>{money(balance)}</strong>
              </div>
            </div>
            <div className="mt-12 border-t border-slate-700 pt-2 text-center text-xs font-semibold">
              Signature
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 text-[10px] leading-4 text-slate-500">
          <p>This receipt is generated from the finalized PhysioBill invoice record. Digital stamp use is optional; a physical stamp and handwritten signature may be added after printing.</p>
          {snapshot.professionalVerificationStatus === 'verified' && (
            <p className="mt-1">Professional information was reviewed through PhysioBill's verification workflow; this does not guarantee insurer/mediclaim reimbursement.</p>
          )}
        </div>
      </section>
    </article>
  );
}

function PrintPreparation({
  homeVisitTimings,
  setHomeVisitTimings,
  referredBy,
  setReferredBy,
  chiefComplaint,
  setChiefComplaint,
  patientAge,
  setPatientAge,
  patientGender,
  setPatientGender,
  additionalNote,
  setAdditionalNote,
  digitalStamp,
  stampFileName,
  setDigitalStamp,
  setStampFileName,
}: {
  homeVisitTimings: string;
  setHomeVisitTimings: (value: string) => void;
  referredBy: string;
  setReferredBy: (value: string) => void;
  chiefComplaint: string;
  setChiefComplaint: (value: string) => void;
  patientAge: string;
  setPatientAge: (value: string) => void;
  patientGender: string;
  setPatientGender: (value: string) => void;
  additionalNote: string;
  setAdditionalNote: (value: string) => void;
  digitalStamp: string | null;
  stampFileName: string;
  setDigitalStamp: (value: string | null) => void;
  setStampFileName: (value: string) => void;
}) {
  const [stampError, setStampError] = useState<string | null>(null);

  const chooseStamp = (file: File | null) => {
    setStampError(null);
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setStampError('Use a PNG or JPG stamp image so the downloaded PDF can match the receipt.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStampError('Digital stamp image must be 2 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setStampError('Unable to read that stamp image.');
        return;
      }
      setDigitalStamp(reader.result);
      setStampFileName(file.name);
    };
    reader.onerror = () => setStampError('Unable to read that stamp image.');
    reader.readAsDataURL(file);
  };

  return (
    <section className="no-print rounded-2xl border bg-card p-5 sm:p-6">
      <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">Print preparation</p>
      <h2 className="mt-1 text-lg font-extrabold">Mediclaim / patient receipt details</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        These optional receipt details do not rewrite the finalized invoice. They are included in the mediclaim PDF you download. A digital stamp is sent only for that PDF generation and is not stored as the permanent invoice artifact.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Home Visit Timings (optional)</span>
          <input
            value={homeVisitTimings}
            onChange={(event) => setHomeVisitTimings(event.target.value)}
            placeholder="e.g. 7:00 AM–1:00 PM · 4:00 PM–10:00 PM"
            className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Referred By Dr. (optional)</span>
          <input
            value={referredBy}
            onChange={(event) => setReferredBy(event.target.value)}
            className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Patient Age (optional)</span>
          <input
            inputMode="numeric"
            value={patientAge}
            onChange={(event) => setPatientAge(event.target.value)}
            className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Gender (optional)</span>
          <select
            value={patientGender}
            onChange={(event) => setPatientGender(event.target.value)}
            className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm"
          >
            <option value="">Not shown</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label className="block space-y-1.5 md:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Chief complaint / service shown on receipt</span>
          <input
            value={chiefComplaint}
            onChange={(event) => setChiefComplaint(event.target.value)}
            className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm"
          />
        </label>
        <label className="block space-y-1.5 md:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Additional receipt note (optional)</span>
          <input
            value={additionalNote}
            onChange={(event) => setAdditionalNote(event.target.value)}
            placeholder="Only if something extra must appear on this printed receipt"
            className="h-11 w-full rounded-xl border bg-card px-3.5 text-sm"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold text-primary hover:bg-secondary">
          <Upload size={16} />
          {digitalStamp ? 'Replace digital stamp' : 'Add digital stamp'}
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(event) => chooseStamp(event.target.files?.[0] ?? null)}
          />
        </label>
        {digitalStamp && (
          <button
            type="button"
            onClick={() => {
              setDigitalStamp(null);
              setStampFileName('');
            }}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/5"
          >
            <Trash2 size={16} /> Remove stamp
          </button>
        )}
        {stampFileName && <span className="text-xs text-muted-foreground">{stampFileName}</span>}
      </div>
      {stampError && <p role="alert" className="mt-3 text-sm text-destructive">{stampError}</p>}
    </section>
  );
}

export function IssuedInvoiceDocument({ invoiceId, onBack }: { invoiceId: string; onBack: () => void }) {
  const [snapshot, setSnapshot] = useState<InvoiceIssuanceSnapshot | null>(null);
  const [invoice, setInvoice] = useState<ProductionInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptPdfBusy, setReceiptPdfBusy] = useState(false);
  const [auditPdfBusy, setAuditPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [homeVisitTimings, setHomeVisitTimings] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');
  const [digitalStamp, setDigitalStamp] = useState<string | null>(null);
  const [stampFileName, setStampFileName] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSnapshot(null);
    setInvoice(null);
    setPdfError(null);

    Promise.all([
      loadInvoiceIssuanceSnapshot(invoiceId),
      loadInvoice(invoiceId),
    ])
      .then(([loadedSnapshot, loadedInvoice]) => {
        if (!active) return;
        if (!loadedSnapshot) {
          setError('Issued invoice details are unavailable.');
          return;
        }
        setSnapshot(loadedSnapshot);
        setInvoice(loadedInvoice);
        setChiefComplaint(loadedSnapshot.description);
      })
      .catch(() => {
        if (active) setError('Issued invoice details are unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [invoiceId]);

  const downloadReceiptPdf = async () => {
    setReceiptPdfBusy(true);
    setPdfError(null);
    try {
      const result = await requestMediclaimReceiptPdf(invoiceId, {
        homeVisitTimings,
        referredBy,
        chiefComplaint,
        patientAge,
        patientGender,
        additionalNote,
        digitalStampDataUrl: digitalStamp,
      });
      downloadMediclaimReceiptPdf(result);
    } catch {
      setPdfError('Mediclaim PDF generation failed. Please try again.');
    } finally {
      setReceiptPdfBusy(false);
    }
  };

  const downloadPermanentPdf = async () => {
    setAuditPdfBusy(true);
    setPdfError(null);
    try {
      const result = await requestPermanentInvoicePdf(invoiceId);
      openPermanentInvoicePdfDownload(result);
    } catch {
      setPdfError('Preserved audit PDF generation failed. Please try again.');
    } finally {
      setAuditPdfBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
        >
          <ArrowLeft size={16} /> Back to invoice
        </button>
        {snapshot && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={receiptPdfBusy}
              onClick={() => void downloadReceiptPdf()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Download size={16} /> {receiptPdfBusy ? 'Generating receipt…' : 'Download mediclaim PDF'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold text-primary hover:bg-secondary"
            >
              <Printer size={16} /> Print / Save PDF
            </button>
            <button
              type="button"
              disabled={auditPdfBusy}
              onClick={() => void downloadPermanentPdf()}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-50"
            >
              <FileCheck2 size={15} /> {auditPdfBusy ? 'Generating audit copy…' : 'Preserved audit PDF'}
            </button>
          </div>
        )}
      </div>

      {pdfError && (
        <div role="alert" className="no-print rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {pdfError}
        </div>
      )}
      {loading && (
        <div className="rounded-2xl border bg-card p-6 text-sm font-semibold text-muted-foreground">
          Loading issued invoice…
        </div>
      )}
      {!loading && error && (
        <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
          {error}
        </div>
      )}
      {!loading && snapshot && (
        <>
          <PrintPreparation
            homeVisitTimings={homeVisitTimings}
            setHomeVisitTimings={setHomeVisitTimings}
            referredBy={referredBy}
            setReferredBy={setReferredBy}
            chiefComplaint={chiefComplaint}
            setChiefComplaint={setChiefComplaint}
            patientAge={patientAge}
            setPatientAge={setPatientAge}
            patientGender={patientGender}
            setPatientGender={setPatientGender}
            additionalNote={additionalNote}
            setAdditionalNote={setAdditionalNote}
            digitalStamp={digitalStamp}
            stampFileName={stampFileName}
            setDigitalStamp={setDigitalStamp}
            setStampFileName={setStampFileName}
          />
          <IssuedInvoiceSheet
            snapshot={snapshot}
            invoice={invoice}
            homeVisitTimings={homeVisitTimings}
            referredBy={referredBy}
            chiefComplaint={chiefComplaint}
            patientAge={patientAge}
            patientGender={patientGender}
            additionalNote={additionalNote}
            digitalStamp={digitalStamp}
          />
          <div className="no-print">
            <ReimbursementDocumentPanel invoiceId={invoiceId} />
          </div>
        </>
      )}
    </div>
  );
}
