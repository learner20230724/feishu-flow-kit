# Developer Guide

> English · [简体中文](./developer-guide.zh-CN.md)

This guide explains how feishu-flow-kit is structured and how to extend it with new commands, adapters, and Feishu API integrations.

---

## Architecture Overview

```
Incoming Feishu Webhook
        │
        ▼
handleWebhookPayload()          ← entry point, validates payload + routes
        │
        ▼
adaptWebhookMessageEvent()      ← normalizes raw Feishu event → FeishuMessageEvent
        │
        ▼
runMessageWorkflow()            ← core business logic, builds reply text / doc / table drafts
        │
        ├─→ parseSlashCommand()  ← extracts /command args from text
        ├─→ buildReplyMessageDraft()
        ├─→ buildDocCreateDraft()
        └─→ buildTableRecordDraft()
        │
        ▼
maybeSendReplyMessage()         ← adapter: sends message via Feishu API (or skips if disabled)
maybeCreateDoc()                ← adapter: creates doc via Feishu API (or skips if disabled)
maybeCreateTableRecord()        ← adapter: creates table record via Feishu API (or skips if disabled)
```

**Key principle:** The workflow layer is pure business logic — it builds drafts, never makes HTTP calls. HTTP calls are isolated in `*-request.ts` adapters. Feature flags (`enableOutboundReply`, `enableDocCreate`, `enableTableCreate`) gate actual API sends.

---

## Adding a New Slash Command

### Step 1 — Register the command in `parseSlashCommand`

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

Commands are routed by name in `runMessageWorkflow.ts`. Add a new case:

```typescript
// inside runMessageWorkflow(), after the /doc case:
if (cmd.command === 'mycommand') {
  return handleMyCommand(cmd.argsText, event, s);
}
```

### Step 2 — Implement the handler

Handlers receive `(argsText, event, s)` where:
- `argsText` is the text after `/mycommand `
- `event` is the parsed `FeishuMessageEvent`
- `s` is the i18n strings object (`Strings` from `src/i18n/index.js`)

A handler returns a `WorkflowResult`:

```typescript
export interface WorkflowResult {
  ok: boolean;
  replyText: string;          // what the bot says back
  tags: string[];              // shown in /status
  docTopic?: string;           // set to create a doc
  docMarkdown?: string;        // doc content (markdown)
  hasTableRecordDraft?: boolean;
  tableRecordDraft?: TableRecordDraft;
}
```

Example:

```typescript
function handleMyCommand(argsText: string, event: FeishuMessageEvent, s: Strings): WorkflowResult {
  const query = argsText.trim() || s.defaultQuery();
  return {
    ok: true,
    replyText: `Processing: ${query}`,
    tags: ['mycommand'],
    // optionally: docTopic + docMarkdown to auto-create a doc
    // optionally: hasTableRecordDraft + tableRecordDraft to auto-create a table record
  };
}
```

### Step 3 — Add i18n strings

Add the new strings to both `src/i18n/en.ts` and `src/i18n/zh.ts`:

```typescript
// src/i18n/en.ts
myCommandReply: (query: string) => `Processing: ${query}`,
defaultQuery: () => 'no query provided',

// src/i18n/zh.ts
myCommandReply: (query: string) => `正在处理：${query}`,
defaultQuery: () => '未提供查询',
```

### Step 4 — Add tests

Create `test/my-command.test.ts`. See existing tests in `test/` for patterns using `loadMockMessageEvent()`.

---

## Adapter Pattern

Adapters are the boundary between business logic and Feishu's API. There are two layers:

### Draft builders (`build-*.ts`)

Pure functions that accept raw data and return a structured draft (no HTTP calls):

```
buildReplyMessageDraft(messageId, replyText)       → ReplyMessageDraft
buildDocCreateDraft(topic, markdown)               → DocCreateDraft
buildTableRecordDraft(fields)                      → TableRecordDraft
```

### Maybe adapters (`maybe-*.ts`)

Check the feature flag, then call the request adapter:

```
maybeSendReplyMessage(config, draft)              → { attempted, skippedReason } | API result
maybeCreateDoc(config, draft)                     → { attempted, skippedReason } | API result
maybeCreateTableRecord(config, draft)             → { attempted, skippedReason } | API result
```

### Request adapters (`send-*.ts` + `get-*.ts` / `fetch-*.ts`)

Make the actual HTTP calls to Feishu:

```
sendReplyMessage(appId, appSecret, draft)         → API response
getTenantAccessToken(appId, appSecret)            → { token, expiresAt }
fetchTenantAccessToken(appId, appSecret)          → token string (caching wrapper)
sendDocCreateRequest(tenantToken, draft)          → API response
```

**Adding a new Feishu API call:**

1. Create `src/adapters/send-my-feature-request.ts` — calls the Feishu API endpoint
2. Create `src/adapters/maybe-my-feature.ts` — wraps with feature flag + token fetch
3. Call `maybe-my-feature.ts` from `handleWebhookPayload` in `src/server/handle-webhook-payload.ts`

All request adapters should use `withRetry` from `src/core/retry.ts` for resilience.

---

## Retry & Error Resilience

The `withRetry` wrapper (`src/core/retry.ts`) provides exponential back-off for Feishu API calls. It handles:

- HTTP 429 (rate limited)
- HTTP 5xx (server errors)
- Feishu error codes 99991661 / 99991663 (transient)

```typescript
import { withRetry } from '../core/retry.js';

const result = await withRetry(() => sendMyRequest(token, draft), {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
});
```

To make an existing adapter retry-aware, wrap the API call inside `withRetry`. See `send-reply-message.ts` for a complete example.

---

## Configuration

All config comes from environment variables, loaded via `src/config/load-config.ts`. Add new env vars following this pattern:

```typescript
// src/config/load-config.ts
MY_FEATURE_ENABLED: boolean = false,
MY_FEATURE_URL: string = '',
```

Always add validation (fail-fast) so startup gives a clear error if a required variable is missing.

Feature flags are the preferred way to add optional integrations — they let the kit run in "draft only" mode without Feishu credentials.

---

## Testing

Run all tests:

```bash
npm test
```

Run with coverage:

```bash
npm test -- --coverage
```

Run a specific test file:

```bash
npm test -- test/my-feature.test.ts
```

**Mock events** are loaded via `loadMockMessageEvent()` in `src/adapters/load-mock-message-event.ts`. Add new fixtures there for new command tests.

**Mocking Feishu API calls** in tests: use `vi.mock()` to intercept `fetch` calls, or add a mock handler in the test file. See `test/webhook-server.test.ts` for examples.

---

## Project Structure

```
src/
├── adapters/               # Feishu API adapters (draft builders + request clients)
│   ├── build-*.ts          # Pure draft builders
│   ├── maybe-*.ts          # Feature-gated orchestrators
│   ├── send-*.ts           # Raw Feishu API HTTP calls
│   ├── get-*.ts            # Token fetchers
│   └── load-mock-*.ts      # Test fixtures
├── core/                    # Pure utilities
│   ├── parse-slash-command.ts
│   ├── retry.ts             # Exponential back-off wrapper
│   ├── sentry.ts           # Error tracking stubs
│   ├── server-status.ts    # /status endpoint state
│   └── logger.ts           # Structured logger
├── i18n/                    # Internationalization
│   ├── en.ts
│   ├── zh.ts
│   └── index.ts
├── server/                  # HTTP server
│   ├── start-webhook-server.ts
│   └── handle-webhook-payload.ts
├── config/
│   └── load-config.ts
├── types/
│   └── feishu-event.ts
└── workflows/
    └── run-message-workflow.ts
test/
├── *.test.ts               # Adapter + workflow tests
└── webhook-server.test.ts  # HTTP integration tests
.github/workflows/
├── ci.yml                  # Test + typecheck on push/PR
├── lint.yml                # ESLint (if configured)
└── publish.yml             # GHCR Docker image publish
docs/
├── deployment.md            # Deployment guide (EN)
├── deployment.zh-CN.md      # Deployment guide (ZH)
├── developer-guide.md       # This file
└── developer-guide.zh-CN.md # Chinese version
```

---

## Docker

The project builds a multi-stage Docker image published to `ghcr.io/learner20230724/feishu-flow-kit`.

```bash
# Build locally
docker build -t feishu-flow-kit .

# Run with env file
docker run -it --env-file .env feishu-flow-kit

# Run with docker-compose (includes mock Feishu server)
docker-compose up
```

Upgrade the image on a live server:
```bash
docker pull ghcr.io/learner20230724/feishu-flow-kit:latest
docker-compose down && docker-compose up -d
```

See `docs/deployment.md` for full deployment instructions (Railway, Render, fly.io, Ubuntu).

---

## Common Patterns

### Always use i18n for user-facing strings
```typescript
// ❌ Bad
replyText: `任务已创建: ${task}`,

// ✅ Good
replyText: s.taskCreated(task),
```

### Never make HTTP calls in workflow layer
Drafts are built in `runMessageWorkflow`, HTTP calls happen in `maybe-*` adapters.

### Feature flags gate API sends
Check `enableMyFeature` before making outbound calls. If disabled, return `{ attempted: false, skippedReason: '…' }`.

### Fail fast on startup
Validate required env vars in `load-config.ts`. The server should crash immediately with a clear message if config is missing.

### Use `loadMockMessageEvent()` for tests
Don't hand-craft raw webhook payloads — use the fixture loader to get a properly typed `FeishuMessageEvent`.
