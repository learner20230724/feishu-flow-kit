import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

import type { AppConfig } from '../config/load-config.js';
import { createLogger, type Logger } from '../core/logger.js';
import { init as initSentry, captureException } from '../core/sentry.js';
import {
  recordServerStart,
  recordEventProcessed,
  getServerStatus,
} from '../core/server-status.js';
import { buildPluginContext, type PluginContext } from '../core/plugin-system.js';
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

function getJsonBody<T>(body: unknown): T {
  return body as T;
}

export function startWebhookServer(
  config: AppConfig & { webhookPort: number },
  pluginContext?: PluginContext,
) {
  // Initialise Sentry if DSN is provided.
  if (process.env.SENTRY_DSN) {
    initSentry({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
  }

  const logger = createLogger(config.logLevel);
  recordServerStart();

  if (pluginContext?.plugins?.length) {
    logger.info('plugins loaded', {
      names: pluginContext.plugins.map(p => p.name),
      commands: pluginContext.registry.getCommandNames(),
    });
  }

  const server = createServer(async (req, res) => {
    // Allocate a request-scoped UUID for correlation across retries/log lines.
    const requestId = randomUUID();

    // Helper that enriches log entries with request context.
    function reqLogger(base: Logger) {
      return {
        debug: (msg: string, meta?: Record<string, unknown>) =>
          base.debug(msg, { requestId, ...meta }),
        info: (msg: string, meta?: Record<string, unknown>) =>
          base.info(msg, { requestId, ...meta }),
        warn: (msg: string, meta?: Record<string, unknown>) =>
          base.warn(msg, { requestId, ...meta }),
        error: (msg: string, meta?: Record<string, unknown>) =>
          base.error(msg, { requestId, ...meta }),
      };
    }

    const log = reqLogger(logger);

    // ── GET /healthz ─────────────────────────────────────────────────────────
    if (req.method === 'GET' && req.url === '/healthz') {
      writeJson(res, 200, {
        ok: true,
        service: 'feishu-flow-kit',
        mode: config.mockMode ? 'mock' : 'webhook',
        requestId,
      });
      return;
    }

    // ── GET /status ───────────────────────────────────────────────────────────
    if (req.method === 'GET' && req.url === '/status') {
      const status = getServerStatus({
        mockMode: config.mockMode,
        enableOutboundReply: config.enableOutboundReply,
        enableDocCreate: config.enableDocCreate,
        enableTableCreate: config.enableTableCreate,
      });
      const tenants = config.tenants ?? [];
      const multiTenantMode = tenants.length > 0 ? 'multi-tenant' : 'single-app';
      const tenantCount = tenants.length > 0 ? tenants.length : 1;
      writeJson(res, 200, {
        ok: true,
        ...status,
        multiTenantMode,
        tenantCount,
        tenantKeys: tenants.length > 0 ? tenants.map(t => t.tenantKey) : undefined,
        requestId,
      });
      return;
    }

    // ── Webhook POST /webhook ─────────────────────────────────────────────────
    if (req.url === '/webhook' && req.method !== 'POST') {
      writeJson(res, 405, {
        ok: false,
        error: 'Method not allowed. Use POST /webhook.',
        requestId,
      });
      return;
    }

    if (req.method !== 'POST' || req.url !== '/webhook') {
      writeJson(res, 404, { ok: false, error: 'Not found', requestId });
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
        log.warn('webhook signature invalid', { error: signatureCheck.error });
        writeJson(res, 401, {
          ok: false,
          error: signatureCheck.error ?? 'Invalid webhook signature.',
          requestId,
        });
        return;
      }

      const result = await handleWebhookPayload(json, config, pluginContext);

      recordEventProcessed();

      log.info('webhook request handled', {
        statusCode: result.statusCode,
        outboundReplyEnabled: config.enableOutboundReply,
        docCreateEnabled: config.enableDocCreate,
        tableCreateEnabled: config.enableTableCreate,
      });

      writeJson(res, result.statusCode, { ...result.body, requestId });
    } catch (error) {
      captureException(error, { requestPath: req.url, requestId });
      log.error('webhook request failed', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      writeJson(res, 500, {
        ok: false,
        error: 'Failed to handle webhook request.',
        requestId,
      });
    }
  });

  server.listen(config.webhookPort, () => {
    const tenants = config.tenants ?? [];
    const mode = tenants.length > 0 ? 'multi-tenant' : 'single-app';
    const tenantCount = tenants.length > 0 ? tenants.length : 1;
    logger.info('webhook server listening', {
      port: config.webhookPort,
      path: '/webhook',
      healthPath: '/healthz',
      statusPath: '/status',
      sentryEnabled: Boolean(process.env.SENTRY_DSN),
      mode,
      tenantCount,
      plugins: pluginContext?.plugins?.map(p => p.name) ?? [],
    });
  });

  return server;
}
