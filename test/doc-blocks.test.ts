import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDocBlockChildrenDraft,
  parseInlineSpans,
} from '../src/adapters/build-doc-block-children-draft.ts';
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

test('parseInlineSpans converts bold, italic, and inline code into styled text runs', () => {
  assert.deepEqual(parseInlineSpans('Plain **bold** and *italic* plus `code`.'), [
    { text_run: { content: 'Plain ' } },
    { text_run: { content: 'bold', text_element_style: { bold: true } } },
    { text_run: { content: ' and ' } },
    { text_run: { content: 'italic', text_element_style: { italic: true } } },
    { text_run: { content: ' plus ' } },
    { text_run: { content: 'code', text_element_style: { inline_code: true } } },
    { text_run: { content: '.' } },
  ]);
});

test('buildDocBlockChildrenDraft keeps inline styles inside paragraph, bullet, and todo blocks', () => {
  const createDraft = buildDocCreateDraft(
    'inline styles demo',
    [
      'A **bold** move with *nuance* and `snippet`.',
      '- bullet with **highlight**',
      '- [ ] todo with `command`',
    ].join('\n'),
  );

  const draft = buildDocBlockChildrenDraft('docxcn_demo', createDraft);
  const [paragraph, bullet, todo] = draft.body.children;

  assert.deepEqual(paragraph?.paragraph?.elements, [
    { text_run: { content: 'A ' } },
    { text_run: { content: 'bold', text_element_style: { bold: true } } },
    { text_run: { content: ' move with ' } },
    { text_run: { content: 'nuance', text_element_style: { italic: true } } },
    { text_run: { content: ' and ' } },
    { text_run: { content: 'snippet', text_element_style: { inline_code: true } } },
    { text_run: { content: '.' } },
  ]);

  assert.deepEqual(bullet?.bullet?.elements, [
    { text_run: { content: 'bullet with ' } },
    { text_run: { content: 'highlight', text_element_style: { bold: true } } },
  ]);

  assert.deepEqual(todo?.todo?.elements, [
    { text_run: { content: 'todo with ' } },
    { text_run: { content: 'command', text_element_style: { inline_code: true } } },
  ]);
  assert.equal(todo?.todo?.style.done, false);
});

test('parseInlineSpans handles strikethrough', () => {
  assert.deepEqual(parseInlineSpans('Remove ~~deprecated~~ field'), [
    { text_run: { content: 'Remove ' } },
    { text_run: { content: 'deprecated', text_element_style: { strikethrough: true } } },
    { text_run: { content: ' field' } },
  ]);
});

test('parseInlineSpans handles underline with __text__ syntax', () => {
  assert.deepEqual(parseInlineSpans('This is __underlined__ text'), [
    { text_run: { content: 'This is ' } },
    { text_run: { content: 'underlined', text_element_style: { underline: true } } },
    { text_run: { content: ' text' } },
  ]);
});

test('parseInlineSpans handles bare URL auto-link', () => {
  const spans = parseInlineSpans('Visit https://open.feishu.cn now');
  assert.deepEqual(spans, [
    { text_run: { content: 'Visit ' } },
    { text_run: { content: 'https://open.feishu.cn', link: { url: 'https://open.feishu.cn' } } },
    { text_run: { content: ' now' } },
  ]);
});

test('parseInlineSpans handles www auto-link (expanded to https)', () => {
  const spans = parseInlineSpans('See www.example.com for info');
  assert.deepEqual(spans, [
    { text_run: { content: 'See ' } },
    { text_run: { content: 'www.example.com', link: { url: 'https://www.example.com' } } },
    { text_run: { content: ' for info' } },
  ]);
});

test('parseInlineSpans merges adjacent bold spans into one run', () => {
  const spans = parseInlineSpans('**bold1** and **bold2**');
  assert.deepEqual(spans, [
    { text_run: { content: 'bold1', text_element_style: { bold: true } } },
    { text_run: { content: ' and ' } },
    { text_run: { content: 'bold2', text_element_style: { bold: true } } },
  ]);
});

test('parseInlineSpans handles mixed underline, auto-link, and explicit link', () => {
  const spans = parseInlineSpans('__Underlined__ and [docs](https://feishu.cn) and https://example.com');
  assert.deepEqual(spans, [
    { text_run: { content: 'Underlined', text_element_style: { underline: true } } },
    { text_run: { content: ' and ' } },
    { text_run: { content: 'docs', link: { url: 'https://feishu.cn' } } },
    { text_run: { content: ' and ' } },
    { text_run: { content: 'https://example.com', link: { url: 'https://example.com' } } },
  ]);
});

test('parseInlineSpans handles links', () => {
  assert.deepEqual(parseInlineSpans('See [docs](https://open.feishu.cn) for more'), [
    { text_run: { content: 'See ' } },
    { text_run: { content: 'docs', link: { url: 'https://open.feishu.cn' } } },
    { text_run: { content: ' for more' } },
  ]);
});

test('parseInlineSpans handles mixed: bold, strikethrough, link, italic, code', () => {
  const spans = parseInlineSpans('**bold** and ~~strike~~ and [link](http://x.com) and *em* and `code`');
  assert.deepEqual(spans, [
    { text_run: { content: 'bold', text_element_style: { bold: true } } },
    { text_run: { content: ' and ' } },
    { text_run: { content: 'strike', text_element_style: { strikethrough: true } } },
    { text_run: { content: ' and ' } },
    { text_run: { content: 'link', link: { url: 'http://x.com' } } },
    { text_run: { content: ' and ' } },
    { text_run: { content: 'em', text_element_style: { italic: true } } },
    { text_run: { content: ' and ' } },
    { text_run: { content: 'code', text_element_style: { inline_code: true } } },
  ]);
});

test('heading blocks support inline spans', () => {
  const createDraft = buildDocCreateDraft(
    'inline heading test',
    '# Title with **bold** and [link](https://feishu.cn)',
  );
  const draft = buildDocBlockChildrenDraft('docxcn_h', createDraft);
  const heading = draft.body.children[0];
  assert.equal(heading?.block_type, 3);
  assert.deepEqual(heading?.heading1?.elements, [
    { text_run: { content: 'Title with ' } },
    { text_run: { content: 'bold', text_element_style: { bold: true } } },
    { text_run: { content: ' and ' } },
    { text_run: { content: 'link', link: { url: 'https://feishu.cn' } } },
  ]);
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
