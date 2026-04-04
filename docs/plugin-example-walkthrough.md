# Plugin Example: Building a `/remind` Command

This document walks through building a complete custom plugin for feishu-flow-kit from scratch. By the end, you'll have a working `/remind [date] [message]` command that creates a Feishu reminder card.

## What You're Building

```
User: /remind tomorrow 10am Team standup
Bot:  📌 Reminder set for Sat, Apr 5 2026 10:00 UTC
      "Team standup"
      [View in Feishu] [Delete]
```

## Step 1: Create the Plugin File

Create `plugins/remind-plugin.ts`:

```typescript
import type { FeishuPlugin, PluginCommandResult, FeishuMessageEvent } from '../packages/plugin-template/src/types.js';

// ─── Helper: parse /remind arguments ────────────────────────────────────────
function parseRemindArgs(text: string): { dateStr: string; message: string } | null {
  // Accepts: /remind tomorrow 10am Do something
  //           /remind 2026-04-05 10:00 Do something
  //           /remind in 2 hours Review PR
  const match = text.match(/^\/remind\s+(.+?)\s+(.+)$/);
  if (!match) return null;
  return { dateStr: match[1], message: match[2] };
}

// ─── Helper: format reminder card ───────────────────────────────────────────
function buildRemindCard(dateStr: string, message: string, rawDate: Date): object {
  return {
    schema: '2.0',
    body: {
      elements: [
        { tag: 'markdown', content: `**📌 Reminder**` },
        { tag: 'div', text: { tag: 'plain_text', content: message } },
        { tag: 'column_set', flex_mode: 'segmented', columns: [
          { tag: 'column', width: 'stretch', elements: [
            { tag: 'markdown', content: `**When:**\n${rawDate.toLocaleString()}` },
          ]},
          { tag: 'column', width: 'auto', elements: [
            { tag: 'button', text: { tag: 'plain_text', content: '✅ Done' }, type: 'primary' },
          ]},
        ]},
      ],
    },
  };
}

// ─── The Plugin ─────────────────────────────────────────────────────────────
export const remindPlugin: FeishuPlugin = {
  name: 'remind',

  register(registry) {
    registry.registerCommand('remind', {
      description: 'Set a reminder — /remind [date] [message]',
      example: '/remind tomorrow 10am Team standup',
    });
  },

  async handle(event: FeishuMessageEvent, ctx: { reply(card: object): Promise<void> }): Promise<PluginCommandResult | void> {
    const text = event.message?.content?.text ?? '';
    const args = parseRemindArgs(text);
    if (!args) {
      return {
        content: {
          text: '❌ Usage: `/remind [when] [what]`\n\nExamples:\n`/remind tomorrow 10am Team standup`\n`/remind 2026-04-05 14:00 Review proposal`',
        },
      };
    }

    // NOTE: Real implementation would call a calendar/reminder API here.
    // For demo purposes, we simulate a parsed date.
    const mockDate = new Date(Date.now() + 86400000); // tomorrow
    const card = buildRemindCard(args.dateStr, args.message, mockDate);

    await ctx.reply(card);

    return { handled: true };
  },
};
```

## Step 2: Register in `FEISHU_PLUGINS`

Add to your `.env`:

```bash
FEISHU_PLUGINS=plugins/remind-plugin
```

Or for multiple plugins:

```bash
FEISHU_PLUGINS=plugins/remind-plugin,plugins/greeting-plugin,plugins/help-plugin
```

## Step 3: Restart the Server

```bash
npm run dev
# or in Docker:
docker compose up -d
```

## Step 4: Test It

Send `/remind tomorrow 10am Review the Q2 report` to your bot.

---

## Key Plugin Concepts Illustrated

| Concept | Where in `/remind` |
|---------|-------------------|
| **Command registration** | `register()` → `registry.registerCommand()` |
| **Pattern matching** | `parseRemindArgs()` in `handle()` |
| **Card-formatted reply** | `ctx.reply(card)` with Feishu card schema |
| **Text fallback reply** | `return { content: { text: '...' } }` for usage errors |
| **Lifecycle hooks** | `register` (setup) + `handle` (main logic) |

## Extending This Plugin

### Add a Database Backend

Replace the mock date with a real storage call:

```typescript
// Add after existing imports
import { saveReminder } from './remind-store.js';

async function handleRemind(event, ctx) {
  const args = parseRemindArgs(text);
  if (!args) { /* ... */ }

  const reminder = await saveReminder({
    userId: event.sender.sender_id?.user_id,
    message: args.message,
    remindAt: parsedDate,
  });

  const card = buildRemindCardWithId(args.dateStr, args.message, mockDate, reminder.id);
  await ctx.reply(card);
}
```

### Add an `afterProcess` Hook (Confirmation Logging)

```typescript
afterProcess(result, event) {
  if (result?.handled) {
    console.log(`[remind] ✅ reminder set by user ${event.sender?.sender_id?.user_id}`);
  }
}
```

### Add i18n Support

```typescript
import { getStrings } from '../src/i18n/index.js';

async function handle(event, ctx) {
  const lang = event.language ?? 'en';
  const strings = getStrings(lang);

  if (!args) {
    return { content: { text: strings.remindUsage } };
  }
}
```

## Full Plugin File (`plugins/remind-plugin.ts`)

```typescript
import type { FeishuPlugin, PluginCommandResult, FeishuMessageEvent } from '../packages/plugin-template/src/types.js';

function parseRemindArgs(text: string): { dateStr: string; message: string } | null {
  const match = text.match(/^\/remind\s+(.+?)\s+(.+)$/);
  if (!match) return null;
  return { dateStr: match[1], message: match[2] };
}

function buildRemindCard(dateStr: string, message: string, rawDate: Date): object {
  return {
    schema: '2.0',
    body: {
      elements: [
        { tag: 'markdown', content: '**📌 Reminder**' },
        { tag: 'div', text: { tag: 'plain_text', content: message } },
        { tag: 'column_set', flex_mode: 'segmented', columns: [
          { tag: 'column', width: 'stretch', elements: [
            { tag: 'markdown', content: `**When:** ${rawDate.toLocaleString()}` },
          ]},
          { tag: 'column', width: 'auto', elements: [
            { tag: 'button', text: { tag: 'plain_text', content: '✅ Done' }, type: 'primary' },
          ]},
        ]},
      ],
    },
  };
}

export const remindPlugin: FeishuPlugin = {
  name: 'remind',
  register(registry) {
    registry.registerCommand('remind', {
      description: 'Set a reminder — /remind [date] [message]',
      example: '/remind tomorrow 10am Team standup',
    });
  },
  async handle(event: FeishuMessageEvent, ctx: { reply(card: object): Promise<void> }): Promise<PluginCommandResult | void> {
    const text = event.message?.content?.text ?? '';
    const args = parseRemindArgs(text);
    if (!args) {
      return {
        content: {
          text: '❌ Usage: `/remind [when] [what]`\n\nExamples:\n`/remind tomorrow 10am Team standup`\n`/remind 2026-04-05 14:00 Review proposal`',
        },
      };
    }
    const mockDate = new Date(Date.now() + 86400000);
    const card = buildRemindCard(args.dateStr, args.message, mockDate);
    await ctx.reply(card);
    return { handled: true };
  },
};
```

---

## See Also

- [Plugin System Architecture](../docs/plugin-system.md) — lifecycle hooks, error isolation, registry
- [Plugin Template Package](../packages/plugin-template/README.md) — npm-installable plugin scaffold
- [CLI Scaffolder](../docs/plugin-system.md#cli-scaffolder) — `node scripts/create-plugin.mjs <name>` to generate a new plugin in 10 seconds
