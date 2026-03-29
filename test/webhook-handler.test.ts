import test from 'node:test';
import assert from 'node:assert/strict';

import { handleWebhookPayload } from '../src/server/handle-webhook-payload.ts';

test('handleWebhookPayload returns challenge for url verification requests', async () => {
  const result = await handleWebhookPayload({
    type: 'url_verification',
    challenge: 'verify_me',
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { challenge: 'verify_me' });
});

test('handleWebhookPayload runs workflow for webhook message payloads', async () => {
  const result = await handleWebhookPayload({
    header: {
      event_type: 'im.message.receive_v1',
      create_time: '2026-03-29T01:50:00Z',
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
        content: JSON.stringify({ text: '/todo write webhook server draft' }),
        create_time: '2026-03-29T01:50:00Z',
      },
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.eventType, 'message.received');
  assert.equal(result.body.messageId, 'om_demo');
  assert.match(String(result.body.replyText), /Todo workflow draft/);
  assert.deepEqual(result.body.replyDraft, {
    endpoint: '/open-apis/im/v1/messages/om_demo/reply',
    method: 'POST',
    pathParams: {
      message_id: 'om_demo',
    },
    body: {
      msg_type: 'text',
      content: JSON.stringify({
        text: String(result.body.replyText),
      }),
    },
  });
  assert.deepEqual(result.body.outboundReply, {
    attempted: false,
    skippedReason: 'No outbound reply config provided.',
  });
});

test('handleWebhookPayload returns doc create draft for /doc requests without create config', async () => {
  const result = await handleWebhookPayload({
    header: {
      event_type: 'im.message.receive_v1',
      create_time: '2026-03-29T01:50:00Z',
      tenant_key: 'tenant_demo',
    },
    event: {
      sender: {
        sender_id: {
          open_id: 'ou_demo_sender',
        },
      },
      message: {
        message_id: 'om_doc_demo',
        chat_id: 'oc_demo_chat',
        chat_type: 'p2p',
        content: JSON.stringify({ text: '/doc weekly launch review' }),
        create_time: '2026-03-29T01:50:00Z',
      },
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.messageId, 'om_doc_demo');
  assert.match(String(result.body.replyText), /Doc outline draft: weekly launch review/);
  assert.deepEqual(result.body.docCreateDraft, {
    endpoint: '/open-apis/docx/v1/documents',
    method: 'POST',
    body: {
      title: 'weekly launch review',
    },
    initialContentMarkdown: String(result.body.replyText),
    notes: [
      'This starter draft only covers the document creation request.',
      'The markdown content is returned separately so a later adapter can append blocks or convert it into richer docx operations.',
    ],
  });
  assert.deepEqual(result.body.docCreate, {
    attempted: false,
    skippedReason: 'No doc create config provided.',
  });
});

test('handleWebhookPayload creates a Feishu doc when doc create is enabled', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; body: string }> = [];

  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    const body = String(init?.body ?? '');
    requests.push({ url, body });

    if (url.includes('/auth/v3/tenant_access_token/internal')) {
      return new Response(
        JSON.stringify({
          code: 0,
          tenant_access_token: 'tenant_token_demo',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    if (url.includes('/docx/v1/documents/docxcn_demo/blocks/docxcn_demo/children')) {
      return new Response(
        JSON.stringify({
          code: 0,
          data: {
            children: [
              { block_id: 'blk_summary' },
              { block_id: 'blk_key_points' },
            ],
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    if (url.includes('/docx/v1/documents')) {
      return new Response(
        JSON.stringify({
          code: 0,
          data: {
            document: {
              document_id: 'docxcn_demo',
              url: 'https://example.feishu.cn/docx/docxcn_demo',
            },
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    return new Response(
      JSON.stringify({
        code: 0,
        data: {
          message_id: 'om_reply_demo',
        },
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  }) as typeof fetch;

  try {
    const result = await handleWebhookPayload(
      {
        header: {
          event_type: 'im.message.receive_v1',
          create_time: '2026-03-29T01:50:00Z',
          tenant_key: 'tenant_demo',
        },
        event: {
          sender: {
            sender_id: {
              open_id: 'ou_demo_sender',
            },
          },
          message: {
            message_id: 'om_doc_demo',
            chat_id: 'oc_demo_chat',
            chat_type: 'p2p',
            content: JSON.stringify({ text: '/doc weekly launch review' }),
            create_time: '2026-03-29T01:50:00Z',
          },
        },
      },
      {
        appId: 'cli_demo_app_id',
        appSecret: 'demo_app_secret',
        enableOutboundReply: false,
        enableDocCreate: true,
      },
    );

    assert.equal(result.statusCode, 200);
    assert.equal(requests.length, 3);
    assert.match(requests[0].url, /tenant_access_token/);
    assert.match(requests[1].url, /\/docx\/v1\/documents$/);
    assert.match(requests[2].url, /\/docx\/v1\/documents\/docxcn_demo\/blocks\/docxcn_demo\/children/);
    assert.equal(result.body.docCreate.attempted, true);
    assert.equal(result.body.docCreate.response.documentId, 'docxcn_demo');
    assert.equal(result.body.docCreate.response.url, 'https://example.feishu.cn/docx/docxcn_demo');
    assert.equal(result.body.docCreate.response.blockAppend.attempted, true);
    assert.deepEqual(result.body.docCreate.response.blockAppend.response.blockIds, [
      'blk_summary',
      'blk_key_points',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('handleWebhookPayload reports outbound reply as skipped when sender is disabled', async () => {
  const result = await handleWebhookPayload(
    {
      header: {
        event_type: 'im.message.receive_v1',
        create_time: '2026-03-29T01:50:00Z',
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
          content: JSON.stringify({ text: '/todo write webhook server draft' }),
          create_time: '2026-03-29T01:50:00Z',
        },
      },
    },
    {
      appId: 'cli_demo_app_id',
      appSecret: 'demo_app_secret',
      enableOutboundReply: false,
    },
  );

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.outboundReply, {
    attempted: false,
    skippedReason: 'FEISHU_ENABLE_OUTBOUND_REPLY is disabled.',
  });
});

test('handleWebhookPayload sends outbound reply when sender is enabled', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; body: string }> = [];

  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    const body = String(init?.body ?? '');
    requests.push({ url, body });

    if (url.includes('/auth/v3/tenant_access_token/internal')) {
      return new Response(
        JSON.stringify({
          code: 0,
          tenant_access_token: 'tenant_token_demo',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    return new Response(
      JSON.stringify({
        code: 0,
        data: {
          message_id: 'om_reply_demo',
        },
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  }) as typeof fetch;

  try {
    const result = await handleWebhookPayload(
      {
        header: {
          event_type: 'im.message.receive_v1',
          create_time: '2026-03-29T01:50:00Z',
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
            content: JSON.stringify({ text: '/todo write webhook server draft' }),
            create_time: '2026-03-29T01:50:00Z',
          },
        },
      },
      {
        appId: 'cli_demo_app_id',
        appSecret: 'demo_app_secret',
        enableOutboundReply: true,
      },
    );

    assert.equal(result.statusCode, 200);
    assert.equal(requests.length, 2);
    assert.match(requests[0].url, /tenant_access_token/);
    assert.match(requests[1].url, /\/im\/v1\/messages\/om_demo\/reply/);
    assert.equal(result.body.outboundReply.attempted, true);
    assert.equal(result.body.outboundReply.response.messageId, 'om_reply_demo');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('handleWebhookPayload rejects unsupported payloads', async () => {
  const result = await handleWebhookPayload({ foo: 'bar' });

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.ok, false);
});
