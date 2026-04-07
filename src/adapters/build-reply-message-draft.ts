export interface FeishuReplyMessageDraft {
  endpoint: string;
  method: 'POST';
  pathParams: {
    message_id: string;
  };
  body: {
    content: string;
    msg_type: 'text' | 'interactive';
  };
}

function normalizeReplyText(text: string) {
  return text.trim() || 'Acknowledged.';
}

/**
 * Detect whether a stringified JSON payload is a Feishu interactive card.
 * Accepts payloads with `msg_type === 'interactive'` or a top-level `card` key.
 */
function isFeishuCardPayload(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return false;
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    return obj.msg_type === 'interactive' || (typeof obj.card === 'object' && obj.card !== null);
  } catch {
    return false;
  }
}

export function buildReplyMessageDraft(messageId: string, replyText: string): FeishuReplyMessageDraft {
  const normalizedReplyText = normalizeReplyText(replyText);
  const isCard = isFeishuCardPayload(normalizedReplyText);

  return {
    endpoint: `/open-apis/im/v1/messages/${messageId}/reply`,
    method: 'POST',
    pathParams: {
      message_id: messageId,
    },
    body: {
      msg_type: isCard ? 'interactive' : 'text',
      content: isCard
        ? normalizedReplyText
        : JSON.stringify({ text: normalizedReplyText }),
    },
  };
}
