# 开发者指南

> 简体中文 · [English](./developer-guide.md)

本指南介绍 feishu-flow-kit 的代码结构，以及如何扩展新的命令、适配器和飞书 API 集成。

---

## 架构概览

```
飞书 Webhook 传入请求
        │
        ▼
handleWebhookPayload()          ← 入口，验证并路由 payload
        │
        ▼
adaptWebhookMessageEvent()      ← 将原始飞书事件 → FeishuMessageEvent
        │
        ▼
runMessageWorkflow()            ← 核心业务逻辑，构建回复文本 / 文档 / 表格草稿
        │
        ├─→ parseSlashCommand()  ← 从文本提取 /command 参数
        ├─→ buildReplyMessageDraft()
        ├─→ buildDocCreateDraft()
        └─→ buildTableRecordDraft()
        │
        ▼
maybeSendReplyMessage()         ← 适配器：通过飞书 API 发送消息（或按开关跳过）
maybeCreateDoc()                 ← 适配器：通过飞书 API 创建文档（或按开关跳过）
maybeCreateTableRecord()        ← 适配器：通过飞书 API 创建多维表格记录（或按开关跳过）
```

**核心原则：** 工作流层是纯业务逻辑——只构建草稿，不发起 HTTP 请求。HTTP 调用全部隔离在 `*-request.ts` 适配器中。功能开关（`enableOutboundReply`、`enableDocCreate`、`enableTableCreate`）控制是否实际发送 API 请求。

---

## 添加新的斜杠命令

### 第一步——在 `parseSlashCommand` 中注册命令

```typescript
// src/core/parse-slash-command.ts
export interface SlashCommand {
  command: string;
  argsText: string;
}

export function parseSlashCommand(text: string): SlashCommand | null {
  const m = text.match(/^\/(\w+)(?:\s+(.*))?$/s);
  if (!m) return null;
  return { command: m[1].toLowerCase(), argsText: m[2]?.trim() ?? '' };
}
```

命令在 `runMessageWorkflow.ts` 中按名称路由，添加新的 case：

```typescript
// 在 runMessageWorkflow() 中 /doc case 之后添加
if (cmd.command === 'mycommand') {
  return handleMyCommand(cmd.argsText, event, s);
}
```

### 第二步——实现处理器

处理器接收 `(argsText, event, s)`，其中：
- `argsText` 是 `/mycommand ` 后面的文本
- `event` 是解析后的 `FeishuMessageEvent`
- `s` 是 i18n 字符串对象（`Strings`，来自 `src/i18n/index.js`）

处理器返回 `WorkflowResult`：

```typescript
export interface WorkflowResult {
  ok: boolean;
  replyText: string;              // 机器人回复内容
  tags: string[];                // 显示在 /status 中
  docTopic?: string;             // 设置后自动创建文档
  docMarkdown?: string;          // 文档内容（markdown）
  hasTableRecordDraft?: boolean;
  tableRecordDraft?: TableRecordDraft;
}
```

示例：

```typescript
function handleMyCommand(argsText: string, event: FeishuMessageEvent, s: Strings): WorkflowResult {
  const query = argsText.trim() || s.defaultQuery();
  return {
    ok: true,
    replyText: `正在处理：${query}`,
    tags: ['mycommand'],
    // 可选：设置 docTopic + docMarkdown 自动创建文档
    // 可选：设置 hasTableRecordDraft + tableRecordDraft 自动创建多维表格记录
  };
}
```

### 第三步——添加 i18n 字符串

在 `src/i18n/en.ts` 和 `src/i18n/zh.ts` 中添加新字符串：

```typescript
// src/i18n/en.ts
myCommandReply: (query: string) => `Processing: ${query}`,
defaultQuery: () => 'no query provided',

// src/i18n/zh.ts
myCommandReply: (query: string) => `正在处理：${query}`,
defaultQuery: () => '未提供查询',
```

### 第四步——添加测试

创建 `test/my-command.test.ts`，参考 `test/` 中现有测试的模式（使用 `loadMockMessageEvent()`）。

---

## 适配器模式

适配器是业务逻辑层与飞书 API 之间的边界，分两层：

### 草稿构建器（`build-*.ts`）

纯函数，接收原始数据返回结构化草稿（无 HTTP 调用）：

```
buildReplyMessageDraft(messageId, replyText)       → ReplyMessageDraft
buildDocCreateDraft(topic, markdown)               → DocCreateDraft
buildTableRecordDraft(fields)                      → TableRecordDraft
```

### Maybe 适配器（`maybe-*.ts`）

检查功能开关，然后调用请求适配器：

```
maybeSendReplyMessage(config, draft)              → { attempted, skippedReason } | API 结果
maybeCreateDoc(config, draft)                    → { attempted, skippedReason } | API 结果
maybeCreateTableRecord(config, draft)            → { attempted, skippedReason } | API 结果
```

### 请求适配器（`send-*.ts` + `get-*.ts` / `fetch-*.ts`）

发起实际的 HTTP 调用到飞书：

```
sendReplyMessage(appId, appSecret, draft)         → API 响应
getTenantAccessToken(appId, appSecret)            → { token, expiresAt }
fetchTenantAccessToken(appId, appSecret)          → token 字符串（带缓存）
sendDocCreateRequest(tenantToken, draft)          → API 响应
```

**添加新的飞书 API 调用：**

1. 创建 `src/adapters/send-my-feature-request.ts` — 调用飞书 API 端点
2. 创建 `src/adapters/maybe-my-feature.ts` — 包装功能开关 + token 获取
3. 从 `src/server/handle-webhook-payload.ts` 的 `handleWebhookPayload` 中调用 `maybe-my-feature.ts`

所有请求适配器应使用 `src/core/retry.ts` 中的 `withRetry` 来保证 resilience。

---

## 重试与错误 Resilience

`withRetry` 包装器（`src/core/retry.ts`）为飞书 API 调用提供指数退避，处理以下情况：

- HTTP 429（速率限制）
- HTTP 5xx（服务器错误）
- 飞书错误码 99991661 / 99991663（瞬时错误）

```typescript
import { withRetry } from '../core/retry.js';

const result = await withRetry(() => sendMyRequest(token, draft), {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
});
```

让现有适配器支持重试：在 API 调用外包装 `withRetry`，参见 `send-reply-message.ts` 的完整示例。

---

## 配置

所有配置来自环境变量，通过 `src/config/load-config.ts` 加载。添加新环境变量：

```typescript
// src/config/load-config.ts
MY_FEATURE_ENABLED: boolean = false,
MY_FEATURE_URL: string = '',
```

始终添加验证（fail-fast），缺少必需变量时服务器启动时报错并给出清晰提示。

功能开关是添加可选集成的首选方式——它们让套件可以在"仅草稿模式"下运行，无需飞书凭证。

---

## 多租户支持

套件支持两种部署模式：

| 模式 | 环境变量 | 适用场景 |
|------|----------|----------|
| **单应用** | `FEISHU_APP_ID`, `FEISHU_APP_SECRET` | 一个机器人，一个飞书组织 |
| **多租户** | `FEISHU_TENANTS`（JSON 数组） | 一个部署，服务多个飞书组织 |

### 单应用模式（默认）

无需特殊配置。设置常规凭证后，机器人处理来自单个飞书应用的事件：

```bash
FEISHU_APP_ID=cli_xxxxx
FEISHU_APP_SECRET=yyyyy
FEISHU_WEBHOOK_SECRET=zzzzz
FEISHU_ENABLE_OUTBOUND_REPLY=true
```

### 多租户模式

将 `FEISHU_TENANTS` 设置为 JSON 数组，每个条目对应一个飞书组织（一个应用）：

```bash
FEISHU_TENANTS='[
  {
    "tenantKey": "tenant_alice",
    "appId": "cli_aaaaa",
    "appSecret": "secret_a",
    "botName": "Alice Bot",
    "enableOutboundReply": true,
    "enableTableCreate": true,
    "bitableAppToken": "xxx",
    "bitableTableId": "yyy"
  },
  {
    "tenantKey": "tenant_bob",
    "appId": "cli_bbbbb",
    "appSecret": "secret_b",
    "botName": "Bob Bot",
    "enableOutboundReply": false,
    "enableDocCreate": true
  }
]'
```

**`tenantKey`** 必须与飞书在 webhook 负载头中发送的 `tenant_key` 值匹配（`header.tenant_key`）。可在飞书开放平台 → 应用 → 凭证 → Tenant Key 中查看。

### 租户路由原理

当 webhook 到达时，服务器：

1. 从 `payload.header.tenant_key` 提取 `tenant_key`（`extractTenantKey()`）
2. 在 `config.tenants` 中查找匹配的 `TenantConfig`（`resolveTenantFromKey()`）
3. 将每个租户的覆盖配置与基础默认配置合并（`resolveTenantConfig()`）
4. 使用解析后的 `appId`/`appSecret` 执行所有飞书 API 调用

如果没有任何租户匹配，机器人返回 HTTP 403 并附带错误信息——不会处理该事件。

### 每个租户的功能覆盖

每个功能开关和 Bitable 字段设置都可以按租户覆盖：

```json
{
  "tenantKey": "tenant_alice",
  "appId": "cli_xxxxx",
  "appSecret": "secret_yyyyy",
  "enableOutboundReply": true,
  "enableDocCreate": false,
  "enableTableCreate": true,
  "bitableAppToken": "app_token_alice",
  "bitableTableId": "tbl_alice",
  "bitableListFieldMode": "multi_select",
  "bitableDueFieldMode": "date"
}
```

未在租户上设置的字段从基础配置（或其默认值）继承。

### 运行时新增租户

由于配置在启动时加载，新增租户需要重启服务。对于生产环境中不停机的租户添加，将 `FEISHU_TENANTS` 指向从 ConfigMap 或 secrets volume 挂载的文件，然后执行 `docker restart` 即可。

---

## 测试

运行所有测试：

```bash
npm test
```

带覆盖率运行：

```bash
npm test -- --coverage
```

运行单个测试文件：

```bash
npm test -- test/my-feature.test.ts
```

**Mock 事件**通过 `loadMockMessageEvent()`（`src/adapters/load-mock-message-event.ts`）加载。为新命令测试在此添加新的 fixture。

**在测试中 Mock 飞书 API 调用**：使用 `vi.mock()` 拦截 `fetch` 调用，或在测试文件中添加 mock handler，参见 `test/webhook-server.test.ts` 的示例。

---

## 项目结构

```
src/
├── adapters/               # 飞书 API 适配器（草稿构建器 + 请求客户端）
│   ├── build-*.ts         # 纯草稿构建器
│   ├── maybe-*.ts         # 功能门控编排器
│   ├── send-*.ts          # 原始飞书 API HTTP 调用
│   ├── get-*.ts           # Token 获取器
│   └── load-mock-*.ts     # 测试 Fixture
├── core/                   # 纯工具函数
│   ├── parse-slash-command.ts
│   ├── retry.ts            # 指数退避包装器
│   ├── sentry.ts          # 错误追踪桩
│   ├── server-status.ts   # /status 端点状态
│   └── logger.ts           # 结构化日志
├── i18n/                    # 国际化
│   ├── en.ts
│   ├── zh.ts
│   └── index.ts
├── server/                  # HTTP 服务器
│   ├── start-webhook-server.ts
│   └── handle-webhook-payload.ts
├── config/
│   └── load-config.ts
├── types/
│   └── feishu-event.ts
└── workflows/
    └── run-message-workflow.ts
test/
├── *.test.ts               # 适配器 + 工作流测试
└── webhook-server.test.ts  # HTTP 集成测试
.github/workflows/
├── ci.yml                  # 推送/PR 时运行测试 + 类型检查
├── lint.yml                # ESLint（如果配置了）
└── publish.yml             # GHCR Docker 镜像发布
docs/
├── deployment.md            # 部署指南（英文）
├── deployment.zh-CN.md      # 部署指南（中文）
├── developer-guide.md       # 英文版（本文件）
├── developer-guide.zh-CN.md # 中文版
├── recipes.md               # 实战食谱（英文）
└── recipes.zh-CN.md         # 实战食谱（中文）
```

---

## Docker

项目构建一个多阶段 Docker 镜像，推送到 `ghcr.io/learner20230724/feishu-flow-kit`。

```bash
# 本地构建
docker build -t feishu-flow-kit .

# 使用 env 文件运行
docker run -it --env-file .env feishu-flow-kit

# 使用 docker-compose 运行（包含 mock 飞书服务器）
docker-compose up
```

在运行中的服务器上升级镜像：
```bash
docker pull ghcr.io/learner20230724/feishu-flow-kit:latest
docker-compose down && docker-compose up -d
```

完整部署说明（Railway、Render、fly.io、Ubuntu）见 `docs/deployment.md`。

---

## 常见模式

### 用户可见的字符串始终使用 i18n
```typescript
// ❌ 错误
replyText: `任务已创建: ${task}`,

// ✅ 正确
replyText: s.taskCreated(task),
```

### 工作流层绝不发起 HTTP 调用
草稿在 `runMessageWorkflow` 中构建，HTTP 调用发生在 `maybe-*` 适配器中。

### 功能开关控制 API 发送
发送外部调用前检查 `enableMyFeature`。如果已禁用，返回 `{ attempted: false, skippedReason: '…' }`。

### 启动时 fail-fast
在 `load-config.ts` 中验证必需的环境变量。如果配置缺失，服务器应立即崩溃并给出清晰错误信息。

### 测试使用 `loadMockMessageEvent()`
不要手工构造原始 webhook payload——使用 fixture loader 获取正确类型的 `FeishuMessageEvent`。
