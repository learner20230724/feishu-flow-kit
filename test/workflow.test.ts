import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDocCreateDraft } from '../src/adapters/build-doc-create-draft.ts';
import { buildTableRecordDraft } from '../src/adapters/build-table-record-draft.ts';
import { loadConfig } from '../src/config/load-config.ts';
import { parseSlashCommand } from '../src/core/parse-slash-command.ts';
import { runMessageWorkflow } from '../src/workflows/run-message-workflow.ts';
import type { FeishuMessageEvent } from '../src/types/feishu-event.ts';

function makeEvent(text: string): FeishuMessageEvent {
  return {
    type: 'message.received',
    timestamp: '2026-03-30T05:20:00Z',
    tenantKey: 'tenant_demo',
    message: {
      messageId: 'msg_demo',
      chatId: 'chat_1',
      chatType: 'group',
      senderId: 'user_1',
      text,
    },
  };
}

test('parseSlashCommand returns null for plain text', () => {
  assert.equal(parseSlashCommand('hello there'), null);
});

test('parseSlashCommand parses command name and args', () => {
  assert.deepEqual(parseSlashCommand('/todo ship webhook adapter'), {
    name: 'todo',
    argsText: 'ship webhook adapter',
  });
});

test('loadConfig accepts FEISHU_MOCK_EVENT_PATH override', () => {
  const config = loadConfig({
    FEISHU_MOCK_EVENT_PATH: 'examples/mock-doc-message-event.json',
  } as NodeJS.ProcessEnv);

  assert.equal(config.mockEventPath, 'examples/mock-doc-message-event.json');
});

test('loadConfig parses table field modes', () => {
  const config = loadConfig({
    FEISHU_BITABLE_LIST_FIELD_MODE: 'multi_select',
    FEISHU_BITABLE_OWNER_FIELD_MODE: 'user',
    FEISHU_BITABLE_ESTIMATE_FIELD_MODE: 'number',
    FEISHU_BITABLE_DUE_FIELD_MODE: 'datetime',
    FEISHU_BITABLE_DONE_FIELD_MODE: 'checkbox',
    FEISHU_BITABLE_ATTACHMENT_FIELD_MODE: 'attachment',
    FEISHU_BITABLE_LINK_FIELD_MODE: 'linked_record',
  } as NodeJS.ProcessEnv);

  assert.equal(config.bitableListFieldMode, 'multi_select');
  assert.equal(config.bitableOwnerFieldMode, 'user');
  assert.equal(config.bitableEstimateFieldMode, 'number');
  assert.equal(config.bitableDueFieldMode, 'datetime');
  assert.equal(config.bitableDoneFieldMode, 'checkbox');
  assert.equal(config.bitableAttachmentFieldMode, 'attachment');
  assert.equal(config.bitableLinkFieldMode, 'linked_record');
});

test('loadConfig parses table field-name overrides', () => {
  const config = loadConfig({
    FEISHU_BITABLE_TITLE_FIELD_NAME: 'Task',
    FEISHU_BITABLE_LIST_FIELD_NAME: 'Stage',
    FEISHU_BITABLE_SOURCE_COMMAND_FIELD_NAME: 'ChatCommand',
  } as NodeJS.ProcessEnv);

  assert.equal(config.bitableTitleFieldName, 'Task');
  assert.equal(config.bitableListFieldName, 'Stage');
  assert.equal(config.bitableSourceCommandFieldName, 'ChatCommand');
  assert.equal(config.bitableOwnerFieldName, 'Owner');
});

test('runMessageWorkflow returns noop for non-command messages', () => {
  const result = runMessageWorkflow(makeEvent('just logging'));
  assert.equal(result.ok, true);
  assert.equal(result.replyText, 'No slash command found. Event accepted for logging only.');
  assert.deepEqual(result.tags, ['noop']);
});

test('runMessageWorkflow returns todo draft for /todo', () => {
  const result = runMessageWorkflow(makeEvent('/todo ship webhook adapter'));
  assert.equal(result.ok, true);
  assert.match(result.replyText, /Todo workflow draft/);
  assert.match(result.replyText, /ship webhook adapter/);
  assert.deepEqual(result.tags, ['todo', 'demo']);
});

test('runMessageWorkflow returns doc outline draft for /doc', () => {
  const result = runMessageWorkflow(makeEvent('/doc weekly launch review'));
  assert.equal(result.ok, true);
  assert.match(result.replyText, /Doc outline draft: weekly launch review/);
  assert.equal(result.docTopic, 'weekly launch review');
  assert.equal(result.docMarkdown, result.replyText);
  assert.equal(result.hasDocCreateDraft, true);
  assert.deepEqual(result.tags, ['doc', 'demo']);
});

test('runMessageWorkflow returns table draft for /table add', () => {
  const result = runMessageWorkflow(
    makeEvent('/table add backlog item: improve webhook errors / owner=alex / estimate=3'),
  );

  assert.equal(result.ok, true);
  assert.match(result.replyText, /Table workflow draft/);
  assert.match(result.replyText, /list: backlog/);
  assert.equal(result.hasTableRecordDraft, true);
  assert.deepEqual(result.tableRecordDraftFields, {
    Title: 'improve webhook errors',
    List: 'backlog',
    SourceCommand: '/table add backlog item: improve webhook errors / owner=alex / estimate=3',
    Details: 'item',
    Owner: 'alex',
    Estimate: '3',
  });
});

test('runMessageWorkflow can emit richer /table field payloads', () => {
  const result = runMessageWorkflow(
    makeEvent('/table add sprint,urgent flaky webhook tests / owner_open_id=ou_demo / estimate=5 / due=2026-04-01T09:30:00Z / done=true / attachment_token=file_v2_demo123,file_v2_demo456 / link_record_id=recA123,recB456'),
    {
      bitableListFieldMode: 'multi_select',
      bitableOwnerFieldMode: 'user',
      bitableEstimateFieldMode: 'number',
      bitableDueFieldMode: 'datetime',
      bitableDoneFieldMode: 'checkbox',
      bitableAttachmentFieldMode: 'attachment',
      bitableLinkFieldMode: 'linked_record',
    },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.tableRecordDraftFields, {
    Title: 'flaky webhook tests',
    List: [{ name: 'sprint' }, { name: 'urgent' }],
    SourceCommand:
      '/table add sprint,urgent flaky webhook tests / owner_open_id=ou_demo / estimate=5 / due=2026-04-01T09:30:00Z / done=true / attachment_token=file_v2_demo123,file_v2_demo456 / link_record_id=recA123,recB456',
    Owner: [{ id: 'ou_demo' }],
    Estimate: 5,
    Due: 1775035800000,
    Done: true,
    Attachment: [{ file_token: 'file_v2_demo123' }, { file_token: 'file_v2_demo456' }],
    LinkedRecords: { link_record_ids: ['recA123', 'recB456'] },
  });
});

test('runMessageWorkflow can remap /table field names', () => {
  const result = runMessageWorkflow(
    makeEvent('/table add backlog item: improve webhook errors / owner=alex / due=2026-04-01'),
    {
      bitableDueFieldMode: 'date',
      bitableFieldNames: {
        title: 'Task',
        list: 'Stage',
        details: 'Context',
        owner: 'Assignee',
        due: 'TargetDate',
        sourceCommand: 'ChatCommand',
      },
    },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.tableRecordDraftFields, {
    Task: 'improve webhook errors',
    Stage: 'backlog',
    ChatCommand: '/table add backlog item: improve webhook errors / owner=alex / due=2026-04-01',
    Context: 'item',
    Assignee: 'alex',
    TargetDate: 1775001600000,
  });
});

test('buildTableRecordDraft uses the expected bitable create-record endpoint', () => {
  const draft = buildTableRecordDraft({
    listName: 'backlog',
    title: 'improve webhook errors',
    details: 'item',
    owner: 'alex',
    estimate: '3',
    sourceCommand: '/table add backlog item: improve webhook errors / owner=alex / estimate=3',
  });

  assert.equal(draft.endpoint, '/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records');
  assert.equal(draft.method, 'POST');
  assert.equal(draft.body.fields.Title, 'improve webhook errors');
  assert.equal(draft.notes.length, 2);
});

test('buildTableRecordDraft can emit field-name overrides and richer notes', () => {
  const draft = buildTableRecordDraft(
    {
      listName: 'backlog, urgent',
      title: 'improve webhook errors',
      ownerOpenId: 'ou_alex',
      sourceCommand: '/table add backlog,urgent improve webhook errors / owner_open_id=ou_alex',
    },
    {
      listFieldMode: 'multi_select',
      ownerFieldMode: 'user',
      fieldNames: {
        title: 'Task',
        list: 'Stage',
        owner: 'Assignee',
        sourceCommand: 'ChatCommand',
      },
    },
  );

  assert.deepEqual(draft.body.fields, {
    Task: 'improve webhook errors',
    Stage: [{ name: 'backlog' }, { name: 'urgent' }],
    ChatCommand: '/table add backlog,urgent improve webhook errors / owner_open_id=ou_alex',
    Assignee: [{ id: 'ou_alex' }],
  });
  assert.match(draft.notes[1] ?? '', /Task/);
  assert.match(draft.notes[2] ?? '', /title→Task/);
});

test('buildDocCreateDraft turns workflow doc output into Feishu doc draft metadata', () => {
  const draft = buildDocCreateDraft(
    'weekly launch review',
    'Doc outline draft: weekly launch review\n\n# Summary\n- Topic: weekly launch review',
  );

  assert.equal(draft.endpoint, '/open-apis/docx/v1/documents');
  assert.equal(draft.method, 'POST');
  assert.equal(draft.body.title, 'weekly launch review');
  assert.match(draft.initialContentMarkdown, /# Summary/);
  assert.equal(draft.notes.length, 2);
});
