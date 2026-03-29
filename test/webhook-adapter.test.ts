import test from 'node:test';
import assert from 'node:assert/strict';

import { adaptWebhookMessageEvent } from '../src/adapters/adapt-webhook-message-event.ts';

test('adaptWebhookMessageEvent converts Feishu webhook payload into local message event', () => {
  const result = adaptWebhookMessageEvent({
    header: {
      event_type: 'im.message.receive_v1',
      create_time: '2026-03-29T01:20:00Z',
      tenant_key: 'tenant_demo',
    },
    event: {
      sender: {
        sender_id: {
          open_id: 'ou_demo_sender',
        },
      },
      message: {
        message_id: 'om_demo',
        chat_id: 'oc_demo_chat',
        chat_type: 'p2p',
        content: JSON.stringify({ text: '/todo review webhook draft' }),
        create_time: '2026-03-29T01:20:00Z',
      },
    },
  });

  assert.ok(result);
  assert.equal(result?.type, 'message.received');
  assert.equal(result?.tenantKey, 'tenant_demo');
  assert.equal(result?.message.senderId, 'ou_demo_sender');
  assert.equal(result?.message.text, '/todo review webhook draft');
  assert.equal(result?.context?.source, 'feishu-webhook');
});

test('adaptWebhookMessageEvent returns null for unsupported events', () => {
  const result = adaptWebhookMessageEvent({
    header: { event_type: 'im.message.message_read_v1' },
  });

  assert.equal(result, null);
});
