import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = new URL('..', import.meta.url);
const workdir = path.resolve(repoRoot.pathname);
const validateScriptPath = path.join(workdir, 'scripts/validate-table-mapping-config.mjs');
const advancedSchemaPath = path.join(workdir, 'examples/feishu-fields-normalized-schema-advanced.json');
const envFilePath = path.join(workdir, 'examples/table-mapping-advanced.env');

test('table mapping config validator accepts aligned advanced mapping env with raw-semantic warning', async () => {
  const { stdout, stderr } = await execFileAsync(
    'node',
    [validateScriptPath, advancedSchemaPath, '--env-file', envFilePath],
    { cwd: workdir },
  );

  assert.equal(stderr, '');
  assert.match(stdout, /✓ List -> Status \(single_select\)/);
  assert.match(stdout, /✓ Owner -> Owner \(user\)/);
  assert.match(stdout, /Warnings:/);
  assert.match(stdout, /Deadline: configured mode is date, but raw Feishu semantics still say datetime/);
  assert.match(stdout, /\/table mapping config looks aligned with the provided schema\./);
});

test('table mapping config validator fails when configured field name is missing from schema', async () => {
  await assert.rejects(
    execFileAsync(
      'node',
      [validateScriptPath, advancedSchemaPath],
      {
        cwd: workdir,
        env: {
          ...process.env,
          FEISHU_BITABLE_LIST_FIELD_MODE: 'single_select',
          FEISHU_BITABLE_OWNER_FIELD_MODE: 'user',
          FEISHU_BITABLE_ESTIMATE_FIELD_MODE: 'number',
          FEISHU_BITABLE_DUE_FIELD_MODE: 'date',
          FEISHU_BITABLE_DONE_FIELD_MODE: 'checkbox',
          FEISHU_BITABLE_ATTACHMENT_FIELD_MODE: 'attachment',
          FEISHU_BITABLE_LINK_FIELD_MODE: 'linked_record',
          FEISHU_BITABLE_TITLE_FIELD_NAME: 'Task',
          FEISHU_BITABLE_LIST_FIELD_NAME: 'Stage',
          FEISHU_BITABLE_DETAILS_FIELD_NAME: 'Notes',
          FEISHU_BITABLE_OWNER_FIELD_NAME: 'Owner',
          FEISHU_BITABLE_ESTIMATE_FIELD_NAME: 'Effort',
          FEISHU_BITABLE_DUE_FIELD_NAME: 'Deadline',
          FEISHU_BITABLE_DONE_FIELD_NAME: 'Completed',
          FEISHU_BITABLE_ATTACHMENT_FIELD_NAME: 'Files',
          FEISHU_BITABLE_LINKED_RECORDS_FIELD_NAME: 'RelatedTasks',
          FEISHU_BITABLE_SOURCE_COMMAND_FIELD_NAME: 'SourceCommand',
        },
      },
    ),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /List: configured field "Stage" was not found in schema/);
      return true;
    },
  );
});

test('table mapping config validator can fail on raw semantic drift in strict mode', async () => {
  await assert.rejects(
    execFileAsync(
      'node',
      [validateScriptPath, advancedSchemaPath, '--env-file', envFilePath, '--strict-raw'],
      { cwd: workdir },
    ),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Deadline: configured mode is date, but raw Feishu semantics still say datetime/);
      return true;
    },
  );
});
