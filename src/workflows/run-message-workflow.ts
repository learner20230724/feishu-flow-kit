import type { FeishuMessageEvent } from '../types/feishu-event.js';
import { parseSlashCommand } from '../core/parse-slash-command.js';
import {
  buildTableRecordDraft,
  type TableAttachmentFieldMode,
  type TableLinkFieldMode,
  type TableCommandDraftInput,
  type TableDoneFieldMode,
  type TableDueFieldMode,
  type TableEstimateFieldMode,
  type TableListFieldMode,
  type TableOwnerFieldMode,
  type TableRecordDraft,
  type TableRecordFieldValue,
} from '../adapters/build-table-record-draft.js';

export interface WorkflowResult {
  ok: boolean;
  replyText: string;
  tags: string[];
  docTopic?: string;
  docMarkdown?: string;
  hasDocCreateDraft?: boolean;
  hasTableRecordDraft?: boolean;
  tableRecordTitle?: string;
  tableRecordDraft?: TableRecordDraft;
  tableRecordDraftFields?: Record<string, TableRecordFieldValue>;
}

export interface WorkflowOptions {
  bitableListFieldMode?: TableListFieldMode;
  bitableOwnerFieldMode?: TableOwnerFieldMode;
  bitableEstimateFieldMode?: TableEstimateFieldMode;
  bitableDueFieldMode?: TableDueFieldMode;
  bitableDoneFieldMode?: TableDoneFieldMode;
  bitableAttachmentFieldMode?: TableAttachmentFieldMode;
  bitableLinkFieldMode?: TableLinkFieldMode;
}

function summarizeTodoRequest(argsText: string) {
  const clean = argsText.replace(/[.。]+$/g, '').trim();
  const task = clean || 'No task details provided';

  return [
    'Todo workflow draft',
    `- request: ${task}`,
    '- next: extract concrete action items',
    '- next: assign owner and due time',
    '- next: push result into a Feishu doc or task system',
  ].join('\n');
}

function buildDocOutline(argsText: string) {
  const clean = argsText.replace(/[.。]+$/g, '').trim();
  const topic = clean || 'Untitled note';

  return [
    `Doc outline draft: ${topic}`,
    '',
    '# Summary',
    `- Topic: ${topic}`,
    '- Goal: capture the request in a format that is easy to paste into a Feishu doc',
    '',
    '# Key points',
    '- Context',
    '- Decisions',
    '- Risks',
    '',
    '# Next actions',
    '- [ ] Fill the missing details',
    '- [ ] Assign an owner',
    '- [ ] Add timeline or due date',
  ].join('\n');
}

function parseKeyValueOption(segment: string): { key: string; value: string } | null {
  const trimmed = segment.trim();
  const eq = trimmed.indexOf('=');
  if (eq === -1) return null;

  const key = trimmed.slice(0, eq).trim().toLowerCase();
  const value = trimmed.slice(eq + 1).trim();
  if (!key || !value) return null;

  return { key, value };
}

function parseTableDraftInput(argsText: string): TableCommandDraftInput | null {
  const normalized = argsText.trim();
  if (!normalized) return null;

  const parts = normalized.split(/\s+/g);
  if (parts.length < 2) return null;

  const action = parts[0]?.toLowerCase();
  if (action !== 'add') return null;

  const listName = parts[1] || '';
  if (!listName) return null;

  const rest = parts.slice(2).join(' ').trim();
  if (!rest) return null;

  const segments = rest.split(/\s*\/\s*/g).map((seg) => seg.trim()).filter(Boolean);
  const first = segments[0] || '';

  const options = segments.slice(1);
  let owner: string | undefined;
  let ownerOpenId: string | undefined;
  let estimate: string | undefined;
  let due: string | undefined;
  let done: string | undefined;
  let attachmentToken: string | undefined;
  let linkRecordId: string | undefined;

  for (const opt of options) {
    const kv = parseKeyValueOption(opt);
    if (!kv) continue;
    if (kv.key === 'owner') owner = kv.value;
    if (kv.key === 'owner_open_id') ownerOpenId = kv.value;
    if (kv.key === 'estimate') estimate = kv.value;
    if (kv.key === 'due') due = kv.value;
    if (kv.key === 'done') done = kv.value;
    if (kv.key === 'attachment_token') attachmentToken = kv.value;
    if (kv.key === 'link_record_id') linkRecordId = kv.value;
  }

  let title = first;
  let details: string | undefined;

  const colon = first.indexOf(':');
  if (colon !== -1) {
    const maybeDetails = first.slice(0, colon).trim();
    const maybeTitle = first.slice(colon + 1).trim();
    if (maybeTitle) {
      title = maybeTitle;
      if (maybeDetails) details = maybeDetails;
    }
  }

  const cleanTitle = title.replace(/[.。]+$/g, '').trim();

  return {
    listName,
    title: cleanTitle || 'Untitled record',
    details,
    owner,
    ownerOpenId,
    estimate,
    due,
    done,
    attachmentToken,
    linkRecordId,
    sourceCommand: `/table ${argsText}`.trim(),
  };
}

function stringifyTableFieldValue(value: TableRecordFieldValue) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

function formatTableDraftReply(
  input: TableCommandDraftInput,
  fields: Record<string, TableRecordFieldValue>,
  listFieldMode: TableListFieldMode,
  ownerFieldMode: TableOwnerFieldMode,
  estimateFieldMode: TableEstimateFieldMode,
  dueFieldMode: TableDueFieldMode,
  doneFieldMode: TableDoneFieldMode,
  attachmentFieldMode: TableAttachmentFieldMode,
  linkFieldMode: TableLinkFieldMode,
) {
  const lines: string[] = ['Table workflow draft'];

  lines.push(`- list: ${input.listName}`);
  lines.push(`- title: ${input.title}`);
  if (input.details) lines.push(`- details: ${input.details}`);
  if (input.owner) lines.push(`- owner: ${input.owner}`);
  if (input.ownerOpenId) lines.push(`- owner_open_id: ${input.ownerOpenId}`);
  if (input.estimate) lines.push(`- estimate: ${input.estimate}`);
  if (input.due) lines.push(`- due: ${input.due}`);
  if (input.done) lines.push(`- done: ${input.done}`);
  if (input.attachmentToken) lines.push(`- attachment_token: ${input.attachmentToken}`);
  if (input.linkRecordId) lines.push(`- link_record_id: ${input.linkRecordId}`);
  if (listFieldMode === 'single_select') lines.push('- list field mode: single_select');
  if (listFieldMode === 'multi_select') lines.push('- list field mode: multi_select');
  if (ownerFieldMode === 'user') lines.push('- owner field mode: user');
  if (estimateFieldMode === 'number') lines.push('- estimate field mode: number');
  if (dueFieldMode === 'date') lines.push('- due field mode: date');
  if (dueFieldMode === 'datetime') lines.push('- due field mode: datetime');
  if (doneFieldMode === 'checkbox') lines.push('- done field mode: checkbox');
  if (attachmentFieldMode === 'attachment') lines.push('- attachment field mode: attachment');
  if (linkFieldMode === 'linked_record') lines.push('- link field mode: linked_record');

  lines.push('');
  lines.push('Draft fields:');
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`- ${key}: ${stringifyTableFieldValue(value)}`);
  }

  lines.push('');
  lines.push('Next: wire the draft into a real Bitable create-record call (opt-in).');

  return lines.join('\n');
}

export function runMessageWorkflow(
  event: FeishuMessageEvent,
  options: WorkflowOptions = {},
): WorkflowResult {
  const command = parseSlashCommand(event.message.text);

  if (!command) {
    return {
      ok: true,
      replyText: 'No slash command found. Event accepted for logging only.',
      tags: ['noop'],
    };
  }

  if (command.name === 'todo') {
    return {
      ok: true,
      replyText: summarizeTodoRequest(command.argsText),
      tags: ['todo', 'demo'],
    };
  }

  if (command.name === 'doc') {
    const docMarkdown = buildDocOutline(command.argsText);
    const cleanTopic = command.argsText.replace(/[.。]+$/g, '').trim() || 'Untitled note';

    return {
      ok: true,
      replyText: docMarkdown,
      tags: ['doc', 'demo'],
      docTopic: cleanTopic,
      docMarkdown,
      hasDocCreateDraft: true,
    };
  }

  if (command.name === 'table') {
    const input = parseTableDraftInput(command.argsText);

    if (!input) {
      return {
        ok: true,
        replyText: [
          'Table workflow draft',
          '',
          'Usage:',
          '- /table add <list> <title...> / owner=<name>',
          '- /table add <list> <title...> / owner_open_id=<open_id>',
          '- /table add <list> <title...> / estimate=<number-or-text>',
          '- /table add <list> <title...> / due=<YYYY-MM-DD-or-ISO8601>',
          '- /table add <list> <title...> / done=<true-or-false>',
          '- /table add <list> <title...> / attachment_token=<file_token-or-comma-separated-file_tokens>',
          '- /table add <list> <title...> / link_record_id=<record_id-or-comma-separated-record_ids>',
          '- in multi_select list mode, <list> can be comma-separated like backlog,urgent',
          '',
          'Example:',
          '- /table add backlog item: improve webhook errors / owner=alex / estimate=3',
          '- /table add backlog improve webhook errors / owner_open_id=ou_xxx',
          '- /table add sprint fix flaky webhook tests / due=2026-04-01',
          '- /table add sprint close flaky webhook tests / done=true',
          '- /table add sprint share demo pack / attachment_token=file_v2_demo123,file_v2_demo456',
          '- /table add sprint ship follow-up / link_record_id=recA123,recB456',
        ].join('\n'),
        tags: ['table', 'demo', 'usage'],
      };
    }

    const listFieldMode = options.bitableListFieldMode ?? 'text';
    const ownerFieldMode = options.bitableOwnerFieldMode ?? 'text';
    const estimateFieldMode = options.bitableEstimateFieldMode ?? 'text';
    const dueFieldMode = options.bitableDueFieldMode ?? 'text';
    const doneFieldMode = options.bitableDoneFieldMode ?? 'text';
    const attachmentFieldMode = options.bitableAttachmentFieldMode ?? 'text';
    const linkFieldMode = options.bitableLinkFieldMode ?? 'text';
    const draft = buildTableRecordDraft(input, {
      listFieldMode,
      ownerFieldMode,
      estimateFieldMode,
      dueFieldMode,
      doneFieldMode,
      attachmentFieldMode,
      linkFieldMode,
    });

    return {
      ok: true,
      replyText: formatTableDraftReply(
        input,
        draft.body.fields,
        listFieldMode,
        ownerFieldMode,
        estimateFieldMode,
        dueFieldMode,
        doneFieldMode,
        attachmentFieldMode,
        linkFieldMode,
      ),
      tags: ['table', 'demo'],
      hasTableRecordDraft: true,
      tableRecordTitle: input.title,
      tableRecordDraft: draft,
      tableRecordDraftFields: draft.body.fields,
    };
  }

  return {
    ok: true,
    replyText: `Command /${command.name} is not implemented yet.`,
    tags: ['unimplemented'],
  };
}
