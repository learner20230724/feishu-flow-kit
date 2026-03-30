import type { AppConfig } from '../config/load-config.js';
import type { TableRecordDraft } from './build-table-record-draft.js';
import {
  fetchTenantAccessToken,
  InMemoryFeishuTenantAccessTokenCache,
} from './fetch-tenant-access-token.js';
import {
  sendTableRecordRequest,
  type SendTableRecordRequestResult,
} from './send-table-record-request.js';

type TableCreateConfig = Pick<
  AppConfig,
  'appId' | 'appSecret' | 'enableTableCreate' | 'bitableAppToken' | 'bitableTableId'
>;

export interface MaybeCreateTableRecordResult {
  attempted: boolean;
  skippedReason?: string;
  response?: SendTableRecordRequestResult;
}

const tenantAccessTokenCache = new InMemoryFeishuTenantAccessTokenCache();

export async function maybeCreateTableRecord(
  config: TableCreateConfig,
  draft: TableRecordDraft,
  fetchImpl?: typeof fetch,
): Promise<MaybeCreateTableRecordResult> {
  if (!config.enableTableCreate) {
    return {
      attempted: false,
      skippedReason: 'FEISHU_ENABLE_TABLE_CREATE is disabled.',
    };
  }

  if (!config.bitableAppToken.trim() || !config.bitableTableId.trim()) {
    return {
      attempted: false,
      skippedReason:
        'Missing FEISHU_BITABLE_APP_TOKEN or FEISHU_BITABLE_TABLE_ID for table record creation.',
    };
  }

  const tokenResult = await fetchTenantAccessToken({
    appId: config.appId,
    appSecret: config.appSecret,
    fetchImpl,
    cache: tenantAccessTokenCache,
  });

  const response = await sendTableRecordRequest({
    tenantAccessToken: tokenResult.token,
    draft,
    appToken: config.bitableAppToken,
    tableId: config.bitableTableId,
    fetchImpl,
  });

  return {
    attempted: true,
    response,
  };
}
