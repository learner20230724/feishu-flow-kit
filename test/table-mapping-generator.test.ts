import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = new URL('..', import.meta.url);
const workdir = path.resolve(repoRoot.pathname);
const scriptPath = path.join(workdir, 'scripts/generate-table-mapping-env.mjs');
const samplePath = path.join(workdir, 'examples/table-schema-sample.json');

test('table mapping generator can emit structured json draft', async () => {
  const { stdout } = await execFileAsync('node', [scriptPath, samplePath, '--format', 'json'], {
    cwd: workdir,
  });

  const draft = JSON.parse(stdout);

  assert.equal(draft.source.inputPath, 'examples/table-schema-sample.json');
  assert.equal(draft.source.tableName, 'Sprint Tasks');
  assert.equal(draft.config.FEISHU_BITABLE_TITLE_FIELD_NAME, 'Task');
  assert.equal(draft.config.FEISHU_BITABLE_LIST_FIELD_MODE, 'single_select');
  assert.equal(draft.config.FEISHU_BITABLE_OWNER_FIELD_MODE, 'user');
  assert.equal(draft.matches.length, 10);
  assert.deepEqual(draft.unmatched, []);
});

test('table mapping generator can write structured json draft to file', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'feishu-flow-kit-table-map-'));
  const outPath = path.join(tempDir, 'table-mapping-draft.json');

  const { stdout } = await execFileAsync(
    'node',
    [scriptPath, samplePath, '--format=json', `--out=${outPath}`],
    {
      cwd: workdir,
    },
  );

  assert.match(stdout, /Wrote json mapping draft/);

  const written = JSON.parse(await readFile(outPath, 'utf8'));
  assert.equal(written.config.FEISHU_BITABLE_LINK_FIELD_MODE, 'linked_record');
  assert.equal(written.config.FEISHU_BITABLE_SOURCE_COMMAND_FIELD_NAME, 'ChatCommand');
});

test('table mapping generator keeps starter defaults for missing fields and reports unmatched columns', async () => {
  const partialPath = path.join(workdir, 'examples/table-schema-unmatched.json');
  const { stdout } = await execFileAsync('node', [scriptPath, partialPath, '--format', 'json'], {
    cwd: workdir,
  });

  const draft = JSON.parse(stdout);

  assert.equal(draft.config.FEISHU_BITABLE_TITLE_FIELD_NAME, 'Task');
  assert.equal(draft.config.FEISHU_BITABLE_LIST_FIELD_MODE, 'multi_select');
  assert.equal(draft.config.FEISHU_BITABLE_OWNER_FIELD_NAME, 'Assignee');
  assert.equal(draft.config.FEISHU_BITABLE_DUE_FIELD_NAME, 'Due');
  assert.equal(draft.config.FEISHU_BITABLE_DUE_FIELD_MODE, 'text');
  assert.deepEqual(
    draft.unmatched.map((field: { name: string }) => field.name),
    ['Severity', 'SLAHours', 'RunbookURL'],
  );
});
