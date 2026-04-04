import { withRetry, type RetryOptions } from '../core/retry.js';
import type { FeishuDocBlockChildrenDraft } from './build-doc-block-children-draft.js';

export interface SendDocBlockChildrenRequestOptions {
  tenantAccessToken: string;
  draft: FeishuDocBlockChildrenDraft;
  fetchImpl?: typeof fetch;
  retry?: RetryOptions;
}

export interface SendDocBlockChildrenRequestResult {
  ok: boolean;
  blockIds: string[];
  raw: Record<string, unknown>;
}

interface FeishuDocBlockChildrenResponse {
  code?: number;
  msg?: string;
  data?: {
    children?: Array<{
      block_id?: string;
    }>;
  };
}

class FeishuDocBlockError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: number | undefined,
  ) {
    super(message);
    this.name = 'FeishuDocBlockError';
  }
}

export async function sendDocBlockChildrenRequest(
  options: SendDocBlockChildrenRequestOptions,
): Promise<SendDocBlockChildrenRequestResult> {
  const tenantAccessToken = options.tenantAccessToken.trim();
  if (!tenantAccessToken) {
    throw new Error('Missing tenant access token for doc block append.');
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

      const payload = (await response.json()) as FeishuDocBlockChildrenResponse;

      if (!response.ok) {
        throw new FeishuDocBlockError(
          `HTTP ${response.status}`,
          response.status,
          payload.code,
        );
      }

      if (payload.code !== 0) {
        throw new FeishuDocBlockError(
          payload.msg || 'Feishu API error',
          response.status,
          payload.code,
        );
      }

      return {
        ok: true,
        blockIds: (payload.data?.children ?? [])
          .map((child) => child.block_id?.trim())
          .filter((blockId): blockId is string => Boolean(blockId)),
        raw: (payload as Record<string, unknown>) ?? {},
      };
    },
    retryOpts,
  );

  return value;
}
