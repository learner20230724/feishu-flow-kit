import type { RetryOptions } from '../core/retry.js';
import { fetchTenantAccessToken, InMemoryFeishuTenantAccessTokenCache } from './fetch-tenant-access-token.js';
import { sendTableRecordRequest } from './send-table-record-request.js';
import type { TableRecordDraft, TableRecordFieldValue } from './build-table-record-draft.js';

export interface BitableFieldOption {
  name: string;
  id: string;
}

export interface BitableFieldProperty {
  options?: BitableFieldOption[];
}

export interface BitableFieldSchema {
  field_id: string;
  field_name: string;
  type: number;
  property?: BitableFieldProperty;
}

export interface BitableTableSchema {
  fields: BitableFieldSchema[];
}

export interface CreateTableRecordWithSchemaOptions {
  appId: string;
  appSecret: string;
  appToken: string;
  tableId: string;
  draft: TableRecordDraft;
  fetchImpl?: typeof fetch;
  retry?: RetryOptions;
}

export interface CreateTableRecordWithSchemaResult {
  ok: boolean;
  recordId?: string;
  fieldsMapped: number;
  raw: Record<string, unknown>;
}

const TYPE_ID_TO_NAME: Record<number, string> = {
  1: 'text',
  2: 'number',
  3: 'single_select',
  4: 'multi_select',
  5: 'date',
  7: 'checkbox',
  11: 'user',
  17: 'attachment',
  18: 'linked_record',
  19: 'cascade',
  20: 'location',
  1003: 'lookup',
  1011: 'department',
  1019: 'contact',
};

function buildFieldNameToIdMap(schema: BitableTableSchema): Map<string, string> {
  const map = new Map<string, string>();
  for (const field of schema.fields) {
    map.set(field.field_name, field.field_id);
    // Also map by lowercase for case-insensitive matching
    map.set(field.field_name.toLowerCase(), field.field_id);
  }
  return map;
}

function buildFieldTypeMap(schema: BitableTableSchema): Map<string, number> {
  const map = new Map<string, number>();
  for (const field of schema.fields) {
    map.set(field.field_id, field.type);
    map.set(field.field_name, field.type);
    map.set(field.field_name.toLowerCase(), field.type);
  }
  return map;
}

/**
 * Build a map: field_id → Map<option_name_lower → option_id>
 * Only populated for single-select (type 3) and multi-select (type 4) fields.
 */
function buildFieldOptionsMap(schema: BitableTableSchema): Map<string, Map<string, string>> {
  const map = new Map<string, Map<string, string>>();
  for (const field of schema.fields) {
    if (isOptionField(field.type) && field.property?.options) {
      const optionMap = new Map<string, string>();
      for (const opt of field.property.options) {
        optionMap.set(opt.name.toLowerCase(), opt.id);
      }
      map.set(field.field_id, optionMap);
    }
  }
  return map;
}

function resolveFieldId(name: string, fieldNameToId: Map<string, string>): string | undefined {
  return fieldNameToId.get(name) ?? fieldNameToId.get(name.toLowerCase());
}

function isOptionField(type: number): boolean {
  return type === 3 || type === 4;
}

function isUserField(type: number): boolean {
  return type === 11;
}

function isAttachmentField(type: number): boolean {
  return type === 17;
}

function isLinkedRecordField(type: number): boolean {
  return type === 18 || type === 21;
}

function isDateField(type: number): boolean {
  return type === 5;
}

function isCheckboxField(type: number): boolean {
  return type === 7;
}

function isNumberField(type: number): boolean {
  return type === 2;
}

/**
 * Transform an option field value from { name } to { id } using the schema's
 * option list. Falls back to the original value if the option name is not found.
 */
function transformOptionValue(
  fieldValue: TableRecordFieldValue,
  optionMap: Map<string, string> | undefined,
): TableRecordFieldValue {
  if (!optionMap) return fieldValue;

  // Single-select: { name: "..." } → { id: "..." }
  if (fieldValue !== null && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
    const name = (fieldValue as unknown as Record<string, unknown>).name;
    if (typeof name === 'string') {
      const id = optionMap.get(name.toLowerCase());
      return id ? ({ id } as import('./build-table-record-draft.js').TableSingleSelectFieldValue) : fieldValue;
    }
  }

  // Multi-select: [{ name: "..." }, ...] → [{ id: "..." }, ...]
  if (Array.isArray(fieldValue)) {
    const transformed = fieldValue.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const name = (item as unknown as Record<string, unknown>).name;
        if (typeof name === 'string') {
          const id = optionMap.get(name.toLowerCase());
          return id ? ({ id } as import('./build-table-record-draft.js').TableSingleSelectFieldValue) : item;
        }
      }
      return item;
    });
    return transformed as TableRecordFieldValue;
  }

  return fieldValue;
}

/**
 * Transform a draft's field-name keys into field_id keys, using the live
 * Bitable table schema. Returns a new draft with transformed body.fields.
 */
export function transformDraftWithSchema(
  draft: TableRecordDraft,
  schema: BitableTableSchema,
): TableRecordDraft {
  const fieldNameToId = buildFieldNameToIdMap(schema);
  const fieldTypeMap = buildFieldTypeMap(schema);
  const fieldOptionsMap = buildFieldOptionsMap(schema);

  const mappedFields: Record<string, TableRecordFieldValue> = {};
  let fieldsMapped = 0;

  for (const [fieldName, fieldValue] of Object.entries(draft.body.fields)) {
    const fieldId = resolveFieldId(fieldName, fieldNameToId);
    if (!fieldId) {
      // Unknown field — emit as-is; Bitable will reject if not present
      mappedFields[fieldName] = fieldValue as TableRecordFieldValue;
      continue;
    }

    const fieldType = fieldTypeMap.get(fieldId) ?? 0;

    // Option fields: map option name(s) → option_id using schema property options.
    // Feishu accepts { name } but { id } is more reliable.
    if (isOptionField(fieldType)) {
      const optionMap = fieldOptionsMap.get(fieldId);
      const transformed = transformOptionValue(fieldValue, optionMap);
      mappedFields[fieldId] = transformed;
      fieldsMapped++;
      continue;
    }

    // User fields need [{ id }] — if the draft already has this shape, pass through
    if (isUserField(fieldType)) {
      mappedFields[fieldId] = fieldValue as TableRecordFieldValue;
      fieldsMapped++;
      continue;
    }

    // Attachment fields need [{ file_token }] — pass through if already correct
    if (isAttachmentField(fieldType)) {
      mappedFields[fieldId] = fieldValue as TableRecordFieldValue;
      fieldsMapped++;
      continue;
    }

    // Linked record fields need { link_record_ids: [] } — pass through
    if (isLinkedRecordField(fieldType)) {
      mappedFields[fieldId] = fieldValue as TableRecordFieldValue;
      fieldsMapped++;
      continue;
    }

    // Date fields: timestamp numbers are fine — pass through
    if (isDateField(fieldType) || isCheckboxField(fieldType) || isNumberField(fieldType)) {
      mappedFields[fieldId] = fieldValue as TableRecordFieldValue;
      fieldsMapped++;
      continue;
    }

    // Default: pass through as-is
    mappedFields[fieldId] = fieldValue as TableRecordFieldValue;
    fieldsMapped++;
  }

  return {
    ...draft,
    body: {
      ...draft.body,
      fields: mappedFields,
    },
  };
}

/**
 * Fetch the live field schema for a Bitable table.
 */
export async function fetchBitableTableSchema(
  tenantAccessToken: string,
  appToken: string,
  tableId: string,
  fetchImpl?: typeof fetch,
): Promise<BitableTableSchema> {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/fields`;
  const response = await (fetchImpl ?? fetch)(url, {
    headers: {
      authorization: `Bearer ${tenantAccessToken}`,
      'content-type': 'application/json; charset=utf-8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Bitable table schema: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    code?: number;
    msg?: string;
    data?: {
      items?: Array<{
        field_id?: string;
        field_name?: string;
        type?: number;
        property?: BitableFieldProperty;
      }>;
    };
  };

  if (payload.code !== 0) {
    throw new Error(payload.msg || 'Failed to fetch Bitable table schema.');
  }

  const items = payload.data?.items ?? [];
  return {
    fields: items
      .filter((f) => f.field_id && f.field_name !== undefined && f.type !== undefined)
      .map((f) => ({
        field_id: f.field_id!,
        field_name: f.field_name!,
        type: f.type!,
        // property contains option lists for select fields and other field-specific data
        property: f.property,
      })),
  };
}

const tenantAccessTokenCache = new InMemoryFeishuTenantAccessTokenCache();

/**
 * Schema-aware table record creation.
 *
 * Fetches the live Bitable table schema, maps field names to field IDs,
 * then creates the record with properly typed field values.
 */
export async function createTableRecordWithSchema(
  options: CreateTableRecordWithSchemaOptions,
): Promise<CreateTableRecordWithSchemaResult> {
  const { appId, appSecret, appToken, tableId, draft, fetchImpl, retry } = options;

  // 1. Get tenant access token
  const tokenResult = await fetchTenantAccessToken({
    appId,
    appSecret,
    fetchImpl,
    cache: tenantAccessTokenCache,
  });

  // 2. Fetch live schema
  const schema = await fetchBitableTableSchema(tokenResult.token, appToken, tableId, fetchImpl);

  // 3. Transform draft field names → field IDs
  const transformedDraft = transformDraftWithSchema(draft, schema);

  const originalFieldCount = Object.keys(draft.body.fields).length;
  const mappedCount = Object.keys(transformedDraft.body.fields).length;

  // 4. Send record creation request
  const result = await sendTableRecordRequest({
    tenantAccessToken: tokenResult.token,
    draft: transformedDraft,
    appToken,
    tableId,
    fetchImpl,
    retry,
  });

  return {
    ok: result.ok,
    recordId: result.recordId,
    fieldsMapped: mappedCount,
    raw: result.raw,
  };
}
