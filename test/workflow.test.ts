import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDocCreateDraft } from '../src/adapters/build-doc-create-draft.ts';
import { buildTableRecordDraft } from '../src/adapters/build-table-record-draft.ts';
import { loadConfig } from '../src/config/load-config.ts';
import { parseSlashCommand } from '../src/core/parse-slash-command.ts';
import { runMessageWorkflow } from '../src/workflows/run-message-workflow.ts';
import type { FeishuMessageEvent } from '../src/types/feishu-event.ts';

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

test('loadConfig parses FEISHU_BITABLE_LIST_FIELD_MODE', () => {
  const config = loadConfig({
    FEISHU_BITABLE_LIST_FIELD_MODE: 'single_select',
  } as NodeJS.ProcessEnv);

  assert.equal(config.bitableListFieldMode, 'single_select');
});

test('loadConfig parses FEISHU_BITABLE_LIST_FIELD_MODE=multi_select', () => {
  const config = loadConfig({
    FEISHU_BITABLE_LIST_FIELD_MODE: 'multi_select',
  } as NodeJS.ProcessEnv);

  assert.equal(config.bitableListFieldMode, 'multi_select');
});

test('loadConfig parses FEISHU_BITABLE_OWNER_FIELD_MODE', () => {
  const config = loadConfig({
    FEISHU_BITABLE_OWNER_FIELD_MODE: 'user',
  } as NodeJS.ProcessEnv);

  assert.equal(config.bitableOwnerFieldMode, 'user');
});

test('loadConfig parses FEISHU_BITABLE_ESTIMATE_FIELD_MODE', () => {
  const config = loadConfig({
    FEISHU_BITABLE_ESTIMATE_FIELD_MODE: 'number',
  } as NodeJS.ProcessEnv);

  assert.equal(config.bitableEstimateFieldMode, 'number');
});

test('loadConfig parses FEISHU_BITABLE_DUE_FIELD_MODE', () => {
  const config = loadConfig({
    FEISHU_BITABLE_DUE_FIELD_MODE: 'datetime',
  } as NodeJS.ProcessEnv);

  assert.equal(config.bitableDueFieldMode, 'datetime');
});

test('loadConfig parses FEISHU_BITABLE_DONE_FIELD_MODE', () => {
  const config = loadConfig({
    FEISHU_BITABLE_DONE_FIELD_MODE: 'checkbox',
  } as NodeJS.ProcessEnv);

  assert.equal(config.bitableDoneFieldMode, 'checkbox');
});

test('runMessageWorkflow returns noop for non-command messages', () => {
  const event: FeishuMessageEvent = {
    type: 'message.received',
    timestamp: '2026-03-29T01:00:00Z',
    tenantKey: 'tenant_demo',
    message: {
      messageId: 'msg_1',
      chatId: 'chat_1',
      chatType: 'group',
      senderId: 'user_1',
      text: 'just logging',
    },
  };

  const result = runMessageWorkflow(event);
  assert.equal(result.ok, true);
  assert.equal(result.replyText, 'No slash command found. Event accepted for logging only.');
  assert.deepEqual(result.tags, ['noop']);
});

test('runMessageWorkflow returns todo draft for /todo', () => {
  const event: FeishuMessageEvent = {
    type: 'message.received',
    timestamp: '2026-03-29T01:00:00Z',
    tenantKey: 'tenant_demo',
    message: {
      messageId: 'msg_2',
      chatId: 'chat_1',
      chatType: 'group',
      senderId: 'user_1',
      text: '/todo ship webhook adapter',
    },
  };

  const result = runMessageWorkflow(event);
  assert.equal(result.ok, true);
  assert.match(result.replyText, /Todo workflow draft/);
  assert.match(result.replyText, /ship webhook adapter/);
  assert.deepEqual(result.tags, ['todo', 'demo']);
});

test('runMessageWorkflow returns doc outline draft for /doc', () => {
  const event: FeishuMessageEvent = {
    type: 'message.received',
    timestamp: '2026-03-29T01:00:00Z',
    tenantKey: 'tenant_demo',
    message: {
      messageId: 'msg_3',
      chatId: 'chat_1',
      chatType: 'group',
      senderId: 'user_1',
      text: '/doc weekly launch review',
    },
  };

  const result = runMessageWorkflow(event);
  assert.equal(result.ok, true);
  assert.match(result.replyText, /Doc outline draft: weekly launch review/);
  assert.match(result.replyText, /# Summary/);
  assert.match(result.replyText, /# Next actions/);
  assert.equal(result.docTopic, 'weekly launch review');
  assert.equal(result.docMarkdown, result.replyText);
  assert.equal(result.hasDocCreateDraft, true);
  assert.deepEqual(result.tags, ['doc', 'demo']);
});

test('runMessageWorkflow returns table draft for /table add', () => {
  const event: FeishuMessageEvent = {
    type: 'message.received',
    timestamp: '2026-03-30T05:20:00Z',
    tenantKey: 'tenant_demo',
    message: {
      messageId: 'msg_table_1',
      chatId: 'chat_1',
      chatType: 'group',
      senderId: 'user_1',
      text: '/table add backlog item: improve webhook errors / owner=alex / estimate=3',
    },
  };

  const result = runMessageWorkflow(event);
  assert.equal(result.ok, true);
  assert.match(result.replyText, /Table workflow draft/);
  assert.match(result.replyText, /list: backlog/);
  assert.match(result.replyText, /title: improve webhook errors/);
  assert.match(result.replyText, /details: item/);
  assert.match(result.replyText, /owner: alex/);
  assert.match(result.replyText, /estimate: 3/);
  assert.deepEqual(result.tags, ['table', 'demo']);
  assert.equal(result.hasTableRecordDraft, true);
  assert.equal(result.tableRecordTitle, 'improve webhook errors');
  assert.deepEqual(result.tableRecordDraftFields, {
    Title: 'improve webhook errors',
    List: 'backlog',
    SourceCommand: '/table add backlog item: improve webhook errors / owner=alex / estimate=3',
    Details: 'item',
    Owner: 'alex',
    Estimate: '3',
  });
});

test('runMessageWorkflow can emit a single-select List field for /table add', () => {
  const event: FeishuMessageEvent = {
    type: 'message.received',
    timestamp: '2026-03-30T05:20:00Z',
    tenantKey: 'tenant_demo',
    message: {
      messageId: 'msg_table_2',
      chatId: 'chat_1',
      chatType: 'group',
      senderId: 'user_1',
      text: '/table add backlog item: improve webhook errors / owner=alex',
    },
  };

  const result = runMessageWorkflow(event, {
    bitableListFieldMode: 'single_select',
  });

  assert.equal(result.ok, true);
  assert.match(result.replyText, /list field mode: single_select/);
  assert.match(result.replyText, /List: \{"name":"backlog"\}/);
  assert.deepEqual(result.tableRecordDraftFields, {
    Title: 'improve webhook errors',
    List: {
      name: 'backlog',
    },
    SourceCommand: '/table add backlog item: improve webhook errors / owner=alex',
    Details: 'item',
    Owner: 'alex',
  });
});

test('runMessageWorkflow can emit a multi-select List field payload for /table add', () => {
  const event: FeishuMessageEvent = {
    type: 'message.received',
    timestamp: '2026-03-30T05:20:00Z',
    tenantKey: 'tenant_demo',
    message: {
      messageId: 'msg_table_2b',
      chatId: 'chat_1',
      chatType: 'group',
      senderId: 'user_1',
      text: '/table add backlog,urgent item: improve webhook errors / owner=alex',
    },
  };

  const result = runMessageWorkflow(event, {
    bitableListFieldMode: 'multi_select',
  });

  assert.equal(result.ok, true);
  assert.match(result.replyText, /list field mode: multi_select/);
  assert.match(result.replyText, /List: \[\{"name":"backlog"\},\{"name":"urgent"\}\]/);
  assert.deepEqual(result.tableRecordDraftFields, {
    Title: 'improve webhook errors',
    List: [
      {
        name: 'backlog',
      },
      {
        name: 'urgent',
      },
    ],
    SourceCommand: '/table add backlog,urgent item: improve webhook errors / owner=alex',
    Details: 'item',
    Owner: 'alex',
  });
});

test('runMessageWorkflow can emit a user field payload for Owner', () => {
  const event: FeishuMessageEvent = {
    type: 'message.received',
    timestamp: '2026-03-30T05:20:00Z',
    tenantKey: 'tenant_demo',
    message: {
      messageId: 'msg_table_3',
      chatId: 'chat_1',
      chatType: 'group',
      senderId: 'user_1',
      text: '/table add backlog improve webhook errors / owner_open_id=ou_alex',
    },
  };

  const result = runMessageWorkflow(event, {
    bitableOwnerFieldMode: 'user',
  });

  assert.equal(result.ok, true);
  assert.match(result.replyText, /owner_open_id: ou_alex/);
  assert.match(result.replyText, /owner field mode: user/);
  assert.match(result.replyText, /Owner: \[\{"id":"ou_alex"\}\]/);
  assert.deepEqual(result.tableRecordDraftFields, {
    Title: 'improve webhook errors',
    List: 'backlog',
    SourceCommand: '/table add backlog improve webhook errors / owner_open_id=ou_alex',
    Owner: [
      {
        id: 'ou_alex',
      },
    ],
  });
});

test('runMessageWorkflow can emit Estimate as a numeric field payload', () => {
  const event: FeishuMessageEvent = {
    type: 'message.received',
    timestamp: '2026-03-30T05:20:00Z',
    tenantKey: 'tenant_demo',
    message: {
      messageId: 'msg_table_4',
      chatId: 'chat_1',
      chatType: 'group',
      senderId: 'user_1',
      text: '/table add backlog improve webhook errors / estimate=5',
    },
  };

  const result = runMessageWorkflow(event, {
    bitableEstimateFieldMode: 'number',
  });

  assert.equal(result.ok, true);
  assert.match(result.replyText, /estimate: 5/);
  assert.match(result.replyText, /estimate field mode: number/);
  assert.match(result.replyText, /Estimate: 5/);
  assert.deepEqual(result.tableRecordDraftFields, {
    Title: 'improve webhook errors',
    List: 'backlog',
    SourceCommand: '/table add backlog improve webhook errors / estimate=5',
    Estimate: 5,
  });
});

test('runMessageWorkflow can emit Due as a date field payload', () => {
  const event: FeishuMessageEvent = {
    type: 'message.received',
    timestamp: '2026-03-30T05:20:00Z',
    tenantKey: 'tenant_demo',
    message: {
      messageId: 'msg_table_5',
      chatId: 'chat_1',
      chatType: 'group',
      senderId: 'user_1',
      text: '/table add sprint fix flaky webhook tests / due=2026-04-01',
    },
  };

  const result = runMessageWorkflow(event, {
    bitableDueFieldMode: 'date',
  });

  assert.equal(result.ok, true);
  assert.match(result.replyText, /due: 2026-04-01/);
  assert.match(result.replyText, /due field mode: date/);
  assert.match(result.replyText, /Due: 1775001600000/);
  assert.deepEqual(result.tableRecordDraftFields, {
    Title: 'fix flaky webhook tests',
    List: 'sprint',
    SourceCommand: '/table add sprint fix flaky webhook tests / due=2026-04-01',
    Due: 1775001600000,
  });
});

test('runMessageWorkflow can emit Due as a datetime field payload', () => {
  const event: FeishuMessageEvent = {
    type: 'message.received',
    timestamp: '2026-03-30T05:20:00Z',
    tenantKey: 'tenant_demo',
    message: {
      messageId: 'msg_table_6',
      chatId: 'chat_1',
      chatType: 'group',
      senderId: 'user_1',
      text: '/table add sprint fix flaky webhook tests / due=2026-04-01T09:30:00Z',
    },
  };

  const result = runMessageWorkflow(event, {
    bitableDueFieldMode: 'datetime',
  });

  assert.equal(result.ok, true);
  assert.match(result.replyText, /due: 2026-04-01T09:30:00Z/);
  assert.match(result.replyText, /due field mode: datetime/);
  assert.match(result.replyText, /Due: 1775035800000/);
  assert.deepEqual(result.tableRecordDraftFields, {
    Title: 'fix flaky webhook tests',
    List: 'sprint',
    SourceCommand: '/table add sprint fix flaky webhook tests / due=2026-04-01T09:30:00Z',
    Due: 1775035800000,
  });
});

test('runMessageWorkflow can emit Done as a checkbox field payload', () => {
  const event: FeishuMessageEvent = {
    type: 'message.received',
    timestamp: '2026-03-30T05:20:00Z',
    tenantKey: 'tenant_demo',
    message: {
      messageId: 'msg_table_7',
      chatId: 'chat_1',
      chatType: 'group',
      senderId: 'user_1',
      text: '/table add sprint close flaky webhook tests / done=true',
    },
  };

  const result = runMessageWorkflow(event, {
    bitableDoneFieldMode: 'checkbox',
  });

  assert.equal(result.ok, true);
  assert.match(result.replyText, /done: true/);
  assert.match(result.replyText, /done field mode: checkbox/);
  assert.match(result.replyText, /Done: true/);
  assert.deepEqual(result.tableRecordDraftFields, {
    Title: 'close flaky webhook tests',
    List: 'sprint',
    SourceCommand: '/table add sprint close flaky webhook tests / done=true',
    Done: true,
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

test('buildTableRecordDraft can emit List as single-select payload', () => {
  const draft = buildTableRecordDraft(
    {
      listName: 'backlog',
      title: 'improve webhook errors',
      details: 'item',
      owner: 'alex',
      sourceCommand: '/table add backlog item: improve webhook errors / owner=alex',
    },
    {
      listFieldMode: 'single_select',
    },
  );

  assert.deepEqual(draft.body.fields.List, {
    name: 'backlog',
  });
  assert.match(draft.notes[1] ?? '', /single-select payload/);
});

test('buildTableRecordDraft can emit List as multi-select payload', () => {
  const draft = buildTableRecordDraft(
    {
      listName: 'backlog, urgent',
      title: 'improve webhook errors',
      details: 'item',
      owner: 'alex',
      sourceCommand: '/table add backlog, urgent item: improve webhook errors / owner=alex',
    },
    {
      listFieldMode: 'multi_select',
    },
  );

  assert.deepEqual(draft.body.fields.List, [
    {
      name: 'backlog',
    },
    {
      name: 'urgent',
    },
  ]);
  assert.match(draft.notes[1] ?? '', /multi-select payload/);
});

test('buildTableRecordDraft can emit Owner as a user field payload', () => {
  const draft = buildTableRecordDraft(
    {
      listName: 'backlog',
      title: 'improve webhook errors',
      ownerOpenId: 'ou_alex',
      sourceCommand: '/table add backlog improve webhook errors / owner_open_id=ou_alex',
    },
    {
      ownerFieldMode: 'user',
    },
  );

  assert.deepEqual(draft.body.fields.Owner, [
    {
      id: 'ou_alex',
    },
  ]);
  assert.match(draft.notes[1] ?? '', /user field payload/);
});

test('buildTableRecordDraft can emit Estimate as number payload', () => {
  const draft = buildTableRecordDraft(
    {
      listName: 'backlog',
      title: 'improve webhook errors',
      estimate: '8',
      sourceCommand: '/table add backlog improve webhook errors / estimate=8',
    },
    {
      estimateFieldMode: 'number',
    },
  );

  assert.equal(draft.body.fields.Estimate, 8);
  assert.match(draft.notes[1] ?? '', /numeric payload/);
});

test('buildTableRecordDraft can emit Due as date payload', () => {
  const draft = buildTableRecordDraft(
    {
      listName: 'sprint',
      title: 'fix flaky webhook tests',
      due: '2026-04-01',
      sourceCommand: '/table add sprint fix flaky webhook tests / due=2026-04-01',
    },
    {
      dueFieldMode: 'date',
    },
  );

  assert.equal(draft.body.fields.Due, 1775001600000);
  assert.match(draft.notes[1] ?? '', /UTC date timestamp payload/);
});

test('buildTableRecordDraft can emit Due as datetime payload', () => {
  const draft = buildTableRecordDraft(
    {
      listName: 'sprint',
      title: 'fix flaky webhook tests',
      due: '2026-04-01T09:30:00Z',
      sourceCommand: '/table add sprint fix flaky webhook tests / due=2026-04-01T09:30:00Z',
    },
    {
      dueFieldMode: 'datetime',
    },
  );

  assert.equal(draft.body.fields.Due, 1775035800000);
  assert.match(draft.notes[1] ?? '', /datetime timestamp payload/);
});

test('buildTableRecordDraft can emit Done as checkbox payload', () => {
  const draft = buildTableRecordDraft(
    {
      listName: 'sprint',
      title: 'close flaky webhook tests',
      done: 'true',
      sourceCommand: '/table add sprint close flaky webhook tests / done=true',
    },
    {
      doneFieldMode: 'checkbox',
    },
  );

  assert.equal(draft.body.fields.Done, true);
  assert.match(draft.notes[1] ?? '', /checkbox payload/);
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
