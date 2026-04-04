# Feishu Flow Kit — Recipe Book

> Practical automation patterns you can copy-paste into `src/workflows/` and adapt for your team.

All recipes assume you have completed [Quick Start](./README.md#quick-start) and understand the [adapter pattern](./developer-guide.md#adapter-pattern-draft-builders--maybe-adapters--request-adapters).

---

## Recipe 1 — `/poll` Quick Poll

**What it does:** Creates a Feishu poll message with predefined options. Users type `/poll "Question?" opt1, opt2, opt3`.

### Step 1 — New adapter: build a poll message draft

```typescript
// src/adapters/build-poll-message-draft.ts
import type { BuildDraftOptions } from './build-reply-message-draft.js';

export interface PollDraft {
  question: string;
  options: string[];
}

/**
 * Builds a Feishu poll card payload.
 * Feishu supports interactive cards with `poll` element.
 */
export function buildPollCardDraft(
  question: string,
  options: string[],
  _opts?: BuildDraftOptions
): object {
  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: question },
        color: 'blue',
      },
      elements: [
        ...options.map((opt, i) => ({
          tag: 'action',
          actions: [
            {
              tag: 'select',
              name: `option_${i}`,
              options: options.map((o) => ({ text: { tag: 'plain_text', content: o }, value: o })),
            },
          ],
        })),
        { tag: 'note', elements: [{ tag: 'plain_text', content: 'Select an option above.' }] },
      ],
    },
  };
}
```

### Step 2 — Extend the slash command parser

In `src/core/parse-slash-command.ts`, add:

```typescript
// In your switch/if that handles command names:
if (command === 'poll') {
  const argsText = remainder.trim();
  const parts = argsText.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) {
    return { type: 'unknown', reason: 'poll needs a question and at least 2 options' };
  }
  const question = parts[0];
  const options = parts.slice(1);
  return { type: 'poll', question, options };
}
```

### Step 3 — Handle the `poll` result in your workflow

```typescript
// In run-message-workflow.ts, add a case:
if (result.type === 'poll') {
  const draft = buildPollCardDraft(result.question, result.options);
  // Send it:
  await maybeSendReplyMessage(draft, token, tenantPath);
  return { ok: true, replyText: `📊 Poll "${result.question}" created.` };
}
```

---

## Recipe 2 — Keyword Auto-Reply (FAQ Bot)

**What it does:** Automatically replies when users send messages containing specific keywords, without needing a slash command prefix.

### Step 1 — Define your FAQ map

```typescript
// src/core/faq.ts
export const FAQ_MAP: Array<{ keywords: string[]; reply: string; lang?: string }> = [
  { keywords: ['hello', 'hi', '你好'], reply: '👋 Hi there! How can I help you today?' },
  { keywords: ['manual', 'help', '帮助'], reply: 'Run `/doc` to create a doc, or `/table` to draft a record.' },
  { keywords: ['contact', '联系'], reply: 'Reach us at team@example.com' },
];
```

### Step 2 — Check keywords in your workflow

In `run-message-workflow.ts`, before checking slash commands:

```typescript
export async function runMessageWorkflow(
  event: FeishuMessageEvent,
  token: string,
  tenantPath: string,
  options: WorkflowOptions = {}
): Promise<WorkflowResult> {
  const rawText = event.message.content?.trim() ?? '';

  // Keyword auto-reply (skip if message is a slash command)
  if (!rawText.startsWith('/')) {
    const lower = rawText.toLowerCase();
    for (const faq of FAQ_MAP) {
      if (faq.keywords.some((kw) => lower.includes(kw))) {
        await maybeSendReplyMessage(
          buildReplyMessageDraft(faq.reply),
          token,
          tenantPath
        );
        return { ok: true, replyText: '[auto-replied]' };
      }
    }
  }

  // ... existing slash command handling below
```

---

## Recipe 3 — Daily Scheduled Summary Bot

**What it does:** Sends a daily summary message to a channel at a fixed time using an external scheduler (e.g. cron job on your VPS).

### Step 1 — Create a scheduled sender module

```typescript
// src/jobs/daily-summary.ts
import { getTenantAccessToken } from '../adapters/get-tenant-access-token.js';
import { maybeSendReplyMessage } from '../adapters/maybe-send-reply-message.js';
import { buildReplyMessageDraft } from '../adapters/build-reply-message-draft.js';

export async function sendDailySummary(channelId: string): Promise<void> {
  const token = await getTenantAccessToken();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const lines = [
    `📅 **Daily Summary — ${today}**`,
    '',
    '• Tasks due today: 3',
    '• Docs created: 1',
    '• Open issues: 7',
    '',
    'Have a great day!',
  ];

  const draft = buildReplyMessageDraft(lines.join('\n'));
  // Feishu channel message uses im/v1/messages API with receive_id_type='chat_id'
  const payload = {
    receive_id: channelId,
    msg_type: 'text',
    content: JSON.stringify({ text: draft.content }),
  };

  const resp = await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) throw new Error(`Failed to send summary: ${resp.status}`);
}
```

### Step 2 — Trigger from a cron script

```bash
# Run at 9am every weekday via cron:
# 0 9 * * 1-5 cd /opt/feishu-flow-kit && node --loader ts-node/esm src/jobs/daily-summary.ts >> /var/log/feishu-summary.log 2>&1
```

Or with GitHub Actions scheduled workflow (`.github/workflows/scheduled-summary.yml`):

```yaml
name: Daily Summary Trigger
on:
  schedule:
    - cron: '0 9 * * 1-5'   # 9 AM UTC = 5 PM CST, Mon–Fri
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Call summary webhook
        run: curl -X POST https://your-vps.example.com/api/summary
```

---

## Recipe 4 — Auto-create Doc from Template

**What it does:** When a user sends `/newdoc Project Name`, creates a Feishu doc pre-populated with a structured template (heading, sections, placeholder tables).

### Step 1 — Template content builder

```typescript
// src/workflows/create-doc-from-template.ts
import { buildDocCreateDraft } from '../adapters/build-doc-create-draft.js';
import { buildDocBlockChildrenDraft } from '../adapters/build-doc-block-children-draft.js';
import { maybeCreateDoc } from '../adapters/maybe-create-doc.js';
import { maybeSendReplyMessage } from '../adapters/maybe-send-reply-message.js';
import { buildReplyMessageDraft } from '../adapters/build-reply-message-draft.js';

export interface DocTemplateOptions {
  title: string;
  owner?: string;
  goal?: string;
  timeline?: string;
}

export async function createProjectDoc(
  opts: DocTemplateOptions,
  token: string,
  tenantPath: string
): Promise<{ docUrl?: string; replyText: string }> {
  const title = opts.title || 'Untitled Project';

  const docDraft = buildDocCreateDraft(title);

  // Build starter block children: heading → goal → timeline → team → notes
  const blocks = buildDocBlockChildrenDraft([
    { type: 'heading1', content: title },
    { type: 'heading2', content: '🎯 Goal' },
    { type: 'paragraph', content: opts.goal || '_Add goal here_' },
    { type: 'heading2', content: '📅 Timeline' },
    { type: 'paragraph', content: opts.timeline || '_Add timeline here_' },
    { type: 'heading2', content: '👥 Team' },
    { type: 'paragraph', content: opts.owner ? `Owner: ${opts.owner}` : '_Add team members_' },
    { type: 'heading2', content: '📝 Notes' },
    { type: 'paragraph', content: '_Add notes here_' },
  ]);

  const docResult = await maybeCreateDoc(docDraft, token, tenantPath, {
    blocks,
  });

  if (!docResult.ok) {
    return { replyText: `❌ Failed to create doc: ${docResult.error}` };
  }

  return {
    docUrl: docResult.docUrl,
    replyText: `✅ Doc created: ${docResult.docUrl}`,
  };
}
```

### Step 2 — Wire it to `/newdoc` in `run-message-workflow.ts`

```typescript
// Add a new command handler alongside /doc and /table:
// if (command === 'newdoc') {
//   const title = remainder.trim();
//   const result = await createProjectDoc({ title }, token, tenantPath);
//   await maybeSendReplyMessage(buildReplyMessageDraft(result.replyText), token, tenantPath);
//   return { ok: true, replyText: result.replyText, hasDocCreateDraft: true };
// }
```

---

## Recipe 5 — Cross-Channel Relay Bot

**What it does:** Watches messages in one chat and relays them (optionally filtered) to another chat.

### How it works

Relay bots require two Feishu bots or a single bot with access to both chats. Configure two `FEISHU_*_CHAT_ID` environment variables:

```bash
FEISHU_SOURCE_CHAT_ID=oc_xxxxx
FEISHU_TARGET_CHAT_ID=oc_yyyyy
```

### Implementation

```typescript
// src/jobs/relay-messages.ts
import { getTenantAccessToken } from '../adapters/get-tenant-access-token.js';
import { maybeSendReplyMessage } from '../adapters/maybe-send-reply-message.js';
import { buildReplyMessageDraft } from '../adapters/build-reply-message-draft.js';

const SOURCE_CHAT = process.env.FEISHU_SOURCE_CHAT_ID!;
const TARGET_CHAT = process.env.FEISHU_TARGET_CHAT_ID!;

interface FeishuMessage {
  message_id: string;
  chat_id: string;
  content: string;  // JSON string: { "text": "..." }
  create_time: string;
}

export async function relayNewMessages(): Promise<number> {
  const token = await getTenantAccessToken();

  // Fetch recent messages from source chat
  const resp = await fetch(
    `https://open.feishu.cn/open-apis/im/v1/messages?container_id_type=chat&container_id=${SOURCE_CHAT}&sort_type=ByCreateTimeDesc&page_size=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!resp.ok) throw new Error(`Failed to fetch messages: ${resp.status}`);
  const data = await resp.json() as { data: { items: FeishuMessage[] } };

  let relayed = 0;
  for (const msg of data.data.items) {
    // Skip non-text messages
    let text = '';
    try {
      const content = JSON.parse(msg.content);
      text = content.text ?? '';
    } catch {
      continue;
    }

    if (!text.trim()) continue;

    // Relay only messages containing specific keywords
    if (text.includes('[relay]')) {
      const relayText = text.replace('[relay]', '').trim();
      const draft = buildReplyMessageDraft(`🔄 Relayed: ${relayText}`);
      await maybeSendReplyMessage(draft, token, TARGET_CHAT);
      relayed++;
    }
  }

  return relayed;
}
```

---

## Recipe 6 — `/translate` with External API

**What it does:** Translates text using any translation API (Google, DeepL, etc.) directly in Feishu chat.

> ⚠️ Requires `FEISHU_ENABLE_OUTBOUND_REPLY=true` and a translation API key.

```typescript
// src/adapters/translate-text.ts
import { withRetry } from '../core/retry.js';

interface TranslateResult {
  translatedText: string;
  detectedLanguage?: string;
}

export async function translateText(
  text: string,
  targetLang: string,
  apiKey: string
): Promise<TranslateResult> {
  // Example using Google Translate API (free tier: https://cloud.google.com/translate)
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const resp = await withRetry(() =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        target: targetLang,
        source: 'auto',
        format: 'text',
      }),
    })
  );

  if (!resp.ok) throw new Error(`Translation API error: ${resp.status}`);
  const data = await resp.json() as { data: { translations: Array<{ translatedText: string; detectedSourceLanguage: string }> } };

  return {
    translatedText: data.data.translations[0].translatedText,
    detectedLanguage: data.data.translations[0].detectedSourceLanguage,
  };
}
```

Wire into your workflow:

```typescript
// In run-message-workflow.ts:
if (command === 'translate') {
  const [text, targetLang = 'en'] = remainder.split('|').map(s => s.trim());
  const result = await translateText(text, targetLang, process.env.TRANSLATION_API_KEY!);
  const reply = `🌐 ${result.detectedLanguage ?? 'auto'} → ${targetLang}:\n${result.translatedText}`;
  await maybeSendReplyMessage(buildReplyMessageDraft(reply), token, tenantPath);
  return { ok: true, replyText: reply };
}
```

Usage: `/translate Hello world|zh` → replies with Chinese translation.

---

## Recipe 7 — Meeting Notes Auto-Summarize

**What it does:** Users paste meeting notes and get a structured summary with action items extracted.

```typescript
// src/adapters/summarize-notes.ts
export interface SummaryResult {
  actionItems: string[];
  decisions: string[];
  nextSteps: string[];
}

export function summarizeNotes(notes: string): SummaryResult {
  const lines = notes.split('\n').map(l => l.trim()).filter(Boolean);

  const actionItems: string[] = [];
  const decisions: string[] = [];
  const nextSteps: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('action:') || lower.startsWith('todo:') || lower.includes('[ ]') || lower.includes('TODO')) {
      actionItems.push(line.replace(/^(action:|todo:|\[.\]\s*)/i, '').trim());
    } else if (lower.startsWith('decision:') || lower.startsWith('decided:') || lower.includes('decided:')) {
      decisions.push(line.replace(/^(decision:|decided:)/i, '').trim());
    } else if (lower.startsWith('next:') || lower.startsWith('next step:')) {
      nextSteps.push(line.replace(/^(next:|next step:)/i, '').trim());
    }
  }

  return { actionItems, decisions, nextSteps };
}
```

```typescript
// In workflow handler:
if (command === 'summarize') {
  const notes = remainder;
  const summary = summarizeNotes(notes);
  const reply = [
    '📋 **Meeting Summary**',
    '',
    '**Action Items:**',
    ...summary.actionItems.map(a => `- [ ] ${a}`),
    '',
    '**Decisions:**',
    ...summary.decisions.map(d => `- ${d}`),
    '',
    '**Next Steps:**',
    ...summary.nextSteps.map(n => `- ${n}`),
  ].join('\n');

  await maybeSendReplyMessage(buildReplyMessageDraft(reply), token, tenantPath);
  return { ok: true, replyText: '[meeting summarized]' };
}
```

Usage: `/summarize` followed by pasting meeting notes.

---

## Adding a New Recipe

### The four steps

1. **Add a builder** in `src/adapters/` — creates the API request payload (draft pattern)
2. **Add a maybe-adapter** in `src/adapters/` — calls the builder, then the request adapter, with env-gate guard
3. **Add a handler** in `src/workflows/run-message-workflow.ts` — wires into the slash command switch
4. **Add tests** in `test/` — use `loadMockMessageEvent()` as fixture

See [developer-guide.md](./developer-guide.md) for full adapter pattern documentation.

---

## Environment Variables Reference

| Variable | Used by recipes |
|---|---|
| `FEISHU_APP_ID` | All |
| `FEISHU_APP_SECRET` | All |
| `FEISHU_ENABLE_OUTBOUND_REPLY` | Recipe 1, 2, 4, 5, 6, 7 |
| `FEISHU_ENABLE_DOC_CREATE` | Recipe 4 |
| `FEISHU_SOURCE_CHAT_ID` | Recipe 5 |
| `FEISHU_TARGET_CHAT_ID` | Recipe 5 |
| `TRANSLATION_API_KEY` | Recipe 6 |
| `NODE_ENV=production` | Enables structured JSON logging via Pino |
