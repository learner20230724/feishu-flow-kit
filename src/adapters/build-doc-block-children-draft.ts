import type { FeishuDocCreateDraft } from './build-doc-create-draft.js';

// Feishu docx block_type constants
// https://open.feishu.cn/document/ukTMukTMukTM/uUDN04SN0QjL1QDN/document-docx/docx-v1/document-block/block-types
const BLOCK_TYPE = {
  paragraph: 2,
  heading1: 3,
  heading2: 4,
  heading3: 5,
  heading4: 6,
  heading5: 7,
  heading6: 8,
  bullet: 12,
  todo: 13,
  ordered: 14,
  code: 17,
  quote: 18,
  divider: 22,
  callout: 34,
} as const;

// Feishu code block language IDs
// https://open.feishu.cn/document/ukTMukTMukTM/uUDN04SN0QjL1QDN/document-docx/docx-v1/document-block/block-types
const LANGUAGE_MAP: Record<string, number> = {
  // Managed high-value languages
  python: 2,
  py: 2,
  javascript: 3,
  js: 3,
  java: 4,
  go: 5,
  'c++': 6,
  cpp: 6,
  cc: 6,
  c: 7,
  ruby: 8,
  rb: 8,
  php: 9,
  swift: 10,
  kotlin: 11,
  typescript: 12,
  ts: 12,
  rust: 13,
  rs: 13,
  sql: 14,
  bash: 15,
  sh: 15,
  shell: 15,
  zsh: 15,
  html: 16,
  css: 17,
  yaml: 18,
  yml: 18,
  json: 19,
  xml: 20,
  markdown: 21,
  md: 21,
  diff: 22,
  patch: 22,
  // Fallback
  plaintext: 1,
  text: 1,
  txt: 1,
  plain: 1,
};

function getFeishuLanguageId(lang: string): number {
  const normalized = lang.toLowerCase().trim();
  return LANGUAGE_MAP[normalized] ?? 1; // default: plain text
}

type BlockType = (typeof BLOCK_TYPE)[keyof typeof BLOCK_TYPE];

interface TextElementStyle {
  bold?: boolean;
  italic?: boolean;
  inline_code?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
}

interface ListBlockStyle {
  indent_level?: number;
  /** Bullet lists only */
  align?: number;
  /** Bullet lists only: bullet_type 1=disc, 2=circle, 3=square, 4=number, 5=latin, 6=chinese, 7= japanese, 8= korean */
  bullet?: { type: number };
  /** Ordered lists only */
  numbering_type?: number;
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
  heading4?: { elements: TextElement[] };
  heading5?: { elements: TextElement[] };
  heading6?: { elements: TextElement[] };
  bullet?: { elements: TextElement[]; style?: ListBlockStyle };
  todo?: { elements: TextElement[]; style: { done: boolean; indent_level?: number } };
  ordered?: { elements: TextElement[]; style?: ListBlockStyle };
  code?: { elements: TextElement[]; style: { language: number } };
  quote?: { elements: TextElement[] };
  divider?: Record<string, never>;
  callout?: {
    callout_type: number;
    icon_id: number;
    border_color: number;
    paragraph: { elements: TextElement[] };
  };
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
 *   `code`                  → inline_code: true
 *   **bold**                → bold: true
 *   ~~strikethrough~~       → strikethrough: true
 *   __underline__           → underline: true
 *   [text](url)             → link: { url }
 *   *italic*                → italic: true
 *   https://… or www.…      → auto-link (bare URL → link)
 *
 * Bold is matched before italic so **text** doesn't collide with *text*.
 * Adjacent styled spans with the same non-link style are merged into a single
 * text_run (e.g. **bold** and *italic* side by side → two runs; but
 * ***bold+italic*** if the same characters are covered by both markers → one
 * run with bold:true+italic:true).
 *
 * Auto-links are detected last so explicit markdown link syntax takes priority.
 * Bare URLs are converted to link text_runs automatically.
 */
export function parseInlineSpans(text: string): TextElement[] {
  // Each token: [start, end, content, styles (sorted csv), isLink, linkUrl?]
  type Token = [number, number, string, string, boolean, string?];
  const tokens: Token[] = [];

  // Token regex priority: inline-code > bold > strikethrough > underline > explicit link > italic
  // Then auto-links are detected separately.
  const TOKEN_REGEX =
    /(`[^`]+`)|(?:\*\*([^*]+)\*\*)|(?:~~([^~]+)~~)|(?:__([^_]+)__)|(?:\[([^\]]+)\]\(([^)]+)\))|(?:\*([^*]+)\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = TOKEN_REGEX.lastIndex;

    // Plain text before this token
    if (matchStart > lastIndex) {
      tokens.push([lastIndex, matchStart, text.slice(lastIndex, matchStart), '', false]);
    }

    if (match[1] !== undefined) {
      // Inline code: strip surrounding backticks
      tokens.push([matchStart, matchEnd, match[1].slice(1, -1), 'inline_code', false]);
    } else if (match[2] !== undefined) {
      // Bold: strip surrounding **
      tokens.push([matchStart, matchEnd, match[2], 'bold', false]);
    } else if (match[3] !== undefined) {
      // Strikethrough: strip surrounding ~~
      tokens.push([matchStart, matchEnd, match[3], 'strikethrough', false]);
    } else if (match[4] !== undefined) {
      // Underline: strip surrounding __
      tokens.push([matchStart, matchEnd, match[4], 'underline', false]);
    } else if (match[5] !== undefined && match[6] !== undefined) {
      // Explicit link: [text](url)
      tokens.push([matchStart, matchEnd, match[5], '', true, match[6]]);
    } else if (match[7] !== undefined) {
      // Italic: strip surrounding *
      tokens.push([matchStart, matchEnd, match[7], 'italic', false]);
    }

    lastIndex = matchEnd;
  }

  // Auto-link: detect bare URLs after explicit tokens
  // Matches http://, https://, ftp://, and www. (which we expand to https://)
  const AUTO_LINK_REGEX = /(?:https?:\/\/[^\s<>"\]]+|www\.[^\s<>"\]]+)/g;
  let autoMatch: RegExpExecArray | null;
  while ((autoMatch = AUTO_LINK_REGEX.exec(text)) !== null) {
    const url = autoMatch[0];
    const s = autoMatch.index;
    const e = AUTO_LINK_REGEX.lastIndex;

    // Check this URL wasn't already captured as part of an explicit link token
    // (explicit [text](url) links take priority; bare URLs inside them are not re-linked)
    const insideExplicit = tokens.some(
      ([start, end, , , isLink]) => isLink && s >= start && e <= end,
    );
    if (!insideExplicit) {
      // Expand www. to https:// for the actual link
      const href = url.startsWith('www.') ? `https://${url}` : url;
      tokens.push([s, e, url, '', true, href]);
    }
  }

  // Sort tokens by start position
  tokens.sort((a, b) => a[0] - b[0]);

  // Build segments: [content, styles, isLink, href]
  type Segment = [string, Set<string>, boolean, string?];
  const segments: Segment[] = [];

  let pos = 0;
  for (const [start, end, content, styleStr, isLink, href] of tokens) {
    if (start > pos) {
      // Plain text gap — auto-link-detect within it
      const gap = text.slice(pos, start);
      const linkInGap = /(?:https?:\/\/[^\s<>"\]]+|www\.[^\s<>"\]]+)/g;
      let lm: RegExpExecArray | null;
      let gapPos = 0;
      while ((lm = linkInGap.exec(gap)) !== null) {
        if (lm.index > gapPos) {
          segments.push([gap.slice(gapPos, lm.index), new Set(), false]);
        }
        const url = lm[0];
        const urlHref = url.startsWith('www.') ? `https://${url}` : url;
        segments.push([url, new Set(), true, urlHref]);
        gapPos = linkInGap.lastIndex;
      }
      if (gapPos < gap.length) {
        segments.push([gap.slice(gapPos), new Set(), false]);
      }
    }

    if (isLink && href) {
      segments.push([content, new Set(), true, href]);
    } else if (styleStr) {
      segments.push([content, new Set(styleStr.split(',')), false]);
    } else {
      segments.push([content, new Set(), false]);
    }

    pos = end;
  }

  if (pos < text.length) {
    const tail = text.slice(pos);
    const linkInTail = /(?:https?:\/\/[^\s<>"\]]+|www\.[^\s<>"\]]+)/g;
    let lm: RegExpExecArray | null;
    let tailPos = 0;
    while ((lm = linkInTail.exec(tail)) !== null) {
      if (lm.index > tailPos) {
        segments.push([tail.slice(tailPos, lm.index), new Set(), false]);
      }
      const url = lm[0];
      const urlHref = url.startsWith('www.') ? `https://${url}` : url;
      segments.push([url, new Set(), true, urlHref]);
      tailPos = linkInTail.lastIndex;
    }
    if (tailPos < tail.length) {
      segments.push([tail.slice(tailPos), new Set(), false]);
    }
  }

  // Merge adjacent segments with identical (style + isLink) signature
  const merged: Segment[] = [];
  for (const seg of segments) {
    const top = merged[merged.length - 1];
    if (top && top[1].size === seg[1].size && [...top[1]].every((s) => seg[1].has(s)) && top[2] === seg[2] && top[2] === seg[2]) {
      // same link flag and same style set — merge
      top[0] += seg[0];
    } else {
      merged.push(seg);
    }
  }

  // Convert to TextElement[]
  const elements: TextElement[] = [];
  for (const [content, styles, isLink, href] of merged) {
    if (!content) continue;
    if (isLink && href) {
      elements.push({ text_run: { content, link: { url: href } } });
    } else {
      const style: TextElementStyle = {};
      if (styles.has('bold')) style.bold = true;
      if (styles.has('italic')) style.italic = true;
      if (styles.has('inline_code')) style.inline_code = true;
      if (styles.has('strikethrough')) style.strikethrough = true;
      if (styles.has('underline')) style.underline = true;
      const hasStyle = Object.keys(style).length > 0;
      elements.push({
        text_run: hasStyle ? { content, text_element_style: style } : { content },
      });
    }
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

  const h4 = trimmed.match(/^#### (.+)/);
  if (h4) {
    const content = h4[1]!.trim();
    return {
      block_type: BLOCK_TYPE.heading4,
      heading4: { elements: parseInlineSpans(content) },
    };
  }

  const h5 = trimmed.match(/^##### (.+)/);
  if (h5) {
    const content = h5[1]!.trim();
    return {
      block_type: BLOCK_TYPE.heading5,
      heading5: { elements: parseInlineSpans(content) },
    };
  }

  const h6 = trimmed.match(/^###### (.+)/);
  if (h6) {
    const content = h6[1]!.trim();
    return {
      block_type: BLOCK_TYPE.heading6,
      heading6: { elements: parseInlineSpans(content) },
    };
  }

  // Checkbox / todo: - [ ] or - [x]
  // Also supports indentation: "  - [ ] nested item" → indent_level 1
  // Match against original `line` (not `trimmed`) to preserve leading whitespace
  const todoMatch = line.match(/^(\s*)- \[([x ])\] (.+)/i);
  if (todoMatch) {
    const indent = todoMatch[1]!.length; // leading spaces before "-"
    const indentLevel = Math.floor(indent / 2); // 2 spaces = 1 level
    const checked = todoMatch[2]!.toLowerCase() === 'x';
    const content = todoMatch[3]!.trim();
    return {
      block_type: BLOCK_TYPE.todo,
      todo: {
        elements: parseInlineSpans(content),
        style: { done: checked, ...(indentLevel > 0 ? { indent_level: indentLevel } : {}) },
      },
    };
  }

  // Bullet list: - item  (supports indentation: "  - item" → indent_level 1)
  // Match against original `line` (not `trimmed`) to preserve leading whitespace
  const bulletMatch = line.match(/^(\s*)- (.+)/);
  if (bulletMatch) {
    const indent = bulletMatch[1]!.length;
    const indentLevel = Math.floor(indent / 2);
    const content = bulletMatch[2]!.trim();
    return {
      block_type: BLOCK_TYPE.bullet,
      bullet: {
        elements: parseInlineSpans(content),
        style: { ...(indentLevel > 0 ? { indent_level: indentLevel } : {}) },
      },
    };
  }

  // Ordered list: 1. item  (supports indentation: "  1. item" → indent_level 1)
  // Match against original `line` (not `trimmed`) to preserve leading whitespace
  const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)/);
  if (orderedMatch) {
    const indent = orderedMatch[1]!.length;
    const indentLevel = Math.floor(indent / 2);
    const content = orderedMatch[3]!.trim();
    return {
      block_type: BLOCK_TYPE.ordered,
      ordered: {
        elements: parseInlineSpans(content),
        style: { ...(indentLevel > 0 ? { indent_level: indentLevel } : {}) },
      },
    };
  }

  // Fenced code block: ``` language\n code \n``` or ```\ncode\n```
  // After pre-processing in buildDocBlockChildrenDraft, multi-line fences are joined
  // into a single string so classifyLine sees them as one unit.
  // Matches: ```js\ncode\n``` or ```\ncode\n```
  const codeFence = trimmed.match(/^```(\w*)\n([\s\S]*?)\n```$/);
  if (codeFence) {
    const lang = codeFence[1] ?? '';
    const codeContent = codeFence[2]!.trim();
    return {
      block_type: BLOCK_TYPE.code,
      code: {
        elements: [{ text_run: { content: codeContent } }],
        style: { language: getFeishuLanguageId(lang) },
      },
    };
  }

  // Inline code block: a line that is entirely `...` (backtick-wrapped, not a fenced block)
  const inlineCodeBlock = trimmed.match(/^`([^`]+)`$/);
  if (inlineCodeBlock) {
    return {
      block_type: BLOCK_TYPE.code,
      code: {
        elements: [{ text_run: { content: inlineCodeBlock[1]!, text_element_style: { inline_code: true } } }],
        style: { language: 1 }, // inline code blocks are always plain text
      },
    };
  }

  // Quote: > quote text
  const quote = trimmed.match(/^>\s+(.+)/);
  if (quote) {
    const content = quote[1]!.trim();
    return {
      block_type: BLOCK_TYPE.quote,
      quote: { elements: parseInlineSpans(content) },
    };
  }

  // Callout: >> [!<type>] text  (GFM-inspired syntax)
  // Supported types: info, warning, tip, success, danger, book
  // Maps to Feishu callout_type: 0=info, 1=warning, 2=danger, 3=bulb/tip, 4=success, 5=book
  const calloutMatch = trimmed.match(/^>>\s*\[!(info|warning|tip|success|danger|book)\]\s*(.+)/i);
  if (calloutMatch) {
    const type = calloutMatch[1]!.toLowerCase();
    const content = calloutMatch[2]!.trim();
    const typeMap: Record<string, { callout_type: number; icon_id: number; border_color: number }> = {
      info:    { callout_type: 0, icon_id: 1, border_color: 0 },
      warning: { callout_type: 1, icon_id: 2, border_color: 1 },
      danger:  { callout_type: 2, icon_id: 3, border_color: 2 },
      tip:     { callout_type: 3, icon_id: 4, border_color: 3 },
      success: { callout_type: 4, icon_id: 5, border_color: 4 },
      book:    { callout_type: 5, icon_id: 6, border_color: 5 },
    };
    const { callout_type, icon_id, border_color } = typeMap[type] ?? typeMap['info'];
    return {
      block_type: BLOCK_TYPE.callout,
      callout: {
        callout_type,
        icon_id,
        border_color,
        paragraph: { elements: parseInlineSpans(content) },
      },
    };
  }

  // Divider: --- or *** or ___
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
    return {
      block_type: BLOCK_TYPE.divider,
      divider: {},
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

  const rawLines = createDraft.initialContentMarkdown.split(/\r?\n/);

  // Pre-process lines: join lines that are inside fenced code blocks so
  // classifyLine sees the whole fence as one unit.
  // Fenced code block: opens with ``` (optionally followed by a language tag)
  // and closes with ``` (no language tag, on its own line).
  // Lines between (exclusive) are accumulated and joined with \n.
  const processedLines: string[] = [];
  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i]!;
    const openMatch = line.match(/^```(\w*)$/);
    if (openMatch && i + 1 < rawLines.length) {
      // Found opening fence. Collect lines until closing fence.
      const fenceLines: string[] = [line]; // opening fence line
      let closed = false;
      i++;
      while (i < rawLines.length) {
        const nextLine = rawLines[i]!;
        fenceLines.push(nextLine);
        if (nextLine === '```') {
          closed = true;
          break;
        }
        i++;
      }
      if (closed) {
        // Join the entire fence as one line so classifyLine can match it
        processedLines.push(fenceLines.join('\n'));
      } else {
        // Unclosed fence — push lines individually (fallback)
        for (const fl of fenceLines) processedLines.push(fl);
      }
    } else {
      processedLines.push(line);
    }
    i++;
  }

  const children = processedLines
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
      'Supported block types: paragraph, heading1/2/3/4/5/6, bullet list, ordered list,',
      '  todo (checked and unchecked), fenced code block (```...```), inline code block (`code`),',
      '  quote (> text), divider (---), and callout blocks (>> [!type] text).',
      '  Callout types: info, warning, tip, success, danger, book.',
      'Supported inline formatting: bold (**text**), italic (*text*), underline (__text__),',
      '  inline code (`text`), strikethrough (~~text~~), explicit links ([text](url)),',
      '  and bare URL auto-link (https://… or www.… → clickable link).',
      'Adjacent spans with the same non-link style are merged into a single text_run.',
      'Heading text also supports all inline spans above.',
    ],
  };
}
