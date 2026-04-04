# Plugin Scaffolder Walkthrough

See the [Plugin Example Walkthrough](./plugin-example-walkthrough.md) for a complete step-by-step guide to building a custom plugin from scratch. This page shows exactly what the CLI scaffolder produces — the files, the structure, and the key code snippets.

---

## What the Scaffolder Does

Run the built-in CLI scaffolder to generate a fully-structured plugin from the [`plugins/template/`](https://github.com/learner20230724/feishu-flow-kit/tree/main/plugins/template) boilerplate:

```bash
node scripts/create-plugin.mjs <plugin-name>
```

**Example:**

```bash
node scripts/create-plugin.mjs remind
```

---

## CLI Output

```
✅ Plugin 'remind' created successfully!

   plugins/
   └── remind/
       ├── index.ts       ← Plugin entry (registers commands)
       ├── plugin.ts      ← Core logic (lifecycle hooks)
       ├── README.md      ← Per-plugin documentation
       └── .env.example   ← Local env var template

Next steps:
  1. Edit plugins/remind/plugin.ts  — implement your command logic
  2. Edit plugins/remind/index.ts   — register your commands
  3. Add FEISHU_PLUGINS=plugins/remind to your .env
  4. Restart the bot: npm run dev
```

---

## Generated File Tree

```
plugins/<name>/
├── index.ts        ← Registers /<name> command with the plugin registry
├── plugin.ts      ← Implements all 5 lifecycle hooks (see diagram below)
├── README.md      ← Per-plugin usage guide (copy-paste ready)
└── .env.example   ← Template for any plugin-specific env vars
```

---

## Generated `index.ts`

```typescript
// plugins/<name>/index.ts
// Registers the plugin's commands with the PluginRegistry.

import { createPlugin } from '../packages/plugin-template/src/index.js';

const plugin = createPlugin({
  name: '<name>',
  // Register the commands this plugin exposes.
  // These are the strings users type after the / prefix.
  commands: ['<name>'],

  // ── Lifecycle Hooks ────────────────────────────────────────────────────────
  // See: docs/assets/plugin-lifecycle-diagram.png

  register(registry) {
    // Called once at startup. Use to register additional commands
    // beyond the ones listed above.
    registry.register('<name>');
  },

  async beforeProcess(event) {
    // Optional pre-processor. Return a modified event to change how the
    // bot processes this message, or null to let the default handler run.
    return null;
  },

  async handle(event, ctx) {
    // Main handler — called when a registered command is triggered.
    // ctx.result carries the reply/draft produced by the built-in handler.
    const text = event.message?.text?.text ?? '';
    if (!text.startsWith(`/${this.name}`)) return null;

    const args = text.slice(this.name.length).trim();

    // TODO: implement your command logic here
    // See docs/plugin-example-walkthrough.md for a full example

    return {
      success: true,
      message: `Command /${this.name} called with args: ${args}`,
    };
  },

  async onCommandResult(result, event) {
    // Optional hook — called after a command reply is sent.
    // Use for logging, analytics, or side-effects.
  },

  async afterProcess(result, event) {
    // Optional hook — called after all processing is complete.
    // Runs even if the command was not found.
    // Use for cleanup, stats, or global side-effects.
  },
});

export default plugin;
```

---

## The 5 Lifecycle Hooks

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Plugin Lifecycle (see diagram below)                   │
│                                                                                │
│  Feishu event                                                                  │
│       │                                                                       │
│       ▼                                                                       │
│  1. register(registry)  ──── Startup only. Register command names.            │
│       │                                                                       │
│       ▼                                                                       │
│  2. beforeProcess(event) ─── Optional. Pre-process or filter events.         │
│       │                         Return modified event, or null to skip.       │
│       ▼                                                                       │
│  3. handle(event, ctx)  ──── Main hook. Implement your command here.         │
│       │                         Return PluginCommandResult.                    │
│       ▼                                                                       │
│  4. onCommandResult(res) ── Optional. React to built-in reply/draft.         │
│       │                                                                       │
│       ▼                                                                       │
│  5. afterProcess(result) ─── Optional. Runs after all processing done.        │
│                                                                                │
│  🔒 All hooks are error-isolated — a crashing plugin never kills the server.  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Lifecycle diagram:**

![Plugin lifecycle architecture diagram](./assets/plugin-lifecycle-diagram.png)

---

## Registering the Plugin

After creating the plugin, add it to your `.env`:

```bash
# .env
FEISHU_PLUGINS=plugins/remind
```

Or for multiple plugins:

```bash
FEISHU_PLUGINS=plugins/remind,plugins/greeting,plugins/help-plugin
```

Restart the bot (`npm run dev`) — the scaffolder appends to `.env` automatically if it exists.

---

## Scaffolder Options

| Flag | Description |
|------|-------------|
| `node scripts/create-plugin.mjs <name>` | Create in default `plugins/` directory |
| `node scripts/create-plugin.mjs <name> --path ./plugins` | Same as above (explicit) |
| `node scripts/create-plugin.mjs <name> --path ./custom-plugins` | Create in a custom directory |
| `node scripts/create-plugin.mjs <name> --dry-run` | Show what would be created without creating files |

The scaffolder **never overwrites** an existing plugin directory — if `plugins/remind/` already exists it will error with a clear message.

---

## From Template to Production: Full Example

See [plugin-example-walkthrough.md](./plugin-example-walkthrough.md) for a complete `/remind` plugin built with this scaffolder, including:

- `parseRemindArgs()` — argument parsing
- Feishu card builder — rich reminder cards
- All 5 lifecycle hooks in a real plugin
- i18n patterns — bilingual replies
- Database extension example

---

## See Also

- [Plugin System Architecture](./plugin-system.md)
- [Plugin Example Walkthrough](./plugin-example-walkthrough.md)
- [`packages/plugin-template/README.md`](https://github.com/learner20230724/feishu-flow-kit/tree/main/packages/plugin-template)
