export interface FeishuReplyMessageDraft {
  endpoint: string;
  method: 'POST';
  pathParams: {
    message_id: string;
  };
  body: {
    content: string;
    msg_type: 'text';
  };
}

function normalizeReplyText(text: string) {
  return text.trim() || 'Acknowledged.';
}

export function buildReplyMessageDraft(messageId: string, replyText: string): FeishuReplyMessageDraft {
  const normalizedReplyText = normalizeReplyText(replyText);

  return {
    endpoint: `/open-apis/im/v1/messages/${messageId}/reply`,
    method: 'POST',
    pathParams: {
      message_id: messageId,
    },
    body: {
      msg_type: 'text',
      content: JSON.stringify({
        text: normalizedReplyText,
      }),
    },
  };
}
