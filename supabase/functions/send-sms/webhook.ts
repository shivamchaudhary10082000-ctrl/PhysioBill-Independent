import { Webhook } from 'standardwebhooks';

export function verifyStandardWebhook(
  payload: string,
  headers: Record<string, string>,
  secret: string,
) {
  return new Webhook(secret).verify(payload, headers);
}
