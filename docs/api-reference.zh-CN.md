# REST API 参考文档

> [English](./api-reference.md) · 简体中文

feishu-flow-kit 暴露的所有 HTTP 端点的完整参考文档。

---

## 端点概览

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/healthz` | 轻量级存活探针 |
| `GET` | `/status` | 服务器及配置完整状态 |
| `POST` | `/webhook` | 飞书事件接收器 |

所有端点均返回 `Content-Type: application/json`，所有响应均包含 `requestId: string` 字段用于日志关联。大多数响应包含 `ok: boolean` 字段，唯一例外是 URL 验证挑战响应（200），该响应仅返回 `challenge` 和 `requestId`，不包含 `ok`。

---

## `GET /healthz`

轻量级存活探针 — 无需认证。适用于负载均衡器健康检查和 uptime 监控。

**请求**

```
GET /healthz
```

**响应 `200 OK`**

```json
{
  "ok": true,
  "service": "feishu-flow-kit",
  "mode": "webhook",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| 字段 | 类型 | 描述 |
|------|------|------|
| `ok` | `boolean` | 200 时始终为 `true` |
| `service` | `string` | 固定字符串 `"feishu-flow-kit"` |
| `mode` | `string` | 正常模式为 `"webhook"`，模拟/开发模式为 `"mock"` |
| `requestId` | `string` | 本次请求的 UUID，用于日志关联 |

---

## `GET /status`

完整服务器状态，包含功能开关、租户信息、插件列表及运行时统计。

**请求**

```
GET /status
```

**响应 `200 OK`**

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

| 字段 | 类型 | 描述 |
|------|------|------|
| `ok` | `boolean` | 始终为 `true`（200 响应时） |
| `service` | `string` | 固定字符串 `"feishu-flow-kit"` |
| `startedAt` | `string` | Webhook 服务进程启动时间的 ISO 8601 时间戳 |
| `uptimeSeconds` | `number` | 距服务器启动的已过秒数 |
| `mode` | `string` | 正常模式下为 `"webhook"`，模拟/开发模式下为 `"mock"` |
| `flags.outboundReply` | `boolean` | 是否允许机器人通过飞书 API 发送回复消息 |
| `flags.docCreate` | `boolean` | 是否启用文档创建功能 |
| `flags.tableCreate` | `boolean` | 是否启用多维表格记录创建功能 |
| `flags.sentry` | `boolean` | 是否启用 Sentry 错误追踪 |
| `lastEventAt` | `string \| null` | 最后一次成功处理的 Webhook 事件的 ISO 8601 时间戳；尚未处理任何事件时为 `null` |
| `eventCount` | `number` | 自服务器启动以来成功处理的 Webhook 事件累计数 |
| `multiTenantMode` | `string` | `"multi-tenant"` 或 `"single-app"` |
| `tenantCount` | `number` | 已注册租户数量（单应用模式下为 1） |
| `tenantKeys` | `string[] \| undefined` | 仅在多租户模式下出现；已注册 `tenantKey` 字符串数组 |
| `requestId` | `string` | 用于日志关联的 UUID |

### 多租户状态响应

当 `FEISHU_TENANTS` 配置了多个租户时：

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

接收并处理传入的飞书事件。这是主要端点 — 负责处理 URL 验证及所有消息事件。

### URL 验证（Challenge 握手）

飞书开放平台在激活 Webhook 前，会发送一个 `POST` 请求（`header.event_type: "im.message.receive_v1"` 且 `type: "url_verification"`）来验证你的端点。

**请求**

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

> **注意：** 实际上飞书的 URL 验证发送的是更简单的格式：`{"challenge": "xxx", "type": "url_verification"}` 直接作为请求体。`handleWebhookPayload` 适配器可以处理直接形式和封装形式两种请求。

**响应 `200 OK`**

```json
{
  "challenge": "test-challenge-string",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

> **注意：** 响应使用 `challenge` 字段（而非 `challengeResponse`），不包含 `ok` 字段。飞书期望 `challenge` 原样回传用于 URL 验证。

### 消息事件处理

**请求**

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

**响应 `200 OK` — 消息事件已处理**

所有成功的消息事件处理响应共享相同的结构：

```json
{
  "ok": true,
  "eventType": "message.received",
  "tenantKey": "tenant-key-xxx",
  "messageId": "om_xxxxxxxxxxxxxxxx",
  "tags": ["doc", "created"],
  "replyText": "已创建文档：**Project Roadmap**\n[在飞书中查看](https://.feishu.cn/docx/xxx) · 已添加至多维表格 · 标签: doc, created",
  "replyDraft": { "msg_type": "interactive", "card": { ... } },
  "docCreateDraft": { "title": "...", "markdown": "..." },
  "tableRecordDraft": { "fields": { "title": "...", ... } },
  "docCreate": { "attempted": true, "response": { "ok": true, "documentId": "MsNxXxXxXxXx", "url": "https://..." } },
  "tableCreate": { "attempted": true, "response": { "ok": true, "recordId": "recxxxxxx", "fieldsMapped": 5 } },
  "outboundReply": { "attempted": true, "response": { "ok": true, "messageId": "om_yyyyyyyyyyyyyyyy" } },
  "loadedPlugins": ["ping", "poll"],
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| 字段 | 类型 | 描述 |
|------|------|------|
| `ok` | `boolean` | 工作流成功完成时为 `true` |
| `eventType` | `string` | 标准化事件类型，如 `message.received` |
| `tenantKey` | `string` | 来自 Webhook  envelope `header.tenant_key` 的租户键 |
| `messageId` | `string` | 飞书消息 ID |
| `tags` | `string[]` | 工作流和插件设置的标签（如 `["doc", "created"]`） |
| `replyText` | `string \| undefined` | 在飞书聊天中显示的纯文本回复 |
| `replyDraft` | `object \| null` | 飞书消息卡片草稿（`msg_type: "interactive"`）；无回复时为 `null` |
| `docCreateDraft` | `object \| null` | 文档创建草稿（`title` + `markdown`）；无文档创建时为 `null` |
| `tableRecordDraft` | `object \| null` | 多维表格记录创建草稿（`fields` 映射）；无表格创建时为 `null` |
| `docCreate` | `object` | 文档创建结果：`{attempted, skippedReason?, response?: {ok, documentId?, url?, raw}}` |
| `tableCreate` | `object` | 多维表格记录创建结果：`{attempted, skippedReason?, response?: {ok, recordId?, fieldsMapped?, raw}}` |
| `outboundReply` | `object` | 出站回复结果：`{attempted, skippedReason?, response?: {ok, messageId?, raw}}` |
| `loadedPlugins` | `string[]` | 启动时通过 `FEISHU_PLUGINS` 加载的插件名称列表 |
| `requestId` | `string` | 用于日志关联的 UUID |

### 错误响应

#### `401 Unauthorized` — 签名无效

```json
{
  "ok": false,
  "error": "Invalid webhook signature.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**原因：** `X-Lark-Signature` 请求头与使用 `FEISHU_WEBHOOK_SECRET` 对原始请求体进行 HMAC-SHA256 计算的值不匹配。可能原因：
- `FEISHU_WEBHOOK_SECRET` 环境变量配置错误
- 请求体在传输过程中被篡改
- 时间戳容忍度超出限制（参见 `FEISHU_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS`）

#### `400 Bad Request` — 无效或不支持的载荷

```json
{
  "ok": false,
  "error": "Unsupported or invalid webhook payload.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**原因：** 无法将 Webhook 载荷解析为飞书事件。当 JSON 结构有效，但 `isUrlVerificationPayload` 和 `adaptWebhookMessageEvent` 都无法处理该载荷时返回（如未知的事件类型）。

#### `403 Forbidden` — 未知租户

```json
{
  "ok": false,
  "error": "Unknown tenant: \"tenant-key\". This bot is not configured for that tenant.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**原因：** Webhook 载荷 `header` 中的 `tenant_key` 与 `FEISHU_TENANTS` 中注册的任何租户都不匹配。仅在多租户模式下：请确保为此租户配置了正确的飞书机器人，并将其 `tenantKey` 包含在 `FEISHU_TENANTS` 中。

#### `404 Not Found`

```json
{
  "ok": false,
  "error": "Not found",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**原因：** 请求 URL 与任何已注册的路由都不匹配。请确保您的飞书 Webhook URL 指向此服务器的 `/webhook` 路径。

#### `405 Method Not Allowed`

```json
{
  "ok": false,
  "error": "Method not allowed. Use POST /webhook.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**原因：** 向 `/webhook` 发送了非 POST 方法的请求。飞书仅使用 POST。

#### `500 Internal Server Error`

```json
{
  "ok": false,
  "error": "Failed to handle webhook request.",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**原因：** 事件处理过程中抛出了未捕获的异常。请使用对应的 `requestId` 检查服务器日志。

---

## 通用 HTTP 请求头

| 请求头 | 必填 | 描述 |
|--------|------|------|
| `Content-Type` | ✅ | 必须为 `application/json` |
| `X-Lark-Request-Timestamp` | 签名验证时必填 | 请求的 Unix 时间戳（秒） |
| `X-Lark-Signature` | 签名验证时必填 | 原始请求体的 HMAC-SHA256 签名 |

> **注意：** 在模拟/开发模式（事件负载中 `context.source: "local-mock"`）下，签名验证会被跳过。

---

## 速率限制

feishu-flow-kit 自身不执行速率限制。飞书 API 的速率限制适用于服务器发出的出站调用（回复消息、文档创建、多维表格记录）。详细参见 [飞书速率限制文档](https://open.feishu.cn/document/server-docs/basis/rate)。

---

## Webhook 安全

### 签名验证流程

```
原始请求体（未修改的字节）
         │
         ▼
HMAC-SHA256(secret, timestamp + rawBody)
         │
         ▼
Base64 编码 ──► 与 X-Lark-Signature 请求头比对
```

- **密钥：** `FEISHU_WEBHOOK_SECRET` 环境变量的值
- **时间戳检查：** `X-Lark-Request-Timestamp` 必须在 ±300 秒以内（可通过 `FEISHU_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS` 配置）以防止重放攻击
- **模拟模式跳过：** 带有 `"context": { "source": "local-mock" }` 的事件会完全跳过签名验证

### 生产环境检查清单

- [ ] 将 `FEISHU_WEBHOOK_SECRET` 设置为强随机值（至少 32 个字符）
- [ ] 使用 HTTPS 作为公开 Webhook URL（飞书要求）
- [ ] 可考虑设置 `FEISHU_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS=60` 以实现更严格的重放保护
- [ ] 配置 `SENTRY_DSN` 后设置 `NODE_ENV=production` 以启用 Sentry 错误报告
- [ ] 生产环境使用静态 ngrok 域名或适当的反向代理（nginx/Caddy）— 避免使用免费 ngrok 隧道导致的重复重启

---

## 环境变量参考

| 变量 | 影响端点 | 作用 |
|------|----------|------|
| `FEISHU_WEBHOOK_SECRET` | `POST /webhook` | 启用 HMAC 签名验证 |
| `FEISHU_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS` | `POST /webhook` | 重放保护的时间戳容忍度（默认：300） |
| `FEISHU_WEBHOOK_PORT` | 所有端点 | 服务器端口（默认：8787） |
| `NODE_ENV` | 所有端点 | 设为 `production` 以启用 Sentry 面包屑 |
| `SENTRY_DSN` | 所有端点 | 启用 Sentry 错误跟踪 |
| `FEISHU_TENANTS` | `GET /status` | 多租户配置 JSON（参见 [部署指南](./deployment.zh-CN.md)） |
| `LOG_LEVEL` | 所有端点 | 日志级别：`debug`、`info`、`warn`、`error`（默认：`info`） |

---

## cURL 示例

### 健康检查

```bash
curl https://your-domain.com/healthz
```

### 完整状态

```bash
curl https://your-domain.com/status
```

### 模拟本地消息事件

```bash
curl -X POST https://your-domain.com/webhook \
  -H "Content-Type: application/json" \
  -d @examples/mock-message-event.json
```

### 模拟自定义文本命令

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
