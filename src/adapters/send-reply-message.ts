import type { FeishuReplyMessageDraft } from './build-reply-message-draft.js';

export interface SendReplyMessageOptions {
  tenantAccessToken: string;
  draft: FeishuReplyMessageDraft;
  fetchImpl?: typeof fetch;
}

export interface SendReplyMessageResult {
  ok: boolean;
  messageId?: string;
  raw: Record<string, unknown>;
}

interface FeishuReplyMessageResponse {
  code?: number;
  msg?: string;
  data?: {
    message_id?: string;
  };
}

export async function sendReplyMessage(
  options: SendReplyMessageOptions,
): Promise<SendReplyMessageResult> {
  const tenantAccessToken = options.tenantAccessToken.trim();
  if (!tenantAccessToken) {
    throw new Error('Missing tenant access token for reply sending.');
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`https://open.feishu.cn${options.draft.endpoint}`, {
    method: options.draft.method,
    headers: {
      authorization: `Bearer ${tenantAccessToken}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(options.draft.body),
  });

  const payload = (await response.json()) as FeishuReplyMessageResponse;

  if (!response.ok) {
    throw new Error(`Failed to send Feishu reply message: HTTP ${response.status}`);
  }

  if (payload.code !== 0) {
    throw new Error(payload.msg || 'Failed to send Feishu reply message.');
  }

  return {
    ok: true,
    messageId: payload.data?.message_id,
    raw: (payload as Record<string, unknown>) ?? {},
  };
}
