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

interface TextElementStyle {
  bold?: boolean;
  italic?: boolean;
  inline_code?: boolean;
  strikethrough?: boolean;
}

interface TextElement {
  text_run: {
    content: string;
    text_element_style?: TextElementStyle;
    link?: { url: string };
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

/**
 * Parse a line of text with inline markdown formatting into Feishu text_run elements.
 *
 * Supported patterns (non-overlapping, left-to-right, highest precedence first):
 *   `code`          → inline_code: true
 *   **bold**        → bold: true
 *   ~~strikethrough~~ → strikethrough: true
 *   [text](url)     → link: { url }
 *   *italic*        → italic: true
 *
 * Bold is matched before italic so **text** doesn't collide with *text*.
 * Nested / combined spans (e.g. ***bold+italic***) are not supported — each
 * span is treated as one style only.
 */
export function parseInlineSpans(text: string): TextElement[] {
  const elements: TextElement[] = [];

  // Token regex priority: inline-code > bold > strikethrough > link > italic
  const TOKEN =
    /(`[^`]+`)|(?:\*\*([^*]+)\*\*)|(?:~~([^~]+)~~)|(?:\[([^\]]+)\]\(([^)]+)\))|(?:\*([^*]+)\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = TOKEN.lastIndex;

    // Plain text before this token
    if (matchStart > lastIndex) {
      elements.push({ text_run: { content: text.slice(lastIndex, matchStart) } });
    }

    if (match[1] !== undefined) {
      // Inline code: strip surrounding backticks
      const content = match[1].slice(1, -1);
      elements.push({ text_run: { content, text_element_style: { inline_code: true } } });
    } else if (match[2] !== undefined) {
      // Bold: strip surrounding **
      elements.push({ text_run: { content: match[2], text_element_style: { bold: true } } });
    } else if (match[3] !== undefined) {
      // Strikethrough: strip surrounding ~~
      elements.push({ text_run: { content: match[3], text_element_style: { strikethrough: true } } });
    } else if (match[4] !== undefined && match[5] !== undefined) {
      // Link: [text](url)
      elements.push({ text_run: { content: match[4], link: { url: match[5] } } });
    } else if (match[6] !== undefined) {
      // Italic: strip surrounding *
      elements.push({ text_run: { content: match[6], text_element_style: { italic: true } } });
    }

    lastIndex = matchEnd;
  }

  // Remaining plain text after the last token
  if (lastIndex < text.length) {
    elements.push({ text_run: { content: text.slice(lastIndex) } });
  }

  // If nothing was parsed (empty string), return a single empty text_run
  if (elements.length === 0) {
    elements.push({ text_run: { content: text } });
  }

  return elements;
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
      heading1: { elements: parseInlineSpans(content) },
    };
  }

  const h2 = trimmed.match(/^## (.+)/);
  if (h2) {
    const content = h2[1]!.trim();
    return {
      block_type: BLOCK_TYPE.heading2,
      heading2: { elements: parseInlineSpans(content) },
    };
  }

  const h3 = trimmed.match(/^### (.+)/);
  if (h3) {
    const content = h3[1]!.trim();
    return {
      block_type: BLOCK_TYPE.heading3,
      heading3: { elements: parseInlineSpans(content) },
    };
  }

  // Checkbox / todo: - [ ] or - [x]
  const checkedTodo = trimmed.match(/^- \[x\] (.+)/i);
  if (checkedTodo) {
    const content = checkedTodo[1]!.trim();
    return {
      block_type: BLOCK_TYPE.todo,
      todo: { elements: parseInlineSpans(content), style: { done: true } },
    };
  }

  const uncheckedTodo = trimmed.match(/^- \[ \] (.+)/);
  if (uncheckedTodo) {
    const content = uncheckedTodo[1]!.trim();
    return {
      block_type: BLOCK_TYPE.todo,
      todo: { elements: parseInlineSpans(content), style: { done: false } },
    };
  }

  // Bullet list: - item
  const bullet = trimmed.match(/^- (.+)/);
  if (bullet) {
    const content = bullet[1]!.trim();
    return {
      block_type: BLOCK_TYPE.bullet,
      bullet: { elements: parseInlineSpans(content) },
    };
  }

  // Plain paragraph
  return {
    block_type: BLOCK_TYPE.paragraph,
    paragraph: { elements: parseInlineSpans(trimmed) },
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
      'Supported block types: paragraph, heading1/2/3, bullet list, todo (checked and unchecked).',
      'Supported inline formatting: bold (**text**), italic (*text*), inline code (`text`).',
      'Each inline span becomes a separate text_run element with the appropriate text_element_style.',
      'Link spans use the Feishu text_run.link.url field.',
      'Heading text also supports inline spans.',
    ],
  };
}
