#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { validateSelectOptionOverrideInput } from './validate-select-option-override.mjs';

const workingDirectory = process.cwd();
const nodeBinary = process.execPath;
const normalizeScriptPath = path.resolve(workingDirectory, 'scripts/normalize-feishu-table-fields.mjs');
const mappingScriptPath = path.resolve(workingDirectory, 'scripts/generate-table-mapping-env.mjs');
const extractSelectOptionReviewScriptPath = path.resolve(workingDirectory, 'scripts/extract-select-option-review.mjs');
const selectOptionOverrideSamplePath = path.resolve(workingDirectory, 'examples/table-select-option-override-sample.json');
const selectOptionOverrideBundleSamplePath = path.resolve(workingDirectory, 'examples/table-select-option-override-bundle-sample.json');

const fixtureChains = [
  {
    label: 'baseline',
    rawFixturePath: path.resolve(workingDirectory, 'examples/feishu-fields-list-response.json'),
    normalizedFixturePath: path.resolve(workingDirectory, 'examples/feishu-fields-normalized-schema.json'),
    mappingFixturePath: path.resolve(workingDirectory, 'examples/feishu-fields-mapping-draft.json'),
  },
  {
    label: 'advanced',
    rawFixturePath: path.resolve(workingDirectory, 'examples/feishu-fields-list-response-advanced.json'),
    normalizedFixturePath: path.resolve(workingDirectory, 'examples/feishu-fields-normalized-schema-advanced.json'),
    mappingFixturePath: path.resolve(workingDirectory, 'examples/feishu-fields-mapping-draft-advanced.json'),
  },
];

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

function failVerification(label, detail) {
  console.error(`Schema handoff verification failed for ${label}.`);
  console.error(detail);
  process.exit(1);
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

function verifyChain(chain) {
  const rawFixtureRelativePath = path.relative(workingDirectory, chain.rawFixturePath);
  const normalizedFixtureRelativePath = path.relative(workingDirectory, chain.normalizedFixturePath);
  const mappingFixtureRelativePath = path.relative(workingDirectory, chain.mappingFixturePath);

  const generatedNormalized = runJsonScript(normalizeScriptPath, [rawFixtureRelativePath]);
  const normalizedFixture = readJson(chain.normalizedFixturePath);
  verifySection(`${chain.label} normalized schema fixture`, generatedNormalized, normalizedFixture);

  const generatedMappingDraft = runJsonScript(mappingScriptPath, [normalizedFixtureRelativePath, '--format', 'json']);
  const mappingFixture = readJson(chain.mappingFixturePath);
  verifySection(`${chain.label} mapping draft fixture`, generatedMappingDraft, mappingFixture);

  process.stdout.write(`verified ${chain.label} fixture chain from ${rawFixtureRelativePath} to ${mappingFixtureRelativePath}\n`);
}

function verifyValidatedOverrideSample(sample, options) {
  try {
    const result = validateSelectOptionOverrideInput(sample, options);
    for (const label of result.labels) {
      process.stdout.write(`ok: ${label}\n`);
    }
  } catch (error) {
    failVerification(options.sourceLabel ?? 'select-option override sample', error instanceof Error ? error.message : String(error));
  }
}

function verifySelectOptionOverrideSample() {
  const generatedOverrideSample = runJsonScript(extractSelectOptionReviewScriptPath, [
    path.relative(workingDirectory, fixtureChains[1].mappingFixturePath),
    '--format',
    'override',
    '--field',
    'List',
  ]);
  const expectedOverrideSample = [readJson(selectOptionOverrideSamplePath)];
  const expectedOverrideBundleSample = readJson(selectOptionOverrideBundleSamplePath);

  verifySection('advanced select-option override sample', generatedOverrideSample, expectedOverrideSample);
  verifySection('advanced select-option override bundle sample', expectedOverrideBundleSample.overrides, expectedOverrideSample);

  verifyValidatedOverrideSample(generatedOverrideSample, {
    sourceLabel: 'generated',
    field: 'List',
  });
  verifyValidatedOverrideSample(expectedOverrideSample, {
    sourceLabel: 'standalone',
    field: 'List',
  });
  verifyValidatedOverrideSample(expectedOverrideBundleSample, {
    sourceLabel: 'bundle',
    field: 'List',
  });
}

function main() {
  for (const chain of fixtureChains) {
    verifyChain(chain);
  }

  verifySelectOptionOverrideSample();
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
