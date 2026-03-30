import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDocCreateDraft } from '../src/adapters/build-doc-create-draft.ts';
import { buildTableRecordDraft } from '../src/adapters/build-table-record-draft.ts';
import { fetchTenantAccessToken } from '../src/adapters/fetch-tenant-access-token.ts';
import { maybeCreateDoc } from '../src/adapters/maybe-create-doc.ts';
import { maybeCreateTableRecord } from '../src/adapters/maybe-create-table-record.ts';
import { maybeSendReplyMessage } from '../src/adapters/maybe-send-reply-message.ts';
import { sendDocCreateRequest } from '../src/adapters/send-doc-create-request.ts';
import { sendReplyMessage } from '../src/adapters/send-reply-message.ts';
import { sendTableRecordRequest } from '../src/adapters/send-table-record-request.ts';

test('fetchTenantAccessToken requests a tenant token from Feishu auth API', async () => {
  const requests: Array<{ url: string; method: string; body: string }> = [];

  const result = await fetchTenantAccessToken({
    appId: 'cli_demo_app_id',
    appSecret: 'demo_app_secret',
    fetchImpl: (async (input, init) => {
      requests.push({
        url: String(input),
        method: String(init?.method ?? ''),
        body: String(init?.body ?? ''),
      });

      return new Response(
        JSON.stringify({
          code: 0,
          tenant_access_token: 'tenant_token_demo',
          expire: 7200,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }) as typeof fetch,
  });

  assert.equal(requests.length, 1);
  assert.match(requests[0]?.url ?? '', /tenant_access_token/);
  assert.equal(requests[0]?.method, 'POST');
  assert.equal(result.token, 'tenant_token_demo');
  assert.equal(result.expireSeconds, 7200);
});

test('fetchTenantAccessToken reuses a cached token when still valid', async () => {
  let fetchCalls = 0;
  const cache = new Map<string, { token: string; expireSeconds: number; fetchedAt: number }>();

  const first = await fetchTenantAccessToken({
    appId: 'cli_demo_app_id',
    appSecret: 'demo_app_secret',
    fetchImpl: (async () => {
      fetchCalls += 1;
      return new Response(
        JSON.stringify({
          code: 0,
          tenant_access_token: 'tenant_token_demo',
          expire: 7200,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }) as typeof fetch,
    cache: {
      get(key) {
        return cache.get(key);
      },
      set(key, value) {
        cache.set(key, value);
      },
    },
    now: () => 1_000,
  });

  const second = await fetchTenantAccessToken({
    appId: 'cli_demo_app_id',
    appSecret: 'demo_app_secret',
    fetchImpl: (async () => {
      fetchCalls += 1;
      throw new Error('fetch should not be called for cached token');
    }) as typeof fetch,
    cache: {
      get(key) {
        return cache.get(key);
      },
      set(key, value) {
        cache.set(key, value);
      },
    },
    now: () => 2_000,
  });

  assert.equal(fetchCalls, 1);
  assert.equal(first.token, 'tenant_token_demo');
  assert.equal(second.token, 'tenant_token_demo');
});

test('sendReplyMessage posts a text reply to the Feishu reply endpoint', async () => {
  const requests: Array<{ url: string; method: string; body: string }> = [];

  const result = await sendReplyMessage({
    tenantAccessToken: 'tenant_token_demo',
    draft: {
      endpoint: '/open-apis/im/v1/messages/om_demo/reply',
      method: 'POST',
      pathParams: {
        message_id: 'om_demo',
      },
      body: {
        msg_type: 'text',
        content: JSON.stringify({ text: 'hello from test' }),
      },
    },
    fetchImpl: (async (input, init) => {
      requests.push({
        url: String(input),
        method: String(init?.method ?? ''),
        body: String(init?.body ?? ''),
      });

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
    }) as typeof fetch,
  });

  assert.equal(requests.length, 1);
  assert.match(requests[0]?.url ?? '', /\/im\/v1\/messages\/om_demo\/reply/);
  assert.equal(requests[0]?.method, 'POST');
  assert.match(requests[0]?.body ?? '', /hello from test/);
  assert.equal(result.messageId, 'om_reply_demo');
});

test('maybeSendReplyMessage skips outbound sending when disabled', async () => {
  const result = await maybeSendReplyMessage(
    {
      appId: 'cli_demo_app_id',
      appSecret: 'demo_app_secret',
      enableOutboundReply: false,
    },
    {
      endpoint: '/open-apis/im/v1/messages/om_demo/reply',
      method: 'POST',
      pathParams: {
        message_id: 'om_demo',
      },
      body: {
        msg_type: 'text',
        content: JSON.stringify({ text: 'hello from test' }),
      },
    },
  );

  assert.equal(result.attempted, false);
  assert.match(String(result.skippedReason), /disabled/);
});

test('maybeSendReplyMessage fetches a token and sends reply when enabled', async () => {
  const requests: Array<{ url: string; body: string }> = [];

  const result = await maybeSendReplyMessage(
    {
      appId: 'cli_demo_app_id',
      appSecret: 'demo_app_secret',
      enableOutboundReply: true,
    },
    {
      endpoint: '/open-apis/im/v1/messages/om_demo/reply',
      method: 'POST',
      pathParams: {
        message_id: 'om_demo',
      },
      body: {
        msg_type: 'text',
        content: JSON.stringify({ text: 'hello from test' }),
      },
    },
    async (input, init) => {
      const url = String(input);
      const body = String(init?.body ?? '');
      requests.push({ url, body });

      if (url.includes('/auth/v3/tenant_access_token/internal')) {
        return new Response(
          JSON.stringify({
            code: 0,
            tenant_access_token: 'tenant_token_demo',
            expire: 7200,
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
    },
  );

  assert.equal(requests.length, 2);
  assert.match(requests[0]?.url ?? '', /tenant_access_token/);
  assert.match(requests[1]?.url ?? '', /\/im\/v1\/messages\/om_demo\/reply/);
  assert.equal(result.attempted, true);
  assert.equal(result.response?.messageId, 'om_reply_demo');
});

test('sendDocCreateRequest posts a doc create request to the Feishu docx endpoint', async () => {
  const requests: Array<{ url: string; method: string; body: string }> = [];

  const result = await sendDocCreateRequest({
    tenantAccessToken: 'tenant_token_demo',
    draft: buildDocCreateDraft('weekly launch review', '# Summary\n- ready'),
    fetchImpl: (async (input, init) => {
      requests.push({
        url: String(input),
        method: String(init?.method ?? ''),
        body: String(init?.body ?? ''),
      });

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
    }) as typeof fetch,
  });

  assert.equal(requests.length, 1);
  assert.match(requests[0]?.url ?? '', /\/docx\/v1\/documents/);
  assert.equal(requests[0]?.method, 'POST');
  assert.match(requests[0]?.body ?? '', /weekly launch review/);
  assert.equal(result.documentId, 'docxcn_demo');
  assert.equal(result.url, 'https://example.feishu.cn/docx/docxcn_demo');
});

test('maybeCreateDoc skips doc creation when disabled', async () => {
  const result = await maybeCreateDoc(
    {
      appId: 'cli_demo_app_id',
      appSecret: 'demo_app_secret',
      enableDocCreate: false,
    },
    buildDocCreateDraft('weekly launch review', '# Summary\n- ready'),
  );

  assert.equal(result.attempted, false);
  assert.match(String(result.skippedReason), /disabled/);
});

test('maybeCreateDoc fetches a token, creates a doc, and appends starter blocks when enabled', async () => {
  const requests: Array<{ url: string; body: string }> = [];

  const result = await maybeCreateDoc(
    {
      appId: 'cli_demo_app_id',
      appSecret: 'demo_app_secret',
      enableDocCreate: true,
    },
    buildDocCreateDraft('weekly launch review', '# Summary\n- ready'),
    async (input, init) => {
      const url = String(input);
      const body = String(init?.body ?? '');
      requests.push({ url, body });

      if (url.includes('/auth/v3/tenant_access_token/internal')) {
        return new Response(
          JSON.stringify({
            code: 0,
            tenant_access_token: 'tenant_token_demo',
            expire: 7200,
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
              children: [{ block_id: 'blk_1' }, { block_id: 'blk_2' }],
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
    },
  );

  assert.equal(requests.length, 3);
  assert.match(requests[0]?.url ?? '', /tenant_access_token/);
  assert.match(requests[1]?.url ?? '', /\/docx\/v1\/documents$/);
  assert.match(requests[2]?.url ?? '', /\/docx\/v1\/documents\/docxcn_demo\/blocks\/docxcn_demo\/children/);
  assert.equal(result.attempted, true);
  assert.equal(result.response?.documentId, 'docxcn_demo');
  assert.deepEqual(result.response?.blockAppend?.response?.blockIds, ['blk_1', 'blk_2']);
});

test('sendTableRecordRequest posts a bitable create-record request to the Feishu table endpoint', async () => {
  const requests: Array<{ url: string; method: string; body: string }> = [];

  const result = await sendTableRecordRequest({
    tenantAccessToken: 'tenant_token_demo',
    appToken: 'app_demo_token',
    tableId: 'tbl_demo_id',
    draft: buildTableRecordDraft({
      listName: 'backlog',
      title: 'improve webhook errors',
      details: 'item',
      owner: 'alex',
      sourceCommand: '/table add backlog item: improve webhook errors / owner=alex',
    }),
    fetchImpl: (async (input, init) => {
      requests.push({
        url: String(input),
        method: String(init?.method ?? ''),
        body: String(init?.body ?? ''),
      });

      return new Response(
        JSON.stringify({
          code: 0,
          data: {
            record: {
              record_id: 'rec_demo_1',
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
    }) as typeof fetch,
  });

  assert.equal(requests.length, 1);
  assert.match(requests[0]?.url ?? '', /\/bitable\/v1\/apps\/app_demo_token\/tables\/tbl_demo_id\/records$/);
  assert.equal(requests[0]?.method, 'POST');
  assert.match(requests[0]?.body ?? '', /improve webhook errors/);
  assert.match(requests[0]?.body ?? '', /"Owner":"alex"/);
  assert.equal(result.ok, true);
  assert.equal(result.recordId, 'rec_demo_1');
});

test('maybeCreateTableRecord skips table record creation when disabled', async () => {
  const result = await maybeCreateTableRecord(
    {
      appId: 'cli_demo_app_id',
      appSecret: 'demo_app_secret',
      enableTableCreate: false,
      bitableAppToken: 'app_demo_token',
      bitableTableId: 'tbl_demo_id',
    },
    buildTableRecordDraft({
      listName: 'backlog',
      title: 'improve webhook errors',
      sourceCommand: '/table add backlog improve webhook errors',
    }),
  );

  assert.equal(result.attempted, false);
  assert.match(String(result.skippedReason), /disabled/);
});

test('maybeCreateTableRecord fetches a token and creates a bitable record when enabled', async () => {
  const requests: Array<{ url: string; body: string }> = [];

  const result = await maybeCreateTableRecord(
    {
      appId: 'cli_demo_app_id',
      appSecret: 'demo_app_secret',
      enableTableCreate: true,
      bitableAppToken: 'app_demo_token',
      bitableTableId: 'tbl_demo_id',
    },
    buildTableRecordDraft({
      listName: 'backlog',
      title: 'improve webhook errors',
      details: 'item',
      owner: 'alex',
      sourceCommand: '/table add backlog item: improve webhook errors / owner=alex',
    }),
    async (input, init) => {
      const url = String(input);
      const body = String(init?.body ?? '');
      requests.push({ url, body });

      if (url.includes('/auth/v3/tenant_access_token/internal')) {
        return new Response(
          JSON.stringify({
            code: 0,
            tenant_access_token: 'tenant_token_demo',
            expire: 7200,
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
            record: {
              record_id: 'rec_demo_1',
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
    },
  );

  assert.equal(requests.length, 2);
  assert.match(requests[0]?.url ?? '', /tenant_access_token/);
  assert.match(requests[1]?.url ?? '', /\/bitable\/v1\/apps\/app_demo_token\/tables\/tbl_demo_id\/records$/);
  assert.equal(result.attempted, true);
  assert.equal(result.response?.recordId, 'rec_demo_1');
});
