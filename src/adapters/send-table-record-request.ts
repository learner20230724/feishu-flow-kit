import type { TableRecordDraft } from './build-table-record-draft.js';

export interface SendTableRecordRequestOptions {
  tenantAccessToken: string;
  draft: TableRecordDraft;
  appToken: string;
  tableId: string;
  fetchImpl?: typeof fetch;
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
    throw new Error('Missing tenant access token for table record creation.');
  }

  const appToken = options.appToken.trim();
  const tableId = options.tableId.trim();
  if (!appToken || !tableId) {
    throw new Error('Missing FEISHU_BITABLE_APP_TOKEN or FEISHU_BITABLE_TABLE_ID for table record creation.');
  }

  const endpoint = resolveEndpoint(options.draft.endpoint, appToken, tableId);
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`https://open.feishu.cn${endpoint}`, {
    method: options.draft.method,
    headers: {
      authorization: `Bearer ${tenantAccessToken}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(options.draft.body),
  });

  const payload = (await response.json()) as FeishuTableRecordResponse;

  if (!response.ok) {
    throw new Error(`Failed to create Feishu table record: HTTP ${response.status}`);
  }

  if (payload.code !== 0) {
    throw new Error(payload.msg || 'Failed to create Feishu table record.');
  }

  return {
    ok: true,
    recordId: payload.data?.record?.record_id,
    raw: (payload as Record<string, unknown>) ?? {},
  };
}
