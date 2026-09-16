import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import type { InvoicePdfDto } from './document-dto.ts';
import { decodePhysioBillMarkPng } from './brand-logo.ts';

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const TEXT = rgb(0.09, 0.18, 0.22);
const MUTED = rgb(0.35, 0.42, 0.45);
const ACCENT = rgb(0.05, 0.43, 0.39);
const BLUE = rgb(0.043, 0.361, 0.678);
const TEAL = rgb(0.043, 0.655, 0.647);
const PALE_BLUE = rgb(0.94, 0.98, 1);
const BORDER = rgb(0.78, 0.83, 0.87);

export type MediclaimReceiptOptions = {
  homeVisitTimings: string;
  referredBy: string;
  chiefComplaint: string;
  patientAge: string;
  patientGender: string;
  additionalNote: string;
  paid: number;
  digitalStamp?: {
    mimeType: 'image/png' | 'image/jpeg';
    bytes: Uint8Array;
  } | null;
};

function safeText(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[\u00B7\u2022]/g, '-');
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
    const amountText = `Rs ${negative ? '-' : ''}${moneyNumber(value)}`;
    const amountWidth = bold.widthOfTextAtSize(amountText, 10);
    page.drawText(amountText, { x: A4[0] - MARGIN - amountWidth, y, size: 10, font: bold, color: TEXT });
    y -= 17;
  };

  line('PhysioBill', { bold: true, size: 11, color: ACCENT });
  y -= 6;
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

function drawWrapped(
  page: ReturnType<PDFDocument['addPage']>,
  font: PDFFont,
  value: string,
  x: number,
  y: number,
  size: number,
  maxWidth: number,
  color = TEXT,
  lineHeight = size + 3,
) {
  const lines = wrap(font, value, size, maxWidth);
  let cursor = y;
  for (const text of lines) {
    page.drawText(text || '-', { x, y: cursor, size, font, color });
    cursor -= lineHeight;
  }
  return cursor;
}

function drawLabeledValue(
  page: ReturnType<PDFDocument['addPage']>,
  regular: PDFFont,
  bold: PDFFont,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  size = 8.5,
) {
  if (!value.trim()) return y;
  const safeLabel = safeText(`${label}: `);
  page.drawText(safeLabel, { x, y, size, font: bold, color: TEXT });
  const labelWidth = bold.widthOfTextAtSize(safeLabel, size);
  const remainingWidth = Math.max(30, maxWidth - labelWidth);
  return drawWrapped(page, regular, value, x + labelWidth, y, size, remainingWidth, TEXT, size + 2.5);
}

function amountText(value: number) {
  return `Rs ${moneyNumber(Math.max(0, value))}`;
}

function drawRightText(
  page: ReturnType<PDFDocument['addPage']>,
  font: PDFFont,
  value: string,
  rightX: number,
  y: number,
  size: number,
  color = TEXT,
) {
  const text = safeText(value);
  page.drawText(text, {
    x: rightX - font.widthOfTextAtSize(text, size),
    y,
    size,
    font,
    color,
  });
}

function parseQuantity(sessions: string) {
  const match = sessions.trim().match(/^(\d+(?:\.\d+)?)/);
  const value = match ? Number(match[1]) : 1;
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export async function renderMediclaimReceiptPdf(
  dto: InvoicePdfDto,
  options: MediclaimReceiptOptions,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Receipt ${safeText(dto.invoiceNumber)}`);
  pdf.setAuthor('PhysioBill');
  pdf.setCreator('PhysioBill');
  pdf.setProducer('PhysioBill mediclaim receipt renderer v1');

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage(A4);
  const width = A4[0];
  const left = 28;
  const right = width - 28;

  // Header / brand. The mark is generated from the same SVG geometry used by the web app.
  const brandMark = await pdf.embedPng(decodePhysioBillMarkPng());
  page.drawImage(brandMark, { x: 34, y: 766, width: 58, height: 58 });

  const wordX = 101;
  const wordY = 799;
  const wordSize = 22;
  const physioWord = 'Physio';
  page.drawText(physioWord, { x: wordX, y: wordY, size: wordSize, font: bold, color: BLUE });
  const billX = wordX + bold.widthOfTextAtSize(physioWord, wordSize) + 2.5;
  page.drawText('Bill', { x: billX, y: wordY, size: wordSize, font: bold, color: TEAL });
  page.drawText('PHYSIOTHERAPY | RECOVERY | BETTER LIVING', { x: wordX, y: 783, size: 5.6, font: bold, color: MUTED });

  const providerX = 312;
  const providerWidth = right - providerX;
  page.drawLine({ start: { x: 298, y: 818 }, end: { x: 298, y: 757 }, thickness: 0.9, color: BORDER });
  let py = 809;
  if (dto.provider.fullName) {
    py = drawWrapped(page, bold, dto.provider.fullName, providerX, py, 10.2, providerWidth, BLUE, 12.4) - 1;
  }
  const professionalLine = [dto.provider.title, dto.provider.qualification]
    .filter((value) => value.trim())
    .join(' | ');
  if (professionalLine) {
    py = drawWrapped(page, bold, professionalLine, providerX, py, 7.8, providerWidth, TEXT, 10);
  }
  py = drawLabeledValue(page, regular, bold, 'Registration No.', dto.provider.registration, providerX, py, providerWidth, 7.6);
  py = drawLabeledValue(page, regular, bold, 'Phone', dto.provider.phone, providerX, py, providerWidth, 7.6);
  py = drawLabeledValue(page, regular, bold, 'Email', dto.provider.email, providerX, py, providerWidth, 6.9);
  py = drawLabeledValue(page, regular, bold, 'Address', dto.provider.address, providerX, py, providerWidth, 7.2);
  py = drawLabeledValue(page, regular, bold, 'Home Visit Timings', options.homeVisitTimings, providerX, py, providerWidth, 7.2);
  if (dto.provider.gstin.trim()) {
    drawLabeledValue(page, regular, bold, 'GSTIN', dto.provider.gstin, providerX, py, providerWidth, 7.2);
  }

  page.drawRectangle({ x: left, y: 744, width: 330, height: 7, color: BLUE });
  page.drawRectangle({ x: left + 330, y: 744, width: right - left - 330, height: 7, color: TEAL });

  // Patient / receipt metadata.
  let y = 724;
  page.drawText(`Date: ${dto.issuedAt ? dateLabel(dto.issuedAt) : '-'}`, { x: left + 10, y, size: 8.5, font: bold, color: TEXT });
  drawRightText(page, bold, `Receipt No.: ${dto.invoiceNumber}`, right - 10, y, 8.5);
  y -= 16;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.7, color: BORDER });
  y -= 18;

  page.drawText('Patient Name:', { x: left + 10, y, size: 8.2, font: bold, color: TEXT });
  page.drawText(safeText(dto.patient.name || '-'), { x: left + 82, y, size: 8.2, font: regular, color: TEXT });
  page.drawText('Patient No.:', { x: 335, y, size: 8.2, font: bold, color: TEXT });
  page.drawText(safeText(dto.patient.number || '-'), { x: 398, y, size: 8.2, font: regular, color: TEXT });
  y -= 17;

  if (options.patientAge.trim()) {
    page.drawText('Age:', { x: left + 10, y, size: 8.2, font: bold, color: TEXT });
    page.drawText(safeText(options.patientAge), { x: left + 35, y, size: 8.2, font: regular, color: TEXT });
  }
  if (options.patientGender.trim()) {
    page.drawText('Gender:', { x: 130, y, size: 8.2, font: bold, color: TEXT });
    page.drawText(safeText(options.patientGender), { x: 170, y, size: 8.2, font: regular, color: TEXT });
  }
  if (dto.patient.phone.trim()) {
    page.drawText('Contact Number:', { x: 335, y, size: 8.2, font: bold, color: TEXT });
    page.drawText(safeText(dto.patient.phone), { x: 410, y, size: 8.2, font: regular, color: TEXT });
  }
  y -= 17;

  if (dto.patient.address.trim()) {
    y = drawLabeledValue(page, regular, bold, 'Address', dto.patient.address, left + 10, y, right - left - 20, 8.2);
  }
  if (options.referredBy.trim()) {
    y = drawLabeledValue(page, regular, bold, 'Referred By Dr.', options.referredBy, left + 10, y - 2, right - left - 20, 8.2);
  }
  y = drawLabeledValue(
    page,
    regular,
    bold,
    'Chief Complaint / Service',
    options.chiefComplaint.trim() || dto.service.description || '-',
    left + 10,
    y - 2,
    right - left - 20,
    8.2,
  );
  y = drawLabeledValue(page, regular, bold, 'Service period', servicePeriod(dto), left + 10, y - 2, right - left - 20, 8.2);
  if (options.additionalNote.trim()) {
    y = drawLabeledValue(page, regular, bold, 'Additional note', options.additionalNote, left + 10, y - 2, right - left - 20, 8.2);
  }
  y -= 8;

  // Billing table.
  const tableX = left + 10;
  const tableW = right - left - 20;
  const cols = [40, 265, 55, 72, tableW - 432];
  const headerH = 24;
  const rowH = 28;
  const visibleRows = Math.max(8, Math.min(11, Math.floor((y - 225 - headerH) / rowH)));
  page.drawRectangle({ x: tableX, y: y - headerH, width: tableW, height: headerH, color: PALE_BLUE, borderColor: BORDER, borderWidth: 0.8 });
  let cx = tableX;
  for (let i = 0; i < cols.length - 1; i += 1) {
    cx += cols[i];
    page.drawLine({ start: { x: cx, y }, end: { x: cx, y: y - headerH - rowH * visibleRows }, thickness: 0.6, color: BORDER });
  }
  const headers = ['Sr. No.', 'Description', 'Days', 'Price / Day', 'Amount'];
  cx = tableX;
  headers.forEach((header, index) => {
    const colW = cols[index];
    const tw = bold.widthOfTextAtSize(header, 7.6);
    page.drawText(header, { x: cx + Math.max(5, (colW - tw) / 2), y: y - 15, size: 7.6, font: bold, color: BLUE });
    cx += colW;
  });

  const days = parseQuantity(dto.service.sessions);
  const unitPrice = days > 1 ? dto.service.fee / days : dto.service.fee;
  const rows: Array<{ description: string; days: string; price: number; amount: number }> = [
    {
      description: dto.service.description || 'Physiotherapy treatment',
      days: dto.service.sessions || '1',
      price: unitPrice,
      amount: dto.service.fee,
    },
  ];
  if (dto.service.additional > 0) {
    rows.push({
      description: dto.service.additionalDescription || 'Additional service / charge',
      days: '1',
      price: dto.service.additional,
      amount: dto.service.additional,
    });
  }

  for (let rowIndex = 0; rowIndex < visibleRows; rowIndex += 1) {
    const top = y - headerH - rowH * rowIndex;
    const bottom = top - rowH;
    page.drawLine({ start: { x: tableX, y: bottom }, end: { x: tableX + tableW, y: bottom }, thickness: 0.6, color: BORDER });
    const row = rows[rowIndex];
    if (!row) continue;
    page.drawText(String(rowIndex + 1), { x: tableX + 17, y: bottom + 9, size: 8, font: regular, color: TEXT });
    drawWrapped(page, regular, row.description, tableX + cols[0] + 7, bottom + 10, 8, cols[1] - 14, TEXT, 9.5);
    const daysText = safeText(row.days);
    const daysX = tableX + cols[0] + cols[1] + (cols[2] - regular.widthOfTextAtSize(daysText, 8)) / 2;
    page.drawText(daysText, { x: daysX, y: bottom + 9, size: 8, font: regular, color: TEXT });
    drawRightText(page, regular, amountText(row.price), tableX + cols[0] + cols[1] + cols[2] + cols[3] - 6, bottom + 9, 8);
    drawRightText(page, regular, amountText(row.amount), tableX + tableW - 6, bottom + 9, 8);
  }
  page.drawRectangle({ x: tableX, y: y - headerH - rowH * visibleRows, width: tableW, height: headerH + rowH * visibleRows, borderColor: BORDER, borderWidth: 0.8 });

  y = y - headerH - rowH * visibleRows - 12;

  // Stamp and totals.
  const stampW = 240;
  const stampH = 140;
  page.drawRectangle({ x: tableX, y: y - stampH, width: stampW, height: stampH, borderColor: BORDER, borderWidth: 0.8 });
  page.drawText(options.digitalStamp ? 'DIGITAL STAMP' : 'STAMP AREA · DIGITAL OR PHYSICAL', { x: tableX + 8, y: y - 14, size: 6.5, font: bold, color: MUTED });

  if (options.digitalStamp) {
    try {
      const image = options.digitalStamp.mimeType === 'image/png'
        ? await pdf.embedPng(options.digitalStamp.bytes)
        : await pdf.embedJpg(options.digitalStamp.bytes);
      const scaled = image.scale(1);
      const maxW = stampW - 24;
      const maxH = stampH - 34;
      const scale = Math.min(maxW / scaled.width, maxH / scaled.height, 1);
      const drawW = scaled.width * scale;
      const drawH = scaled.height * scale;
      page.drawImage(image, {
        x: tableX + (stampW - drawW) / 2,
        y: y - stampH + 8 + (maxH - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    } catch {
      throw new Error('UNSUPPORTED_STAMP_IMAGE');
    }
  } else {
    page.drawText('Leave blank to apply a physical stamp after printing.', { x: tableX + 27, y: y - 78, size: 7, font: regular, color: MUTED });
  }

  const totalsX = tableX + stampW + 16;
  const totalsW = tableW - stampW - 16;
  const lineH = 22;
  const subtotal = Math.max(0, dto.service.fee + dto.service.additional);
  const paid = Math.max(0, options.paid);
  const totalDue = Math.max(0, dto.service.total - paid);
  const totals: Array<[string, number, boolean]> = [
    ['Subtotal', subtotal, false],
  ];
  if (dto.service.discount > 0) totals.push(['Discount', dto.service.discount, true]);
  if (dto.service.gstRate > 0) {
    const gstAmount = Math.max(0, dto.service.total - subtotal + dto.service.discount);
    totals.push([`GST (${dto.service.gstRate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%)`, gstAmount, false]);
  }
  totals.push(['Invoice total', dto.service.total, false]);
  totals.push(['Paid / Advance', paid, false]);
  totals.push(['Total Due', totalDue, false]);

  let ty = y;
  totals.forEach(([label, value, negative], index) => {
    const isLast = index === totals.length - 1;
    page.drawRectangle({
      x: totalsX,
      y: ty - lineH,
      width: totalsW,
      height: lineH,
      color: isLast || index === 0 ? PALE_BLUE : rgb(1,1,1),
      borderColor: BORDER,
      borderWidth: 0.6,
    });
    page.drawText(safeText(label), { x: totalsX + 9, y: ty - 14, size: isLast ? 9 : 8, font: isLast ? bold : regular, color: TEXT });
    drawRightText(page, isLast ? bold : regular, `Rs ${negative ? '-' : ''}${moneyNumber(value)}`, totalsX + totalsW - 8, ty - 14, isLast ? 9 : 8);
    ty -= lineH;
  });

  const signatureLineY = Math.max(y - stampH + 30, ty - 18);
  page.drawLine({ start: { x: totalsX + 16, y: signatureLineY }, end: { x: totalsX + totalsW - 16, y: signatureLineY }, thickness: 0.8, color: TEXT });
  const signature = 'Signature';
  page.drawText(signature, { x: totalsX + (totalsW - regular.widthOfTextAtSize(signature, 7)) / 2, y: signatureLineY - 12, size: 7, font: regular, color: TEXT });

  page.drawLine({ start: { x: left, y: 57 }, end: { x: right, y: 57 }, thickness: 0.6, color: BORDER });
  page.drawText('This receipt is generated from the finalized PhysioBill invoice record.', { x: left, y: 42, size: 6.3, font: regular, color: MUTED });
  page.drawText('Digital stamp is optional; a physical stamp and handwritten signature may be added after printing.', { x: left, y: 32, size: 6.3, font: regular, color: MUTED });

  return pdf.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: 50 });
}
