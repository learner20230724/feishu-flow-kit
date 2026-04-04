export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type TableListFieldMode = 'text' | 'single_select' | 'multi_select';
export type TableOwnerFieldMode = 'text' | 'user';
export type TableEstimateFieldMode = 'text' | 'number';
export type TableDueFieldMode = 'text' | 'date' | 'datetime';
export type TableDoneFieldMode = 'text' | 'checkbox';
export type TableAttachmentFieldMode = 'text' | 'attachment';
export type TableLinkFieldMode = 'text' | 'linked_record';

export interface AppConfig {
  appId: string;
  appSecret: string;
  botName: string;
  mockMode: boolean;
  mockEventPath: string;
  logLevel: LogLevel;
  webhookPort: number;
  webhookSecret: string;
  webhookSignatureToleranceSeconds: number;
  enableOutboundReply: boolean;
  enableDocCreate: boolean;
  enableTableCreate: boolean;
  bitableAppToken: string;
  bitableTableId: string;
  bitableListFieldMode: TableListFieldMode;
  bitableOwnerFieldMode: TableOwnerFieldMode;
  bitableEstimateFieldMode: TableEstimateFieldMode;
  bitableDueFieldMode: TableDueFieldMode;
  bitableDoneFieldMode: TableDoneFieldMode;
  bitableAttachmentFieldMode: TableAttachmentFieldMode;
  bitableLinkFieldMode: TableLinkFieldMode;
  bitableTitleFieldName: string;
  bitableListFieldName: string;
  bitableDetailsFieldName: string;
  bitableOwnerFieldName: string;
  bitableEstimateFieldName: string;
  bitableDueFieldName: string;
  bitableDoneFieldName: string;
  bitableAttachmentFieldName: string;
  bitableLinkedRecordsFieldName: string;
  bitableSourceCommandFieldName: string;
}

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function parseBoolean(value: string | undefined, defaultValue = false) {
  if (value == null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseLogLevel(value: string | undefined): LogLevel {
  if (!value) return 'info';
  if (LOG_LEVELS.includes(value as LogLevel)) return value as LogLevel;
  throw new Error(`Invalid LOG_LEVEL: ${value}`);
}

function parsePort(value: string | undefined, defaultValue: number) {
  if (!value) return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid FEISHU_WEBHOOK_PORT: ${value}`);
  }
  return parsed;
}

function parsePositiveInteger(
  value: string | undefined,
  envName: string,
  defaultValue: number,
) {
  if (!value) return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid ${envName}: ${value}`);
  }
  return parsed;
}

function parseTableListFieldMode(value: string | undefined): TableListFieldMode {
  if (!value) return 'text';
  if (value === 'text' || value === 'single_select' || value === 'multi_select') return value;
  throw new Error(`Invalid FEISHU_BITABLE_LIST_FIELD_MODE: ${value}`);
}

function parseTableOwnerFieldMode(value: string | undefined): TableOwnerFieldMode {
  if (!value) return 'text';
  if (value === 'text' || value === 'user') return value;
  throw new Error(`Invalid FEISHU_BITABLE_OWNER_FIELD_MODE: ${value}`);
}

function parseTableEstimateFieldMode(value: string | undefined): TableEstimateFieldMode {
  if (!value) return 'text';
  if (value === 'text' || value === 'number') return value;
  throw new Error(`Invalid FEISHU_BITABLE_ESTIMATE_FIELD_MODE: ${value}`);
}

function parseTableDueFieldMode(value: string | undefined): TableDueFieldMode {
  if (!value) return 'text';
  if (value === 'text' || value === 'date' || value === 'datetime') return value;
  throw new Error(`Invalid FEISHU_BITABLE_DUE_FIELD_MODE: ${value}`);
}

function parseTableDoneFieldMode(value: string | undefined): TableDoneFieldMode {
  if (!value) return 'text';
  if (value === 'text' || value === 'checkbox') return value;
  throw new Error(`Invalid FEISHU_BITABLE_DONE_FIELD_MODE: ${value}`);
}

function parseTableAttachmentFieldMode(value: string | undefined): TableAttachmentFieldMode {
  if (!value) return 'text';
  if (value === 'text' || value === 'attachment') return value;
  throw new Error(`Invalid FEISHU_BITABLE_ATTACHMENT_FIELD_MODE: ${value}`);
}

function parseTableLinkFieldMode(value: string | undefined): TableLinkFieldMode {
  if (!value) return 'text';
  if (value === 'text' || value === 'linked_record') return value;
  throw new Error(`Invalid FEISHU_BITABLE_LINK_FIELD_MODE: ${value}`);
}

function parseFieldName(value: string | undefined, defaultValue: string) {
  const trimmed = value?.trim();
  return trimmed || defaultValue;
}

function validateConfig(config: AppConfig): void {
  const errors: string[] = [];

  if (!config.mockMode) {
    if (!config.appId) errors.push('FEISHU_APP_ID is required in production mode');
    if (!config.appSecret) errors.push('FEISHU_APP_SECRET is required in production mode');
    if (!config.webhookSecret) errors.push('FEISHU_WEBHOOK_SECRET is required in production mode');
  }

  if (config.enableTableCreate && !config.mockMode) {
    if (!config.bitableAppToken) {
      errors.push('FEISHU_BITABLE_APP_TOKEN is required when FEISHU_ENABLE_TABLE_CREATE=true');
    }
    if (!config.bitableTableId) {
      errors.push('FEISHU_BITABLE_TABLE_ID is required when FEISHU_ENABLE_TABLE_CREATE=true');
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration error:\n  - ${errors.join('\n  - ')}\n` +
      `Set FEISHU_MOCK_MODE=true to run without Feishu credentials.`,
    );
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config: AppConfig = {
    appId: env.FEISHU_APP_ID ?? '',
    appSecret: env.FEISHU_APP_SECRET ?? '',
    botName: env.FEISHU_BOT_NAME ?? 'feishu-flow-kit',
    mockMode: parseBoolean(env.FEISHU_MOCK_MODE, true),
    mockEventPath: env.FEISHU_MOCK_EVENT_PATH ?? 'examples/mock-message-event.json',
    logLevel: parseLogLevel(env.LOG_LEVEL),
    webhookPort: parsePort(env.FEISHU_WEBHOOK_PORT, 8787),
    webhookSecret: env.FEISHU_WEBHOOK_SECRET ?? '',
    webhookSignatureToleranceSeconds: parsePositiveInteger(
      env.FEISHU_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS,
      'FEISHU_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS',
      300,
    ),
    enableOutboundReply: parseBoolean(env.FEISHU_ENABLE_OUTBOUND_REPLY, false),
    enableDocCreate: parseBoolean(env.FEISHU_ENABLE_DOC_CREATE, false),
    enableTableCreate: parseBoolean(env.FEISHU_ENABLE_TABLE_CREATE, false),
    bitableAppToken: env.FEISHU_BITABLE_APP_TOKEN ?? '',
    bitableTableId: env.FEISHU_BITABLE_TABLE_ID ?? '',
    bitableListFieldMode: parseTableListFieldMode(env.FEISHU_BITABLE_LIST_FIELD_MODE),
    bitableOwnerFieldMode: parseTableOwnerFieldMode(env.FEISHU_BITABLE_OWNER_FIELD_MODE),
    bitableEstimateFieldMode: parseTableEstimateFieldMode(env.FEISHU_BITABLE_ESTIMATE_FIELD_MODE),
    bitableDueFieldMode: parseTableDueFieldMode(env.FEISHU_BITABLE_DUE_FIELD_MODE),
    bitableDoneFieldMode: parseTableDoneFieldMode(env.FEISHU_BITABLE_DONE_FIELD_MODE),
    bitableAttachmentFieldMode: parseTableAttachmentFieldMode(env.FEISHU_BITABLE_ATTACHMENT_FIELD_MODE),
    bitableLinkFieldMode: parseTableLinkFieldMode(env.FEISHU_BITABLE_LINK_FIELD_MODE),
    bitableTitleFieldName: parseFieldName(env.FEISHU_BITABLE_TITLE_FIELD_NAME, 'Title'),
    bitableListFieldName: parseFieldName(env.FEISHU_BITABLE_LIST_FIELD_NAME, 'List'),
    bitableDetailsFieldName: parseFieldName(env.FEISHU_BITABLE_DETAILS_FIELD_NAME, 'Details'),
    bitableOwnerFieldName: parseFieldName(env.FEISHU_BITABLE_OWNER_FIELD_NAME, 'Owner'),
    bitableEstimateFieldName: parseFieldName(env.FEISHU_BITABLE_ESTIMATE_FIELD_NAME, 'Estimate'),
    bitableDueFieldName: parseFieldName(env.FEISHU_BITABLE_DUE_FIELD_NAME, 'Due'),
    bitableDoneFieldName: parseFieldName(env.FEISHU_BITABLE_DONE_FIELD_NAME, 'Done'),
    bitableAttachmentFieldName: parseFieldName(env.FEISHU_BITABLE_ATTACHMENT_FIELD_NAME, 'Attachment'),
    bitableLinkedRecordsFieldName: parseFieldName(env.FEISHU_BITABLE_LINKED_RECORDS_FIELD_NAME, 'LinkedRecords'),
    bitableSourceCommandFieldName: parseFieldName(env.FEISHU_BITABLE_SOURCE_COMMAND_FIELD_NAME, 'SourceCommand'),
  };

  validateConfig(config);
  return config;
}
