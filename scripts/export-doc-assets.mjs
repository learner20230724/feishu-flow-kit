#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const exportScript = resolve(scriptDir, 'export-svg-png.mjs');

const assets = [
  {
    input: 'docs/demo-table-schema-handoff-review.svg',
    output: 'docs/demo-table-schema-handoff-review.png'
  },
  {
    input: 'docs/demo-table-schema-review-page.svg',
    output: 'docs/demo-table-schema-review-page.png'
  },
  {
    input: 'docs/demo-table-schema-review-share-card.svg',
    output: 'docs/demo-table-schema-review-share-card.png'
  }
];

for (const asset of assets) {
  const inputPath = resolve(repoRoot, asset.input);
  const outputPath = resolve(repoRoot, asset.output);
  const result = spawnSync(process.execPath, [exportScript, inputPath, '--out', outputPath], {
    cwd: repoRoot,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  console.log(`Refreshed ${relative(repoRoot, outputPath)}`);
}
