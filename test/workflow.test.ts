import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDocCreateDraft } from '../src/adapters/build-doc-create-draft.ts';
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
