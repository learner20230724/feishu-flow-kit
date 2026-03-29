import test from 'node:test';
import assert from 'node:assert/strict';

import { buildReplyMessageDraft } from '../src/adapters/build-reply-message-draft.ts';

test('buildReplyMessageDraft creates a Feishu reply request draft for text messages', () => {
  const draft = buildReplyMessageDraft('om_demo', 'hello from workflow');

  assert.equal(draft.method, 'POST');
  assert.equal(draft.endpoint, '/open-apis/im/v1/messages/om_demo/reply');
  assert.deepEqual(draft.pathParams, {
    message_id: 'om_demo',
  });
  assert.equal(draft.body.msg_type, 'text');
  assert.equal(draft.body.content, JSON.stringify({ text: 'hello from workflow' }));
});

test('buildReplyMessageDraft falls back to a minimal acknowledgement for blank replies', () => {
  const draft = buildReplyMessageDraft('om_demo', '   ');

  assert.equal(draft.body.content, JSON.stringify({ text: 'Acknowledged.' }));
});
