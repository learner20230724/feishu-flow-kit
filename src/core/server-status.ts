/**
 * In-process singleton that tracks server health and runtime metrics.
 * Consumed by the `GET /status` endpoint.
 */

export interface ServerStatus {
  /** Human-readable service name. */
  service: string;
  /** ISO-8601 moment the process started. */
  startedAt: string;
  /** Seconds elapsed since process start (integer). */
  uptimeSeconds: number;
  /** Current operating mode. */
  mode: 'mock' | 'webhook';
  /** Environment-variable feature flags relevant to operators. */
  flags: {
    outboundReply: boolean;
    docCreate: boolean;
    tableCreate: boolean;
    sentry: boolean;
  };
  /** ISO-8601 timestamp of the most recent webhook event processed. */
  lastEventAt: string | null;
  /** Count of events processed since start. */
  eventCount: number;
}

/** Module-level singleton — written by the HTTP server, read by /status. */
let _startedAt = Date.now();
let _lastEventAt: string | null = null;
let _eventCount = 0;

export function recordServerStart(startedAt?: number): void {
  _startedAt = startedAt ?? Date.now();
}

export function recordEventProcessed(): void {
  _lastEventAt = new Date().toISOString();
  _eventCount++;
}

export function getServerStatus(config: {
  mockMode: boolean;
  enableOutboundReply: boolean;
  enableDocCreate: boolean;
  enableTableCreate: boolean;
  sentry: boolean;
}): ServerStatus {
  const uptimeMs = Date.now() - _startedAt;
  return {
    service: 'feishu-flow-kit',
    startedAt: new Date(_startedAt).toISOString(),
    uptimeSeconds: Math.floor(uptimeMs / 1000),
    mode: config.mockMode ? 'mock' : 'webhook',
    flags: {
      outboundReply: config.enableOutboundReply,
      docCreate: config.enableDocCreate,
      tableCreate: config.enableTableCreate,
      sentry: config.sentry,
    },
    lastEventAt: _lastEventAt,
    eventCount: _eventCount,
  };
}
