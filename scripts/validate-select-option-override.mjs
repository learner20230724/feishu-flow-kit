#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function printUsage() {
  console.error(`Usage:\n  node scripts/validate-select-option-override.mjs <override.json> [--field <starterField>]\n\nSupported input shapes:\n  - a single override object\n  - an array of override objects\n  - a bundle object with an overrides array\n\nExamples:\n  node scripts/validate-select-option-override.mjs examples/table-select-option-override-sample.json\n  node scripts/validate-select-option-override.mjs examples/table-select-option-override-bundle-sample.json\n  node scripts/validate-select-option-override.mjs ./override.json --field List\n`);
}

function parseArgs(argv) {
  const args = [...argv];
  const positionals = [];
  let field = null;

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === '--help' || current === '-h') {
      return { help: true };
    }

    if (current === '--field') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) throw new Error('Missing value for --field');
      field = next;
      index += 1;
      continue;
    }

    if (current.startsWith('--field=')) {
      field = current.slice('--field='.length);
      if (!field) throw new Error('Missing value for --field');
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
    field,
  };
}

export function normalizeOverrideBundle(value) {
  if (Array.isArray(value)) {
    return { kind: 'array', overrides: value };
  }

  if (value && typeof value === 'object') {
    if (Array.isArray(value.overrides)) {
      return { kind: 'bundle', overrides: value.overrides };
    }

    return { kind: 'single', overrides: [value] };
  }

  throw new Error('Expected a single override object, an overrides array, or a bundle object with an overrides array.');
}

export function validateSelectOptionOverrideShape(overrideSample, index, sourceLabel = 'sample') {
  const label = `${sourceLabel} override sample #${index + 1} shape`;

  if (!overrideSample || typeof overrideSample !== 'object' || Array.isArray(overrideSample)) {
    throw new Error(`${label}: Expected an object.`);
  }

  if (typeof overrideSample.field !== 'string' || overrideSample.field.trim().length === 0) {
    throw new Error(`${label}: Expected a non-empty string field property.`);
  }

  if (!['single_select', 'multi_select'].includes(overrideSample.mode)) {
    throw new Error(`${label}: Expected mode to be single_select or multi_select.`);
  }

  if (!overrideSample.byLabel || typeof overrideSample.byLabel !== 'object' || Array.isArray(overrideSample.byLabel)) {
    throw new Error(`${label}: Expected byLabel to be an object.`);
  }

  const entries = Object.entries(overrideSample.byLabel);
  if (entries.length === 0) {
    throw new Error(`${label}: Expected byLabel to include at least one label → option-id entry.`);
  }

  for (const [entryLabel, optionId] of entries) {
    if (typeof entryLabel !== 'string' || entryLabel.trim().length === 0) {
      throw new Error(`${label}: Expected every byLabel key to be a non-empty string.`);
    }

    if (typeof optionId !== 'string' || optionId.trim().length === 0) {
      throw new Error(`${label}: Expected option id for label "${entryLabel}" to be a non-empty string.`);
    }
  }

  return label;
}

export function validateSelectOptionOverrideInput(input, options = {}) {
  const normalized = normalizeOverrideBundle(input);
  const sourceLabel = options.sourceLabel ?? normalized.kind;
  const expectedField = options.field ?? null;

  if (!normalized.overrides.length) {
    throw new Error('Expected at least one override sample.');
  }

  const labels = normalized.overrides.map((overrideSample, index) => {
    const label = validateSelectOptionOverrideShape(overrideSample, index, sourceLabel);

    if (expectedField && overrideSample.field !== expectedField) {
      throw new Error(`${label}: Expected field to be ${expectedField}, got ${overrideSample.field}.`);
    }

    return label;
  });

  return {
    kind: normalized.kind,
    count: normalized.overrides.length,
    labels,
  };
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
  const absoluteInputPath = path.resolve(workingDirectory, parsedArgs.inputPath);
  const raw = fs.readFileSync(absoluteInputPath, 'utf8');
  const parsed = JSON.parse(raw);
  const result = validateSelectOptionOverrideInput(parsed, {
    sourceLabel: path.basename(parsedArgs.inputPath, path.extname(parsedArgs.inputPath)),
    field: parsedArgs.field,
  });

  for (const label of result.labels) {
    process.stdout.write(`ok: ${label}\n`);
  }

  process.stdout.write(`validated ${result.count} select-option override sample${result.count === 1 ? '' : 's'} from ${path.relative(workingDirectory, absoluteInputPath)}\n`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
