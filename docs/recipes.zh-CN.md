# Feishu Flow Kit — 实战食谱

> 可直接复制到 `src/workflows/` 使用的自动化模式，为你的团队定制。

所有食谱均假设你已完成 [快速入门](./README.zh-CN.md#快速上手)，并理解 [适配器模式](./developer-guide.zh-CN.md#适配器模式-draft-builders--maybe-adapters--request-adapters)。

---

## 食谱 1 — `/poll` 快速投票

**功能：** 创建飞书投票消息。用户输入 `/poll "问题？" 选项1, 选项2, 选项3`。

### 第一步 — 新建适配器：构建投票消息草稿

```typescript
// src/adapters/build-poll-message-draft.ts
import type { BuildDraftOptions } from './build-reply-message-draft.js';

export interface PollDraft {
  question: string;
  options: string[];
}

/**
 * 构建飞书投票卡片。
 * 飞书支持带 poll 元素的交互卡片。
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
        { tag: 'note', elements: [{ tag: 'plain_text', content: '请在上方选择。' }] },
      ],
    },
  };
}
```

### 第二步 — 扩展斜杠命令解析器

在 `src/core/parse-slash-command.ts` 中添加：

```typescript
// 在命令处理 switch 中添加：
if (command === 'poll') {
  const argsText = remainder.trim();
  const parts = argsText.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) {
    return { type: 'unknown', reason: 'poll 需要一个问题和至少2个选项' };
  }
  const question = parts[0];
  const options = parts.slice(1);
  return { type: 'poll', question, options };
}
```

### 第三步 — 在 workflow 中处理 `poll` 结果

```typescript
// 在 run-message-workflow.ts 中添加分支：
if (result.type === 'poll') {
  const draft = buildPollCardDraft(result.question, result.options);
  await maybeSendReplyMessage(draft, token, tenantPath);
  return { ok: true, replyText: `📊 投票"${result.question}"已创建。` };
}
```

---

## 食谱 2 — 关键词自动回复（FAQ 机器人）

**功能：** 当用户发送包含特定关键词的消息时，无需斜杠命令前缀即可自动回复。

### 第一步 — 定义 FAQ 映射表

```typescript
// src/core/faq.ts
export const FAQ_MAP: Array<{ keywords: string[]; reply: string }> = [
  { keywords: ['hello', 'hi', '你好'], reply: '👋 你好！有什么可以帮你的吗？' },
  { keywords: ['帮助', 'help', '怎么用'], reply: '输入 `/doc` 创建文档，或输入 `/table` 起草多维表格记录。' },
  { keywords: ['联系', 'contact', '邮箱'], reply: '联系我们：team@example.com' },
];
```

### 第二步 — 在 workflow 中检查关键词

在 `run-message-workflow.ts` 中，斜杠命令检查之前：

```typescript
export async function runMessageWorkflow(
  event: FeishuMessageEvent,
  token: string,
  tenantPath: string,
  options: WorkflowOptions = {}
): Promise<WorkflowResult> {
  const rawText = event.message.content?.trim() ?? '';

  // 关键词自动回复（非斜杠命令消息才检查）
  if (!rawText.startsWith('/')) {
    const lower = rawText.toLowerCase();
    for (const faq of FAQ_MAP) {
      if (faq.keywords.some((kw) => lower.includes(kw))) {
        await maybeSendReplyMessage(
          buildReplyMessageDraft(faq.reply),
          token,
          tenantPath
        );
        return { ok: true, replyText: '[自动回复]' };
      }
    }
  }

  // ... 其余斜杠命令处理
```

---

## 食谱 3 — 每日定时摘要机器人

**功能：** 每天固定时间向指定频道发送摘要消息（通过 VPS cron 或 GitHub Actions scheduled workflow 触发）。

### 第一步 — 创建定时发送模块

```typescript
// src/jobs/daily-summary.ts
import { getTenantAccessToken } from '../adapters/get-tenant-access-token.js';
import { loadConfig } from '../config/load-config.js';

export async function sendDailySummary(channelId: string): Promise<void> {
  const config = loadConfig();
  const token = await getTenantAccessToken({
    appId: config.appId,
    appSecret: config.appSecret,
  });

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const lines = [
    `📅 **每日摘要 — ${today}**`,
    '',
    '• 今日待办：3 项',
    '• 新建文档：1 个',
    '• 开放问题：7 个',
    '',
    '祝你有美好的一天！',
  ];

  // Feishu channel message uses im/v1/messages API with receive_id_type='chat_id'
  const payload = {
    receive_id_type: 'chat_id',
    msg_type: 'text',
    content: JSON.stringify({ text: lines.join('\n') }),
  };

  const resp = await fetch(
    'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!resp.ok) throw new Error(`发送摘要失败: ${resp.status}`);
}
```

### 第二步 — 用 cron 触发

```bash
# 每个工作日 9:00 执行（北京时间 17:00）：
# 0 9 * * 1-5 cd /opt/feishu-flow-kit && node --import tsx src/jobs/daily-summary.ts >> /var/log/feishu-summary.log 2>&1
```

---

## 食谱 4 — 从模板自动创建文档

**功能：** 用户发送 `/newdoc 项目名称`，自动创建填充了结构化模板（标题、章节、占位表格）的飞书文档。

### 第一步 — 模板内容构建器

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
  const title = opts.title || '未命名项目';

  const docDraft = buildDocCreateDraft(title);

  const blocks = buildDocBlockChildrenDraft([
    { type: 'heading1', content: title },
    { type: 'heading2', content: '🎯 目标' },
    { type: 'paragraph', content: opts.goal || '_请填写目标_' },
    { type: 'heading2', content: '📅 时间线' },
    { type: 'paragraph', content: opts.timeline || '_请填写时间线_' },
    { type: 'heading2', content: '👥 团队成员' },
    { type: 'paragraph', content: opts.owner ? `负责人：${opts.owner}` : '_请填写团队成员_' },
    { type: 'heading2', content: '📝 备注' },
    { type: 'paragraph', content: '_在此添加备注_' },
  ]);

  const docResult = await maybeCreateDoc(docDraft, token, tenantPath, { blocks });

  if (!docResult.ok) {
    return { replyText: `❌ 创建文档失败：${docResult.error}` };
  }

  return {
    docUrl: docResult.docUrl,
    replyText: `✅ 文档已创建：${docResult.docUrl}`,
  };
}
```

### 第二步 — 在 workflow 中接入 `/newdoc`

```typescript
// 在 run-message-workflow.ts 中添加命令处理：
// if (command === 'newdoc') {
//   const title = remainder.trim();
//   const result = await createProjectDoc({ title }, token, tenantPath);
//   await maybeSendReplyMessage(buildReplyMessageDraft(result.replyText), token, tenantPath);
//   return { ok: true, replyText: result.replyText, hasDocCreateDraft: true };
// }
```

---

## 食谱 5 — 跨频道转发机器人

**功能：** 监控一个频道的消息，按条件过滤后转发到另一个频道。

### 配置

在 `.env` 中设置源频道和目标频道 ID：

```bash
FEISHU_SOURCE_CHAT_ID=oc_xxxxx   # 监听来源
FEISHU_TARGET_CHAT_ID=oc_yyyyy   # 转发目标
```

### 实现

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
  content: string;   // JSON string: { "text": "..." }
  create_time: string;
}

export async function relayNewMessages(): Promise<number> {
  const token = await getTenantAccessToken();

  // 获取源频道最近消息
  const resp = await fetch(
    `https://open.feishu.cn/open-apis/im/v1/messages?container_id_type=chat&container_id=${SOURCE_CHAT}&sort_type=ByCreateTimeDesc&page_size=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!resp.ok) throw new Error(`获取消息失败: ${resp.status}`);
  const data = await resp.json() as { data: { items: FeishuMessage[] } };

  let relayed = 0;
  for (const msg of data.data.items) {
    let text = '';
    try {
      const content = JSON.parse(msg.content);
      text = content.text ?? '';
    } catch {
      continue;
    }

    if (!text.trim()) continue;

    // 仅转发包含 [relay] 标记的消息
    if (text.includes('[relay]')) {
      const relayText = text.replace('[relay]', '').trim();
      const draft = buildReplyMessageDraft(`🔄 转发：${relayText}`);
      await maybeSendReplyMessage(draft, token, TARGET_CHAT);
      relayed++;
    }
  }

  return relayed;
}
```

---

## 食谱 6 — `/translate` 调用外部翻译 API

**功能：** 在飞书聊天中直接翻译文本，支持任意翻译服务。

> ⚠️ 需要 `FEISHU_ENABLE_OUTBOUND_REPLY=true` 和翻译 API key（如 Google Translate、DeepL）。

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
  // 示例：Google Translate API
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

  if (!resp.ok) throw new Error(`翻译 API 错误: ${resp.status}`);
  const data = await resp.json() as {
    data: { translations: Array<{ translatedText: string; detectedSourceLanguage: string }> };
  };

  return {
    translatedText: data.data.translations[0].translatedText,
    detectedLanguage: data.data.translations[0].detectedSourceLanguage,
  };
}
```

接入 workflow：

```typescript
// 在 run-message-workflow.ts 中：
if (command === 'translate') {
  const [text, targetLang = 'en'] = remainder.split('|').map(s => s.trim());
  const result = await translateText(text, targetLang, process.env.TRANSLATION_API_KEY!);
  const reply = `🌐 ${result.detectedLanguage ?? '自动检测'} → ${targetLang}：\n${result.translatedText}`;
  await maybeSendReplyMessage(buildReplyMessageDraft(reply), token, tenantPath);
  return { ok: true, replyText: reply };
}
```

用法：`/translate Hello world|zh` → 回复中文翻译。

---

## 食谱 7 — 会议纪要自动提炼

**功能：** 用户粘贴会议纪要，提取结构化的行动项、决策和下一步。

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
    } else if (lower.startsWith('decision:') || lower.startsWith('decided:')) {
      decisions.push(line.replace(/^(decision:|decided:)/i, '').trim());
    } else if (lower.startsWith('next:') || lower.startsWith('next step:')) {
      nextSteps.push(line.replace(/^(next:|next step:)/i, '').trim());
    }
  }

  return { actionItems, decisions, nextSteps };
}
```

```typescript
// 在 workflow 中处理 /summarize：
if (command === 'summarize') {
  const notes = remainder;
  const summary = summarizeNotes(notes);
  const reply = [
    '📋 **会议摘要**',
    '',
    '**行动项：**',
    ...summary.actionItems.map(a => `- [ ] ${a}`),
    '',
    '**决策：**',
    ...summary.decisions.map(d => `- ${d}`),
    '',
    '**下一步：**',
    ...summary.nextSteps.map(n => `- ${n}`),
  ].join('\n');

  await maybeSendReplyMessage(buildReplyMessageDraft(reply), token, tenantPath);
  return { ok: true, replyText: '[会议摘要已生成]' };
}
```

---

## 添加新食谱的四个步骤

1. **在 `src/adapters/` 添加 builder** — 构建 API 请求体（draft 模式）
2. **在 `src/adapters/` 添加 maybe-adapter** — 调用 builder 和 request adapter，带 env 开关
3. **在 `src/workflows/run-message-workflow.ts` 添加处理器** — 接入斜杠命令 switch
4. **在 `test/` 添加测试** — 用 `loadMockMessageEvent()` 作为测试 fixture

详见 [developer-guide.md](./developer-guide.zh-CN.md) 适配器模式完整文档。

---

## 环境变量参考

| 变量 | 适用食谱 |
|---|---|
| `FEISHU_APP_ID` | 全部 |
| `FEISHU_APP_SECRET` | 全部 |
| `FEISHU_ENABLE_OUTBOUND_REPLY` | 食谱 1、2、4、5、6、7 |
| `FEISHU_ENABLE_DOC_CREATE` | 食谱 4 |
| `FEISHU_SOURCE_CHAT_ID` | 食谱 5 |
| `FEISHU_TARGET_CHAT_ID` | 食谱 5 |
| `TRANSLATION_API_KEY` | 食谱 6 |
| `NODE_ENV=production` | 生产模式，Pino JSON 结构化日志 |
