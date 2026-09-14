const MAX_WEBHOOK_BYTES = 20 * 1024;
const MSG91_FLOW_ENDPOINT = 'https://control.msg91.com/api/v5/flow';
const E164_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const OTP_PATTERN = /^\d{6}$/;
const FLOW_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const SENDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const VARIABLE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const RESERVED_RECIPIENT_FIELDS = new Set(['mobiles', '__proto__', 'prototype', 'constructor']);

export type EnvReader = (name: string) => string | undefined;
export type WebhookVerifier = (
  payload: string,
  headers: Record<string, string>,
  secret: string,
) => unknown | Promise<unknown>;
export type SafeLogger = {
  error: (message: string, details?: Record<string, unknown>) => void;
};

export type SendSmsHandlerDependencies = {
  getEnv: EnvReader;
  verifyWebhook: WebhookVerifier;
  fetchImpl?: typeof fetch;
  logger?: SafeLogger;
};

type Msg91Config = {
  authKey: string;
  flowId: string;
  otpVariable: string;
  senderId?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const json = (status: number, body: Record<string, unknown>, extraHeaders: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...Object.fromEntries(new Headers(extraHeaders)),
    },
  });

const reject = (status: number, message: string, extraHeaders?: HeadersInit) =>
  json(status, { error: message }, extraHeaders);

const safeAsciiSecret = (value: string) =>
  value.length > 0 && value.length <= 512 && /^[\x21-\x7E]+$/.test(value);

export function normalizeHookSecret(raw: string | undefined): string | null {
  const secret = raw?.trim() ?? '';
  const match = /^v1,(whsec_[A-Za-z0-9+/]{16,512}={0,2})$/.exec(secret);
  return match?.[1] ?? null;
}

function readMsg91Config(getEnv: EnvReader): Msg91Config | null {
  const authKey = getEnv('MSG91_AUTH_KEY')?.trim() ?? '';
  const flowId = getEnv('MSG91_FLOW_ID')?.trim() ?? '';
  const otpVariable = getEnv('MSG91_OTP_VARIABLE')?.trim() ?? '';
  const senderId = getEnv('MSG91_SENDER_ID')?.trim() ?? '';

  if (!safeAsciiSecret(authKey)) return null;
  if (!FLOW_ID_PATTERN.test(flowId)) return null;
  if (!VARIABLE_NAME_PATTERN.test(otpVariable)) return null;
  if (RESERVED_RECIPIENT_FIELDS.has(otpVariable)) return null;
  if (senderId && !SENDER_ID_PATTERN.test(senderId)) return null;

  return {
    authKey,
    flowId,
    otpVariable,
    ...(senderId ? { senderId } : {}),
  };
}

function contentLengthTooLarge(req: Request) {
  const raw = req.headers.get('content-length');
  if (!raw) return false;
  if (!/^\d+$/.test(raw)) return true;
  return Number(raw) > MAX_WEBHOOK_BYTES;
}

function extractSignedPayload(verified: unknown): { phone: string; otp: string } | null {
  if (!isRecord(verified)) return null;
  const user = verified.user;
  const sms = verified.sms;
  if (!isRecord(user) || !isRecord(sms)) return null;

  const phone = typeof user.phone === 'string' ? user.phone : '';
  const otp = typeof sms.otp === 'string' ? sms.otp : '';
  if (!E164_PHONE_PATTERN.test(phone)) return null;
  if (!OTP_PATTERN.test(otp)) return null;

  return { phone, otp };
}

async function sendViaMsg91(
  config: Msg91Config,
  phone: string,
  otp: string,
  fetchImpl: typeof fetch,
  logger: SafeLogger,
) {
  const recipient: Record<string, string> = {
    mobiles: phone.slice(1),
  };
  recipient[config.otpVariable] = otp;

  const body: Record<string, unknown> = {
    flow_id: config.flowId,
    recipients: [recipient],
  };
  if (config.senderId) body.sender = config.senderId;

  let response: Response;
  try {
    response = await fetchImpl(MSG91_FLOW_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        authkey: config.authKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3500),
    });
  } catch {
    logger.error('[send-sms] MSG91 request failed.', { category: 'network' });
    return false;
  }

  if (!response.ok) {
    logger.error('[send-sms] MSG91 rejected request.', { httpStatus: response.status });
    return false;
  }

  let providerBody: unknown;
  try {
    providerBody = await response.json();
  } catch {
    logger.error('[send-sms] MSG91 returned an invalid response.', { category: 'invalid-json' });
    return false;
  }

  if (!isRecord(providerBody) || providerBody.type !== 'success') {
    logger.error('[send-sms] MSG91 did not confirm delivery acceptance.', { category: 'provider-rejection' });
    return false;
  }

  return true;
}

export function createSendSmsHandler({
  getEnv,
  verifyWebhook,
  fetchImpl = fetch,
  logger = console,
}: SendSmsHandlerDependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
      return reject(405, 'Method not allowed.');
    }

    const hookSecret = normalizeHookSecret(getEnv('SEND_SMS_HOOK_SECRET'));
    if (!hookSecret) {
      return reject(500, 'SMS delivery service is not configured.');
    }

    const webhookId = req.headers.get('webhook-id');
    const webhookTimestamp = req.headers.get('webhook-timestamp');
    const webhookSignature = req.headers.get('webhook-signature');
    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      return reject(401, 'Invalid webhook.');
    }

    if (contentLengthTooLarge(req)) {
      return reject(413, 'Invalid webhook.');
    }

    let rawPayload: string;
    try {
      rawPayload = await req.text();
    } catch {
      return reject(400, 'Invalid webhook.');
    }
    if (new TextEncoder().encode(rawPayload).byteLength > MAX_WEBHOOK_BYTES) {
      return reject(413, 'Invalid webhook.');
    }

    let verified: unknown;
    try {
      verified = await verifyWebhook(
        rawPayload,
        Object.fromEntries(req.headers.entries()),
        hookSecret,
      );
    } catch {
      return reject(401, 'Invalid webhook.');
    }

    const payload = extractSignedPayload(verified);
    if (!payload) {
      return reject(400, 'Invalid SMS request.');
    }

    const msg91Config = readMsg91Config(getEnv);
    if (!msg91Config) {
      return reject(500, 'SMS delivery service is not configured.');
    }

    const delivered = await sendViaMsg91(
      msg91Config,
      payload.phone,
      payload.otp,
      fetchImpl,
      logger,
    );
    if (!delivered) {
      return reject(502, 'SMS delivery failed.');
    }

    return json(200, {});
  };
}
