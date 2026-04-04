import type { AppConfig } from '../config/load-config.js';
import type { TableRecordDraft } from './build-table-record-draft.js';
import {
  createTableRecordWithSchema,
  type CreateTableRecordWithSchemaResult,
} from './create-table-record-with-schema.js';

type TableCreateConfig = Pick<
  AppConfig,
  'appId' | 'appSecret' | 'enableTableCreate' | 'bitableAppToken' | 'bitableTableId'
>;

export interface MaybeCreateTableRecordResult {
  attempted: boolean;
  skippedReason?: string;
  response?: CreateTableRecordWithSchemaResult;
}

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

  // Use schema-aware creation: fetches live Bitable schema and maps field names → field IDs
  const response = await createTableRecordWithSchema(
    {
      appId: config.appId,
      appSecret: config.appSecret,
      appToken: config.bitableAppToken,
      tableId: config.bitableTableId,
      draft,
      fetchImpl,
    },
  );

  return {
    attempted: true,
    response,
  };
}
