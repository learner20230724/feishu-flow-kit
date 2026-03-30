import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import type { AppConfig } from '../config/load-config.js';
import { createLogger } from '../core/logger.js';
import { handleWebhookPayload } from './handle-webhook-payload.js';
import { verifyWebhookSignature } from './verify-webhook-signature.js';

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return {
    raw,
    json: raw ? (JSON.parse(raw) as unknown) : {},
  };
}

function writeJson(res: ServerResponse, statusCode: number, body: Record<string, unknown>) {
  res.writeHead(statusCode, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

export function startWebhookServer(config: AppConfig & { webhookPort: number }) {
  const logger = createLogger(config.logLevel);

  const server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/healthz') {
      writeJson(res, 200, {
        ok: true,
        service: 'feishu-flow-kit',
        mode: config.mockMode ? 'mock' : 'webhook',
      });
      return;
    }

    if (req.url === '/webhook' && req.method !== 'POST') {
      writeJson(res, 405, {
        ok: false,
        error: 'Method not allowed. Use POST /webhook.',
      });
      return;
    }

    if (req.method !== 'POST' || req.url !== '/webhook') {
      writeJson(res, 404, { ok: false, error: 'Not found' });
      return;
    }

    try {
      const { raw, json } = await readJsonBody(req);
      const signatureCheck = verifyWebhookSignature({
        secret: config.webhookSecret,
        timestamp: req.headers['x-lark-request-timestamp']?.toString(),
        signature: req.headers['x-lark-signature']?.toString(),
        rawBody: raw,
        toleranceSeconds: config.webhookSignatureToleranceSeconds,
      });

      if (!signatureCheck.ok) {
        writeJson(res, 401, {
          ok: false,
          error: signatureCheck.error ?? 'Invalid webhook signature.',
        });
        return;
      }

      const result = await handleWebhookPayload(json, {
        appId: config.appId,
        appSecret: config.appSecret,
        enableOutboundReply: config.enableOutboundReply,
        enableDocCreate: config.enableDocCreate,
        enableTableCreate: config.enableTableCreate,
        bitableAppToken: config.bitableAppToken,
        bitableTableId: config.bitableTableId,
        bitableListFieldMode: config.bitableListFieldMode,
        bitableOwnerFieldMode: config.bitableOwnerFieldMode,
        bitableEstimateFieldMode: config.bitableEstimateFieldMode,
        bitableDueFieldMode: config.bitableDueFieldMode,
      });

      logger.info('webhook request handled', {
        statusCode: result.statusCode,
        signatureVerified: config.webhookSecret ? true : false,
        outboundReplyEnabled: config.enableOutboundReply,
        docCreateEnabled: config.enableDocCreate,
        tableCreateEnabled: config.enableTableCreate,
      });

      writeJson(res, result.statusCode, result.body);
    } catch (error) {
      logger.error('webhook request failed', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      writeJson(res, 500, { ok: false, error: 'Failed to handle webhook request.' });
    }
  });

  server.listen(config.webhookPort, () => {
    logger.info('webhook server listening', {
      port: config.webhookPort,
      path: '/webhook',
      healthPath: '/healthz',
    });
  });

  return server;
}
