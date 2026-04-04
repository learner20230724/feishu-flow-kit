import { withRetry, type RetryOptions } from '../core/retry.js';
import type { FeishuReplyMessageDraft } from './build-reply-message-draft.js';

export interface SendReplyMessageOptions {
  tenantAccessToken: string;
  draft: FeishuReplyMessageDraft;
  fetchImpl?: typeof fetch;
  retry?: RetryOptions;
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

class FeishuReplyError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: number | undefined,
  ) {
    super(message);
    this.name = 'FeishuReplyError';
  }
}

export async function sendReplyMessage(
  options: SendReplyMessageOptions,
): Promise<SendReplyMessageResult> {
  const tenantAccessToken = options.tenantAccessToken.trim();
  if (!tenantAccessToken) {
    throw new Error('Missing tenant access token for reply sending.');
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const retryOpts = options.retry ?? { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 8000 };

  const { value } = await withRetry(
    async (attempt) => {
      const headers: Record<string, string> = {
        authorization: `Bearer ${tenantAccessToken}`,
        'content-type': 'application/json; charset=utf-8',
      };
      if (attempt > 1) headers['x-retry-attempt'] = String(attempt);

      const response = await fetchImpl(
        `https://open.feishu.cn${options.draft.endpoint}`,
        {
          method: options.draft.method,
          headers,
          body: JSON.stringify(options.draft.body),
        },
      );

      const payload = (await response.json()) as FeishuReplyMessageResponse;

      if (!response.ok) {
        const err = new FeishuReplyError(
          `HTTP ${response.status}`,
          response.status,
          payload.code,
        );
        throw err;
      }

      if (payload.code !== 0) {
        const err = new FeishuReplyError(
          payload.msg || 'Feishu API error',
          response.status,
          payload.code,
        );
        throw err;
      }

      return {
        ok: true,
        messageId: payload.data?.message_id,
        raw: (payload as Record<string, unknown>) ?? {},
      };
    },
    { ...retryOpts },
  );

  return value;
}
