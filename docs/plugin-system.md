# Plugin System — feishu-flow-kit

> Extend the bot with custom slash commands and event processors — no core code changes required.

## Overview

Plugins are plain JavaScript/TypeScript modules that hook into the message processing pipeline. They can:

1. **Add new slash commands** (`/poll`, `/translate`, `/remind`, etc.)
2. **Intercept and transform built-in command results** (e.g. auto-translate every reply)
3. **Post-process events** for side-effects (webhooks, analytics, logging)
4. **Filter events** before they reach the workflow (e.g. allowlist certain chats)

## Quick Start

### 1. Write a plugin

Create `plugins/my-plugin.ts`:

```typescript
import type { FeishuPlugin, PluginRegistry } from '../core/plugin-system.ts';

export const plugin: FeishuPlugin = {
  name: 'my-plugin',

  register(registry: PluginRegistry) {
    registry.registerCommand('hello', this);
  },

  handle(command, event, options) {
    if (command.name !== 'hello') return null;
    return {
      ok: true,
      replyText: `Hello, ${event.message.sender?.sender_id?.open_id ?? 'world'}!`,
      tags: ['hello', 'plugin'],
    };
  },
};
```

### 2. Register it

Add the module path to `FEISHU_PLUGINS` (comma-separated for multiple):

```bash
FEISHU_PLUGINS="./plugins/my-plugin.js,./plugins/poll-plugin.js"
```

Or in `.env`:

```env
FEISHU_PLUGINS=./plugins/my-plugin.js
```

### 3. Rebuild and restart

```bash
npm run build
docker-compose down && docker-compose up -d
```

The plugin registers `/hello` alongside the built-in `/todo`, `/doc`, and `/table` commands.

### 4. Use the plugin template (recommended)

The fastest way to start a new plugin:

```bash
# Scaffold a new plugin from the built-in template
node scripts/create-plugin.mjs my-github-notify
```

This creates `plugins/my-github-notify/` with:
- `plugins/template/index.ts` — entry point (updated with your plugin name)
- `plugins/template/plugin.ts` — your logic, with all lifecycle hooks documented
- `plugins/template/.env.example` — document your plugin's env vars
- `plugins/template/README.md` — per-plugin usage guide

The scaffolder also appends the new plugin path to `FEISHU_PLUGINS` in your `.env`.

```bash
# Dry-run to preview what would be created
node scripts/create-plugin.mjs my-github-notify --dry-run
```

The template demonstrates all three response patterns:
- **`/greeting [name]`** — Feishu interactive card reply
- **`/greeting doc [name]`** — Feishu Doc creation draft
- **`onCommandResult` / `afterProcess`** hooks — intercepting and post-processing

See `plugins/template/README.md` for full details.

---

## Architecture

### Lifecycle

For every incoming Feishu message event:

```
plugin.register(registry)          ← once, at server startup
  ↓
plugin.beforeProcess(event)         ← per event, can skip workflow
  ↓
plugin.handle(command, event)       ← if a plugin owns this command name
  ↓ OR built-in (todo/doc/table)
plugin.onCommandResult(result)      ← per event, mutate reply/tags
  ↓
plugin.afterProcess(event, result)  ← per event, side-effects only
```

### Plugin Interface

```typescript
interface FeishuPlugin {
  name: string;                                   // unique identifier
  register(registry: PluginRegistry): void;       // claim command names
  beforeProcess?(event, config): boolean | void; // return false to skip
  handle?(command, event, options): Result | null;// null = passthrough
  onCommandResult?(result, event): void;         // mutate result in place
  afterProcess?(event, result, config): void;    // fire-and-forget side-effects
}
```

### Command Registry

Inside `register()`, plugins claim slash command names:

```typescript
registry.registerCommand('myaction', this);
```

Once claimed, no other plugin (and no built-in handler) can use that name. If two plugins claim the same name, the first to call `register()` wins — the second throws at startup.

### Return Values

- **`null`** from `handle()` — passthrough to the next handler (built-in or next plugin)
- **`PluginCommandResult`** — immediate reply, skips built-in workflow for that command
- **`false`** from `beforeProcess()` — skip the entire workflow for this event
- **`throw`** in any hook — caught and logged; the pipeline continues with the original result

---

## Configuration Reference

| Environment Variable | Type | Description |
|---|---|---|
| `FEISHU_PLUGINS` | comma-separated paths | Plugin module specifiers. Paths are resolved relative to the project root. Can include npm package names (e.g. `@my-org/feishu-poll-plugin`). |

### Loading from npm packages

If an npm package exports a plugin:

```env
FEISHU_PLUGINS=@my-org/feishu-poll-plugin
```

The package must export either:
- `createPlugin: (config: AppConfig) => FeishuPlugin | Promise<FeishuPlugin>` (factory)
- `default: FeishuPlugin` (instance)
- `plugin: FeishuPlugin` (named instance)

---

## Built-in Example Plugins

Two reference plugins ship in the `plugins/` directory:

### `/ping` (`plugins/ping-plugin.ts`)

Trivial health-check command. Always responds with `🏓 PONG`.

```bash
FEISHU_PLUGINS=./plugins/ping-plugin.js
```

```
/ping → 🏓 PONG
/ping hello → 🏓 PONG — you said: "hello"
```

### `/poll` (`plugins/poll-plugin.ts`)

Creates a Feishu interactive card poll.

```
/poll "Which project?" "Alpha" "Beta" "Gamma"
```

Outputs the raw Feishu card JSON draft (for use with `FEISHU_ENABLE_OUTBOUND_REPLY=true`).

> **What it looks like in Feishu:** The `/poll` command renders as an interactive Feishu card with radio-button options:
> ![Poll card preview](../assets/poll-card-mockup.png)

### `/help` (`plugins/help-plugin.ts`)

Dynamically lists all available commands — both built-in (`/doc`, `/table`, `/todo`) and any registered via plugins. Adding a new plugin automatically extends `/help` with no extra work.

```
/help
```

No `FEISHU_PLUGINS` entry required — `/help` is loaded automatically when the plugin system is initialised. If you want to control load order, add it explicitly:

```
FEISHU_PLUGINS=./plugins/help-plugin.js,./plugins/ping-plugin.js
```

---

## Writing a Real Plugin

### Adding an outbound reply (requires Feishu API credentials)

```typescript
import type { FeishuPlugin, PluginRegistry } from '../core/plugin-system.ts';
import type { FeishuMessageEvent } from '../types/feishu-event.ts';
import type { WorkflowOptions } from '../workflows/run-message-workflow.ts';

export const plugin: FeishuPlugin = {
  name: 'remind',

  register(registry: PluginRegistry) {
    registry.registerCommand('remind', this);
  },

  async handle(command, event, options) {
    if (command.name !== 'remind') return null;
    const [who, ...rest] = command.argsText.trim().split(/\s+/);
    const text = rest.join(' ') || 'Reminder!';

    return {
      ok: true,
      replyText: `📝 Reminder set for ${who}: ${text}`,
      tags: ['remind', 'plugin'],
    };
  },

  async afterProcess(event, result, config) {
    // Fire an external webhook when a remind command was handled.
    if (!result.tags.includes('remind')) return;
    await fetch('https://your-webhook.example.com/notify', {
      method: 'POST',
      body: JSON.stringify({ message: result.replyText, event }),
    });
  },
};
```

### Intercepting / transforming a built-in result

```typescript
export const plugin: FeishuPlugin = {
  name: 'auto-translate',

  register() {},  // no new commands

  onCommandResult(result) {
    // Append a translation footer to every reply.
    if (result.replyText && !result.replyText.includes('(中文版')) {
      result.replyText += '\n\n_This reply was auto-generated._';
    }
  },
};
```

---

## Plugin Directory Structure

```
feishu-flow-kit/
├── plugins/
│   ├── help-plugin.ts       # /help command — lists all registered commands
│   ├── ping-plugin.ts        # /ping command (reference implementation)
│   ├── poll-plugin.ts        # /poll command (reference implementation)
│   └── template/             # ⭐ Plugin template + scaffolder target
│       ├── index.ts          # Entry point (export plugin)
│       ├── plugin.ts         # Full implementation with all lifecycle hooks
│       ├── .env.example      # Document your plugin's env vars
│       └── README.md         # Per-plugin usage guide
├── scripts/
│   └── create-plugin.mjs     # CLI scaffolder: node scripts/create-plugin.mjs <name>
└── src/
    └── core/
        └── plugin-system.ts   # PluginRegistry, loadPlugins, FeishuPlugin interface
```

To scaffold a new plugin: `node scripts/create-plugin.mjs <plugin-name>`

---

## Debugging Plugins

Set `LOG_LEVEL=debug` to see plugin lifecycle logs:

```
[plugin-system] Plugin "ping" registered command "/ping"
[plugin] ping.handle() called for /ping hello
```

If a plugin throws, the error is caught and logged without crashing the webhook:

```
[plugin-system] Plugin "bad-plugin" handle() threw: Error: something went wrong
```

---

## Migrating from v1.0 (no plugin system)

To port functionality that was previously hard-coded in `run-message-workflow.ts`:

1. Move the handler function to `plugins/my-plugin.ts`
2. Export it as `{ plugin }` (named export)
3. Add `registry.registerCommand('your-command', this)` in `register()`
4. Move the command name check inside `handle()` with `if (command.name !== 'x') return null`
5. Add the plugin path to `FEISHU_PLUGINS`

The built-in commands (`/todo`, `/doc`, `/table`) continue to work even when plugins are loaded — they run after plugin handlers that return `null`.
