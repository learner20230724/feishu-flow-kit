import { createHash, timingSafeEqual } from 'node:crypto';

export interface VerifyWebhookSignatureInput {
  timestamp?: string;
  signature?: string;
  rawBody: string;
  secret: string;
  now?: Date;
  toleranceSeconds?: number;
}

export function createWebhookSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
) {
  return createHash('sha256')
    .update(`${timestamp}${secret}${rawBody}`, 'utf8')
    .digest('hex');
}

function isTimestampWithinTolerance(
  timestamp: string,
  now: Date,
  toleranceSeconds: number,
) {
  if (!/^\d+$/.test(timestamp)) {
    return false;
  }

  const timestampSeconds = Number(timestamp);

  if (!Number.isSafeInteger(timestampSeconds)) {
    return false;
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);
  return Math.abs(nowSeconds - timestampSeconds) <= toleranceSeconds;
}

export function verifyWebhookSignature(input: VerifyWebhookSignatureInput) {
  const secret = input.secret.trim();

  if (!secret) {
    return {
      ok: true,
      skipped: true,
    } as const;
  }

  const timestamp = input.timestamp?.trim();
  const signature = input.signature?.trim();

  if (!timestamp || !signature) {
    return {
      ok: false,
      error: 'Missing webhook signature headers.',
    } as const;
  }

  const toleranceSeconds = input.toleranceSeconds ?? 300;
  const now = input.now ?? new Date();

  if (!isTimestampWithinTolerance(timestamp, now, toleranceSeconds)) {
    return {
      ok: false,
      error: 'Webhook timestamp is outside the allowed replay window.',
    } as const;
  }

  const expected = createWebhookSignature(secret, timestamp, input.rawBody);
  const actualBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  if (actualBuffer.length !== expectedBuffer.length) {
    return {
      ok: false,
      error: 'Invalid webhook signature.',
    } as const;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer)
    ? ({ ok: true, skipped: false } as const)
    : ({ ok: false, error: 'Invalid webhook signature.' } as const);
}
