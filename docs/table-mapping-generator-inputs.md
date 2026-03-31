# `/table` mapping generator input guide

This page documents the JSON input shape expected by `scripts/generate-table-mapping-env.mjs`.

Use it when you already inspected a real Bitable table and want a quick first-pass mapping draft without writing every `FEISHU_BITABLE_*` line by hand.

It is still a starter helper.
It does **not** call Feishu APIs, fetch schema automatically, or discover select option IDs.

Use it together with:
- [`/table` schema mapping worksheet](./table-schema-mapping-worksheet.md)
- [Setup guide](./setup-guide.md)
- [`/table` API error fixture pack](./table-api-error-fixtures.md)

---

## Quick start

```bash
npm run table:mapping-draft -- examples/table-schema-sample.json
npm run table:mapping-draft -- examples/table-schema-partial.json --format json
npm run table:mapping-draft -- examples/table-schema-unmatched.json --format json --out ./table-mapping-review.json
```

Default output is env text.
Use `--format json` when you want a review artifact that keeps `matches`, `unmatched`, and inferred modes in one machine-readable file.

---

## Expected JSON shape

The generator expects one JSON object with a non-empty `fields` array.

```json
{
  "tableName": "Sprint Tasks",
  "appToken": "app_demo123",
  "tableId": "tbl_demo456",
  "enableTableCreate": true,
  "fields": [
    { "name": "Task", "type": "text" },
    { "name": "Stage", "type": "single_select" },
    { "name": "Assignee", "type": "user" }
  ]
}
```

### Top-level fields

| Field | Required | Meaning |
| --- | --- | --- |
| `tableName` | no | Human-readable table name shown in output metadata |
| `appToken` | no | Draft value for `FEISHU_BITABLE_APP_TOKEN`; defaults to `app_xxx` |
| `tableId` | no | Draft value for `FEISHU_BITABLE_TABLE_ID`; defaults to `tbl_xxx` |
| `enableTableCreate` | no | Draft value for `FEISHU_ENABLE_TABLE_CREATE`; defaults to `true` |
| `fields` | yes | Real or copied table column list used for alias matching |

### Field objects

Each item in `fields` should be a small object like:

```json
{ "name": "Assignee", "type": "user" }
```

Supported `type` values for mode inference today:
- `text`
- `single_select`
- `multi_select`
- `user`
- `number`
- `date`
- `datetime`
- `checkbox`
- `attachment`
- `linked_record`

If a field type is unknown or outside the supported starter modes, the generator falls back to the safest starter mode for that repo field, usually `text`.

---

## What the generator tries to match

The helper maps a copied real-table field list back onto the repo's starter fields:

- `Title`
- `List`
- `Details`
- `Owner`
- `Estimate`
- `Due`
- `Done`
- `Attachment`
- `LinkedRecords`
- `SourceCommand`

It uses simple name aliases such as:
- `Task` / `Name` → `Title`
- `Stage` / `Status` / `Bucket` → `List`
- `Context` / `Notes` / `Description` → `Details`
- `Assignee` / `Person` → `Owner`
- `Points` / `Effort` / `Size` → `Estimate`
- `TargetDate` / `Deadline` → `Due`
- `Completed` → `Done`
- `Files` → `Attachment`
- `Dependencies` / `RelatedTasks` → `LinkedRecords`
- `ChatCommand` → `SourceCommand`

This is alias-based matching, not schema discovery.
If your real table uses very custom names, expect to review and adjust the draft manually.

---

## Output behavior

### Env mode

Env mode produces a pasteable draft such as:

```bash
FEISHU_ENABLE_TABLE_CREATE=true
FEISHU_BITABLE_APP_TOKEN=app_demo123
FEISHU_BITABLE_TABLE_ID=tbl_demo456
...
FEISHU_BITABLE_TITLE_FIELD_NAME=Task
FEISHU_BITABLE_LIST_FIELD_NAME=Stage
```

### JSON mode

JSON mode produces a review artifact with:
- `source`
- `config`
- `matches`
- `unmatched`

That is useful when you want to:
- diff mapping changes between tables
- keep review notes in CI or repo artifacts
- inspect which columns were left unmatched before enabling real writes

---

## Sample variants in `examples/`

### `table-schema-sample.json`
A full happy-path sample where all starter fields can be matched cleanly.

### `table-schema-partial.json`
A smaller real-world first pass.
Only the fields needed for an early `/table` rollout are present, so the draft falls back to starter defaults for missing fields.

### `table-schema-localized.json`
A reminder that localized or non-English column names are **not** automatically understood unless they overlap with current alias heuristics.
Use this as a review sample, not as proof of multilingual schema support.

### `table-schema-unmatched.json`
A noisier sample with extra columns that the repo does not currently map.
Use it to check whether your review flow preserves unmatched fields clearly before real integration.

---

## Practical usage patterns

### Small first-pass rollout

If your real table only needs title, stage, owner, and source command, a partial input is fine.
The generator will still emit the full config surface, but unmapped fields fall back to starter names and starter modes.

That is often better than pretending you have a perfect schema plan on day one.

### Review before live write

If the table is not close to the starter schema, prefer:

```bash
npm run table:mapping-draft -- examples/table-schema-unmatched.json --format json
```

Then inspect:
- which starter fields matched
- which inferred modes look suspicious
- which real columns are still unmatched

### Localized tables

If your tenant uses Chinese or mixed-language field names, treat the current output as a draft to review, not as truth.
The helper is useful for surfacing the gap, but it is not yet multilingual schema-aware.

---

## Known limits

Current limits are intentional:
- no live Feishu schema fetch
- no select option ID lookup
- no linked-table metadata lookup
- no guaranteed multilingual alias coverage
- no validation that your slash-command payload shape really matches the target field options

So the safest workflow is still:
1. inspect the table once
2. generate a draft
3. review `matches` and `unmatched`
4. turn on one real write path at a time

That keeps this repo honest and readable.
