import type { AppConfig } from '../config/load-config.js';
import {
  buildDocBlockChildrenDraft,
  type FeishuDocBlockChildrenDraft,
} from './build-doc-block-children-draft.js';
import type { FeishuDocCreateDraft } from './build-doc-create-draft.js';
import {
  fetchTenantAccessToken,
  InMemoryFeishuTenantAccessTokenCache,
} from './fetch-tenant-access-token.js';
import {
  sendDocBlockChildrenRequest,
  type SendDocBlockChildrenRequestResult,
} from './send-doc-block-children-request.js';
import {
  sendDocCreateRequest,
  type SendDocCreateRequestResult,
} from './send-doc-create-request.js';

type DocCreateConfig = Pick<AppConfig, 'appId' | 'appSecret' | 'enableDocCreate'>;

export interface MaybeCreateDocBlockAppendResult {
  attempted: boolean;
  draft?: FeishuDocBlockChildrenDraft;
  response?: SendDocBlockChildrenRequestResult;
  skippedReason?: string;
}

export interface MaybeCreateDocResponse extends SendDocCreateRequestResult {
  blockAppend?: MaybeCreateDocBlockAppendResult;
}

export interface MaybeCreateDocResult {
  attempted: boolean;
  skippedReason?: string;
  response?: MaybeCreateDocResponse;
}

const tenantAccessTokenCache = new InMemoryFeishuTenantAccessTokenCache();

export async function maybeCreateDoc(
  config: DocCreateConfig,
  draft: FeishuDocCreateDraft,
  fetchImpl?: typeof fetch,
): Promise<MaybeCreateDocResult> {
  if (!config.enableDocCreate) {
    return {
      attempted: false,
      skippedReason: 'FEISHU_ENABLE_DOC_CREATE is disabled.',
    };
  }

  const tokenResult = await fetchTenantAccessToken({
    appId: config.appId,
    appSecret: config.appSecret,
    fetchImpl,
    cache: tenantAccessTokenCache,
  });

  const response = await sendDocCreateRequest({
    tenantAccessToken: tokenResult.token,
    draft,
    fetchImpl,
  });

  let blockAppend: MaybeCreateDocBlockAppendResult | undefined;

  if (response.documentId) {
    const blockAppendDraft = buildDocBlockChildrenDraft(response.documentId, draft);
    blockAppend = {
      attempted: true,
      draft: blockAppendDraft,
      response: await sendDocBlockChildrenRequest({
        tenantAccessToken: tokenResult.token,
        draft: blockAppendDraft,
        fetchImpl,
      }),
    };
  } else {
    blockAppend = {
      attempted: false,
      skippedReason: 'Doc create response did not include documentId.',
    };
  }

  return {
    attempted: true,
    response: {
      ...response,
      blockAppend,
    },
  };
}
