export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type TableListFieldMode = 'text' | 'single_select' | 'multi_select';
export type TableOwnerFieldMode = 'text' | 'user';
export type TableEstimateFieldMode = 'text' | 'number';
export type TableDueFieldMode = 'text' | 'date' | 'datetime';
export type TableDoneFieldMode = 'text' | 'checkbox';
export type TableAttachmentFieldMode = 'text' | 'attachment';
export type TableLinkFieldMode = 'text' | 'linked_record';

/**
 * Per-tenant configuration. Each Feishu app (tenant) that sends webhooks to
 * this server needs a TenantConfig entry so the correct credentials are used
 * for API calls and the correct feature flags are applied.
 */
export interface TenantConfig {
  /** Feishu's tenant_key, as found in the webhook payload header `header.tenant_key`. */
  tenantKey: string;
  appId: string;
  appSecret: string;
  /** Per-tenant feature overrides (all optional — fall back to top-level AppConfig). */
  botName?: string;
  enableOutboundReply?: boolean;
  enableDocCreate?: boolean;
  enableTableCreate?: boolean;
  bitableAppToken?: string;
  bitableTableId?: string;
  bitableListFieldMode?: TableListFieldMode;
  bitableOwnerFieldMode?: TableOwnerFieldMode;
  bitableEstimateFieldMode?: TableEstimateFieldMode;
  bitableDueFieldMode?: TableDueFieldMode;
  bitableDoneFieldMode?: TableDoneFieldMode;
  bitableAttachmentFieldMode?: TableAttachmentFieldMode;
  bitableLinkFieldMode?: TableLinkFieldMode;
  bitableTitleFieldName?: string;
  bitableListFieldName?: string;
  bitableDetailsFieldName?: string;
  bitableOwnerFieldName?: string;
  bitableEstimateFieldName?: string;
  bitableDueFieldName?: string;
  bitableDoneFieldName?: string;
  bitableAttachmentFieldName?: string;
  bitableLinkedRecordsFieldName?: string;
  bitableSourceCommandFieldName?: string;
}

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
  /** Single-app mode: the singleton tenant used for all webhooks. */
  singleTenant: TenantConfig | null;
  /**
   * Multi-tenant mode: array of TenantConfigs keyed by `tenantKey`.
   * When set, the webhook server routes each incoming event to the
   * matching TenantConfig by looking up `header.tenant_key`.
   */
  tenants: TenantConfig[];
  /** Resolved per-tenant settings (built in resolveTenantConfig). */
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
    throw new Error(`Invalid ${envName}: ${parsed}`);
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

/** Raw tenant parsed from FEISHU_TENANTS JSON (before defaults are applied). */
interface RawTenantEntry {
  tenantKey: string;
  appId: string;
  appSecret: string;
  botName?: string;
  enableOutboundReply?: unknown;
  enableDocCreate?: unknown;
  enableTableCreate?: unknown;
  bitableAppToken?: string;
  bitableTableId?: string;
  bitableListFieldMode?: string;
  bitableOwnerFieldMode?: string;
  bitableEstimateFieldMode?: string;
  bitableDueFieldMode?: string;
  bitableDoneFieldMode?: string;
  bitableAttachmentFieldMode?: string;
  bitableLinkFieldMode?: string;
  bitableTitleFieldName?: string;
  bitableListFieldName?: string;
  bitableDetailsFieldName?: string;
  bitableOwnerFieldName?: string;
  bitableEstimateFieldName?: string;
  bitableDueFieldName?: string;
  bitableDoneFieldName?: string;
  bitableAttachmentFieldName?: string;
  bitableLinkedRecordsFieldName?: string;
  bitableSourceCommandFieldName?: string;
}

function parseTenantsJson(raw: string): RawTenantEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('FEISHU_TENANTS must be valid JSON — expected an array of tenant objects.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('FEISHU_TENANTS must be a JSON array of tenant objects.');
  }
  return parsed as RawTenantEntry[];
}

function rawToTenant(raw: RawTenantEntry): TenantConfig {
  return {
    tenantKey: raw.tenantKey,
    appId: raw.appId,
    appSecret: raw.appSecret,
    botName: raw.botName,
    enableOutboundReply:
      raw.enableOutboundReply !== undefined
        ? parseBoolean(String(raw.enableOutboundReply), false)
        : undefined,
    enableDocCreate:
      raw.enableDocCreate !== undefined
        ? parseBoolean(String(raw.enableDocCreate), false)
        : undefined,
    enableTableCreate:
      raw.enableTableCreate !== undefined
        ? parseBoolean(String(raw.enableTableCreate), false)
        : undefined,
    bitableAppToken: raw.bitableAppToken,
    bitableTableId: raw.bitableTableId,
    bitableListFieldMode: parseTableListFieldMode(raw.bitableListFieldMode),
    bitableOwnerFieldMode: parseTableOwnerFieldMode(raw.bitableOwnerFieldMode),
    bitableEstimateFieldMode: parseTableEstimateFieldMode(raw.bitableEstimateFieldMode),
    bitableDueFieldMode: parseTableDueFieldMode(raw.bitableDueFieldMode),
    bitableDoneFieldMode: parseTableDoneFieldMode(raw.bitableDoneFieldMode),
    bitableAttachmentFieldMode: parseTableAttachmentFieldMode(raw.bitableAttachmentFieldMode),
    bitableLinkFieldMode: parseTableLinkFieldMode(raw.bitableLinkFieldMode),
    bitableTitleFieldName: parseFieldName(raw.bitableTitleFieldName, 'Title'),
    bitableListFieldName: parseFieldName(raw.bitableListFieldName, 'List'),
    bitableDetailsFieldName: parseFieldName(raw.bitableDetailsFieldName, 'Details'),
    bitableOwnerFieldName: parseFieldName(raw.bitableOwnerFieldName, 'Owner'),
    bitableEstimateFieldName: parseFieldName(raw.bitableEstimateFieldName, 'Estimate'),
    bitableDueFieldName: parseFieldName(raw.bitableDueFieldName, 'Due'),
    bitableDoneFieldName: parseFieldName(raw.bitableDoneFieldName, 'Done'),
    bitableAttachmentFieldName: parseFieldName(raw.bitableAttachmentFieldName, 'Attachment'),
    bitableLinkedRecordsFieldName: parseFieldName(
      raw.bitableLinkedRecordsFieldName,
      'LinkedRecords',
    ),
    bitableSourceCommandFieldName: parseFieldName(raw.bitableSourceCommandFieldName, 'SourceCommand'),
  };
}

function validateSingleTenantConfig(config: AppConfig): void {
  const errors: string[] = [];

  if (!config.mockMode) {
    if (!config.appId) errors.push('FEISHU_APP_ID is required in production mode');
    if (!config.appSecret) errors.push('FEISHU_APP_SECRET is required in production mode');
    if (!config.webhookSecret) {
      errors.push('FEISHU_WEBHOOK_SECRET is required in production mode');
    }
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

function validateMultiTenantConfig(config: AppConfig): void {
  const errors: string[] = [];

  if (config.tenants.length === 0) {
    errors.push('FEISHU_TENANTS is set but contains an empty array — at least one tenant is required.');
  }

  const tenantKeys = new Set<string>();
  const appIds = new Set<string>();
  for (const tenant of config.tenants) {
    if (!tenant.tenantKey) errors.push('Each tenant must have a tenantKey field.');
    if (!tenant.appId) errors.push(`Tenant "${tenant.tenantKey ?? '(unknown)'}": appId is required.`);
    if (!tenant.appSecret) {
      errors.push(`Tenant "${tenant.tenantKey ?? '(unknown)'}": appSecret is required.`);
    }
    if (tenant.tenantKey && tenantKeys.has(tenant.tenantKey)) {
      errors.push(`Duplicate tenantKey "${tenant.tenantKey}" — each tenant must have a unique tenantKey.`);
    }
    if (tenant.appId && appIds.has(tenant.appId)) {
      errors.push(`Duplicate appId "${tenant.appId}" — each tenant must have a unique appId.`);
    }
    tenantKeys.add(tenant.tenantKey);
    appIds.add(tenant.appId);
  }

  if (errors.length > 0) {
    throw new Error(`Multi-tenant configuration error:\n  - ${errors.join('\n  - ')}`);
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const tenantsEnv = env.FEISHU_TENANTS;
  const isMultiTenant = tenantsEnv !== undefined && tenantsEnv !== '';

  let rawTenants: RawTenantEntry[] = [];
  if (isMultiTenant) {
    rawTenants = parseTenantsJson(tenantsEnv);
  }

  // Base config (used as defaults in multi-tenant mode).
  const base: AppConfig = {
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
    singleTenant: null,
    tenants: [],
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
    bitableLinkedRecordsFieldName: parseFieldName(
      env.FEISHU_BITABLE_LINKED_RECORDS_FIELD_NAME,
      'LinkedRecords',
    ),
    bitableSourceCommandFieldName: parseFieldName(
      env.FEISHU_BITABLE_SOURCE_COMMAND_FIELD_NAME,
      'SourceCommand',
    ),
  };

  if (isMultiTenant) {
    base.tenants = rawTenants.map(rawToTenant);
    validateMultiTenantConfig(base);
  } else {
    // Single-app mode — build a synthetic singleTenant from legacy env vars.
    base.singleTenant = {
      tenantKey: env.FEISHU_TENANT_KEY ?? 'default',
      appId: base.appId,
      appSecret: base.appSecret,
      botName: base.botName,
      enableOutboundReply: base.enableOutboundReply,
      enableDocCreate: base.enableDocCreate,
      enableTableCreate: base.enableTableCreate,
      bitableAppToken: base.bitableAppToken,
      bitableTableId: base.bitableTableId,
      bitableListFieldMode: base.bitableListFieldMode,
      bitableOwnerFieldMode: base.bitableOwnerFieldMode,
      bitableEstimateFieldMode: base.bitableEstimateFieldMode,
      bitableDueFieldMode: base.bitableDueFieldMode,
      bitableDoneFieldMode: base.bitableDoneFieldMode,
      bitableAttachmentFieldMode: base.bitableAttachmentFieldMode,
      bitableLinkFieldMode: base.bitableLinkFieldMode,
      bitableTitleFieldName: base.bitableTitleFieldName,
      bitableListFieldName: base.bitableListFieldName,
      bitableDetailsFieldName: base.bitableDetailsFieldName,
      bitableOwnerFieldName: base.bitableOwnerFieldName,
      bitableEstimateFieldName: base.bitableEstimateFieldName,
      bitableDueFieldName: base.bitableDueFieldName,
      bitableDoneFieldName: base.bitableDoneFieldName,
      bitableAttachmentFieldName: base.bitableAttachmentFieldName,
      bitableLinkedRecordsFieldName: base.bitableLinkedRecordsFieldName,
      bitableSourceCommandFieldName: base.bitableSourceCommandFieldName,
    };
    validateSingleTenantConfig(base);
  }

  return base;
}

/**
 * Resolve effective tenant settings by merging a TenantConfig's per-tenant
 * overrides on top of the base AppConfig defaults. Used by the webhook handler
 * when processing events in multi-tenant mode.
 */
export function resolveTenantConfig(
  base: AppConfig,
  tenant: TenantConfig,
): AppConfig {
  return {
    appId: tenant.appId,
    appSecret: tenant.appSecret,
    botName: tenant.botName ?? base.botName,
    mockMode: false,
    mockEventPath: base.mockEventPath,
    logLevel: base.logLevel,
    webhookPort: base.webhookPort,
    webhookSecret: base.webhookSecret,
    webhookSignatureToleranceSeconds: base.webhookSignatureToleranceSeconds,
    singleTenant: null,
    tenants: [],
    enableOutboundReply: tenant.enableOutboundReply ?? base.enableOutboundReply,
    enableDocCreate: tenant.enableDocCreate ?? base.enableDocCreate,
    enableTableCreate: tenant.enableTableCreate ?? base.enableTableCreate,
    bitableAppToken: tenant.bitableAppToken ?? base.bitableAppToken,
    bitableTableId: tenant.bitableTableId ?? base.bitableTableId,
    bitableListFieldMode: tenant.bitableListFieldMode ?? base.bitableListFieldMode,
    bitableOwnerFieldMode: tenant.bitableOwnerFieldMode ?? base.bitableOwnerFieldMode,
    bitableEstimateFieldMode: tenant.bitableEstimateFieldMode ?? base.bitableEstimateFieldMode,
    bitableDueFieldMode: tenant.bitableDueFieldMode ?? base.bitableDueFieldMode,
    bitableDoneFieldMode: tenant.bitableDoneFieldMode ?? base.bitableDoneFieldMode,
    bitableAttachmentFieldMode: tenant.bitableAttachmentFieldMode ?? base.bitableAttachmentFieldMode,
    bitableLinkFieldMode: tenant.bitableLinkFieldMode ?? base.bitableLinkFieldMode,
    bitableTitleFieldName: tenant.bitableTitleFieldName ?? base.bitableTitleFieldName,
    bitableListFieldName: tenant.bitableListFieldName ?? base.bitableListFieldName,
    bitableDetailsFieldName: tenant.bitableDetailsFieldName ?? base.bitableDetailsFieldName,
    bitableOwnerFieldName: tenant.bitableOwnerFieldName ?? base.bitableOwnerFieldName,
    bitableEstimateFieldName: tenant.bitableEstimateFieldName ?? base.bitableEstimateFieldName,
    bitableDueFieldName: tenant.bitableDueFieldName ?? base.bitableDueFieldName,
    bitableDoneFieldName: tenant.bitableDoneFieldName ?? base.bitableDoneFieldName,
    bitableAttachmentFieldName: tenant.bitableAttachmentFieldName ?? base.bitableAttachmentFieldName,
    bitableLinkedRecordsFieldName: tenant.bitableLinkedRecordsFieldName ?? base.bitableLinkedRecordsFieldName,
    bitableSourceCommandFieldName:
      tenant.bitableSourceCommandFieldName ?? base.bitableSourceCommandFieldName,
  };
}
