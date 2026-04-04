import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import { startWebhookServer } from '../src/server/start-webhook-server.ts';
import { createWebhookSignature } from '../src/server/verify-webhook-signature.ts';

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = (await response.json()) as Record<string, unknown>;
  return {
    status: response.status,
    body,
  };
}

function createTestServer(overrides: Partial<Parameters<typeof startWebhookServer>[0]> = {}) {
  return startWebhookServer({
    appId: '',
    appSecret: '',
    botName: 'test-bot',
    mockMode: false,
    logLevel: 'error',
    webhookPort: 0,
    webhookSecret: '',
    webhookSignatureToleranceSeconds: 300,
    enableOutboundReply: false,
    ...overrides,
  });
}

test('startWebhookServer exposes GET /healthz for local checks', async () => {
  const server = createTestServer();

  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const result = await requestJson(`http://127.0.0.1:${port}/healthz`);

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.service, 'feishu-flow-kit');
    assert.equal(result.body.mode, 'webhook');
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('startWebhookServer exposes GET /status with runtime metrics', async () => {
  const server = createTestServer({
    enableOutboundReply: true,
    enableDocCreate: false,
    enableTableCreate: true,
  });

  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const result = await requestJson(`http://127.0.0.1:${port}/status`);

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.service, 'feishu-flow-kit');
    assert.equal(result.body.mode, 'webhook');
    assert.equal(result.body.flags.outboundReply, true);
    assert.equal(result.body.flags.docCreate, false);
    assert.equal(result.body.flags.tableCreate, true);
    assert.equal(result.body.flags.sentry, false);
    assert.equal(result.body.eventCount, 0);
    assert.equal(result.body.lastEventAt, null);
    assert.ok(typeof result.body.uptimeSeconds === 'number');
    assert.ok(typeof result.body.startedAt === 'string');
    assert.ok(typeof result.body.requestId === 'string');
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('startWebhookServer rejects non-POST webhook requests with 405', async () => {
  const server = createTestServer();

  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const result = await requestJson(`http://127.0.0.1:${port}/webhook`);

    assert.equal(result.status, 405);
    assert.equal(result.body.ok, false);
    assert.match(String(result.body.error), /Method not allowed/);
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('startWebhookServer handles url verification payloads over HTTP', async () => {
  const server = createTestServer();

  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const result = await requestJson(`http://127.0.0.1:${port}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'url_verification',
        challenge: 'verify_me',
      }),
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.challenge, 'verify_me');
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('startWebhookServer rejects webhook requests with invalid signatures when secret is configured', async () => {
  const server = createTestServer({
    webhookSecret: 'demo_webhook_secret',
  });

  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const result = await requestJson(`http://127.0.0.1:${port}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lark-request-timestamp': '1711670400',
        'x-lark-signature': 'deadbeef',
      },
      body: JSON.stringify({
        type: 'url_verification',
        challenge: 'verify_me',
      }),
    });

    assert.equal(result.status, 401);
    assert.equal(result.body.ok, false);
    assert.match(String(result.body.error), /outside the allowed replay window|Invalid webhook signature/);
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('startWebhookServer accepts webhook requests with valid signatures when secret is configured', async () => {
  const secret = 'demo_webhook_secret';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = JSON.stringify({
    type: 'url_verification',
    challenge: 'verify_me',
  });

  const server = createTestServer({ webhookSecret: secret });

  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const result = await requestJson(`http://127.0.0.1:${port}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lark-request-timestamp': timestamp,
        'x-lark-signature': createWebhookSignature(secret, timestamp, rawBody),
      },
      body: rawBody,
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.challenge, 'verify_me');
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('startWebhookServer rejects webhook requests outside the replay window', async () => {
  const secret = 'demo_webhook_secret';
  const timestamp = '1711670400';
  const rawBody = JSON.stringify({
    type: 'url_verification',
    challenge: 'verify_me',
  });

  const server = createTestServer({
    webhookSecret: secret,
    webhookSignatureToleranceSeconds: 300,
  });

  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const result = await requestJson(`http://127.0.0.1:${port}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lark-request-timestamp': timestamp,
        'x-lark-signature': createWebhookSignature(secret, timestamp, rawBody),
      },
      body: rawBody,
    });

    assert.equal(result.status, 401);
    assert.equal(result.body.ok, false);
    assert.match(String(result.body.error), /outside the allowed replay window/);
  } finally {
    server.close();
    await once(server, 'close');
  }
});
