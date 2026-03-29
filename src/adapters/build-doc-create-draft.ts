export interface FeishuDocCreateDraft {
  endpoint: '/open-apis/docx/v1/documents';
  method: 'POST';
  body: {
    title: string;
  };
  initialContentMarkdown: string;
  notes: string[];
}

function normalizeTitle(topic: string) {
  const clean = topic.trim();
  if (!clean) return 'Untitled note';
  return clean.length <= 120 ? clean : `${clean.slice(0, 117)}...`;
}

export function buildDocCreateDraft(
  topic: string,
  markdownContent: string,
): FeishuDocCreateDraft {
  const title = normalizeTitle(topic);

  return {
    endpoint: '/open-apis/docx/v1/documents',
    method: 'POST',
    body: {
      title,
    },
    initialContentMarkdown: markdownContent,
    notes: [
      'This starter draft only covers the document creation request.',
      'The markdown content is returned separately so a later adapter can append blocks or convert it into richer docx operations.',
    ],
  };
}
