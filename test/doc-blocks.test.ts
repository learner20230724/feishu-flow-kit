import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDocBlockChildrenDraft } from '../src/adapters/build-doc-block-children-draft.ts';
import { buildDocCreateDraft } from '../src/adapters/build-doc-create-draft.ts';
import { sendDocBlockChildrenRequest } from '../src/adapters/send-doc-block-children-request.ts';

test('buildDocBlockChildrenDraft converts markdown lines into richer docx blocks', () => {
  const createDraft = buildDocCreateDraft(
    'weekly launch review',
    [
      'Doc outline draft: weekly launch review',
      '',
      '# Summary',
      '## Notes',
      '### Details',
      '- Topic: weekly launch review',
      '- [ ] Fill the missing details',
      '- [x] Confirm participants',
    ].join('\n'),
  );

  const draft = buildDocBlockChildrenDraft('docxcn_demo', createDraft);

  assert.equal(
    draft.endpoint,
    '/open-apis/docx/v1/documents/docxcn_demo/blocks/docxcn_demo/children',
  );
  assert.equal(draft.body.index, 0);

  assert.deepEqual(
    draft.body.children.map((child) => ({
      type: child.block_type,
      text:
        child.paragraph?.elements[0]?.text_run.content ??
        child.heading1?.elements[0]?.text_run.content ??
        child.heading2?.elements[0]?.text_run.content ??
        child.heading3?.elements[0]?.text_run.content ??
        child.bullet?.elements[0]?.text_run.content ??
        child.todo?.elements[0]?.text_run.content,
      done: child.todo?.style?.done,
    })),
    [
      { type: 2, text: 'Doc outline draft: weekly launch review', done: undefined },
      { type: 3, text: 'Summary', done: undefined },
      { type: 4, text: 'Notes', done: undefined },
      { type: 5, text: 'Details', done: undefined },
      { type: 12, text: 'Topic: weekly launch review', done: undefined },
      { type: 13, text: 'Fill the missing details', done: false },
      { type: 13, text: 'Confirm participants', done: true },
    ],
  );
});

test('sendDocBlockChildrenRequest posts blocks and returns block ids', async () => {
  const createDraft = buildDocCreateDraft('weekly launch review', 'Line 1\n- Line 2');
  const draft = buildDocBlockChildrenDraft('docxcn_demo', createDraft);
  const requests: Array<{ url: string; method: string; body: string }> = [];

  const result = await sendDocBlockChildrenRequest({
    tenantAccessToken: 'tenant_token_demo',
    draft,
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
    }) as typeof fetch,
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.method, 'POST');
  assert.match(
    String(requests[0]?.url),
    /\/docx\/v1\/documents\/docxcn_demo\/blocks\/docxcn_demo\/children/,
  );
  assert.match(String(requests[0]?.body), /Line 1/);
  assert.match(String(requests[0]?.body), /Line 2/);
  assert.deepEqual(result.blockIds, ['blk_1', 'blk_2']);
});
