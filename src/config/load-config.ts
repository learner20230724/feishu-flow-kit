export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type TableListFieldMode = 'text' | 'single_select';
export type TableOwnerFieldMode = 'text' | 'user';
export type TableEstimateFieldMode = 'text' | 'number';
export type TableDueFieldMode = 'text' | 'date' | 'datetime';

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
  if (value === 'text' || value === 'single_select') return value;
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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
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
  };
}
