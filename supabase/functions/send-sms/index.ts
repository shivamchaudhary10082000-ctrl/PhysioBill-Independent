import { createSendSmsHandler } from './handler.ts';
import { verifyStandardWebhook } from './webhook.ts';

Deno.serve(
  createSendSmsHandler({
    getEnv: (name) => Deno.env.get(name),
    verifyWebhook: verifyStandardWebhook,
  }),
);
