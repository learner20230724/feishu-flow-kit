#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const TYPE_ID_TO_NAME = new Map([
  [1, 'text'],
  [2, 'number'],
  [3, 'single_select'],
  [4, 'multi_select'],
  [5, 'date'],
  [7, 'checkbox'],
  [11, 'user'],
  [17, 'attachment'],
  [18, 'linked_record'],
  [21, 'linked_record'],
]);

function printUsage() {
  console.error(`Usage:\n  node scripts/normalize-feishu-table-fields.mjs <raw-fields.json> [--out <path>] [--table-name <name>] [--app-token <token>] [--table-id <id>]\n\nExamples:\n  node scripts/normalize-feishu-table-fields.mjs examples/feishu-fields-list-response.json\n  node scripts/normalize-feishu-table-fields.mjs examples/feishu-fields-list-response.json --out ./table-schema-from-feishu.json\n  node scripts/normalize-feishu-table-fields.mjs examples/feishu-fields-list-response.json --table-name "Sprint Tasks" --app-token app_demo123 --table-id tbl_demo456\n\nAccepted raw input shapes:\n  { "items": [ ... ] }\n  { "data": { "items": [ ... ] } }\n  [ ... ]\n\nEach item may use fields like:\n  { "field_name": "Task", "type": 1, "field_id": "fld_xxx" }\n  { "fieldName": "Task", "typeId": 1, "fieldId": "fld_xxx" }\n\nOutput shape:\n  {\n    "tableName": "Sprint Tasks",\n    "appToken": "app_demo123",\n    "tableId": "tbl_demo456",\n    "fields": [\n      { "name": "Task", "type": "text", "sourceTypeId": 1, "sourceFieldId": "fld_xxx" }\n    ]\n  }\n`);
}

function parseArgs(argv) {
  const args = [...argv];
  const positionals = [];
  let outPath = null;
  let tableName = null;
  let appToken = null;
  let tableId = null;

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === '--help' || current === '-h') {
      return { help: true };
    }

    if (current === '--out' || current === '--table-name' || current === '--app-token' || current === '--table-id') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error(`Missing value for ${current}`);
      }
      if (current === '--out') outPath = next;
      if (current === '--table-name') tableName = next;
      if (current === '--app-token') appToken = next;
      if (current === '--table-id') tableId = next;
      index += 1;
      continue;
    }

    if (current.startsWith('--out=')) {
      outPath = current.slice('--out='.length);
      continue;
    }

    if (current.startsWith('--table-name=')) {
      tableName = current.slice('--table-name='.length);
      continue;
    }

    if (current.startsWith('--app-token=')) {
      appToken = current.slice('--app-token='.length);
      continue;
    }

    if (current.startsWith('--table-id=')) {
      tableId = current.slice('--table-id='.length);
      continue;
    }

    if (current.startsWith('--')) {
      throw new Error(`Unknown option: ${current}`);
    }

    positionals.push(current);
  }

  return {
    help: false,
    inputPath: positionals[0],
    outPath,
    tableName,
    appToken,
    tableId,
  };
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function extractItems(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.items)) return parsed.items;
  if (Array.isArray(parsed?.data?.items)) return parsed.data.items;
  throw new Error('Input must be an array, an object with items, or an object with data.items.');
}

function pickString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function pickNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && /^\d+$/.test(value.trim())) return Number(value.trim());
  }
  return null;
}

function inferTypeName(item) {
  const explicitType = pickString(item.typeName, item.type_name, item.normalizedType);
  if (explicitType) return explicitType;

  const rawType = item.type;
  if (typeof rawType === 'string' && rawType.trim()) return rawType.trim();

  const typeId = pickNumber(item.typeId, item.type_id, item.fieldType, item.field_type, rawType);
  if (typeId !== null && TYPE_ID_TO_NAME.has(typeId)) return TYPE_ID_TO_NAME.get(typeId);

  const uiType = pickString(item.uiType, item.ui_type);
  if (uiType) {
    const normalizedUiType = uiType.toLowerCase().replace(/\s+/g, '_');
    if (normalizedUiType === 'datetime') return 'datetime';
    if (normalizedUiType === 'date_time') return 'datetime';
    if (normalizedUiType === 'date') return 'date';
    if (normalizedUiType === 'singlelink' || normalizedUiType === 'duplexlink') return 'linked_record';
    if (normalizedUiType === 'single_select') return 'single_select';
    if (normalizedUiType === 'multi_select') return 'multi_select';
    if (normalizedUiType === 'checkbox') return 'checkbox';
    if (normalizedUiType === 'attachment') return 'attachment';
    if (normalizedUiType === 'user') return 'user';
    if (normalizedUiType === 'number') return 'number';
    if (normalizedUiType === 'text') return 'text';
  }

  return 'text';
}

function normalizeField(item) {
  const objectItem = asObject(item);
  if (!objectItem) {
    throw new Error('Every field item must be an object.');
  }

  const name = pickString(objectItem.field_name, objectItem.fieldName, objectItem.name, objectItem.title);
  if (!name) {
    throw new Error('Every field item must include a field_name, fieldName, or name.');
  }

  const sourceTypeId = pickNumber(
    objectItem.typeId,
    objectItem.type_id,
    typeof objectItem.type === 'number' ? objectItem.type : null,
    objectItem.fieldType,
    objectItem.field_type,
  );

  return {
    name,
    type: inferTypeName(objectItem),
    ...(sourceTypeId !== null ? { sourceTypeId } : {}),
    ...(pickString(objectItem.field_id, objectItem.fieldId, objectItem.id) ? {
      sourceFieldId: pickString(objectItem.field_id, objectItem.fieldId, objectItem.id),
    } : {}),
    ...(pickString(objectItem.ui_type, objectItem.uiType) ? {
      uiType: pickString(objectItem.ui_type, objectItem.uiType),
    } : {}),
    ...(typeof objectItem.is_primary === 'boolean' ? { isPrimary: objectItem.is_primary } : {}),
    ...(typeof objectItem.isPrimary === 'boolean' ? { isPrimary: objectItem.isPrimary } : {}),
  };
}

function buildNormalizedSchema(parsed, args, absolutePath, workingDirectory) {
  const items = extractItems(parsed);
  if (items.length === 0) {
    throw new Error('Input must include at least one field item.');
  }

  const normalized = {
    tableName: args.tableName ?? pickString(parsed?.tableName, parsed?.data?.tableName, parsed?.table_name, parsed?.data?.table_name) ?? null,
    appToken: args.appToken ?? pickString(parsed?.appToken, parsed?.data?.appToken, parsed?.app_token, parsed?.data?.app_token) ?? null,
    tableId: args.tableId ?? pickString(parsed?.tableId, parsed?.data?.tableId, parsed?.table_id, parsed?.data?.table_id) ?? null,
    fields: items.map(normalizeField),
    source: {
      inputPath: path.relative(workingDirectory, absolutePath),
      itemCount: items.length,
      format: Array.isArray(parsed) ? 'array' : Array.isArray(parsed?.items) ? 'items' : 'data.items',
    },
  };

  return normalized;
}

function writeOutputFile(outPath, content, workingDirectory) {
  const absoluteOutPath = path.resolve(workingDirectory, outPath);
  fs.mkdirSync(path.dirname(absoluteOutPath), { recursive: true });
  fs.writeFileSync(absoluteOutPath, content, 'utf8');
  return absoluteOutPath;
}

function main() {
  const parsedArgs = parseArgs(process.argv.slice(2));

  if (parsedArgs.help) {
    printUsage();
    process.exit(0);
  }

  if (!parsedArgs.inputPath) {
    printUsage();
    process.exit(1);
  }

  const workingDirectory = process.cwd();
  const absolutePath = path.resolve(workingDirectory, parsedArgs.inputPath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(raw);
  const normalized = buildNormalizedSchema(parsed, parsedArgs, absolutePath, workingDirectory);
  const output = `${JSON.stringify(normalized, null, 2)}\n`;

  if (parsedArgs.outPath) {
    const absoluteOutPath = writeOutputFile(parsedArgs.outPath, output, workingDirectory);
    process.stdout.write(`Wrote normalized table schema to ${path.relative(workingDirectory, absoluteOutPath)}\n`);
    return;
  }

  process.stdout.write(output);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
