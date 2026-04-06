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

test('buildDocBlockChildrenDraft converts ordered list lines into ordered blocks', () => {
  const createDraft = buildDocCreateDraft(
    'ordered list demo',
    ['1. First step', '2. Second step', '3. Third step'].join('\n'),
  );
  const draft = buildDocBlockChildrenDraft('docxcn_demo', createDraft);
  const children = draft.body.children;

  assert.equal(children[0]?.block_type, 14);
  assert.equal(children[0]?.ordered?.elements[0]?.text_run.content, 'First step');
  assert.equal(children[1]?.block_type, 14);
  assert.equal(children[1]?.ordered?.elements[0]?.text_run.content, 'Second step');
  assert.equal(children[2]?.block_type, 14);
  assert.equal(children[2]?.ordered?.elements[0]?.text_run.content, 'Third step');
});

test('buildDocBlockChildrenDraft converts fenced code blocks into code blocks', () => {
  // Fenced code block must be a single line (multi-line code blocks require
  // state-machine parsing that is beyond line-by-line classifyLine splitting).
  // This tests the single-line form: ```language\ncode\n```
  const createDraft = buildDocCreateDraft(
    'code block demo',
    // Pass as a single line so classifyLine sees it as one unit
    '```js\nconsole.log("hello")\n```',
  );
  const draft = buildDocBlockChildrenDraft('docxcn_demo', createDraft);
  const children = draft.body.children;

  assert.equal(children.length, 1);
  assert.equal(children[0]?.block_type, 17);
  assert.equal(children[0]?.code?.elements[0]?.text_run.content, 'console.log("hello")');
  assert.equal(children[0]?.code?.style?.language, 1); // plain text
});

test('buildDocBlockChildrenDraft converts quote lines into quote blocks', () => {
  const createDraft = buildDocCreateDraft(
    'quote demo',
    ['> This is a wise quote', '> — Someone'].join('\n'),
  );
  const draft = buildDocBlockChildrenDraft('docxcn_demo', createDraft);
  const children = draft.body.children;

  assert.equal(children[0]?.block_type, 18);
  assert.equal(children[0]?.quote?.elements[0]?.text_run.content, 'This is a wise quote');
  assert.equal(children[1]?.block_type, 18);
  assert.equal(children[1]?.quote?.elements[0]?.text_run.content, '— Someone');
});

test('buildDocBlockChildrenDraft converts divider lines into divider blocks', () => {
  const createDraft = buildDocCreateDraft(
    'divider demo',
    ['Before', '---', 'After'].join('\n'),
  );
  const draft = buildDocBlockChildrenDraft('docxcn_demo', createDraft);
  const children = draft.body.children;

  assert.equal(children.length, 3);
  assert.equal(children[0]?.block_type, 2);  // paragraph
  assert.equal(children[1]?.block_type, 22); // divider
  assert.equal(children[2]?.block_type, 2);  // paragraph
  assert.deepEqual(children[1]?.divider, {});
});

test('buildDocBlockChildrenDraft converts callout lines into callout blocks', () => {
  const createDraft = buildDocCreateDraft(
    'callout demo',
    ['Before', '>> [!warning] This is a warning callout', 'After'].join('\n'),
  );
  const draft = buildDocBlockChildrenDraft('docxcn_demo', createDraft);
  const children = draft.body.children;

  assert.equal(children.length, 3);
  assert.equal(children[0]?.block_type, 2);   // paragraph
  assert.equal(children[1]?.block_type, 34); // callout
  assert.equal(children[1]?.callout?.callout_type, 1); // warning = 1
  assert.equal(children[1]?.callout?.icon_id, 2);
  assert.equal(children[1]?.callout?.border_color, 1);
  assert.equal(children[2]?.block_type, 2);  // paragraph
});

test('buildDocBlockChildrenDraft converts all callout types correctly', () => {
  const createDraft = buildDocCreateDraft(
    'all callout types',
    [
      '>> [!info] Info callout',
      '>> [!tip] Tip callout',
      '>> [!success] Success callout',
      '>> [!danger] Danger callout',
      '>> [!book] Book callout',
    ].join('\n'),
  );
  const draft = buildDocBlockChildrenDraft('docxcn_demo', createDraft);
  const children = draft.body.children;

  assert.equal(children.length, 5);
  assert.equal(children[0]?.callout?.callout_type, 0);  // info
  assert.equal(children[1]?.callout?.callout_type, 3);  // tip
  assert.equal(children[2]?.callout?.callout_type, 4);  // success
  assert.equal(children[3]?.callout?.callout_type, 2);  // danger
  assert.equal(children[4]?.callout?.callout_type, 5);  // book
});

test('buildDocBlockChildrenDraft supports inline spans inside callout text', () => {
  const createDraft = buildDocCreateDraft(
    'callout inline styles',
    '>> [!tip] Use **bold**, *italic*, and `code` inside callouts',
  );
  const draft = buildDocBlockChildrenDraft('docxcn_demo', createDraft);
  const children = draft.body.children;

  assert.equal(children[0]?.block_type, 34);
  const elements = children[0]?.callout?.paragraph?.elements ?? [];
  // Should have: "Use ", bold("bold"), ", ", italic("italic"), ", and ", inline_code("code"), " inside callouts"
  const boldRun = elements.find((e: any) => e.text_run?.text_element_style?.bold);
  const italicRun = elements.find((e: any) => e.text_run?.text_element_style?.italic);
  const codeRun = elements.find((e: any) => e.text_run?.text_element_style?.inline_code);
  assert.ok(boldRun, 'should contain bold run');
  assert.ok(italicRun, 'should contain italic run');
  assert.ok(codeRun, 'should contain inline_code run');
});

test('buildDocBlockChildrenDraft converts inline code block lines into code blocks', () => {
  // A line that is entirely backtick-wrapped (not fenced) is treated as a
  // standalone code block, preserving the inline_code text_element_style.
  const createDraft = buildDocCreateDraft(
    'inline code block test',
    '`console.log(1)`',
  );
  const draft = buildDocBlockChildrenDraft('docxcn_demo', createDraft);
  const children = draft.body.children;

  assert.equal(children.length, 1);
  assert.equal(children[0]?.block_type, 17); // code block
  assert.equal(children[0]?.code?.elements[0]?.text_run?.content, 'console.log(1)');
  assert.equal(children[0]?.code?.elements[0]?.text_run?.text_element_style?.inline_code, true);
  assert.equal(children[0]?.code?.style?.language, 1); // plain text
});

test('buildDocBlockChildrenDraft handles mixed content with all new block types', () => {
  const createDraft = buildDocCreateDraft(
    'mixed blocks demo',
    [
      '# Project Notes',
      '',
      '## Setup',
      '1. Install dependencies',
      '2. Configure `.env`',
      '',
      '> Remember to restart the server after changes.',
      '',
      '---',
      '',
      '## Usage',
      '- Run `npm run dev` to start',
      '',
      // Multi-line fenced code blocks require state-machine parsing; test
      // the single-line form instead: ```language\ncode\n```
      '```ts\nconst app = createApp();\n```',
    ].join('\n'),
  );
  const draft = buildDocBlockChildrenDraft('docxcn_demo', createDraft);
  const children = draft.body.children;

  // Blank lines are filtered (classifyLine returns null for them).
  // The code fence (lines 13-15) is joined into one block.
  // Expected: h1, h2, ol1, ol2, quote, divider, h2, bullet, code = 9 blocks.
  assert.equal(children.length, 9);

  // Verify h1
  assert.equal(children[0]?.block_type, 3);

  // Verify ordered list items (blank lines filtered, so ol1=idx2, ol2=idx3)
  assert.equal(children[2]?.block_type, 14);
  assert.equal(children[2]?.ordered?.elements[0]?.text_run.content, 'Install dependencies');
  assert.equal(children[3]?.block_type, 14);
  // Content "Configure `.env`" is parsed into: "Configure " (plain) + ".env" (inline_code, backticks stripped by parseInlineSpans)
  assert.equal(
    children[3]?.ordered?.elements?.map(e => e.text_run.content).join(''),
    'Configure .env',
  );

  // Verify quote (blank filtered before it)
  assert.equal(children[4]?.block_type, 18);
  assert.ok(children[4]?.quote?.elements[0]?.text_run.content?.includes('Remember'));

  // Verify divider
  assert.equal(children[5]?.block_type, 22);
  assert.deepEqual(children[5]?.divider, {});

  // Verify fenced code block at end
  const lastChild = children[children.length - 1];
  assert.equal(lastChild?.block_type, 17);
  assert.equal(lastChild?.code?.elements[0]?.text_run.content?.trim(), 'const app = createApp();');
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
