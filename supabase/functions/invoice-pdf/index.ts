import { createClient } from '@supabase/supabase-js';
import { normalizeSnapshot, SNAPSHOT_COLUMNS } from './document-dto.ts';
import { renderInvoicePdf } from './renderer.ts';

const BUCKET = 'invoice-pdf-artifacts';
const DOCUMENT_VERSION = 1;
const RENDERER_VERSION = 'physiobill-pdf-v1';
const SIGNED_URL_TTL_SECONDS = 90;
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_ALLOWED_ORIGINS = ['https://physiobill-independent.pages.dev'];
const allowedOrigins = new Set(
  (Deno.env.get('INVOICE_PDF_ALLOWED_ORIGINS') ?? DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

const corsHeadersFor = (req: Request) => {
  const origin = req.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (origin && allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
};

const json = (req: Request, status: number, body: unknown, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), ...extraHeaders, 'Content-Type': 'application/json' },
  });

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

const objectPath = (physioId: string, invoiceId: string) =>
  `physios/${physioId}/invoices/${invoiceId}/documents/v${DOCUMENT_VERSION}/invoice.pdf`;

const errorCode = (caught: unknown) => {
  const message = caught instanceof Error ? caught.message : 'generation_failed';
  if (/^[A-Z0-9_]{3,120}$/.test(message)) return message.toLowerCase();
  return 'generation_failed';
};

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (origin && !allowedOrigins.has(origin)) {
    return json(req, 403, { error: 'Origin not allowed.' });
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'Method not allowed.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');
  if (!supabaseUrl || !publicKey || !serviceRoleKey) return json(req, 500, { error: 'PDF service is not configured.' });
  if (!authorization?.startsWith('Bearer ')) return json(req, 401, { error: 'Authentication required.' });

  let invoiceId = '';
  try {
    const body = await req.json();
    invoiceId = typeof body?.invoiceId === 'string' ? body.invoiceId : '';
  } catch {
    return json(req, 400, { error: 'Invalid request.' });
  }
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return json(req, 400, { error: 'Invalid invoice ID.' });

  const userClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json(req, 401, { error: 'Authentication required.' });

  const { data: snapshotRow, error: snapshotError } = await userClient
    .from('invoice_issuance_snapshots')
    .select(SNAPSHOT_COLUMNS)
    .eq('invoice_id', invoiceId)
    .maybeSingle();
  if (snapshotError) return json(req, 500, { error: 'Unable to load issued invoice.' });
  if (!snapshotRow) return json(req, 404, { error: 'Issued invoice is unavailable.' });

  const dto = normalizeSnapshot(snapshotRow as Record<string, unknown>);
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rateRows, error: rateError } = await service.rpc('check_invoice_pdf_rate_limit', {
    p_user_id: userData.user.id,
    p_limit: RATE_LIMIT_REQUESTS,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
  });
  if (rateError || !Array.isArray(rateRows) || !rateRows[0]) {
    return json(req, 500, { error: 'Unable to verify PDF request limits.' });
  }
  const rate = rateRows[0] as Record<string, unknown>;
  if (rate.allowed !== true) {
    const retryAfter = Math.max(1, Number(rate.retry_after_seconds ?? RATE_LIMIT_WINDOW_SECONDS));
    return json(req, 429, { error: 'Too many PDF requests. Please retry shortly.' }, { 'Retry-After': String(retryAfter) });
  }

  const path = objectPath(dto.physioId, dto.invoiceId);
  const token = crypto.randomUUID();

  const { data: claimRows, error: claimError } = await service.rpc('claim_invoice_document_artifact', {
    p_invoice_id: dto.invoiceId,
    p_physio_id: dto.physioId,
    p_snapshot_schema_version: dto.snapshotSchemaVersion,
    p_document_version: DOCUMENT_VERSION,
    p_renderer_version: RENDERER_VERSION,
    p_storage_bucket: BUCKET,
    p_storage_object_path: path,
    p_generation_token: token,
  });
  if (claimError || !Array.isArray(claimRows) || !claimRows[0]) return json(req, 500, { error: 'Unable to claim PDF generation.' });
  const claim = claimRows[0] as Record<string, unknown>;
  const artifactId = String(claim.artifact_id ?? '');
  const action = String(claim.action ?? '');

  const verifyStoredObject = async (expectedHash?: string, expectedSize?: number) => {
    const { data, error } = await service.storage.from(BUCKET).download(path);
    if (error || !data) return null;
    const bytes = new Uint8Array(await data.arrayBuffer());
    const hash = await sha256Hex(bytes);
    if (expectedHash && hash !== expectedHash) throw new Error('ARTIFACT_SHA_MISMATCH');
    if (expectedSize && bytes.byteLength !== expectedSize) throw new Error('ARTIFACT_SIZE_MISMATCH');
    return { bytes, hash };
  };

  const signedResponse = async (sha256: string, byteSize: number) => {
    const filename = `invoice-${dto.invoiceNumber.replace(/[^A-Za-z0-9._-]+/g, '-')}.pdf`;
    const { data, error } = await service.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS, { download: filename });
    if (error || !data?.signedUrl) return json(req, 500, { error: 'Unable to create secure PDF download.' });
    return json(req, 200, {
      signedUrl: data.signedUrl,
      artifact: { id: artifactId, invoiceId: dto.invoiceId, documentVersion: DOCUMENT_VERSION, rendererVersion: RENDERER_VERSION, sha256, byteSize },
    });
  };

  try {
    if (action === 'complete') {
      const expectedHash = String(claim.sha256 ?? '');
      const expectedSize = Number(claim.byte_size ?? 0);
      const stored = await verifyStoredObject(expectedHash, expectedSize);
      if (!stored) return json(req, 409, { error: 'Stored PDF artifact is missing.' });
      return await signedResponse(stored.hash, stored.bytes.byteLength);
    }
    if (action === 'in_progress') return json(req, 409, { error: 'PDF generation is already in progress. Please retry shortly.' });
    if (action !== 'claimed') return json(req, 500, { error: 'Unexpected PDF generation state.' });

    const orphan = await verifyStoredObject();
    let bytes: Uint8Array;
    let hash: string;
    if (orphan) {
      bytes = orphan.bytes;
      hash = orphan.hash;
    } else {
      bytes = await renderInvoicePdf(dto);
      hash = await sha256Hex(bytes);
      const { error: uploadError } = await service.storage.from(BUCKET).upload(path, bytes, {
        contentType: 'application/pdf',
        upsert: false,
        cacheControl: '31536000',
      });
      if (uploadError) {
        const raced = await verifyStoredObject();
        if (!raced) throw new Error('STORAGE_UPLOAD_FAILED');
        bytes = raced.bytes;
        hash = raced.hash;
      }
    }

    const { error: completeError } = await service.rpc('complete_invoice_document_artifact', {
      p_artifact_id: artifactId,
      p_generation_token: token,
      p_byte_size: bytes.byteLength,
      p_sha256: hash,
    });
    if (completeError) throw new Error('ARTIFACT_FINALIZE_FAILED');
    return await signedResponse(hash, bytes.byteLength);
  } catch (caught) {
    await service.rpc('fail_invoice_document_artifact', {
      p_artifact_id: artifactId,
      p_generation_token: token,
      p_error_code: errorCode(caught),
    });
    const code = errorCode(caught);
    if (code.includes('mismatch')) return json(req, 409, { error: 'Stored PDF integrity check failed.' });
    if (code === 'unsupported_pdf_text') return json(req, 422, { error: 'This invoice contains text the current PDF renderer cannot safely encode.' });
    return json(req, 500, { error: 'PDF generation failed.' });
  }
});
