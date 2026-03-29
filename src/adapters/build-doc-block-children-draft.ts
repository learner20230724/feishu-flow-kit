import type { FeishuDocCreateDraft } from './build-doc-create-draft.js';

// Feishu docx block_type constants
// https://open.feishu.cn/document/ukTMukTMukTM/uUDN04SN0QjL1QDN/document-docx/docx-v1/document-block/block-types
const BLOCK_TYPE = {
  paragraph: 2,
  heading1: 3,
  heading2: 4,
  heading3: 5,
  bullet: 12,
  todo: 13,
} as const;

type BlockType = (typeof BLOCK_TYPE)[keyof typeof BLOCK_TYPE];

interface TextElement {
  text_run: {
    content: string;
  };
}

export interface FeishuDocRichBlock {
  block_type: BlockType;
  paragraph?: { elements: TextElement[] };
  heading1?: { elements: TextElement[] };
  heading2?: { elements: TextElement[] };
  heading3?: { elements: TextElement[] };
  bullet?: { elements: TextElement[] };
  todo?: { elements: TextElement[]; style: { done: boolean } };
}

export interface FeishuDocBlockChildrenDraft {
  endpoint: string;
  method: 'POST';
  body: {
    children: FeishuDocRichBlock[];
    index: number;
  };
  sourceMarkdown: string;
  notes: string[];
}

function makeTextElements(content: string): TextElement[] {
  return [{ text_run: { content } }];
}

function classifyLine(line: string): FeishuDocRichBlock | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Headings
  const h1 = trimmed.match(/^# (.+)/);
  if (h1) {
    const content = h1[1]!.trim();
    return {
      block_type: BLOCK_TYPE.heading1,
      heading1: { elements: makeTextElements(content) },
    };
  }

  const h2 = trimmed.match(/^## (.+)/);
  if (h2) {
    const content = h2[1]!.trim();
    return {
      block_type: BLOCK_TYPE.heading2,
      heading2: { elements: makeTextElements(content) },
    };
  }

  const h3 = trimmed.match(/^### (.+)/);
  if (h3) {
    const content = h3[1]!.trim();
    return {
      block_type: BLOCK_TYPE.heading3,
      heading3: { elements: makeTextElements(content) },
    };
  }

  // Checkbox / todo: - [ ] or - [x]
  const checkedTodo = trimmed.match(/^- \[x\] (.+)/i);
  if (checkedTodo) {
    const content = checkedTodo[1]!.trim();
    return {
      block_type: BLOCK_TYPE.todo,
      todo: { elements: makeTextElements(content), style: { done: true } },
    };
  }

  const uncheckedTodo = trimmed.match(/^- \[ \] (.+)/);
  if (uncheckedTodo) {
    const content = uncheckedTodo[1]!.trim();
    return {
      block_type: BLOCK_TYPE.todo,
      todo: { elements: makeTextElements(content), style: { done: false } },
    };
  }

  // Bullet list: - item
  const bullet = trimmed.match(/^- (.+)/);
  if (bullet) {
    const content = bullet[1]!.trim();
    return {
      block_type: BLOCK_TYPE.bullet,
      bullet: { elements: makeTextElements(content) },
    };
  }

  // Plain paragraph
  return {
    block_type: BLOCK_TYPE.paragraph,
    paragraph: { elements: makeTextElements(trimmed) },
  };
}

export function buildDocBlockChildrenDraft(
  documentId: string,
  createDraft: FeishuDocCreateDraft,
): FeishuDocBlockChildrenDraft {
  const cleanDocumentId = documentId.trim();
  if (!cleanDocumentId) {
    throw new Error('Missing document id for block append draft.');
  }

  const children = createDraft.initialContentMarkdown
    .split(/\r?\n/)
    .map(classifyLine)
    .filter((block): block is FeishuDocRichBlock => block !== null);

  return {
    endpoint: `/open-apis/docx/v1/documents/${cleanDocumentId}/blocks/${cleanDocumentId}/children`,
    method: 'POST',
    body: {
      children,
      index: 0,
    },
    sourceMarkdown: createDraft.initialContentMarkdown,
    notes: [
      'This adapter converts markdown lines into native Feishu docx block types.',
      'Supported: paragraph, heading1/2/3, bullet list, todo (checked and unchecked).',
      'Inline formatting (bold, italic, code) is not yet handled — content is preserved as plain text.',
    ],
  };
}
