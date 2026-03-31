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

function pickSelectOptionLabels(sourceProperty) {
  const options = sourceProperty?.options;
  if (!Array.isArray(options)) return [];

  return options
    .map((option) => option?.name)
    .filter((name) => typeof name === 'string' && name.trim().length > 0)
    .slice(0, 3);
}

function buildSelectSourceExcerpt(sourceProperty) {
  const options = sourceProperty?.options;
  if (!Array.isArray(options) || options.length === 0) return null;

  return {
    options: options.slice(0, 3).map((option) => ({
      ...(typeof option?.id === 'string' ? { id: option.id } : {}),
      ...(typeof option?.name === 'string' ? { name: option.name } : {}),
    })),
  };
}

function buildSelectOptionRemapDraft(starterField, inferredMode, optionLabelSample, sourceProperty) {
  if (starterField !== 'List') return null;
  if (!['single_select', 'multi_select'].includes(inferredMode)) return null;
  if (!Array.isArray(optionLabelSample) || optionLabelSample.length === 0) return null;

  const options = Array.isArray(sourceProperty?.options) ? sourceProperty.options : [];
  const entries = optionLabelSample.map((label) => {
    const matchedOption = options.find((option) => option?.name === label);
    return {
      sourceLabel: label,
      targetLabel: label,
      ...(typeof matchedOption?.id === 'string' ? { targetOptionId: matchedOption.id } : {}),
    };
  });

  return {
    sourceFieldMode: inferredMode,
    strategy: 'label_to_option_id',
    entries,
    overrideExample: {
      field: starterField,
      mode: inferredMode,
      byLabel: Object.fromEntries(entries.map((entry) => [entry.sourceLabel, entry.targetOptionId ?? entry.targetLabel])),
    },
    note: 'Copy this draft into your rollout notes or a small override layer if workflow labels and live Bitable option IDs need explicit review.',
  };
}

function buildSelectOptionReviewDrafts(reviewWarnings) {
  return reviewWarnings
    .filter((warning) => warning.kind === 'select-options-review' && warning.optionRemapDraft)
    .map((warning) => ({
      starterField: warning.starterField,
      actualName: warning.actualName,
      actualType: warning.actualType,
      inferredMode: warning.inferredMode,
      optionCount: warning.optionCount,
      ...(Array.isArray(warning.optionLabelSample) && warning.optionLabelSample.length > 0 ? { optionLabelSample: warning.optionLabelSample } : {}),
      ...(warning.sourcePropertyExcerpt ? { sourcePropertyExcerpt: warning.sourcePropertyExcerpt } : {}),
      optionRemapDraft: warning.optionRemapDraft,
      reviewAction: warning.reviewAction,
      reviewChecklist: warning.reviewChecklist,
    }));
}

function buildReviewWarnings(matches) {
  const warnings = [];

  for (const match of matches) {
    if (
      match.starterField === 'List'
      && ['single_select', 'multi_select'].includes(match.inferredMode)
      && typeof match.optionCount === 'number'
      && match.optionCount > 0
    ) {
      const optionLabelSample = pickSelectOptionLabels(match.sourceProperty);
      const sourcePropertyExcerpt = buildSelectSourceExcerpt(match.sourceProperty);
      const optionRemapDraft = buildSelectOptionRemapDraft(match.starterField, match.inferredMode, optionLabelSample, match.sourceProperty);

      warnings.push({
        kind: 'select-options-review',
        starterField: match.starterField,
        actualName: match.actualName,
        actualType: match.actualType,
        inferredMode: match.inferredMode,
        optionCount: match.optionCount,
        ...(optionLabelSample.length > 0 ? { optionLabelSample } : {}),
        ...(sourcePropertyExcerpt ? { sourcePropertyExcerpt } : {}),
        ...(optionRemapDraft ? { optionRemapDraft } : {}),
        reviewAction: 'Check whether the target select column already has matching option labels and IDs before enabling real writes.',
        suggestedEnv: null,
        reviewChecklist: [
          'Confirm whether the target Bitable column is single_select or multi_select as expected.',
          'Verify that the existing option labels match the values your workflow will send.',
          'If the real table uses different option labels or IDs, adjust the column or add a mapping layer before rollout.',
        ],
        message: `Detected ${match.optionCount} existing select options. Review option labels and IDs before first live writes.`,
      });
    }

    if (!match.rawSemanticType) continue;

    if (match.starterField === 'Due' && match.inferredMode === 'date' && match.rawSemanticType === 'datetime') {
      warnings.push({
        kind: 'mode-mismatch',
        starterField: match.starterField,
        actualName: match.actualName,
        actualType: match.actualType,
        inferredMode: match.inferredMode,
        rawSemanticType: match.rawSemanticType,
        reviewAction: 'Check whether the target Bitable column should keep FEISHU_BITABLE_DUE_FIELD_MODE=date or be upgraded to datetime before enabling real writes.',
        suggestedEnv: 'FEISHU_BITABLE_DUE_FIELD_MODE=datetime',
        reviewChecklist: [
          'Confirm whether the column stores date-only values or date-time values in the real table.',
          'If time-of-day matters, switch the env mode to datetime before first live create-record calls.',
          'Run one controlled write and compare the stored value in Bitable before rolling out wider.',
        ],
        message: 'Normalized type is date, but raw Feishu semantics still say datetime. Review whether FEISHU_BITABLE_DUE_FIELD_MODE should stay date or be upgraded to datetime.',
      });
      continue;
    }

    if (match.starterField === 'LinkedRecords' && match.inferredMode === 'linked_record' && ['single_link', 'duplex_link'].includes(match.rawSemanticType)) {
      warnings.push({
        kind: 'link-shape-review',
        starterField: match.starterField,
        actualName: match.actualName,
        actualType: match.actualType,
        inferredMode: match.inferredMode,
        rawSemanticType: match.rawSemanticType,
        reviewAction: 'Check whether the linked-record column is single-link or duplex-link in the real table before enabling real writes.',
        suggestedEnv: null,
        reviewChecklist: [
          'Confirm whether the linked column is single_link or duplex_link in the Feishu table schema.',
          'Verify that linked record IDs come from the expected target table before first live writes.',
          'Run one controlled write and confirm the relation shape behaves as expected in Bitable.',
        ],
        message: 'Normalized type is linked_record, but raw Feishu semantics still distinguish single_link vs duplex_link. Review linked-table behavior before real writes.',
      });
    }
  }

  return warnings;
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
    const optionLabelSample = pickSelectOptionLabels(match.field.sourceProperty);
    matches.push({
      starterField: starter.starterField,
      envName: starter.envName,
      modeEnvName: starter.modeEnvName,
      actualName: match.field.name,
      actualType: match.field.type,
      inferredMode,
      ...(typeof match.field.rawSemanticType === 'string' ? { rawSemanticType: match.field.rawSemanticType } : {}),
      ...(typeof match.field.uiType === 'string' ? { uiType: match.field.uiType } : {}),
      ...(typeof match.field.dateFormatter === 'string' ? { dateFormatter: match.field.dateFormatter } : {}),
      ...(typeof match.field.linkedTableId === 'string' ? { linkedTableId: match.field.linkedTableId } : {}),
      ...(typeof match.field.optionCount === 'number' ? { optionCount: match.field.optionCount } : {}),
      ...(optionLabelSample.length > 0 ? { optionLabelSample } : {}),
      ...(match.field.sourceProperty && typeof match.field.sourceProperty === 'object' ? { sourceProperty: match.field.sourceProperty } : {}),
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
        ...(typeof match.rawSemanticType === 'string' ? { rawSemanticType: match.rawSemanticType } : {}),
        ...(typeof match.uiType === 'string' ? { uiType: match.uiType } : {}),
        ...(typeof match.dateFormatter === 'string' ? { dateFormatter: match.dateFormatter } : {}),
        ...(typeof match.linkedTableId === 'string' ? { linkedTableId: match.linkedTableId } : {}),
        ...(typeof match.optionCount === 'number' ? { optionCount: match.optionCount } : {}),
        ...(Array.isArray(match.optionLabelSample) && match.optionLabelSample.length > 0 ? { optionLabelSample: match.optionLabelSample } : {}),
        ...(match.sourceProperty && typeof match.sourceProperty === 'object' ? { sourceProperty: match.sourceProperty } : {}),
      });
    }
  }

  const reviewWarnings = buildReviewWarnings(matchSummary);

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
    reviewWarnings,
    selectOptionReviewDrafts: buildSelectOptionReviewDrafts(reviewWarnings),
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
  if (Array.isArray(data.reviewWarnings) && data.reviewWarnings.length > 0) {
    lines.push('');
    lines.push('# Review warnings');
    for (const warning of data.reviewWarnings) {
      lines.push(`# - ${warning.actualName}: ${warning.message}`);
      if (warning.reviewAction) {
        lines.push(`#   action: ${warning.reviewAction}`);
      }
      if (Array.isArray(warning.optionLabelSample) && warning.optionLabelSample.length > 0) {
        lines.push(`#   option labels: ${warning.optionLabelSample.join(', ')}`);
      }
      if (warning.suggestedEnv) {
        lines.push(`#   suggested env: ${warning.suggestedEnv}`);
      }
      if (warning.optionRemapDraft?.entries?.length) {
        lines.push(`#   option remap draft: ${warning.optionRemapDraft.entries.map((entry) => `${entry.sourceLabel}=>${entry.targetOptionId ?? entry.targetLabel}`).join(', ')}`);
      }
    }
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
