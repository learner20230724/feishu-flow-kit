import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createWebhookSignature,
  verifyWebhookSignature,
} from '../src/server/verify-webhook-signature.ts';

test('verifyWebhookSignature allows requests when no secret is configured', () => {
  const result = verifyWebhookSignature({
    secret: '',
    timestamp: undefined,
    signature: undefined,
    rawBody: '{"type":"url_verification"}',
  });

  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
});

test('verifyWebhookSignature validates matching signature headers', () => {
  const rawBody = JSON.stringify({ type: 'url_verification', challenge: 'verify_me' });
  const timestamp = '1711670400';
  const secret = 'demo_webhook_secret';
  const signature = createWebhookSignature(secret, timestamp, rawBody);

  const result = verifyWebhookSignature({
    secret,
    timestamp,
    signature,
    rawBody,
    now: new Date('2024-03-29T00:00:00Z'),
    toleranceSeconds: 300,
  });

  assert.equal(result.ok, true);
  assert.equal(result.skipped, false);
});

test('verifyWebhookSignature rejects requests with missing headers when secret is configured', () => {
  const result = verifyWebhookSignature({
    secret: 'demo_webhook_secret',
    timestamp: undefined,
    signature: undefined,
    rawBody: '{"type":"url_verification"}',
  });

  assert.equal(result.ok, false);
  assert.match(String(result.error), /Missing webhook signature headers/);
});

test('verifyWebhookSignature rejects invalid signatures', () => {
  const result = verifyWebhookSignature({
    secret: 'demo_webhook_secret',
    timestamp: '1711670400',
    signature: 'deadbeef',
    rawBody: '{"type":"url_verification"}',
    now: new Date('2024-03-29T00:00:00Z'),
    toleranceSeconds: 300,
  });

  assert.equal(result.ok, false);
  assert.match(String(result.error), /Invalid webhook signature/);
});

test('verifyWebhookSignature rejects timestamps outside the replay window', () => {
  const rawBody = JSON.stringify({ type: 'url_verification', challenge: 'verify_me' });
  const timestamp = '1711670400';
  const secret = 'demo_webhook_secret';
  const signature = createWebhookSignature(secret, timestamp, rawBody);

  const result = verifyWebhookSignature({
    secret,
    timestamp,
    signature,
    rawBody,
    now: new Date('2024-03-29T00:10:01Z'),
    toleranceSeconds: 300,
  });

  assert.equal(result.ok, false);
  assert.match(String(result.error), /outside the allowed replay window/);
});

test('verifyWebhookSignature rejects non-numeric timestamps when secret is configured', () => {
  const rawBody = JSON.stringify({ type: 'url_verification', challenge: 'verify_me' });

  const result = verifyWebhookSignature({
    secret: 'demo_webhook_secret',
    timestamp: 'not-a-timestamp',
    signature: 'deadbeef',
    rawBody,
    now: new Date('2024-03-29T00:00:00Z'),
    toleranceSeconds: 300,
  });

  assert.equal(result.ok, false);
  assert.match(String(result.error), /outside the allowed replay window/);
});
