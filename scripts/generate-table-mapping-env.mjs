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
  console.error(`Usage:\n  node scripts/generate-table-mapping-env.mjs <fields.json>\n\nInput JSON shape:\n  {\n    "tableName": "Sprint Tasks",\n    "appToken": "app_xxx",\n    "tableId": "tbl_xxx",\n    "fields": [\n      { "name": "Task", "type": "text" },\n      { "name": "Stage", "type": "single_select" }\n    ]\n  }\n\nSupported field types for mode inference:\n  text, single_select, multi_select, user, number, date, datetime, checkbox, attachment, linked_record\n`);
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

function main() {
  const inputPath = process.argv[2];
  if (!inputPath || inputPath === '-h' || inputPath === '--help') {
    printUsage();
    process.exit(inputPath ? 0 : 1);
  }

  const absolutePath = path.resolve(process.cwd(), inputPath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(raw);
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

  const lines = [];
  lines.push('# Suggested FEISHU_BITABLE_* mapping draft');
  lines.push(`# Source: ${path.relative(process.cwd(), absolutePath)}`);
  if (parsed.tableName) lines.push(`# Table: ${parsed.tableName}`);
  lines.push('');

  lines.push(`FEISHU_ENABLE_TABLE_CREATE=${parsed.enableTableCreate ?? 'true'}`);
  lines.push(`FEISHU_BITABLE_APP_TOKEN=${parsed.appToken ?? 'app_xxx'}`);
  lines.push(`FEISHU_BITABLE_TABLE_ID=${parsed.tableId ?? 'tbl_xxx'}`);
  lines.push('');

  for (const starter of STARTER_FIELDS) {
    const match = matches.find((item) => item.starterField === starter.starterField);
    if (starter.modeEnvName) {
      lines.push(`${starter.modeEnvName}=${match?.inferredMode ?? starter.supportedModes[0]}`);
    }
  }
  lines.push('');

  for (const starter of STARTER_FIELDS) {
    const match = matches.find((item) => item.starterField === starter.starterField);
    lines.push(`${starter.envName}=${match?.actualName ?? starter.starterField}`);
  }
  lines.push('');
  lines.push('# Match summary');
  for (const match of matches) {
    const modeNote = match.modeEnvName ? ` | mode=${match.inferredMode}` : '';
    lines.push(`# ${match.starterField} -> ${match.actualName} (${match.actualType})${modeNote}`);
  }
  if (unmatched.length > 0) {
    lines.push('');
    lines.push('# Unmatched input fields (review manually)');
    for (const field of unmatched) {
      lines.push(`# - ${field.name} (${field.type})`);
    }
  }

  process.stdout.write(`${lines.join('\n')}\n`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
