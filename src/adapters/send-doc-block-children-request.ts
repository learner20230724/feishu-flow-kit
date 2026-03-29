import type { FeishuDocBlockChildrenDraft } from './build-doc-block-children-draft.js';

export interface SendDocBlockChildrenRequestOptions {
  tenantAccessToken: string;
  draft: FeishuDocBlockChildrenDraft;
  fetchImpl?: typeof fetch;
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

export async function sendDocBlockChildrenRequest(
  options: SendDocBlockChildrenRequestOptions,
): Promise<SendDocBlockChildrenRequestResult> {
  const tenantAccessToken = options.tenantAccessToken.trim();
  if (!tenantAccessToken) {
    throw new Error('Missing tenant access token for doc block append.');
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

  const payload = (await response.json()) as FeishuDocBlockChildrenResponse;

  if (!response.ok) {
    throw new Error(`Failed to append Feishu doc blocks: HTTP ${response.status}`);
  }

  if (payload.code !== 0) {
    throw new Error(payload.msg || 'Failed to append Feishu doc blocks.');
  }

  return {
    ok: true,
    blockIds: (payload.data?.children ?? [])
      .map((child) => child.block_id?.trim())
      .filter((blockId): blockId is string => Boolean(blockId)),
    raw: (payload as Record<string, unknown>) ?? {},
  };
}
