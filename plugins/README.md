# feishu-flow-kit Plugin Registry

feishu-flow-kit uses a lightweight plugin architecture to extend slash-command capabilities. Plugins are plain JavaScript/TypeScript modules that register commands and return structured results.

## Table of Contents

- [Built-in Commands](#built-in-commands)
- [Example Plugins](#example-plugins)
- [Loading Plugins](#loading-plugins)
- [Writing a New Plugin](#writing-a-new-plugin)
- [Plugin API Reference](#plugin-api-reference)

---

## Built-in Commands

These commands are compiled into the core binary — no `FEISHU_PLUGINS` configuration needed.

| Command | Description |
|---------|-------------|
| `/doc [markdown...]` | Creates a Feishu Doc with rendered markdown (bold, italic, code, lists, headings, etc.) |
| `/table` | Opens an interactive panel to draft a Feishu Bitable table record |
| `/todo [task description]` | Creates a Feishu task assigned to the message sender |
| `/help` | Lists all registered commands and their sources |

### /doc — Rich Doc Authoring

```
/doc # My Document
This is a **bold** statement with `inline code`.
- Item one
- Item two
```

**Supported block types:**

| Markdown | Block Type | Feishu block_type |
|----------|-----------|-------------------|
| `# H1` / `## H2` / `### H3` | Heading | 2 / 3 / 4 |
| `**bold**` | Paragraph with bold | — |
| `_italic_` | Paragraph with italic | — |
| `` `code` `` | Paragraph with inline_code | 17 |
| ```` ```lang\ncode\n``` ```` | Fenced code block | 17 |
| `- item` | Bullet list | 12 |
| `1. item` | Ordered list | 14 |
| `> quote` | Quote | 18 |
| `---` | Divider | 22 |
| Paragraph text | Paragraph | 1 |

### /table — Bitable Record Drafting

Interactive multi-step flow:

1. Select a Bitable app and table
2. Map fields (supports text, number, single-select, multi-select, user, date)
3. Preview the record JSON
4. Copy the JSON payload for use in the Feishu Bitable API

See [docs/table-mapping-config-preflight.md](./table-mapping-config-preflight.md) for field mapping details.

### /todo — Task Creation

```
/todo Review the Q2 report by Friday
```

Creates a Feishu task due at the end of the current day, assigned to the sender.

---

## Example Plugins

These plugins live in the `plugins/` directory. Copy any of them and adapt to your needs.

### /ping — Health Check

**Source:** `plugins/ping-plugin.ts`

```
/ping
🏓 PONG

/ping hello world
🏓 PONG — you said: "hello world"
```

The simplest possible plugin — demonstrates the minimum viable plugin shape.

### /poll — Multi-Choice Poll

**Source:** `plugins/poll-plugin.ts`

```
/poll "Which project?" "Option A" "Option B" "Option C"
```

Creates an interactive Feishu card with clickable option buttons. Requires `FEISHU_ENABLE_OUTBOUND_REPLY=true`.

---

## Loading Plugins

Add plugin paths to `FEISHU_PLUGINS` in your `.env` file, separated by commas:

```env
FEISHU_PLUGINS="./plugins/help-plugin.js,./plugins/ping-plugin.js,./plugins/poll-plugin.js"
```

Each path is resolved relative to the project root. Build TypeScript plugins first:

```bash
cd plugins/my-plugin && npm install && npm run build
```

Or use the CLI scaffolder (recommended):

```bash
node scripts/create-plugin.mjs my-plugin-name
```

This automatically copies the plugin template, updates all references, and appends the new plugin to `FEISHU_PLUGINS` in `.env`.

---

## Writing a New Plugin

### Step 1 — Scaffold

```bash
node scripts/create-plugin.mjs my-command
cd plugins/my-command
npm install
```

### Step 2 — Edit the plugin logic

Replace the logic in `src/plugin.ts`. The minimum shape:

```typescript
import type { FeishuPlugin, PluginRegistry } from '../core/plugin-system.js';

export const plugin: FeishuPlugin = {
  name: 'my-command',

  register(registry: PluginRegistry) {
    registry.registerCommand('my-command', this);
  },

  handle(command) {
    if (command.name !== 'my-command') return null;
    return {
      ok: true,
      replyText: `You said: ${command.argsText}`,
    };
  },
};
```

### Step 3 — Build and enable

```bash
npm run build
```

Then add to `FEISHU_PLUGINS`:

```env
FEISHU_PLUGINS="./plugins/my-command/dist/index.js"
```

### Publishing to npm

Use `@feishu/plugin-template` as a base:

```bash
npm install @feishu/plugin-template
# Copy node_modules/@feishu/plugin-template to your plugin directory
# Customize src/plugin.ts
npm publish
```

See [docs/plugin-scaffolder-walkthrough.md](../docs/plugin-scaffolder-walkthrough.md) for the full walkthrough.

---

## Plugin API Reference

### `FeishuPlugin`

```typescript
interface FeishuPlugin {
  name: string;
  register(registry: PluginRegistry): void;
  handle(command: PluginCommand): PluginCommandResult | null;
}
```

### `PluginCommand`

```typescript
interface PluginCommand {
  name: string;         // command name, e.g. "ping"
  argsText: string;     // everything after the command name
  event: FeishuMessageEvent;  // raw Feishu message event
  workflowOptions: WorkflowOptions;  // workflow config (tenant_access_token, etc.)
}
```

### `PluginCommandResult`

```typescript
interface PluginCommandResult {
  ok: boolean;
  replyText?: string;        // plain text reply
  card?: object;             // Feishu interactive card payload
  tags?: string[];           // search/topic tags
  webhookResult?: object;    // raw Feishu API response for logging
}
```

### `PluginRegistry`

```typescript
interface PluginRegistry {
  registerCommand(name: string, plugin: FeishuPlugin): void;
  getCommands(): Array<{ name: string; plugin: FeishuPlugin }>;
}
```

See [docs/plugin-system.md](../docs/plugin-system.md) for the full system design.
