import { withRetry, type RetryOptions } from '../core/retry.js';
import type { FeishuDocCreateDraft } from './build-doc-create-draft.js';

export interface SendDocCreateRequestOptions {
  tenantAccessToken: string;
  draft: FeishuDocCreateDraft;
  fetchImpl?: typeof fetch;
  retry?: RetryOptions;
}

export interface SendDocCreateRequestResult {
  ok: boolean;
  documentId?: string;
  url?: string;
  raw: Record<string, unknown>;
}

interface FeishuDocCreateResponse {
  code?: number;
  msg?: string;
  data?: {
    document?: {
      document_id?: string;
      url?: string;
    };
  };
}

class FeishuDocError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: number | undefined,
  ) {
    super(message);
    this.name = 'FeishuDocError';
  }
}

export async function sendDocCreateRequest(
  options: SendDocCreateRequestOptions,
): Promise<SendDocCreateRequestResult> {
  const tenantAccessToken = options.tenantAccessToken.trim();
  if (!tenantAccessToken) {
    throw new Error('Missing tenant access token for doc creation.');
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

      const response = await fetchImpl(`https://open.feishu.cn${options.draft.endpoint}`, {
        method: options.draft.method,
        headers,
        body: JSON.stringify(options.draft.body),
      });

      const payload = (await response.json()) as FeishuDocCreateResponse;

      if (!response.ok) {
        throw new FeishuDocError(`HTTP ${response.status}`, response.status, payload.code);
      }

      if (payload.code !== 0) {
        throw new FeishuDocError(payload.msg || 'Feishu API error', response.status, payload.code);
      }

      return {
        ok: true,
        documentId: payload.data?.document?.document_id,
        url: payload.data?.document?.url,
        raw: (payload as Record<string, unknown>) ?? {},
      };
    },
    retryOpts,
  );

  return value;
}
