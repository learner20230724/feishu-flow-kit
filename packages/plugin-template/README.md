# @feishu/plugin-template

> Official starter template for building a **feishu-flow-kit** plugin.

[![npm version](https://img.shields.io/npm/v/@feishu/plugin-template)](https://www.npmjs.com/package/@feishu/plugin-template)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)

## What is this?

`@feishu/plugin-template` is a **copy-and-customise starter** for adding new slash commands to [feishu-flow-kit](https://github.com/learner20230724/feishu-flow-kit).

Instead of reading all the source code to understand the plugin system, copy this directory and follow the annotated comments — you'll have a working `/greeting` command in minutes.

## Usage

### Option A — Scaffold with the CLI (recommended)

feishu-flow-kit ships with a built-in scaffolder:

```bash
node scripts/create-plugin.mjs my-github-notify
```

This copies this template into `plugins/my-github-notify/`, updates all references, and appends the new plugin path to `FEISHU_PLUGINS` in your `.env` file.

### Option B — Install as a dependency

```bash
npm install @feishu/plugin-template
```

Then add the path to your `FEISHU_PLUGINS` in `.env`:

```
FEISHU_PLUGINS="./plugins/my-plugin/dist/index.js"
```

Build your plugin with `npm run build` (from the plugin directory). The dist output is what feishu-flow-kit loads at runtime.

## Template anatomy

```
@feishu/plugin-template/
├── src/
│   ├── index.ts    # Entry point — re-exports types + plugin singleton
│   ├── plugin.ts   # Your plugin logic — replace everything here
│   └── types.ts    # Standalone FeishuPlugin type definitions
├── package.json
├── tsconfig.json
└── README.md
```

## What this template does

| Command | Description |
|---------|-------------|
| `/greeting [name]` | Sends a personalised Feishu interactive card |
| `/greeting doc [name]` | Creates a Feishu Doc draft |

This is intentional — it demonstrates **all three response patterns** available to plugins:

1. **Text/card reply** — return `{ ok: true, replyText: string }` with raw JSON card
2. **Doc draft** — return `{ ok: true, hasDocCreateDraft: true, docTopic, docMarkdown }`
3. **Table record draft** — return `{ ok: true, hasTableRecordDraft: true, ... }`

## Lifecycle hooks

Your plugin can implement any or all of these:

| Hook | When it runs | Use for |
|------|-------------|---------|
| `register(registry)` | Server startup, once | Claim `/command` names |
| `beforeProcess(event)` | Every Feishu event | Filter events by sender, type, language |
| `handle(command, event, options)` | Matched slash command | Your main logic — return a reply or draft |
| `onCommandResult(result, event)` | After built-in workflow | Mutate or annotate the reply |
| `afterProcess(event, result)` | After reply is sent | Fire-and-forget: logging, analytics, webhooks |

## Quick example

```typescript
import { createPlugin } from '@feishu/plugin-template';

export function createPlugin(_config): FeishuPlugin {
  return {
    name: 'hello',
    register(registry) {
      registry.registerCommand('hello', pluginInstance);
    },
    handle({ name, argsText }) {
      if (name !== 'hello') return null;
      return {
        ok: true,
        replyText: `Hello, ${argsText || 'world'}!`,
        tags: ['hello', 'plugin'],
      };
    },
  };
}

const pluginInstance = createPlugin({});
export { pluginInstance as plugin };
```

## Types

All plugin types are re-exported from this package:

```typescript
import type {
  FeishuPlugin,
  PluginCommandResult,
  PluginRegistry,
  WorkflowResult,
  FeishuMessageEvent,
  AppConfig,
  WorkflowOptions,
} from '@feishu/plugin-template';
```

They are identical to the internal types in `feishu-flow-kit` — using this package as a type dependency is fully compatible.

## Peer dependency

This package's runtime peer dependency is `feishu-flow-kit >= 1.0.0`. The plugin system types and the server that loads plugins are both defined in feishu-flow-kit.

If you install this package as a dev/type-only dependency (e.g. `npm install --save-dev @feishu/plugin-template`), you do not need `feishu-flow-kit` installed.

## Publishing a plugin

Once your plugin is ready:

1. Build: `npm run build` → `dist/` output
2. Set the version in `package.json`
3. Publish to npm: `npm publish --access public` (or scope it under `@feishu`)
4. Users add your package path to their `FEISHU_PLUGINS` env var

Example `package.json` for a published plugin:

```json
{
  "name": "@yourname/feishu-github-notify",
  "version": "1.0.0",
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" }
  },
  "peerDependencies": {
    "feishu-flow-kit": ">=1.0.0"
  }
}
```

## License

MIT — same as [feishu-flow-kit](https://github.com/learner20230724/feishu-flow-kit).
