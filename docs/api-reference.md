# REST API Reference

> English · [简体中文](./api-reference.zh-CN.md)

Complete reference for all HTTP endpoints exposed by feishu-flow-kit.

---

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/healthz` | Lightweight liveness probe |
| `GET` | `/status` | Full server + config status |
| `POST` | `/webhook` | Feishu event receiver |

All endpoints return `Content-Type: application/json`. All responses include a `requestId: string` field for log correlation. Most responses include an `ok: boolean` field — the exception is the URL verification challenge response (200), which returns only `challenge` and `requestId`.

---

## `GET /healthz`

Lightweight liveness probe — no authentication required. Suitable for load balancer health checks and uptime monitors.

**Request**

```
GET /healthz
```

**Response `200 OK`**

```json
{
  "ok": true,
  "service": "feishu-flow-kit",
  "mode": "webhook",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ok` | `boolean` | Always `true` for 200 |
| `service` | `string` | Fixed string `"feishu-flow-kit"` |
| `mode` | `string` | `"webhook"` in normal mode, `"mock"` in mock/development mode |
| `requestId` | `string` | UUID assigned to this request for log correlation |

---

## `GET /status`

Full server status including feature flags, tenant info, plugin list, and runtime stats.

**Request**

```
GET /status
```

**Response `200 OK`**

```json
{
  "ok": true,
  "service": "feishu-flow-kit",
  "startedAt": "2026-04-06T10:00:00.000Z",
  "uptimeSeconds": 3723,
  "mode": "webhook",
  "flags": {
    "outboundReply": true,
    "docCreate": true,
    "tableCreate": true,
    "sentry": false
  },
  "lastEventAt": "2026-04-06T10:05:00.000Z",
  "eventCount": 142,
  "multiTenantMode": "single-app",
  "tenantCount": 1,
  "tenantKeys": undefined,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ok` | `boolean` | Always `true` for 200 |
| `service` | `string` | Fixed string `"feishu-flow-kit"` |
| `startedAt` | `string` | ISO 8601 timestamp of when the webhook server process started |
| `uptimeSeconds` | `number` | Seconds elapsed since server start |
| `mode` | `string` | `"webhook"` in normal mode, `"mock"` in mock/development mode |
| `flags.outboundReply` | `boolean` | Whether the bot is allowed to send reply messages via Feishu API |
| `flags.docCreate` | `boolean` | Whether document creation is enabled |
| `flags.tableCreate` | `boolean` | Whether Bitable record creation is enabled |
| `flags.sentry` | `boolean` | Whether Sentry error tracking is enabled |
| `lastEventAt` | `string \| null` | ISO 8601 timestamp of the last successfully processed webhook event; `null` if no events processed yet |
| `eventCount` | `number` | Cumulative count of webhook events successfully processed since server start |
| `multiTenantMode` | `string` | `"multi-tenant"` or `"single-app"` |
| `tenantCount` | `number` | Number of registered tenants (1 in single-app mode) |
| `tenantKeys` | `string[] \| undefined` | Present only in multi-tenant mode; array of registered `tenantKey` strings |
| `requestId` | `string` | UUID for log correlation |

### Multi-tenant status response

When `FEISHU_TENANTS` is configured with multiple tenants:

```json
{
  "ok": true,
  "service": "feishu-flow-kit",
  "startedAt": "2026-04-06T10:00:00.000Z",
  "uptimeSeconds": 3723,
  "mode": "webhook",
  "flags": {
    "outboundReply": true,
    "docCreate": true,
    "tableCreate": true,
    "sentry": false
  },
  "lastEventAt": "2026-04-06T10:05:00.000Z",
  "eventCount": 89,
  "multiTenantMode": "multi-tenant",
  "tenantCount": 3,
  "tenantKeys": ["tenant-alpha", "tenant-beta", "tenant-gamma"],
  "requestId": "..."
}
```

---

## `POST /webhook`

Receives and processes incoming Feishu events. This is the primary endpoint — it handles URL verification and all message events.

### URL Verification (Challenge Handshake)

Feishu's Open Platform sends a `POST` with `header.event_type: "im.message.receive_v1"` and `type: "url_verification"` to verify your endpoint before activating the webhook.

**Request**

```http
POST /webhook
Content-Type: application/json
X-Lark-Request-Timestamp: <timestamp>
X-Lark-Signature: <signature>
```

```json
{
  "header": {
    "event_type": "im.message.receive_v1",
    "create_time": "2026-04-06T10:00:00Z",
    "tenant_key": "your-tenant-key"
  },
  "event": {
    "message": {
      "message_id": "om_xxx",
      "chat_id": "oc_xxx",
      "chat_type": "p2p",
      "content": "{\"text\": \"{\\\"type\\\":\\\"url_verification\\\",\\\"challenge\\\":\\\"test-challenge-string\\\"}\"}",
      "create_time": "2026-04-06T10:00:00Z"
    },
    "sender": {
      "sender_id": { "open_id": "ou_xxx" }
    }
  }
}
```

> **Note:** In practice, Feishu's URL verification sends a simpler shape: `{"challenge": "xxx", "type": "url_verification"}` directly. The `handleWebhookPayload` adapter handles both the direct and wrapped forms.

**Response `200 OK`**

```json
{
  "challenge": "test-challenge-string",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

> **Note:** The response uses the `challenge` key (not `challengeResponse`) and does not include an `ok` field. Feishu expects `challenge` to be echoed back verbatim for URL verification.

### Message Event Processing

**Request**

```http
POST /webhook
Content-Type: application/json
X-Lark-Request-Timestamp: <timestamp>
X-Lark-Signature: <signature>
```

```json
{
  "header": {
    "event_type": "im.message.receive_v1",
    "create_time": "2026-04-06T10:00:00Z",
    "tenant_key": "local-dev-tenant"
  },
  "event": {
    "message": {
      "message_id": "om_abc123",
      "chat_id": "oc_chat456",
      "chat_type": "p2p",
      "content": "{\"text\": \"/doc Create a project roadmap\"}",
      "create_time": "2026-04-06T10:00:00Z"
    },
    "sender": {
      "sender_id": { "open_id": "ou_user789" }
    }
  }
}
```

**Response `200 OK` — Message event processed**

All successful message event processing responses share the same structure:

```json
{
  "ok": true,
  "eventType": "message.received",
  "tenantKey": "tenant-key-xxx",
  "messageId": "om_xxxxxxxxxxxxxxxx",
  "tags": ["doc", "created"],
  "replyText": "Created document: **Project Roadmap**\n[View in Feishu](https://.feishu.cn/docx/xxx) · Added to Bitable · Tagged: doc, created",
  "replyDraft": { "msg_type": "interactive", "card": { ... } },
  "docCreateDraft": { "title": "...", "markdown": "..." },
  "tableRecordDraft": { "fields": { "title": "...", ... } },
  "docCreate": { "ok": true, "docId": "MsNxXxXxXxXx", "url": "https://..." },
  "tableCreate": { "ok": true, "recordId": "recxxxxxx" },
  "outboundReply": { "ok": true, "messageId": "om_yyyyyyyyyyyyyyyy" },
  "loadedPlugins": ["ping", "poll"],
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ok` | `boolean` | `true` if the workflow completed successfully |
| `eventType` | `string` | Normalized event type, e.g. `message.received` |
| `tenantKey` | `string` | Tenant key from the webhook envelope's `header.tenant_key` |
| `messageId` | `string` | Feishu message ID of the incoming message |
| `tags` | `string[]` | Tags set by the workflow and plugins (e.g. `["doc", "created"]`) |
| `replyText` | `string \| undefined` | Plain-text reply rendered in the Feishu chat |
| `replyDraft` | `object \| null` | Feishu message card draft (`msg_type: "interactive"`); `null` if no reply |
| `docCreateDraft` | `object \| null` | Document creation draft (`title` + `markdown`); `null` if no doc creation |
| `tableRecordDraft` | `object \| null` | Bitable record creation draft (`fields` map); `null` if no table creation |
| `docCreate` | `object` | Result of document creation attempt: `{ok, docId?, url?, skippedReason?}` |
| `tableCreate` | `object` | Result of Bitable record creation: `{ok, recordId?, skippedReason?}` |
| `outboundReply` | `object` | Result of outbound reply: `{ok, messageId?, skippedReason?}` |
| `loadedPlugins` | `string[]` | Names of all plugins loaded at startup via `FEISHU_PLUGINS` |
| `requestId` | `string` | UUID for log correlation |

### Error Responses

#### `401 Unauthorized` — Invalid signature

```json
{
  "ok": false,
  "error": "Invalid webhook signature.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Cause:** The `X-Lark-Signature` header doesn't match the HMAC-SHA256 of the raw request body using `FEISHU_WEBHOOK_SECRET`. Occurs when:
- `FEISHU_WEBHOOK_SECRET` env var is wrong
- The request body was modified in transit
- Timestamp tolerance exceeded (see `FEISHU_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS`)

#### `400 Bad Request` — Invalid or unsupported payload

```json
{
  "ok": false,
  "error": "Unsupported or invalid webhook payload.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Cause:** The webhook payload could not be parsed as a Feishu event. This occurs when the JSON is structurally valid but neither `isUrlVerificationPayload` nor `adaptWebhookMessageEvent` can process it (e.g., an unknown event type).

#### `403 Forbidden` — Unknown tenant

```json
{
  "ok": false,
  "error": "Unknown tenant: \"tenant-key\". This bot is not configured for that tenant.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Cause:** The `tenant_key` in the webhook payload's `header` does not match any registered tenant in `FEISHU_TENANTS`. Multi-tenant mode only: ensure the correct Feishu bot is configured for this tenant and its `tenantKey` is included in `FEISHU_TENANTS`.

#### `404 Not Found`

```json
{
  "ok": false,
  "error": "Not found",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Cause:** The request URL does not match any registered route. Ensure your Feishu webhook URL points to the `/webhook` path on this server.

#### `405 Method Not Allowed`

```json
{
  "ok": false,
  "error": "Method not allowed. Use POST /webhook.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Cause:** A non-POST method was sent to `/webhook`. Feishu only sends POST.

#### `500 Internal Server Error`

```json
{
  "ok": false,
  "error": "Failed to handle webhook request.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Cause:** An unhandled exception was thrown during event processing. Check server logs with the corresponding `requestId`.

---

## Shared HTTP Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | ✅ | Must be `application/json` |
| `X-Lark-Request-Timestamp` | For signature verification | Unix timestamp of the request (seconds) |
| `X-Lark-Signature` | For signature verification | HMAC-SHA256 signature of the raw request body |

> **Note:** In mock/development mode (`source: "local-mock"` in event payload), signature verification is bypassed.

---

## Rate Limits

feishu-flow-kit itself does not enforce rate limits. Feishu's API rate limits apply to outbound calls (reply messages, doc creation, table records) made by the server. See [Feishu's rate limit documentation](https://open.feishu.cn/document/server-docs/basis/rate) for details.

---

## Webhook Security

### Signature Verification Flow

```
Raw request body (unchanged bytes)
         │
         ▼
HMAC-SHA256(secret, timestamp + rawBody)
         │
         ▼
Base64 encode ──► Compare to X-Lark-Signature header
```

- **Secret:** Value of `FEISHU_WEBHOOK_SECRET` environment variable
- **Timestamp check:** `X-Lark-Request-Timestamp` must be within ±300 seconds (configurable via `FEISHU_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS`) to prevent replay attacks
- **Mock mode bypass:** Events with `"context": { "source": "local-mock" }` skip signature verification entirely

### Production Checklist

- [ ] Set `FEISHU_WEBHOOK_SECRET` to a strong, random value (minimum 32 characters)
- [ ] Use HTTPS for your public webhook URL (required by Feishu)
- [ ] Consider setting `FEISHU_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS=60` for stricter replay protection
- [ ] Set `NODE_ENV=production` to enable Sentry error reporting (if `SENTRY_DSN` is configured)
- [ ] Use a static ngrok domain or a proper reverse proxy (nginx/Caddy) in production — avoid free ngrok tunnel restarts

---

## Environment Variables Reference

| Variable | Endpoint | Effect |
|----------|----------|--------|
| `FEISHU_WEBHOOK_SECRET` | `POST /webhook` | Enables HMAC signature verification |
| `FEISHU_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS` | `POST /webhook` | Timestamp tolerance for replay protection (default: 300) |
| `PORT` | All | Server port (default: 8787) |
| `NODE_ENV` | All | Set to `production` for Sentry breadcrumbs |
| `SENTRY_DSN` | All | Enables Sentry error tracking |
| `FEISHU_TENANTS` | `GET /status` | Multi-tenant config JSON (see [Deployment Guide](./deployment.md)) |
| `LOG_LEVEL` | All | Log verbosity: `debug`, `info`, `warn`, `error` (default: `info`) |

---

## cURL Examples

### Health check

```bash
curl https://your-domain.com/healthz
```

### Full status

```bash
curl https://your-domain.com/status
```

### Simulate a local mock message event

```bash
curl -X POST https://your-domain.com/webhook \
  -H "Content-Type: application/json" \
  -d @examples/mock-message-event.json
```

### Simulate with a custom text command

```bash
curl -X POST https://your-domain.com/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "header": {
      "event_type": "im.message.receive_v1",
      "create_time": "2026-04-06T10:00:00Z",
      "tenant_key": "local-dev-tenant"
    },
    "event": {
      "message": {
        "message_id": "om_test001",
        "chat_id": "oc_testchat",
        "chat_type": "p2p",
        "content": "{\"text\": \"/help\"}",
        "create_time": "2026-04-06T10:00:00Z"
      },
      "sender": {
        "sender_id": { "open_id": "ou_testuser" }
      }
    }
  }'
```
