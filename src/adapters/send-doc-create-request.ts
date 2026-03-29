import type { FeishuDocCreateDraft } from './build-doc-create-draft.js';

export interface SendDocCreateRequestOptions {
  tenantAccessToken: string;
  draft: FeishuDocCreateDraft;
  fetchImpl?: typeof fetch;
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

export async function sendDocCreateRequest(
  options: SendDocCreateRequestOptions,
): Promise<SendDocCreateRequestResult> {
  const tenantAccessToken = options.tenantAccessToken.trim();
  if (!tenantAccessToken) {
    throw new Error('Missing tenant access token for doc creation.');
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

  const payload = (await response.json()) as FeishuDocCreateResponse;

  if (!response.ok) {
    throw new Error(`Failed to create Feishu doc: HTTP ${response.status}`);
  }

  if (payload.code !== 0) {
    throw new Error(payload.msg || 'Failed to create Feishu doc.');
  }

  return {
    ok: true,
    documentId: payload.data?.document?.document_id,
    url: payload.data?.document?.url,
    raw: (payload as Record<string, unknown>) ?? {},
  };
}
