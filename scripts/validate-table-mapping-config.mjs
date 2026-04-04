#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const STARTER_FIELDS = [
  {
    starterField: 'Title',
    envName: 'FEISHU_BITABLE_TITLE_FIELD_NAME',
    modeEnvName: null,
    defaultName: 'Title',
    defaultMode: 'text',
    allowedTypes: ['text'],
  },
  {
    starterField: 'List',
    envName: 'FEISHU_BITABLE_LIST_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_LIST_FIELD_MODE',
    defaultName: 'List',
    defaultMode: 'text',
    allowedTypes: ['text', 'single_select', 'multi_select'],
  },
  {
    starterField: 'Details',
    envName: 'FEISHU_BITABLE_DETAILS_FIELD_NAME',
    modeEnvName: null,
    defaultName: 'Details',
    defaultMode: 'text',
    allowedTypes: ['text'],
  },
  {
    starterField: 'Owner',
    envName: 'FEISHU_BITABLE_OWNER_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_OWNER_FIELD_MODE',
    defaultName: 'Owner',
    defaultMode: 'text',
    allowedTypes: ['text', 'user'],
  },
  {
    starterField: 'Estimate',
    envName: 'FEISHU_BITABLE_ESTIMATE_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_ESTIMATE_FIELD_MODE',
    defaultName: 'Estimate',
    defaultMode: 'text',
    allowedTypes: ['text', 'number'],
  },
  {
    starterField: 'Due',
    envName: 'FEISHU_BITABLE_DUE_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_DUE_FIELD_MODE',
    defaultName: 'Due',
    defaultMode: 'text',
    allowedTypes: ['text', 'date', 'datetime'],
  },
  {
    starterField: 'Done',
    envName: 'FEISHU_BITABLE_DONE_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_DONE_FIELD_MODE',
    defaultName: 'Done',
    defaultMode: 'text',
    allowedTypes: ['text', 'checkbox'],
  },
  {
    starterField: 'Attachment',
    envName: 'FEISHU_BITABLE_ATTACHMENT_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_ATTACHMENT_FIELD_MODE',
    defaultName: 'Attachment',
    defaultMode: 'text',
    allowedTypes: ['text', 'attachment'],
  },
  {
    starterField: 'LinkedRecords',
    envName: 'FEISHU_BITABLE_LINKED_RECORDS_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_LINK_FIELD_MODE',
    defaultName: 'LinkedRecords',
    defaultMode: 'text',
    allowedTypes: ['text', 'linked_record'],
  },
  {
    starterField: 'SourceCommand',
    envName: 'FEISHU_BITABLE_SOURCE_COMMAND_FIELD_NAME',
    modeEnvName: null,
    defaultName: 'SourceCommand',
    defaultMode: 'text',
    allowedTypes: ['text'],
  },
];

function printUsage() {
  console.error(`Usage:\n  node scripts/validate-table-mapping-config.mjs <fields.json> [--env-file <path>] [--strict-raw]\n\nExamples:\n  node scripts/validate-table-mapping-config.mjs examples/feishu-fields-normalized-schema.json\n  node scripts/validate-table-mapping-config.mjs examples/feishu-fields-normalized-schema-advanced.json --env-file examples/table-mapping-advanced.env\n\nInput JSON shape:\n  A normalized schema file with a top-level fields array, such as the output of table:normalize-feishu-fields.`);
}

function parseArgs(argv) {
  const args = [...argv];
  const positionals = [];
  let envFile = null;
  let strictRaw = false;

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === '--help' || current === '-h') {
      return { help: true };
    }

    if (current === '--env-file') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('Missing value for --env-file');
      }
      envFile = next;
      index += 1;
      continue;
    }

    if (current.startsWith('--env-file=')) {
      envFile = current.slice('--env-file='.length);
      if (!envFile) throw new Error('Missing value for --env-file');
      continue;
    }

    if (current === '--strict-raw') {
      strictRaw = true;
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
    envFile,
    strictRaw,
  };
}

function normalize(value) {
  return String(value ?? '').trim();
}

function loadEnvFile(envFilePath) {
  const env = {};
  const raw = fs.readFileSync(envFilePath, 'utf8');
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;
    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function loadSchema(schemaPath) {
  const raw = fs.readFileSync(schemaPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.fields) || parsed.fields.length === 0) {
    throw new Error('Input must include a non-empty fields array.');
  }
  return parsed;
}

function findField(fields, name) {
  return fields.find((field) => field?.name === name) ?? null;
}

function buildModeWarning(fieldDef, field, configuredMode, strictRaw) {
  if (!field || !field.rawSemanticType) return null;

  if (fieldDef.starterField === 'Due' && configuredMode === 'date' && field.rawSemanticType === 'datetime') {
    return {
      level: strictRaw ? 'error' : 'warning',
      message: `${field.name}: configured mode is date, but raw Feishu semantics still say datetime`,
    };
  }

  if (fieldDef.starterField === 'LinkedRecords' && configuredMode === 'linked_record' && ['single_link', 'duplex_link'].includes(field.rawSemanticType)) {
    return {
      level: 'warning',
      message: `${field.name}: linked_record is valid, but raw Feishu semantics still distinguish ${field.rawSemanticType}`,
    };
  }

  return null;
}

function validateSchemaMapping(schema, env, strictRaw) {
  const fields = schema.fields;
  const lines = [];
  const errors = [];
  const warnings = [];

  const tableName = schema.tableName ? ` (${schema.tableName})` : '';
  lines.push(`Validating /table mapping against ${path.basename(schema.source?.inputPath ?? 'schema')}${tableName}`);

  for (const fieldDef of STARTER_FIELDS) {
    const configuredName = normalize(env[fieldDef.envName] ?? fieldDef.defaultName);
    const configuredMode = normalize(fieldDef.modeEnvName ? (env[fieldDef.modeEnvName] ?? fieldDef.defaultMode) : fieldDef.defaultMode);
    const matchedField = findField(fields, configuredName);

    if (!matchedField) {
      errors.push(`${fieldDef.starterField}: configured field \"${configuredName}\" was not found in schema`);
      continue;
    }

    if (!fieldDef.allowedTypes.includes(configuredMode)) {
      errors.push(`${fieldDef.starterField}: configured mode \"${configuredMode}\" is not supported by the starter contract`);
      continue;
    }

    if (matchedField.type !== configuredMode) {
      errors.push(`${fieldDef.starterField}: field \"${configuredName}\" is ${matchedField.type}, but config expects ${configuredMode}`);
      continue;
    }

    lines.push(`✓ ${fieldDef.starterField} -> ${matchedField.name} (${matchedField.type})`);

    const rawWarning = buildModeWarning(fieldDef, matchedField, configuredMode, strictRaw);
    if (rawWarning) {
      (rawWarning.level === 'error' ? errors : warnings).push(rawWarning.message);
    }
  }

  return { lines, errors, warnings };
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
  const schemaPath = path.resolve(workingDirectory, parsedArgs.inputPath);
  const envFilePath = parsedArgs.envFile ? path.resolve(workingDirectory, parsedArgs.envFile) : null;
  const schema = loadSchema(schemaPath);
  const envFromFile = envFilePath ? loadEnvFile(envFilePath) : {};
  const env = { ...process.env, ...envFromFile };

  const result = validateSchemaMapping(schema, env, parsedArgs.strictRaw);

  process.stdout.write(`${result.lines.join('\n')}\n`);

  if (envFilePath) {
    process.stdout.write(`Env source: ${path.relative(workingDirectory, envFilePath)}\n`);
  } else {
    process.stdout.write('Env source: process.env + defaults\n');
  }

  if (result.warnings.length > 0) {
    process.stdout.write('\nWarnings:\n');
    for (const warning of result.warnings) {
      process.stdout.write(`- ${warning}\n`);
    }
  }

  if (result.errors.length > 0) {
    process.stderr.write('\nValidation failed:\n');
    for (const error of result.errors) {
      process.stderr.write(`- ${error}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('\n/table mapping config looks aligned with the provided schema.\n');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
