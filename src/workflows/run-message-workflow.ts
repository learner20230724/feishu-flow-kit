import type { FeishuMessageEvent } from '../types/feishu-event.js';
import { parseSlashCommand } from '../core/parse-slash-command.js';
import {
  buildTableRecordDraft,
  type TableCommandDraftInput,
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
  tableRecordDraftFields?: Record<string, string>;
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
  // Supported minimal command:
  //   /table add <list> <title...> / owner=<name>
  // Title supports an optional "label: title" prefix (label will be treated as details).
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

  // Split by "/" into [titleAndDetails, option1, option2, ...]
  const segments = rest.split(/\s*\/\s*/g).map((seg) => seg.trim()).filter(Boolean);
  const first = segments[0] || '';

  const options = segments.slice(1);
  let owner: string | undefined;

  for (const opt of options) {
    const kv = parseKeyValueOption(opt);
    if (!kv) continue;
    if (kv.key === 'owner') owner = kv.value;
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
    sourceCommand: `/table ${argsText}`.trim(),
  };
}

function formatTableDraftReply(input: TableCommandDraftInput, fields: Record<string, string>) {
  const lines: string[] = ['Table workflow draft'];

  lines.push(`- list: ${input.listName}`);
  lines.push(`- title: ${input.title}`);
  if (input.details) lines.push(`- details: ${input.details}`);
  if (input.owner) lines.push(`- owner: ${input.owner}`);

  lines.push('');
  lines.push('Draft fields (Bitable text fields):');
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`- ${key}: ${value}`);
  }

  lines.push('');
  lines.push('Next: wire the draft into a real Bitable create-record call (opt-in).');

  return lines.join('\n');
}

export function runMessageWorkflow(event: FeishuMessageEvent): WorkflowResult {
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
          '',
          'Example:',
          '- /table add backlog item: improve webhook errors / owner=alex',
        ].join('\n'),
        tags: ['table', 'demo', 'usage'],
      };
    }

    const draft = buildTableRecordDraft(input);

    return {
      ok: true,
      replyText: formatTableDraftReply(input, draft.body.fields),
      tags: ['table', 'demo'],
      hasTableRecordDraft: true,
      tableRecordTitle: input.title,
      tableRecordDraftFields: draft.body.fields,
    };
  }

  return {
    ok: true,
    replyText: `Command /${command.name} is not implemented yet.`,
    tags: ['unimplemented'],
  };
}
