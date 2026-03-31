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
const extractSelectOptionReviewScriptPath = path.join(workdir, 'scripts/extract-select-option-review.mjs');
const samplePath = path.join(workdir, 'examples/table-schema-sample.json');
const feishuFieldsResponsePath = path.join(workdir, 'examples/feishu-fields-list-response.json');
const feishuFieldsResponseAdvancedPath = path.join(workdir, 'examples/feishu-fields-list-response-advanced.json');
const feishuFieldsNormalizedFixturePath = path.join(workdir, 'examples/feishu-fields-normalized-schema.json');
const feishuFieldsNormalizedAdvancedFixturePath = path.join(workdir, 'examples/feishu-fields-normalized-schema-advanced.json');
const feishuFieldsMappingDraftFixturePath = path.join(workdir, 'examples/feishu-fields-mapping-draft.json');
const feishuFieldsMappingDraftAdvancedFixturePath = path.join(workdir, 'examples/feishu-fields-mapping-draft-advanced.json');

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
    sourceProperty: {},
  });
  assert.equal(normalized.fields[5].name, 'TargetDate');
  assert.equal(normalized.fields[5].type, 'date');
  assert.equal(normalized.fields[5].rawSemanticType, 'datetime');
  assert.equal(normalized.fields[5].dateFormatter, 'yyyy-MM-dd');
  assert.deepEqual(normalized.fields[5].sourceProperty, { date_formatter: 'yyyy-MM-dd' });
  assert.equal(normalized.fields[8].type, 'linked_record');
  assert.equal(normalized.fields[8].rawSemanticType, 'single_link');
  assert.equal(normalized.fields[8].linkedTableId, 'tbl_dependency');
  assert.deepEqual(normalized.fields[8].sourceProperty, { table_id: 'tbl_dependency' });
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

test('env draft review warnings include select, datetime, and link review hints without duplicate blocks', async () => {
  const { stdout } = await execFileAsync('node', [scriptPath, feishuFieldsNormalizedFixturePath], {
    cwd: workdir,
  });

  const reviewHeadingCount = stdout.match(/^# Review warnings$/gm)?.length ?? 0;
  assert.equal(reviewHeadingCount, 1);
  assert.match(stdout, /# - Stage: Detected 2 existing select options\. Review option labels and IDs before first live writes\./);
  assert.match(stdout, /#   action: Check whether the target select column already has matching option labels and IDs before enabling real writes\./);
  assert.match(stdout, /#   option labels: Backlog, Doing/);
  assert.match(stdout, /#   option remap draft: Backlog=>opt_backlog, Doing=>opt_doing/);
  assert.match(stdout, /# - TargetDate: Normalized type is date, but raw Feishu semantics still say datetime\./);
  assert.match(stdout, /#   action: Check whether the target Bitable column should keep FEISHU_BITABLE_DUE_FIELD_MODE=date or be upgraded to datetime before enabling real writes\./);
  assert.match(stdout, /#   suggested env: FEISHU_BITABLE_DUE_FIELD_MODE=datetime/);
  assert.match(stdout, /# - Dependencies: Normalized type is linked_record, but raw Feishu semantics still distinguish single_link vs duplex_link\./);
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

test('advanced feishu field-list fixture keeps datetime formatter, duplex link, and option metadata visible across handoff', async () => {
  const [{ stdout: normalizedStdout }, normalizedFixtureRaw] = await Promise.all([
    execFileAsync('node', [normalizeScriptPath, feishuFieldsResponseAdvancedPath], {
      cwd: workdir,
    }),
    readFile(feishuFieldsNormalizedAdvancedFixturePath, 'utf8'),
  ]);

  const normalized = JSON.parse(normalizedStdout);
  assert.deepEqual(normalized, JSON.parse(normalizedFixtureRaw));
  assert.equal(normalized.fields[1].optionCount, 3);
  assert.equal(normalized.fields[5].rawSemanticType, 'datetime');
  assert.equal(normalized.fields[5].dateFormatter, 'yyyy-MM-dd HH:mm');
  assert.equal(normalized.fields[8].rawSemanticType, 'duplex_link');
  assert.equal(normalized.fields[8].linkedTableId, 'tbl_related_release');

  const [{ stdout: draftStdout }, draftFixtureRaw] = await Promise.all([
    execFileAsync('node', [scriptPath, feishuFieldsNormalizedAdvancedFixturePath, '--format', 'json'], {
      cwd: workdir,
    }),
    readFile(feishuFieldsMappingDraftAdvancedFixturePath, 'utf8'),
  ]);

  const draft = JSON.parse(draftStdout);
  assert.deepEqual(draft, JSON.parse(draftFixtureRaw));
  assert.equal(draft.matches[1].optionCount, 3);
  assert.deepEqual(draft.matches[1].optionLabelSample, ['Todo', 'Doing', 'Done']);
  assert.equal(draft.matches[5].dateFormatter, 'yyyy-MM-dd HH:mm');
  assert.deepEqual(
    draft.reviewWarnings.map((warning: { kind: string; actualName: string; rawSemanticType?: string; optionCount?: number; optionLabelSample?: string[]; sourcePropertyExcerpt?: { options?: Array<{ id?: string; name?: string }> }; optionRemapDraft?: { sourceFieldMode?: string; strategy?: string; entries?: Array<{ sourceLabel?: string; targetLabel?: string; targetOptionId?: string }> } }) => ({
      kind: warning.kind,
      actualName: warning.actualName,
      rawSemanticType: warning.rawSemanticType,
      optionCount: warning.optionCount,
      optionLabelSample: warning.optionLabelSample,
      sourcePropertyExcerpt: warning.sourcePropertyExcerpt,
      optionRemapDraft: warning.optionRemapDraft,
    })),
    [
      {
        kind: 'select-options-review',
        actualName: 'Status',
        rawSemanticType: undefined,
        optionCount: 3,
        optionLabelSample: ['Todo', 'Doing', 'Done'],
        sourcePropertyExcerpt: {
          options: [
            { id: 'opt_todo', name: 'Todo' },
            { id: 'opt_doing', name: 'Doing' },
            { id: 'opt_done', name: 'Done' },
          ],
        },
        optionRemapDraft: {
          sourceFieldMode: 'single_select',
          strategy: 'label_to_option_id',
          entries: [
            { sourceLabel: 'Todo', targetLabel: 'Todo', targetOptionId: 'opt_todo' },
            { sourceLabel: 'Doing', targetLabel: 'Doing', targetOptionId: 'opt_doing' },
            { sourceLabel: 'Done', targetLabel: 'Done', targetOptionId: 'opt_done' },
          ],
          overrideExample: {
            field: 'List',
            mode: 'single_select',
            byLabel: {
              Todo: 'opt_todo',
              Doing: 'opt_doing',
              Done: 'opt_done',
            },
          },
          note: 'Copy this draft into your rollout notes or a small override layer if workflow labels and live Bitable option IDs need explicit review.',
        },
      },
      {
        kind: 'mode-mismatch',
        actualName: 'Deadline',
        rawSemanticType: 'datetime',
        optionCount: undefined,
        optionLabelSample: undefined,
        sourcePropertyExcerpt: undefined,
        optionRemapDraft: undefined,
      },
      {
        kind: 'link-shape-review',
        actualName: 'RelatedTasks',
        rawSemanticType: 'duplex_link',
        optionCount: undefined,
        optionLabelSample: undefined,
        sourcePropertyExcerpt: undefined,
        optionRemapDraft: undefined,
      },
    ],
  );
});

test('select option review extractor can emit smaller rollout assets from mapping draft fixtures', async () => {
  const { stdout } = await execFileAsync(
    'node',
    [extractSelectOptionReviewScriptPath, feishuFieldsMappingDraftAdvancedFixturePath],
    { cwd: workdir },
  );

  const extracted = JSON.parse(stdout);
  assert.deepEqual(extracted, [
    {
      starterField: 'List',
      actualName: 'Status',
      actualType: 'single_select',
      inferredMode: 'single_select',
      optionCount: 3,
      optionLabelSample: ['Todo', 'Doing', 'Done'],
      sourcePropertyExcerpt: {
        options: [
          { id: 'opt_todo', name: 'Todo' },
          { id: 'opt_doing', name: 'Doing' },
          { id: 'opt_done', name: 'Done' },
        ],
      },
      optionRemapDraft: {
        sourceFieldMode: 'single_select',
        strategy: 'label_to_option_id',
        entries: [
          { sourceLabel: 'Todo', targetLabel: 'Todo', targetOptionId: 'opt_todo' },
          { sourceLabel: 'Doing', targetLabel: 'Doing', targetOptionId: 'opt_doing' },
          { sourceLabel: 'Done', targetLabel: 'Done', targetOptionId: 'opt_done' },
        ],
        overrideExample: {
          field: 'List',
          mode: 'single_select',
          byLabel: {
            Todo: 'opt_todo',
            Doing: 'opt_doing',
            Done: 'opt_done',
          },
        },
        note: 'Copy this draft into your rollout notes or a small override layer if workflow labels and live Bitable option IDs need explicit review.',
      },
      reviewAction: 'Check whether the target select column already has matching option labels and IDs before enabling real writes.',
      reviewChecklist: [
        'Confirm whether the target Bitable column is single_select or multi_select as expected.',
        'Verify that the existing option labels match the values your workflow will send.',
        'If the real table uses different option labels or IDs, adjust the column or add a mapping layer before rollout.',
      ],
    },
  ]);
});

test('select option review extractor can emit override-only payloads', async () => {
  const { stdout } = await execFileAsync(
    'node',
    [extractSelectOptionReviewScriptPath, feishuFieldsMappingDraftAdvancedFixturePath, '--format', 'override', '--field', 'List'],
    { cwd: workdir },
  );

  assert.deepEqual(JSON.parse(stdout), [
    {
      field: 'List',
      mode: 'single_select',
      byLabel: {
        Todo: 'opt_todo',
        Doing: 'opt_doing',
        Done: 'opt_done',
      },
    },
  ]);
});

