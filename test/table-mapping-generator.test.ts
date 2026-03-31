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
const normalizeScriptPath = path.join(workdir, 'scripts/normalize-feishu-table-fields.mjs');
const samplePath = path.join(workdir, 'examples/table-schema-sample.json');
const feishuFieldsResponsePath = path.join(workdir, 'examples/feishu-fields-list-response.json');
const feishuFieldsNormalizedFixturePath = path.join(workdir, 'examples/feishu-fields-normalized-schema.json');
const feishuFieldsMappingDraftFixturePath = path.join(workdir, 'examples/feishu-fields-mapping-draft.json');

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

test('feishu field-list normalizer can convert raw API response into mapping-generator input', async () => {
  const { stdout } = await execFileAsync('node', [normalizeScriptPath, feishuFieldsResponsePath], {
    cwd: workdir,
  });

  const normalized = JSON.parse(stdout);

  assert.equal(normalized.tableName, 'Sprint Tasks');
  assert.equal(normalized.appToken, 'app_demo123');
  assert.equal(normalized.tableId, 'tbl_demo456');
  assert.equal(normalized.source.inputPath, 'examples/feishu-fields-list-response.json');
  assert.equal(normalized.fields.length, 10);
  assert.deepEqual(normalized.fields[0], {
    name: 'Task',
    type: 'text',
    sourceTypeId: 1,
    sourceFieldId: 'fldTitle001',
    uiType: 'Text',
    isPrimary: true,
  });
  assert.equal(normalized.fields[5].name, 'TargetDate');
  assert.equal(normalized.fields[5].type, 'date');
  assert.equal(normalized.fields[8].type, 'linked_record');
});

test('feishu field-list fixture stays aligned with normalizer output', async () => {
  const [{ stdout }, fixtureRaw] = await Promise.all([
    execFileAsync('node', [normalizeScriptPath, feishuFieldsResponsePath], {
      cwd: workdir,
    }),
    readFile(feishuFieldsNormalizedFixturePath, 'utf8'),
  ]);

  assert.deepEqual(JSON.parse(stdout), JSON.parse(fixtureRaw));
});

test('feishu field-list normalizer output can be written and then consumed by mapping generator', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'feishu-flow-kit-feishu-fields-'));
  const normalizedPath = path.join(tempDir, 'table-schema-from-feishu.json');

  const normalizeResult = await execFileAsync(
    'node',
    [normalizeScriptPath, feishuFieldsResponsePath, `--out=${normalizedPath}`],
    { cwd: workdir },
  );

  assert.match(normalizeResult.stdout, /Wrote normalized table schema/);

  const { stdout } = await execFileAsync('node', [scriptPath, normalizedPath, '--format', 'json'], {
    cwd: workdir,
  });

  const draft = JSON.parse(stdout);
  assert.equal(draft.config.FEISHU_BITABLE_TITLE_FIELD_NAME, 'Task');
  assert.equal(draft.config.FEISHU_BITABLE_LIST_FIELD_MODE, 'single_select');
  assert.equal(draft.config.FEISHU_BITABLE_OWNER_FIELD_MODE, 'user');
  assert.equal(draft.config.FEISHU_BITABLE_DUE_FIELD_MODE, 'date');
  assert.equal(draft.config.FEISHU_BITABLE_LINK_FIELD_MODE, 'linked_record');
  assert.deepEqual(draft.unmatched, []);
});

test('mapping draft fixture stays aligned with normalized schema fixture', async () => {
  const [{ stdout }, fixtureRaw] = await Promise.all([
    execFileAsync('node', [scriptPath, feishuFieldsNormalizedFixturePath, '--format', 'json'], {
      cwd: workdir,
    }),
    readFile(feishuFieldsMappingDraftFixturePath, 'utf8'),
  ]);

  assert.deepEqual(JSON.parse(stdout), JSON.parse(fixtureRaw));
});

