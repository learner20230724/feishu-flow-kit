#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function printUsage() {
  console.error(`Usage:\n  node scripts/extract-select-option-review.mjs <mapping-draft.json> [--format json|override] [--field <starterField>] [--out <path>]\n\nExamples:\n  node scripts/extract-select-option-review.mjs examples/feishu-fields-mapping-draft-advanced.json\n  node scripts/extract-select-option-review.mjs examples/feishu-fields-mapping-draft-advanced.json --format override\n  node scripts/extract-select-option-review.mjs examples/feishu-fields-mapping-draft-advanced.json --field List --out ./select-option-override.json\n`);
}

function parseArgs(argv) {
  const args = [...argv];
  const positionals = [];
  let outPath = null;
  let format = 'json';
  let field = null;

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === '--help' || current === '-h') {
      return { help: true };
    }

    if (current === '--out') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) throw new Error('Missing value for --out');
      outPath = next;
      index += 1;
      continue;
    }

    if (current.startsWith('--out=')) {
      outPath = current.slice('--out='.length);
      if (!outPath) throw new Error('Missing value for --out');
      continue;
    }

    if (current === '--format') {
      const next = args[index + 1];
      if (!next || next.startsWith('--')) throw new Error('Missing value for --format');
      format = next;
      index += 1;
      continue;
    }

    if (current.startsWith('--format=')) {
      format = current.slice('--format='.length);
      if (!format) throw new Error('Missing value for --format');
      continue;
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

  if (!['json', 'override'].includes(format)) {
    throw new Error(`Unsupported format: ${format}`);
  }

  return {
    help: false,
    inputPath: positionals[0],
    outPath,
    format,
    field,
  };
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
  const absoluteInputPath = path.resolve(workingDirectory, parsedArgs.inputPath);
  const raw = fs.readFileSync(absoluteInputPath, 'utf8');
  const parsed = JSON.parse(raw);

  const drafts = Array.isArray(parsed.selectOptionReviewDrafts) ? parsed.selectOptionReviewDrafts : [];
  const filteredDrafts = parsedArgs.field
    ? drafts.filter((draft) => draft?.starterField === parsedArgs.field)
    : drafts;

  if (parsedArgs.field && filteredDrafts.length === 0) {
    throw new Error(`No select option review draft found for starter field: ${parsedArgs.field}`);
  }

  const output = parsedArgs.format === 'override'
    ? filteredDrafts.map((draft) => draft?.optionRemapDraft?.overrideExample).filter(Boolean)
    : filteredDrafts;

  const content = `${JSON.stringify(output, null, 2)}\n`;

  if (parsedArgs.outPath) {
    const absoluteOutPath = writeOutputFile(parsedArgs.outPath, content, workingDirectory);
    process.stdout.write(`Wrote ${parsedArgs.format} select-option review asset to ${path.relative(workingDirectory, absoluteOutPath)}\n`);
    return;
  }

  process.stdout.write(content);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
