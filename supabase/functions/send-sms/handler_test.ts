import { Webhook } from 'standardwebhooks';
import { createSendSmsHandler, normalizeHookSecret } from './handler.ts';
import { verifyStandardWebhook } from './webhook.ts';

function assert(condition: unknown, message = 'Assertion failed'): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message = 'Values differ') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `v1,whsec_${btoa(binary)}`;
}

function baseConfig() {
  return {
    SEND_SMS_HOOK_SECRET: randomSecret(),
    MSG91_AUTH_KEY: crypto.randomUUID().replaceAll('-', ''),
    MSG91_FLOW_ID: 'flow_test',
    MSG91_OTP_VARIABLE: 'OTP',
  } satisfies Record<string, string>;
}

function signedRequest(config: Record<string, string>, body: unknown) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  const hookSecret = normalizeHookSecret(config.SEND_SMS_HOOK_SECRET);
  assert(hookSecret, 'test hook secret should normalize');
  const webhook = new Webhook(hookSecret);
  const id = `msg_${crypto.randomUUID()}`;
  const timestamp = new Date();
  const signature = webhook.sign(id, timestamp, payload);
  return new Request('https://example.invalid/functions/v1/send-sms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
      'webhook-signature': signature,
    },
    body: payload,
  });
}

function makeHarness(configOverrides: Record<string, string | undefined> = {}, provider?: typeof fetch) {
  const config: Record<string, string | undefined> = { ...baseConfig(), ...configOverrides };
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = provider ?? (async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ type: 'success', message: 'accepted' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  const safeLogs: unknown[] = [];
  const handler = createSendSmsHandler({
    getEnv: (name) => config[name],
    verifyWebhook: verifyStandardWebhook,
    fetchImpl: async (input, init) => {
      if (provider) calls.push({ url: String(input), init });
      return fetchImpl(input, init);
    },
    logger: {
      error: (message, details) => safeLogs.push({ message, details }),
    },
  });
  return { config, calls, handler, safeLogs };
}

const validBody = () => ({ user: { phone: '+919876543210' }, sms: { otp: '482731' } });

Deno.test('valid signed hook sends Supabase OTP through MSG91 and returns 200', async () => {
  const harness = makeHarness();
  const response = await harness.handler(signedRequest(harness.config as Record<string, string>, validBody()));
  assertEquals(response.status, 200);
  assertEquals(harness.calls.length, 1);
  const call = harness.calls[0];
  assertEquals(call.url, 'https://control.msg91.com/api/v5/flow');
  const requestBody = JSON.parse(String(call.init?.body));
  assertEquals(requestBody.recipients[0].mobiles, '919876543210');
  assertEquals(requestBody.recipients[0].OTP, '482731');
});

Deno.test('invalid signature makes no MSG91 call', async () => {
  const harness = makeHarness();
  const request = signedRequest(harness.config as Record<string, string>, validBody());
  request.headers.set('webhook-signature', 'v1,invalid');
  const response = await harness.handler(request);
  assertEquals(response.status, 401);
  assertEquals(harness.calls.length, 0);
});

Deno.test('missing signature makes no MSG91 call', async () => {
  const harness = makeHarness();
  const request = signedRequest(harness.config as Record<string, string>, validBody());
  request.headers.delete('webhook-signature');
  const response = await harness.handler(request);
  assertEquals(response.status, 401);
  assertEquals(harness.calls.length, 0);
});

Deno.test('wrong HTTP method makes no MSG91 call', async () => {
  const harness = makeHarness();
  const response = await harness.handler(new Request('https://example.invalid', { method: 'GET' }));
  assertEquals(response.status, 405);
  assertEquals(harness.calls.length, 0);
});

for (const [name, body] of [
  ['missing phone', { user: {}, sms: { otp: '482731' } }],
  ['invalid phone', { user: { phone: '9876543210' }, sms: { otp: '482731' } }],
  ['missing OTP', { user: { phone: '+919876543210' }, sms: {} }],
  ['invalid OTP length', { user: { phone: '+919876543210' }, sms: { otp: '12345' } }],
  ['invalid OTP content', { user: { phone: '+919876543210' }, sms: { otp: '12A456' } }],
] as const) {
  Deno.test(`${name} makes no MSG91 call`, async () => {
    const harness = makeHarness();
    const response = await harness.handler(signedRequest(harness.config as Record<string, string>, body));
    assertEquals(response.status, 400);
    assertEquals(harness.calls.length, 0);
  });
}

Deno.test('malformed signed JSON is rejected before MSG91', async () => {
  const harness = makeHarness();
  const response = await harness.handler(signedRequest(harness.config as Record<string, string>, '{not-json'));
  assert(response.status >= 400);
  assertEquals(harness.calls.length, 0);
});

Deno.test('missing MSG91 configuration fails closed', async () => {
  const harness = makeHarness({ MSG91_AUTH_KEY: undefined });
  const response = await harness.handler(signedRequest(harness.config as Record<string, string>, validBody()));
  assertEquals(response.status, 500);
  assertEquals(harness.calls.length, 0);
});

Deno.test('MSG91 HTTP rejection fails the hook', async () => {
  const provider: typeof fetch = async () => new Response(
    JSON.stringify({ type: 'error', message: 'rejected' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  );
  const harness = makeHarness({}, provider);
  const response = await harness.handler(signedRequest(harness.config as Record<string, string>, validBody()));
  assertEquals(response.status, 502);
  assertEquals(harness.calls.length, 1);
});

Deno.test('MSG91 200 provider-level rejection fails the hook', async () => {
  const provider: typeof fetch = async () => new Response(
    JSON.stringify({ type: 'error', message: 'not accepted' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
  const harness = makeHarness({}, provider);
  const response = await harness.handler(signedRequest(harness.config as Record<string, string>, validBody()));
  assertEquals(response.status, 502);
  assertEquals(harness.calls.length, 1);
});

Deno.test('MSG91 network failure fails without leaking sensitive values', async () => {
  const provider: typeof fetch = async () => {
    throw new Error('network failure');
  };
  const harness = makeHarness({}, provider);
  const body = validBody();
  const response = await harness.handler(signedRequest(harness.config as Record<string, string>, body));
  assertEquals(response.status, 502);
  const responseText = await response.text();
  assert(!responseText.includes(body.sms.otp));
  assert(!responseText.includes(String(harness.config.MSG91_AUTH_KEY)));
  assert(!responseText.includes(String(harness.config.SEND_SMS_HOOK_SECRET)));
  const logs = JSON.stringify(harness.safeLogs);
  assert(!logs.includes(body.sms.otp));
  assert(!logs.includes(String(harness.config.MSG91_AUTH_KEY)));
  assert(!logs.includes(String(harness.config.SEND_SMS_HOOK_SECRET)));
});
