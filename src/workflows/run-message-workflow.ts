import type { FeishuMessageEvent } from '../types/feishu-event.js';
import { parseSlashCommand } from '../core/parse-slash-command.js';
import {
  buildTableRecordDraft,
  type TableAttachmentFieldMode,
  type TableCommandDraftInput,
  type TableDoneFieldMode,
  type TableDueFieldMode,
  type TableEstimateFieldMode,
  type TableFieldNames,
  type TableLinkFieldMode,
  type TableListFieldMode,
  type TableOwnerFieldMode,
  type TableRecordDraft,
  type TableRecordFieldValue,
} from '../adapters/build-table-record-draft.js';
import { getStrings, type Strings } from '../i18n/index.js';

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
  lang?: string;
  bitableListFieldMode?: TableListFieldMode;
  bitableOwnerFieldMode?: TableOwnerFieldMode;
  bitableEstimateFieldMode?: TableEstimateFieldMode;
  bitableDueFieldMode?: TableDueFieldMode;
  bitableDoneFieldMode?: TableDoneFieldMode;
  bitableAttachmentFieldMode?: TableAttachmentFieldMode;
  bitableLinkFieldMode?: TableLinkFieldMode;
  bitableFieldNames?: Partial<TableFieldNames>;
}

function summarizeTodoRequest(argsText: string, s: Strings) {
  const clean = argsText.replace(/[.。]+$/g, '').trim();
  const task = clean || s.todoRequest('—');

  return [
    s.todoWorkflowDraft,
    `- ${s.todoRequest(clean || '—')}`,
    s.todoNextExtract,
    s.todoNextAssign,
    s.todoNextPush,
  ].join('\n');
}

function buildDocOutline(argsText: string, s: Strings) {
  const clean = argsText.replace(/[.。]+$/g, '').trim();
  const topic = clean || s.docTopic('Untitled note');

  return [
    s.docOutlineDraft(topic),
    '',
    s.docSummary,
    s.docTopic(topic),
    s.docGoal,
    '',
    s.docKeyPoints,
    s.docContext,
    s.docDecisions,
    s.docRisks,
    '',
    s.docNextActions,
    s.docFillMissing,
    s.docAssignOwner,
    s.docAddTimeline,
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
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function formatTableDraftReply(
  input: TableCommandDraftInput,
  fields: Record<string, TableRecordFieldValue>,
  s: Strings,
  listFieldMode: TableListFieldMode,
  ownerFieldMode: TableOwnerFieldMode,
  estimateFieldMode: TableEstimateFieldMode,
  dueFieldMode: TableDueFieldMode,
  doneFieldMode: TableDoneFieldMode,
  attachmentFieldMode: TableAttachmentFieldMode,
  linkFieldMode: TableLinkFieldMode,
) {
  const lines: string[] = [s.tableWorkflowDraft];

  lines.push(s.list(input.listName));
  lines.push(s.title(input.title));
  if (input.details) lines.push(s.details(input.details));
  if (input.owner) lines.push(s.owner(input.owner));
  if (input.ownerOpenId) lines.push(s.ownerOpenId(input.ownerOpenId));
  if (input.estimate) lines.push(s.estimate(input.estimate));
  if (input.due) lines.push(s.due(input.due));
  if (input.done) lines.push(s.done(input.done));
  if (input.attachmentToken) lines.push(s.attachmentToken(input.attachmentToken));
  if (input.linkRecordId) lines.push(s.linkRecordId(input.linkRecordId));
  if (listFieldMode === 'single_select') lines.push(s.listFieldMode('single_select'));
  if (listFieldMode === 'multi_select') lines.push(s.listFieldMode('multi_select'));
  if (ownerFieldMode === 'user') lines.push(s.ownerFieldMode('user'));
  if (estimateFieldMode === 'number') lines.push(s.estimateFieldMode('number'));
  if (dueFieldMode === 'date') lines.push(s.dueFieldMode('date'));
  if (dueFieldMode === 'datetime') lines.push(s.dueFieldMode('datetime'));
  if (doneFieldMode === 'checkbox') lines.push(s.doneFieldMode('checkbox'));
  if (attachmentFieldMode === 'attachment') lines.push(s.attachmentFieldMode('attachment'));
  if (linkFieldMode === 'linked_record') lines.push(s.linkFieldMode('linked_record'));

  lines.push('');
  lines.push(s.tableDraftFields);
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`- ${key}: ${stringifyTableFieldValue(value)}`);
  }

  lines.push('');
  lines.push(s.tableNextWire);

  return lines.join('\n');
}

function buildTableUsage(s: Strings) {
  return [
    s.tableWorkflowDraft,
    '',
    s.tableUsage,
    s.tableUsageAdd,
    s.tableUsageAddOpenId,
    s.tableUsageEstimate,
    s.tableUsageDue,
    s.tableUsageDone,
    s.tableUsageAttachment,
    s.tableUsageLink,
    s.tableUsageMultiSelect,
    '',
    s.tableExample,
    s.tableExample1,
    s.tableExample2,
    s.tableExample3,
    s.tableExample4,
    s.tableExample5,
    s.tableExample6,
  ].join('\n');
}

export function runMessageWorkflow(
  event: FeishuMessageEvent,
  options: WorkflowOptions = {},
): WorkflowResult {
  const s = getStrings(options.lang ?? event.language);
  const command = parseSlashCommand(event.message.text);

  if (!command) {
    return {
      ok: true,
      replyText: s.noSlashCommand,
      tags: ['noop'],
    };
  }

  if (command.name === 'todo') {
    return {
      ok: true,
      replyText: summarizeTodoRequest(command.argsText, s),
      tags: ['todo', 'demo'],
    };
  }

  if (command.name === 'doc') {
    const docMarkdown = buildDocOutline(command.argsText, s);
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
        replyText: buildTableUsage(s),
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
      fieldNames: options.bitableFieldNames,
    });

    return {
      ok: true,
      replyText: formatTableDraftReply(
        input,
        draft.body.fields,
        s,
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
    replyText: s.unimplemented(command.name),
    tags: ['unimplemented'],
  };
}
