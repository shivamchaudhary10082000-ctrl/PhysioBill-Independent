import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { InvoicePdfDto } from './document-dto.ts';

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const TEXT = rgb(0.09, 0.18, 0.22);
const MUTED = rgb(0.35, 0.42, 0.45);
const ACCENT = rgb(0.05, 0.43, 0.39);

function safeText(value: string) {
  const normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  if (/[^\x20-\x7E]/.test(normalized)) throw new Error('UNSUPPORTED_PDF_TEXT');
  return normalized;
}

const moneyNumber = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const dateLabel = (value: string) => {
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

function servicePeriod(dto: InvoicePdfDto) {
  const start = dto.service.startDate ? dateLabel(dto.service.startDate) : '';
  const end = dto.service.endDate ? dateLabel(dto.service.endDate) : '';
  if (!start && !end) return '-';
  if (start && start === end) return start;
  return `${start || '-'} - ${end || '-'}`;
}

function drawRupee(page: PDFPage, x: number, y: number, size: number) {
  const w = size * 0.62;
  const t = Math.max(0.8, size * 0.07);
  page.drawLine({ start: { x, y: y + size * 0.82 }, end: { x: x + w, y: y + size * 0.82 }, thickness: t, color: TEXT });
  page.drawLine({ start: { x, y: y + size * 0.62 }, end: { x: x + w * 0.9, y: y + size * 0.62 }, thickness: t, color: TEXT });
  page.drawLine({ start: { x: x + w * 0.08, y: y + size }, end: { x: x + w * 0.55, y: y + size }, thickness: t, color: TEXT });
  page.drawLine({ start: { x: x + w * 0.55, y: y + size }, end: { x: x + w * 0.55, y: y + size * 0.55 }, thickness: t, color: TEXT });
  page.drawLine({ start: { x: x + w * 0.55, y: y + size * 0.55 }, end: { x: x + w * 0.08, y: y + size * 0.08 }, thickness: t, color: TEXT });
  return w + size * 0.18;
}

function wrap(font: PDFFont, value: string, size: number, maxWidth: number) {
  const words = safeText(value).split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderInvoicePdf(dto: InvoicePdfDto): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${safeText(dto.invoiceNumber)}`);
  pdf.setAuthor('PhysioBill');
  pdf.setCreator('PhysioBill');
  pdf.setProducer('PhysioBill PDF renderer v1');
  pdf.setCreationDate(new Date(0));
  pdf.setModificationDate(new Date(0));

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage(A4);
  let y = A4[1] - MARGIN;

  const ensure = (needed = 24) => {
    if (y - needed >= MARGIN) return;
    page = pdf.addPage(A4);
    y = A4[1] - MARGIN;
  };
  const line = (value: string, options: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb>; indent?: number } = {}) => {
    const font = options.bold ? bold : regular;
    const size = options.size ?? 10;
    const indent = options.indent ?? 0;
    const lines = wrap(font, value, size, A4[0] - MARGIN * 2 - indent);
    for (const text of lines) {
      ensure(size + 7);
      page.drawText(text || '-', { x: MARGIN + indent, y, size, font, color: options.color ?? TEXT });
      y -= size + 5;
    }
  };
  const section = (title: string) => { ensure(34); y -= 7; line(title.toUpperCase(), { bold: true, size: 9, color: ACCENT }); y -= 3; };
  const kv = (label: string, value: string) => { if (value.trim()) line(`${label}: ${value}`); };
  const amount = (label: string, value: number, negative = false) => {
    ensure(19);
    page.drawText(safeText(label), { x: MARGIN, y, size: 10, font: regular, color: TEXT });
    const numberText = `${negative ? '-' : ''}${moneyNumber(value)}`;
    const numberWidth = regular.widthOfTextAtSize(numberText, 10);
    const rupeeX = A4[0] - MARGIN - numberWidth - 10;
    const rupeeWidth = drawRupee(page, rupeeX, y - 1, 10);
    page.drawText(numberText, { x: rupeeX + rupeeWidth, y, size: 10, font: bold, color: TEXT });
    y -= 17;
  };

  line('PhysioBill', { bold: true, size: 11, color: ACCENT });
  line('INVOICE', { bold: true, size: 24 });
  line(dto.invoiceNumber, { bold: true, size: 12, color: MUTED });
  line(dto.issuedAt ? `Issued on: ${dateLabel(dto.issuedAt)}` : 'Issue date unavailable for this legacy invoice.', { color: MUTED });

  section('Provider');
  if (dto.provider.practiceName) line(dto.provider.practiceName, { bold: true, size: 13 });
  if (dto.provider.fullName) line(dto.provider.fullName, { bold: true });
  kv('Title', dto.provider.title);
  kv('Qualification', dto.provider.qualification);
  kv('Registration', dto.provider.registration);
  kv('Registration authority', dto.provider.registrationAuthority);
  if (dto.provider.professionalVerificationStatus === 'verified') line('Professional credentials verified by PhysioBill', { bold: true, color: ACCENT });
  kv('Address', dto.provider.address);
  kv('Phone', dto.provider.phone);
  kv('Email', dto.provider.email);
  kv('PAN', dto.provider.pan);
  kv('GSTIN', dto.provider.gstin);

  section('Patient');
  line(dto.patient.name || '-', { bold: true });
  kv('Patient number', dto.patient.number);
  kv('Phone', dto.patient.phone);
  kv('Email', dto.patient.email);
  kv('Address', dto.patient.address);

  section('Service details');
  kv('Description', dto.service.description || '-');
  kv('Sessions', dto.service.sessions || '-');
  kv('Service period', servicePeriod(dto));
  y -= 4;
  amount('Fee', dto.service.fee);
  if (dto.service.additional > 0) amount(dto.service.additionalDescription ? `Additional - ${dto.service.additionalDescription}` : 'Additional', dto.service.additional);
  if (dto.service.discount > 0) amount('Discount', dto.service.discount, true);
  line(`GST: ${dto.service.gstRate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`);
  y -= 2;
  amount('TOTAL', dto.service.total);

  ensure(35);
  y -= 8;
  line('This document is rendered from the preserved invoice issuance record.', { size: 8, color: MUTED });

  return pdf.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: 50 });
}
