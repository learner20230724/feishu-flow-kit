#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const workingDirectory = process.cwd();
const nodeBinary = process.execPath;
const normalizeScriptPath = path.resolve(workingDirectory, 'scripts/normalize-feishu-table-fields.mjs');
const mappingScriptPath = path.resolve(workingDirectory, 'scripts/generate-table-mapping-env.mjs');

const rawFixturePath = path.resolve(workingDirectory, 'examples/feishu-fields-list-response.json');
const normalizedFixturePath = path.resolve(workingDirectory, 'examples/feishu-fields-normalized-schema.json');
const mappingFixturePath = path.resolve(workingDirectory, 'examples/feishu-fields-mapping-draft.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runJsonScript(scriptPath, args) {
  const stdout = execFileSync(nodeBinary, [scriptPath, ...args], {
    cwd: workingDirectory,
    encoding: 'utf8',
  });
  return JSON.parse(stdout);
}

function stableJson(value) {
  return JSON.stringify(value, null, 2);
}

function verifySection(label, actual, expected) {
  if (stableJson(actual) !== stableJson(expected)) {
    console.error(`Schema handoff verification failed for ${label}.`);
    console.error('--- expected ---');
    console.error(stableJson(expected));
    console.error('--- actual ---');
    console.error(stableJson(actual));
    process.exit(1);
  }

  process.stdout.write(`ok: ${label}\n`);
}

function main() {
  const generatedNormalized = runJsonScript(normalizeScriptPath, ['examples/feishu-fields-list-response.json']);
  const normalizedFixture = readJson(normalizedFixturePath);
  verifySection('normalized schema fixture', generatedNormalized, normalizedFixture);

  const generatedMappingDraft = runJsonScript(mappingScriptPath, ['examples/feishu-fields-normalized-schema.json', '--format', 'json']);
  const mappingFixture = readJson(mappingFixturePath);
  verifySection('mapping draft fixture', generatedMappingDraft, mappingFixture);

  process.stdout.write(`verified fixture chain from ${path.relative(workingDirectory, rawFixturePath)} to ${path.relative(workingDirectory, mappingFixturePath)}\n`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
