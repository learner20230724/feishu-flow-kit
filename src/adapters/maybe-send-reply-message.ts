import type { AppConfig } from '../config/load-config.js';
import type { RetryOptions } from '../core/retry.js';
import type { FeishuReplyMessageDraft } from './build-reply-message-draft.js';
import {
  fetchTenantAccessToken,
  InMemoryFeishuTenantAccessTokenCache,
} from './fetch-tenant-access-token.js';
import { sendReplyMessage, type SendReplyMessageResult } from './send-reply-message.js';

type OutboundReplyConfig = Pick<AppConfig, 'appId' | 'appSecret' | 'enableOutboundReply'>;

export interface MaybeSendReplyMessageResult {
  attempted: boolean;
  skippedReason?: string;
  response?: SendReplyMessageResult;
}

const tenantAccessTokenCache = new InMemoryFeishuTenantAccessTokenCache();

export async function maybeSendReplyMessage(
  config: OutboundReplyConfig,
  draft: FeishuReplyMessageDraft,
  fetchImpl?: typeof fetch,
  retryOpts?: RetryOptions,
): Promise<MaybeSendReplyMessageResult> {
  if (!config.enableOutboundReply) {
    return {
      attempted: false,
      skippedReason: 'FEISHU_ENABLE_OUTBOUND_REPLY is disabled.',
    };
  }

  const tokenResult = await fetchTenantAccessToken({
    appId: config.appId,
    appSecret: config.appSecret,
    fetchImpl,
    cache: tenantAccessTokenCache,
  });

  const response = await sendReplyMessage(
    {
      tenantAccessToken: tokenResult.token,
      draft,
      fetchImpl,
      retry: retryOpts,
    },
  );

  return {
    attempted: true,
    response,
  };
}
