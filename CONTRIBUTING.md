# Contributing to feishu-flow-kit

🎉 Thanks for your interest in improving feishu-flow-kit! This document covers everything you need to know to get started.

---

## Development Setup

```bash
git clone https://github.com/learner20230724/feishu-flow-kit.git
cd feishu-flow-kit
npm install
```

Copy `.env.example` to `.env` and fill in your Feishu credentials (see [Quick Start](README.md#quick-start)):

```bash
cp .env.example .env
```

Start the webhook server in development mode:

```bash
npm run dev        # starts with tsx (auto-reload on file changes)
npm start          # production server (requires npm run build first)
```

Run the full test suite:

```bash
npm test           # 141 tests, should pass in < 20s
# (no watch mode — use `npm test` for CI runs)
```

TypeScript type checking (no emit):

```bash
npm run check
```

---

## Repository Structure

```
feishu-flow-kit/
├── src/
│   ├── core/          # Plugin system, retry logic, structured logger, Sentry stubs
│   ├── workflows/     # Message handling pipelines (run-message-workflow.ts)
│   ├── adapters/      # Three-tier adapters: draft builders → maybe-adapters → request adapters
│   ├── server/        # Webhook server entry point and request handlers
│   ├── config/        # Configuration loading and environment variable parsing
│   └── i18n/          # Internationalisation (English + Simplified Chinese)
├── plugins/           # Built-in plugins (help, ping, poll, template scaffolder)
│   ├── help-plugin.ts     # /help — dynamically lists all registered commands
│   ├── ping-plugin.ts      # /ping — liveness check plugin
│   ├── poll-plugin.ts      # /poll — interactive poll card plugin
│   ├── examples/          # Gallery: qrcode, joke, remind (see Plugin Examples Gallery)
│   └── template/           # CLI plugin template (used by create-plugin.mjs scaffolder)
├── packages/
│   └── plugin-template/   # @feishu/plugin-template npm package (optional alternative)
├── scripts/
│   ├── create-plugin.mjs  # CLI scaffolder: creates a new plugin from the template
│   ├── verify-setup.mjs  # Environment and config validation script
│   └── demo-interactive.mjs # Terminal ASCII demo (try: node scripts/demo-interactive.mjs)
├── docs/                   # Architecture diagrams, developer guide, API references
├── deploy/                 # Docker Compose + Traefik production stack
└── examples/
    └── webhook-events/    # Sample Feishu im.message.receive_v1 event JSON files
```

---

## Adding a New Built-in Command

The webhook server routes messages through a three-tier adapter pipeline:

```
1. Draft builders   — build Feishu card/payload structures (src/adapters/build-*.ts)
2. Maybe adapters  — "maybe" prefix: try the Feishu API, return null on failure → next adapter
3. Request adapters — send the actual HTTP request to Feishu (src/adapters/send-*.ts)
```

To add a new command (e.g., `/weather <city>`):

### Step 1 — Add the command handler in `src/workflows/run-message-workflow.ts`

```typescript
// In the switch statement inside runMessageWorkflow:
case '/weather': {
  const city = textParts.slice(1).join(' ').trim();
  if (!city) return i18n(lang).errors.usage('/weather <city>');
  const result = await runWeatherWorkflow(city, lang);
  return result; // FeishuPluginCommandResult
}
```

### Step 2 — Create the workflow function

```typescript
// src/workflows/run-weather-workflow.ts
import { FeishuPluginCommandResult } from './types';
import { getStrings } from '../i18n';

export async function runWeatherWorkflow(city: string, lang: string): Promise<FeishuPluginCommandResult> {
  const i18n = getStrings(lang);
  const weather = await fetch(`https://api.example.com/weather?city=${encodeURIComponent(city)}`)
    .then(r => r.json())
    .catch(() => null);

  if (!weather) {
    return { action: 'reply', replyMessage: i18n.errors.weatherFailed };
  }

  return {
    action: 'card',
    card: buildWeatherCard(weather, i18n),
  };
}
```

### Step 3 — Register it in the command map

In `src/workflows/run-message-workflow.ts`, add the case before the `default` branch.

### Step 4 — Add tests

Create `test/weather-workflow.test.ts` and add at least:
- `/weather Beijing` → valid response
- `/weather` (no args) → usage error
- `/weather <city>` where API fails → graceful error message

### Step 5 — Add i18n strings

Add `weatherFailed` (and any other user-facing strings) to both `src/i18n/en.ts` and `src/i18n/zh.ts`.

---

## Writing a Plugin (Plugin System)

Plugins are independent modules that hook into the message processing pipeline. They can:
- Register custom commands
- Transform or intercept events before processing
- Handle commands and return rich Feishu card responses
- Perform actions after a command result is generated

### Option A — CLI Scaffolder (recommended)

```bash
node scripts/create-plugin.mjs my-plugin
```

This creates `plugins/my-plugin/` from the template, with:
- `index.ts` — plugin entry point
- `plugin.ts` — full implementation scaffold with all lifecycle hooks
- `.env.example` — plugin-specific environment variables
- `README.md` — plugin documentation

After creating, add your plugin to `.env`:

```bash
FEISHU_PLUGINS=my-plugin
```

### Option B — From npm package `@feishu/plugin-template`

```bash
npm install @feishu/plugin-template
```

See `packages/plugin-template/README.md` for full npm publishing instructions.

### Plugin Lifecycle Hooks

| Hook | When it runs | Use case |
|------|-------------|----------|
| `register(registry)` | Server startup | Register command names to claim ownership |
| `beforeProcess(event)` | Before routing | Inspect/drop events, enrich context |
| `handle(event)` | Command matched | Return a `FeishuPluginCommandResult` (reply/card/doc/table) |
| `onCommandResult(event, result)` | After handle | Log, notify, store analytics |
| `afterProcess(event)` | After all hooks | Cleanup, metrics, follow-up actions |

All hooks are wrapped in try/catch — a plugin crash never kills the webhook.

See [`docs/plugin-system.md`](docs/plugin-system.md) for the full architecture guide and [`docs/plugin-example-walkthrough.md`](docs/plugin-example-walkthrough.md) for a step-by-step tutorial building a `/remind` plugin.

---

## Plugin Examples Gallery

Ready-to-copy production plugins are in `plugins/examples/`:

| Plugin | Command | External API | State |
|--------|---------|-------------|-------|
| `qrcode-plugin.ts` | `/qr [text]` | QRServer (no key) | ✅ No API key needed |
| `joke-plugin.ts` | `/joke [category]` | JokeAPI v2 (no key) | ✅ No API key needed |
| `remind-plugin.ts` | `/remind <when>` | In-memory Map | ✅ Works out of the box |

Activate any of these by adding the filename (without `.ts`) to `FEISHU_PLUGINS`:

```bash
FEISHU_PLUGINS=qrc

# or all three:
FEISHU_PLUGINS=qrcode-plugin,joke-plugin,remind-plugin
```

---

## Testing

```bash
npm test              # All 141 tests
```

Tests are in `test/`. Key test files:
- `test/webhook-server.test.ts` — HTTP endpoint integration tests
- `test/retry.test.ts` — Exponential backoff and retryable error detection
- `test/doc-blocks.test.ts` — Document block formatting and inline span parsing

Webhook events can be tested locally without Feishu credentials:

```bash
# Send a single event:
bash scripts/test-webhook-local.sh examples/webhook-events/help-command.json

# Or use the verification script:
node scripts/verify-setup.mjs

# Run the interactive ASCII demo:
node scripts/demo-interactive.mjs
```

---

## Pull Request Checklist

Before opening a PR:

- [ ] `npm test` passes (130/130)
- [ ] `npm run check` passes (no new TypeScript errors)
- [ ] New commands have i18n strings in both `en.ts` and `zh.ts`
- [ ] New adapters include a "maybe" variant that degrades gracefully
- [ ] New environment variables are documented in `.env.example`
- [ ] If adding a new package/tool, update `docs/developer-guide.md`

---

## Release Process

This project uses two GitHub Actions workflows to automate releases:

| Workflow | Trigger | What it does |
|---|---|---|
| `release-draft.yml` | `v*.*.*` tag pushed | Creates a **draft** GitHub Release with changelog |
| `release-publish.yml` | `v*.*.*` tag pushed (after draft) | **Publishes** the draft (removes `draft: true`) |

### Making a release

```bash
# 1. Update CHANGELOG.md with the new version entry (if needed)
# 2. Bump version in package.json
npm version patch   # or minor / major

# 3. Push the tag — this triggers both workflows automatically
git push origin v1.0.4
```

The release goes through two phases:
1. **Draft phase** — `release-draft.yml` creates the draft; CI must pass; you can preview and edit on GitHub
2. **Live phase** — `release-publish.yml` publishes it automatically once the draft exists

### Manual override

If you need to publish manually or skip auto-publish, delete `release-publish.yml` before pushing the tag.

### Publishing @feishu/plugin-template to npm

The `@feishu/plugin-template` package is published to npm separately from the main feishu-flow-kit release. It lives in `packages/plugin-template/` and has its own `package.json` with independent versioning.

**Prerequisites:** You must have an `NPM_TOKEN` secret configured in the repository (GitHub repo → Settings → Secrets → Actions). The token needs publish permission for the `@feishu` scope. Request access to the [feishu npm org](https://www.npmjs.com/org/feishu) if needed.

**To publish** (GitHub Actions, recommended):

1. Go to **Actions → Publish @feishu/plugin-template to npm → Run workflow**
2. Enter the version number (e.g., `1.0.0`) or leave blank to use the version in `packages/plugin-template/package.json`
3. Click **Run workflow**

The workflow will:
- Build the TypeScript in `packages/plugin-template/`
- Publish to `https://registry.npmjs.org/` with public access
- Tag the commit as `plugin-template-v{x.y.z}` on GitHub

**To version-bump separately:**

```bash
cd packages/plugin-template
npm version minor   # or patch
# Then push the git tag: git push origin plugin-template-v1.2.0
```

## Code Style

- TypeScript strict mode — avoid `any`, prefer explicit types
- Error handling — use `withRetry()` from `src/core/retry.ts` for all Feishu API calls
- Logging — use `logger` from `src/core/logger.ts` (includes `requestId` automatically)
- i18n — all user-facing strings must use `getStrings(lang)` from `src/i18n/`

---

## Need Help?

- 📖 Full docs: [`docs/developer-guide.md`](docs/developer-guide.md)
- 🧩 Plugin system: [`docs/plugin-system.md`](docs/plugin-system.md)
- 🔧 Troubleshooting: [`docs/troubleshooting.md`](docs/troubleshooting.md)
- 💬 For questions, open a GitHub Discussion
