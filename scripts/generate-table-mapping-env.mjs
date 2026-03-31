#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const STARTER_FIELDS = [
  {
    starterField: 'Title',
    envName: 'FEISHU_BITABLE_TITLE_FIELD_NAME',
    modeEnvName: null,
    supportedModes: ['text'],
    aliases: ['title', 'task', 'name'],
  },
  {
    starterField: 'List',
    envName: 'FEISHU_BITABLE_LIST_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_LIST_FIELD_MODE',
    supportedModes: ['text', 'single_select', 'multi_select'],
    aliases: ['list', 'stage', 'status', 'bucket'],
  },
  {
    starterField: 'Details',
    envName: 'FEISHU_BITABLE_DETAILS_FIELD_NAME',
    modeEnvName: null,
    supportedModes: ['text'],
    aliases: ['details', 'context', 'notes', 'label', 'description'],
  },
  {
    starterField: 'Owner',
    envName: 'FEISHU_BITABLE_OWNER_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_OWNER_FIELD_MODE',
    supportedModes: ['text', 'user'],
    aliases: ['owner', 'assignee', 'person'],
  },
  {
    starterField: 'Estimate',
    envName: 'FEISHU_BITABLE_ESTIMATE_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_ESTIMATE_FIELD_MODE',
    supportedModes: ['text', 'number'],
    aliases: ['estimate', 'points', 'effort', 'size'],
  },
  {
    starterField: 'Due',
    envName: 'FEISHU_BITABLE_DUE_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_DUE_FIELD_MODE',
    supportedModes: ['text', 'date', 'datetime'],
    aliases: ['due', 'due date', 'targetdate', 'target date', 'deadline'],
  },
  {
    starterField: 'Done',
    envName: 'FEISHU_BITABLE_DONE_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_DONE_FIELD_MODE',
    supportedModes: ['text', 'checkbox'],
    aliases: ['done', 'completed', 'complete'],
  },
  {
    starterField: 'Attachment',
    envName: 'FEISHU_BITABLE_ATTACHMENT_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_ATTACHMENT_FIELD_MODE',
    supportedModes: ['text', 'attachment'],
    aliases: ['attachment', 'attachments', 'files', 'file'],
  },
  {
    starterField: 'LinkedRecords',
    envName: 'FEISHU_BITABLE_LINKED_RECORDS_FIELD_NAME',
    modeEnvName: 'FEISHU_BITABLE_LINK_FIELD_MODE',
    supportedModes: ['text', 'linked_record'],
    aliases: ['linkedrecords', 'linked records', 'dependencies', 'relatedtasks', 'related tasks'],
  },
  {
    starterField: 'SourceCommand',
    envName: 'FEISHU_BITABLE_SOURCE_COMMAND_FIELD_NAME',
    modeEnvName: null,
    supportedModes: ['text'],
    aliases: ['sourcecommand', 'source command', 'chatcommand', 'chat command'],
  },
];

function printUsage() {
  console.error(`Usage:\n  node scripts/generate-table-mapping-env.mjs <fields.json> [--format env|json] [--out <path>]\n\nExamples:\n  node scripts/generate-table-mapping-env.mjs examples/table-schema-sample.json\n  node scripts/generate-table-mapping-env.mjs examples/table-schema-sample.json --format json\n  node scripts/generate-table-mapping-env.mjs examples/table-schema-sample.json --out ./.env.table-draft\n  node scripts/generate-table-mapping-env.mjs examples/table-schema-sample.json --format json --out ./table-mapping-draft.json\n\nInput JSON shape:\n  {\n    "tableName": "Sprint Tasks",\n    "appToken": "app_xxx",\n    "tableId": "tbl_xxx",\n    "fields": [\n      { "name": "Task", "type": "text" },\n      { "name": "Stage", "type": "single_select" }\n    ]\n  }\n\nSupported field types for mode inference:\n  text, single_select, multi_select, user, number, date, datetime, checkbox, attachment, linked_record\n`);
}

function parseArgs(argv) {
  const args = [...argv];
  const positionals = [];
  let outPath = null;
  let format = 'env';

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === '--help' || current === '-h') {
      return { help: true };
    }

    if (current === '--out') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('Missing value for --out');
      }
      outPath = next;
      index += 1;
      continue;
    }

    if (current.startsWith('--out=')) {
      outPath = current.slice('--out='.length);
      if (!outPath) {
        throw new Error('Missing value for --out');
      }
      continue;
    }

    if (current === '--format') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('Missing value for --format');
      }
      format = next;
      index += 1;
      continue;
    }

    if (current.startsWith('--format=')) {
      format = current.slice('--format='.length);
      if (!format) {
        throw new Error('Missing value for --format');
      }
      continue;
    }

    if (current.startsWith('--')) {
      throw new Error(`Unknown option: ${current}`);
    }

    positionals.push(current);
  }

  if (!['env', 'json'].includes(format)) {
    throw new Error(`Unsupported format: ${format}`);
  }

  return {
    help: false,
    inputPath: positionals[0],
    outPath,
    format,
  };
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreField(starter, field) {
  const name = normalize(field.name);
  if (!name) return -1;
  if (starter.aliases.includes(name)) return 100;
  if (starter.aliases.some((alias) => name.includes(alias))) return 50;
  return -1;
}

function inferMode(starter, type) {
  const normalizedType = normalize(type).replace(/ /g, '_');
  if (starter.supportedModes.includes(normalizedType)) return normalizedType;
  return starter.supportedModes[0] || 'text';
}

function findMatch(starter, fields, usedIndexes) {
  let bestIndex = -1;
  let bestScore = -1;

  fields.forEach((field, index) => {
    if (usedIndexes.has(index)) return;
    const score = scoreField(starter, field);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  if (bestIndex === -1) return null;
  return { index: bestIndex, field: fields[bestIndex] };
}

function buildDraftData(parsed, absolutePath, workingDirectory) {
  const fields = Array.isArray(parsed.fields) ? parsed.fields : [];

  if (fields.length === 0) {
    throw new Error('Input must include a non-empty fields array.');
  }

  const usedIndexes = new Set();
  const matches = [];
  const unmatched = [];

  for (const starter of STARTER_FIELDS) {
    const match = findMatch(starter, fields, usedIndexes);
    if (!match) continue;
    usedIndexes.add(match.index);
    const inferredMode = inferMode(starter, match.field.type);
    matches.push({
      starterField: starter.starterField,
      envName: starter.envName,
      modeEnvName: starter.modeEnvName,
      actualName: match.field.name,
      actualType: match.field.type,
      inferredMode,
    });
  }

  fields.forEach((field, index) => {
    if (!usedIndexes.has(index)) unmatched.push(field);
  });

  const modeConfig = {};
  const fieldNameConfig = {};
  const matchSummary = [];

  for (const starter of STARTER_FIELDS) {
    const match = matches.find((item) => item.starterField === starter.starterField);
    if (starter.modeEnvName) {
      modeConfig[starter.modeEnvName] = match?.inferredMode ?? starter.supportedModes[0];
    }
    fieldNameConfig[starter.envName] = match?.actualName ?? starter.starterField;
    if (match) {
      matchSummary.push({
        starterField: match.starterField,
        actualName: match.actualName,
        actualType: match.actualType,
        inferredMode: match.inferredMode,
        envName: match.envName,
        modeEnvName: match.modeEnvName,
      });
    }
  }

  return {
    source: {
      inputPath: path.relative(workingDirectory, absolutePath),
      tableName: parsed.tableName ?? null,
    },
    config: {
      FEISHU_ENABLE_TABLE_CREATE: String(parsed.enableTableCreate ?? 'true'),
      FEISHU_BITABLE_APP_TOKEN: parsed.appToken ?? 'app_xxx',
      FEISHU_BITABLE_TABLE_ID: parsed.tableId ?? 'tbl_xxx',
      ...modeConfig,
      ...fieldNameConfig,
    },
    matches: matchSummary,
    unmatched,
  };
}

function renderEnvDraft(data) {
  const lines = [];
  lines.push('# Suggested FEISHU_BITABLE_* mapping draft');
  lines.push(`# Source: ${data.source.inputPath}`);
  if (data.source.tableName) lines.push(`# Table: ${data.source.tableName}`);
  lines.push('');

  lines.push(`FEISHU_ENABLE_TABLE_CREATE=${data.config.FEISHU_ENABLE_TABLE_CREATE}`);
  lines.push(`FEISHU_BITABLE_APP_TOKEN=${data.config.FEISHU_BITABLE_APP_TOKEN}`);
  lines.push(`FEISHU_BITABLE_TABLE_ID=${data.config.FEISHU_BITABLE_TABLE_ID}`);
  lines.push('');

  for (const starter of STARTER_FIELDS) {
    if (starter.modeEnvName) {
      lines.push(`${starter.modeEnvName}=${data.config[starter.modeEnvName]}`);
    }
  }
  lines.push('');

  for (const starter of STARTER_FIELDS) {
    lines.push(`${starter.envName}=${data.config[starter.envName]}`);
  }
  lines.push('');
  lines.push('# Match summary');
  for (const match of data.matches) {
    const modeNote = match.modeEnvName ? ` | mode=${match.inferredMode}` : '';
    lines.push(`# ${match.starterField} -> ${match.actualName} (${match.actualType})${modeNote}`);
  }
  if (data.unmatched.length > 0) {
    lines.push('');
    lines.push('# Unmatched input fields (review manually)');
    for (const field of data.unmatched) {
      lines.push(`# - ${field.name} (${field.type})`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function renderJsonDraft(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

function writeOutputFile(outPath, draft, workingDirectory) {
  const absoluteOutPath = path.resolve(workingDirectory, outPath);
  fs.mkdirSync(path.dirname(absoluteOutPath), { recursive: true });
  fs.writeFileSync(absoluteOutPath, draft, 'utf8');
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
  const draftData = buildDraftData(parsed, absolutePath, workingDirectory);
  const draft = parsedArgs.format === 'json' ? renderJsonDraft(draftData) : renderEnvDraft(draftData);

  if (parsedArgs.outPath) {
    const absoluteOutPath = writeOutputFile(parsedArgs.outPath, draft, workingDirectory);
    process.stdout.write(`Wrote ${parsedArgs.format} mapping draft to ${path.relative(workingDirectory, absoluteOutPath)}\n`);
    return;
  }

  process.stdout.write(draft);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
