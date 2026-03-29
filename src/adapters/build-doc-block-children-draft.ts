import type { FeishuDocCreateDraft } from './build-doc-create-draft.js';

export interface FeishuDocParagraphBlock {
  block_type: 2;
  paragraph: {
    elements: Array<{
      text_run: {
        content: string;
      };
    }>;
  };
}

export interface FeishuDocBlockChildrenDraft {
  endpoint: string;
  method: 'POST';
  body: {
    children: FeishuDocParagraphBlock[];
    index: number;
  };
  sourceMarkdown: string;
  notes: string[];
}

function normalizeMarkdownLines(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function toParagraphContent(line: string) {
  return line.replace(/^#{1,6}\s+/, '').replace(/^- \[ \]\s+/, 'TODO: ');
}

export function buildDocBlockChildrenDraft(
  documentId: string,
  createDraft: FeishuDocCreateDraft,
): FeishuDocBlockChildrenDraft {
  const cleanDocumentId = documentId.trim();
  if (!cleanDocumentId) {
    throw new Error('Missing document id for block append draft.');
  }

  const children = normalizeMarkdownLines(createDraft.initialContentMarkdown).map((line) => ({
    block_type: 2 as const,
    paragraph: {
      elements: [
        {
          text_run: {
            content: toParagraphContent(line),
          },
        },
      ],
    },
  }));

  return {
    endpoint: `/open-apis/docx/v1/documents/${cleanDocumentId}/blocks/${cleanDocumentId}/children`,
    method: 'POST',
    body: {
      children,
      index: 0,
    },
    sourceMarkdown: createDraft.initialContentMarkdown,
    notes: [
      'This starter adapter converts markdown lines into plain paragraph blocks only.',
      'It currently strips lightweight markdown markers instead of preserving rich formatting.',
    ],
  };
}
