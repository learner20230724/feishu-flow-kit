/**
 * test/select-option-transform.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for select-field (single/multi-select) option name→id
 * transformation in create-table-record-with-schema.ts.
 *
 * These exercise transformDraftWithSchema() with option fields to cover the
 * option-name→option_id lookup added in the Issue 21 completion.
 *
 * Run:  node --test test/select-option-transform.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  transformDraftWithSchema,
  type BitableTableSchema,
  type BitableFieldSchema,
} from '../src/adapters/create-table-record-with-schema.ts';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeField(
  overrides: Partial<BitableFieldSchema> = {},
): BitableFieldSchema {
  return {
    field_id: 'fld_001',
    field_name: 'Status',
    type: 3, // single_select
    property: { options: [] },
    ...overrides,
  };
}

function makeSchema(fields: BitableFieldSchema[]): BitableTableSchema {
  return { fields };
}

function makeDraft(
  fields: Record<string, unknown>,
): { body: { fields: Record<string, unknown> } } {
  return { body: { fields } };
}

// ── Single-select (type 3) tests ────────────────────────────────────────────

test('single-select: { name } is resolved to { id } using schema options', () => {
  const schema = makeSchema([
    makeField({
      field_id: 'fld_status',
      field_name: 'Status',
      type: 3, // single_select
      property: {
        options: [
          { name: 'Active', id: 'opt_active' },
          { name: 'Inactive', id: 'opt_inactive' },
        ],
      },
    }),
  ]);

  const draft = makeDraft({ Status: { name: 'Active' } });
  const result = transformDraftWithSchema(draft as never, schema);

  assert.deepEqual(result.body.fields['fld_status'], { id: 'opt_active' });
});

test('single-select: unknown option name falls back to original value', () => {
  const schema = makeSchema([
    makeField({
      field_id: 'fld_status',
      field_name: 'Status',
      type: 3,
      property: {
        options: [{ name: 'Active', id: 'opt_active' }],
      },
    }),
  ]);

  const draft = makeDraft({ Status: { name: 'NotInSchema' } });
  const result = transformDraftWithSchema(draft as never, schema);

  // Falls back: original value passed through
  assert.deepEqual(result.body.fields['fld_status'], { name: 'NotInSchema' });
});

test('single-select: option lookup is case-insensitive', () => {
  const schema = makeSchema([
    makeField({
      field_id: 'fld_status',
      field_name: 'Status',
      type: 3,
      property: {
        options: [{ name: 'Active', id: 'opt_active' }],
      },
    }),
  ]);

  const draftLower = makeDraft({ Status: { name: 'active' } });
  const draftMixed = makeDraft({ Status: { name: 'ACTIVE' } });

  const resultLower = transformDraftWithSchema(draftLower as never, schema);
  const resultMixed = transformDraftWithSchema(draftMixed as never, schema);

  assert.deepEqual(resultLower.body.fields['fld_status'], { id: 'opt_active' });
  assert.deepEqual(resultMixed.body.fields['fld_status'], { id: 'opt_active' });
});

test('single-select: null value is passed through unchanged', () => {
  const schema = makeSchema([
    makeField({
      field_id: 'fld_status',
      field_name: 'Status',
      type: 3,
      property: {
        options: [{ name: 'Active', id: 'opt_active' }],
      },
    }),
  ]);

  const draft = makeDraft({ Status: null });
  const result = transformDraftWithSchema(draft as never, schema);

  assert.equal(result.body.fields['fld_status'], null);
});

test('single-select: field with no options in schema — name passed through', () => {
  const schema = makeSchema([
    makeField({
      field_id: 'fld_status',
      field_name: 'Status',
      type: 3,
      property: { options: [] }, // no options defined
    }),
  ]);

  const draft = makeDraft({ Status: { name: 'SomeValue' } });
  const result = transformDraftWithSchema(draft as never, schema);

  // No option map → falls back to original value
  assert.deepEqual(result.body.fields['fld_status'], { name: 'SomeValue' });
});

// ── Multi-select (type 4) tests ─────────────────────────────────────────────

test('multi-select: array of { name } is resolved to array of { id }', () => {
  const schema = makeSchema([
    makeField({
      field_id: 'fld_tags',
      field_name: 'Tags',
      type: 4, // multi_select
      property: {
        options: [
          { name: 'Bug', id: 'opt_bug' },
          { name: 'Feature', id: 'opt_feature' },
          { name: 'Docs', id: 'opt_docs' },
        ],
      },
    }),
  ]);

  const draft = makeDraft({ Tags: [{ name: 'Bug' }, { name: 'Feature' }] });
  const result = transformDraftWithSchema(draft as never, schema);

  assert.deepEqual(result.body.fields['fld_tags'], [{ id: 'opt_bug' }, { id: 'opt_feature' }]);
});

test('multi-select: unknown option in array falls back to original item', () => {
  const schema = makeSchema([
    makeField({
      field_id: 'fld_tags',
      field_name: 'Tags',
      type: 4,
      property: {
        options: [{ name: 'Bug', id: 'opt_bug' }],
      },
    }),
  ]);

  const draft = makeDraft({ Tags: [{ name: 'Bug' }, { name: 'Unknown' }] });
  const result = transformDraftWithSchema(draft as never, schema);

  assert.deepEqual(result.body.fields['fld_tags'], [{ id: 'opt_bug' }, { name: 'Unknown' }]);
});

test('multi-select: empty array passes through unchanged', () => {
  const schema = makeSchema([
    makeField({
      field_id: 'fld_tags',
      field_name: 'Tags',
      type: 4,
      property: {
        options: [{ name: 'Bug', id: 'opt_bug' }],
      },
    }),
  ]);

  const draft = makeDraft({ Tags: [] });
  const result = transformDraftWithSchema(draft as never, schema);

  assert.deepEqual(result.body.fields['fld_tags'], []);
});

test('multi-select: non-object items in array are passed through', () => {
  const schema = makeSchema([
    makeField({
      field_id: 'fld_tags',
      field_name: 'Tags',
      type: 4,
      property: {
        options: [{ name: 'Bug', id: 'opt_bug' }],
      },
    }),
  ]);

  // Mixed array with string (edge case)
  const draft = makeDraft({ Tags: [{ name: 'Bug' }, 'not_an_object'] as never });
  const result = transformDraftWithSchema(draft as never, schema);

  assert.deepEqual(result.body.fields['fld_tags'][0], { id: 'opt_bug' });
  assert.equal((result.body.fields['fld_tags'] as unknown[])[1], 'not_an_object');
});

// ── Mixed field types ────────────────────────────────────────────────────────

test('single-select + number + text fields all transformed correctly in one pass', () => {
  const schema = makeSchema([
    makeField({
      field_id: 'fld_status',
      field_name: 'Status',
      type: 3,
      property: {
        options: [{ name: 'Open', id: 'opt_open' }],
      },
    }),
    makeField({ field_id: 'fld_count', field_name: 'Count', type: 2 }), // number
    makeField({ field_id: 'fld_name', field_name: 'Name', type: 1 }),   // text
  ]);

  const draft = makeDraft({
    Status: { name: 'Open' },
    Count: 42,
    Name: 'Hello',
  });

  const result = transformDraftWithSchema(draft as never, schema);

  assert.deepEqual(result.body.fields['fld_status'], { id: 'opt_open' });
  assert.equal(result.body.fields['fld_count'], 42);
  assert.equal(result.body.fields['fld_name'], 'Hello');
});

test('select field lookup uses field_name key (case-insensitive) to find field_id', () => {
  const schema = makeSchema([
    makeField({
      field_id: 'fld_priority',
      field_name: 'Priority',
      type: 3,
      property: {
        options: [{ name: 'High', id: 'opt_high' }],
      },
    }),
  ]);

  // Draft uses lowercase field name; schema has "Priority"
  const draft = makeDraft({ priority: { name: 'High' } });
  const result = transformDraftWithSchema(draft as never, schema);

  assert.deepEqual(result.body.fields['fld_priority'], { id: 'opt_high' });
});
