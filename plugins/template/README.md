# Plugin Template

A complete, copy-paste starter for a new feishu-flow-kit plugin.

## Quick start

```bash
# Scaffold a new plugin in one command
node scripts/create-plugin.mjs my-github-notify

# Or manually copy the template
cp -r plugins/template plugins/my-github-notify
```

Then edit `plugins/my-github-notify/plugin.ts` and restart the server.

## Template anatomy

```
plugins/template/
├── index.ts          # Entry point — exports the plugin (no need to edit)
├── plugin.ts         # Your plugin logic — replace everything here
├── .env.example      # Document your plugin's env vars here
└── README.md         # This file
```

## What this template does

The template implements two commands:

| Command | Description |
|---------|-------------|
| `/greeting [name]` | Responds with a Feishu interactive card |
| `/greeting doc [name]` | Creates a Feishu Doc draft |

This is intentional — it demonstrates the three response patterns available
to plugins:

1. **Text reply** — return `replyText: string` (plain text or card JSON)
2. **Doc draft** — return `hasDocCreateDraft: true` + `docTopic` + `docMarkdown`
3. **Table record draft** — return `hasTableRecordDraft: true` + `tableRecordTitle`

## Lifecycle hooks

Your plugin can implement all or none of these:

```typescript
export function createPlugin(config: AppConfig): FeishuPlugin {
  return {
    name: 'my-plugin',

    register(registry) {
      // Called once at server startup.
      // Register your /command names here via registry.registerCommand().
      registry.registerCommand('my-command', pluginInstance);
    },

    beforeProcess(event, config) {
      // Called for every incoming Feishu event, before command dispatch.
      // Return false to skip the entire workflow for this event.
    },

    handle(command, event, options) {
      // Called when a registered command is matched.
      // Return null to defer to the next handler.
      // Return PluginCommandResult to produce a reply.
      if (command.name !== 'my-command') return null;
      return { ok: true, replyText: 'Hello!' };
    },

    onCommandResult(result, event) {
      // Called after the core workflow or a plugin handle() has run.
      // Mutate result.replyText or result.tags in place.
    },

    afterProcess(event, result) {
      // Called after all handlers have finished (fire-and-forget).
      // Good for: external webhooks, analytics, follow-up API calls.
    },
  };
}
```

## Activating your plugin

Add its module path to `FEISHU_PLUGINS` in your `.env`:

```env
FEISHU_PLUGINS="./plugins/ping-plugin.js,./plugins/my-github-notify/index.js"
```

Multiple plugins are separated by commas. Plugins are loaded in order;
if two plugins register the same command name, the first one wins.

## Testing

Run the project tests after changing your plugin:

```bash
npm test
```

See `docs/plugin-system.md` for the full plugin system reference.
