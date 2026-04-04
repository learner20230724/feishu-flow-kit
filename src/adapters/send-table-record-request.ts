import { withRetry, type RetryOptions } from '../core/retry.js';
import type { TableRecordDraft } from './build-table-record-draft.js';

export interface SendTableRecordRequestOptions {
  tenantAccessToken: string;
  draft: TableRecordDraft;
  appToken: string;
  tableId: string;
  fetchImpl?: typeof fetch;
  retry?: RetryOptions;
}

export interface SendTableRecordRequestResult {
  ok: boolean;
  recordId?: string;
  raw: Record<string, unknown>;
}

interface FeishuTableRecordResponse {
  code?: number;
  msg?: string;
  data?: {
    record?: {
      record_id?: string;
    };
  };
}

class FeishuTableRecordError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: number | undefined,
  ) {
    super(message);
    this.name = 'FeishuTableRecordError';
  }
}

function resolveEndpoint(template: string, appToken: string, tableId: string) {
  return template
    .replace('{app_token}', encodeURIComponent(appToken))
    .replace('{table_id}', encodeURIComponent(tableId));
}

export async function sendTableRecordRequest(
  options: SendTableRecordRequestOptions,
): Promise<SendTableRecordRequestResult> {
  const tenantAccessToken = options.tenantAccessToken.trim();
  if (!tenantAccessToken) {
    throw new Error(
      'Missing tenant access token for table record creation.',
    );
  }

  const appToken = options.appToken.trim();
  const tableId = options.tableId.trim();
  if (!appToken || !tableId) {
    throw new Error(
      'Missing FEISHU_BITABLE_APP_TOKEN or FEISHU_BITABLE_TABLE_ID for table record creation.',
    );
  }

  const endpoint = resolveEndpoint(options.draft.endpoint, appToken, tableId);
  const fetchImpl = options.fetchImpl ?? fetch;
  const retryOpts = options.retry ?? { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 8000 };

  const { value } = await withRetry(
    async (attempt) => {
      const headers: Record<string, string> = {
        authorization: `Bearer ${tenantAccessToken}`,
        'content-type': 'application/json; charset=utf-8',
      };
      if (attempt > 1) headers['x-retry-attempt'] = String(attempt);

      const response = await fetchImpl(`https://open.feishu.cn${endpoint}`, {
        method: options.draft.method,
        headers,
        body: JSON.stringify(options.draft.body),
      });

      const payload = (await response.json()) as FeishuTableRecordResponse;

      if (!response.ok) {
        throw new FeishuTableRecordError(
          `HTTP ${response.status}`,
          response.status,
          payload.code,
        );
      }

      if (payload.code !== 0) {
        throw new FeishuTableRecordError(
          payload.msg || 'Feishu API error',
          response.status,
          payload.code,
        );
      }

      return {
        ok: true,
        recordId: payload.data?.record?.record_id,
        raw: (payload as Record<string, unknown>) ?? {},
      };
    },
    retryOpts,
  );

  return value;
}
