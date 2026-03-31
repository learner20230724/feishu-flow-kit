# `/table` schema mapping worksheet

This page is a small helper for the moment right before you turn on real Bitable writes.

It does **not** fetch schema for you. It gives you a fast way to inspect a real table, map the repo's starter fields onto it, and produce a clean `.env` snippet without guessing.

If you already have a JSON field list, you can also generate a first-pass draft with:

```bash
npm run table:mapping-draft -- examples/table-schema-sample.json
```

And if you want a file you can review or copy into `.env` later:

```bash
npm run table:mapping-draft -- examples/table-schema-sample.json --out ./.env.table-draft
```

If you want a machine-readable review artifact instead of `.env` text, use JSON output:

```bash
npm run table:mapping-draft -- examples/table-schema-sample.json --format json
npm run table:mapping-draft -- examples/table-schema-sample.json --format json --out ./table-mapping-draft.json
```

The JSON form keeps inferred modes, field-name mapping, and unmatched columns in a structure that is easier to diff or feed into follow-up scripts.

Use it together with:
- [Setup guide](./setup-guide.md)
- [`/table` mapping generator input guide](./table-mapping-generator-inputs.md)
- [Table / Bitable field mapping notes](./table-bitable-field-mapping.md)
- [`/table` API error fixture pack](./table-api-error-fixtures.md)

---

## When to use this

Use this worksheet when:
- `/table` draft output already looks right locally
- you have a real `FEISHU_BITABLE_APP_TOKEN` and `FEISHU_BITABLE_TABLE_ID`
- your target table does **not** use the starter field names exactly
- you want to turn field-name remap into one deliberate pass instead of trial-and-error

---

## Step 1: inspect the target table once

Open the target Bitable table and write down the actual column names and field types.

You only need the fields you plan to use now.

Suggested starter inventory:

| Repo field | Meaning | Typical real-table name examples | Typical field type |
| --- | --- | --- | --- |
| `Title` | primary task / item title | `Task`, `Title`, `Name` | Text |
| `List` | bucket / stage / swimlane | `Stage`, `List`, `Status` | Text / SingleSelect / MultiSelect |
| `Details` | short extra context | `Context`, `Notes`, `Label` | Text |
| `Owner` | person in charge | `Assignee`, `Owner` | Text / User |
| `Estimate` | rough effort / points | `Estimate`, `Points` | Text / Number |
| `Due` | due date or target timestamp | `Due`, `TargetDate` | Text / Date / Datetime |
| `Done` | completion state | `Done`, `Completed` | Text / Checkbox |
| `Attachment` | uploaded files | `Files`, `Attachment` | Text / Attachment |
| `LinkedRecords` | related records | `Dependencies`, `RelatedTasks` | Text / Linked Record |
| `SourceCommand` | raw slash command trace | `ChatCommand`, `SourceCommand` | Text |

---

## Step 2: choose only the fields you actually need now

Do **not** try to wire every possible field on day one.

A practical first pass is usually:
- `Title`
- `List`
- `Details`
- `Owner`
- `SourceCommand`

If that works, then widen one field at a time:
- `Estimate`
- `Due`
- `Done`
- `Attachment`
- `LinkedRecords`

---

## Step 3: fill this worksheet

Copy this block into your notes and replace the right-hand side values.

```text
Table name:
App token:
Table ID:

Title -> actual column name:
Title -> actual field type:

List -> actual column name:
List -> actual field type:
List -> desired mode (text | single_select | multi_select):

Details -> actual column name:
Details -> actual field type:

Owner -> actual column name:
Owner -> actual field type:
Owner -> desired mode (text | user):

Estimate -> actual column name:
Estimate -> actual field type:
Estimate -> desired mode (text | number):

Due -> actual column name:
Due -> actual field type:
Due -> desired mode (text | date | datetime):

Done -> actual column name:
Done -> actual field type:
Done -> desired mode (text | checkbox):

Attachment -> actual column name:
Attachment -> actual field type:
Attachment -> desired mode (text | attachment):

LinkedRecords -> actual column name:
LinkedRecords -> actual field type:
LinkedRecords -> desired mode (text | linked_record):

SourceCommand -> actual column name:
SourceCommand -> actual field type:
```

---

## Step 4: turn that into `.env` config

### Minimal text-first example

If your table stays close to the starter schema:

```bash
FEISHU_ENABLE_TABLE_CREATE=true
FEISHU_BITABLE_APP_TOKEN=app_xxx
FEISHU_BITABLE_TABLE_ID=tbl_xxx

FEISHU_BITABLE_LIST_FIELD_MODE=text
FEISHU_BITABLE_OWNER_FIELD_MODE=text
FEISHU_BITABLE_ESTIMATE_FIELD_MODE=text
FEISHU_BITABLE_DUE_FIELD_MODE=text
FEISHU_BITABLE_DONE_FIELD_MODE=text
FEISHU_BITABLE_ATTACHMENT_FIELD_MODE=text
FEISHU_BITABLE_LINK_FIELD_MODE=text

FEISHU_BITABLE_TITLE_FIELD_NAME=Title
FEISHU_BITABLE_LIST_FIELD_NAME=List
FEISHU_BITABLE_DETAILS_FIELD_NAME=Details
FEISHU_BITABLE_OWNER_FIELD_NAME=Owner
FEISHU_BITABLE_ESTIMATE_FIELD_NAME=Estimate
FEISHU_BITABLE_DUE_FIELD_NAME=Due
FEISHU_BITABLE_DONE_FIELD_NAME=Done
FEISHU_BITABLE_ATTACHMENT_FIELD_NAME=Attachment
FEISHU_BITABLE_LINKED_RECORDS_FIELD_NAME=LinkedRecords
FEISHU_BITABLE_SOURCE_COMMAND_FIELD_NAME=SourceCommand
```

### Remapped real-table example

If your table uses more realistic business names:

```bash
FEISHU_ENABLE_TABLE_CREATE=true
FEISHU_BITABLE_APP_TOKEN=app_xxx
FEISHU_BITABLE_TABLE_ID=tbl_xxx

FEISHU_BITABLE_LIST_FIELD_MODE=single_select
FEISHU_BITABLE_OWNER_FIELD_MODE=user
FEISHU_BITABLE_ESTIMATE_FIELD_MODE=number
FEISHU_BITABLE_DUE_FIELD_MODE=date
FEISHU_BITABLE_DONE_FIELD_MODE=checkbox
FEISHU_BITABLE_ATTACHMENT_FIELD_MODE=attachment
FEISHU_BITABLE_LINK_FIELD_MODE=linked_record

FEISHU_BITABLE_TITLE_FIELD_NAME=Task
FEISHU_BITABLE_LIST_FIELD_NAME=Stage
FEISHU_BITABLE_DETAILS_FIELD_NAME=Context
FEISHU_BITABLE_OWNER_FIELD_NAME=Assignee
FEISHU_BITABLE_ESTIMATE_FIELD_NAME=Points
FEISHU_BITABLE_DUE_FIELD_NAME=TargetDate
FEISHU_BITABLE_DONE_FIELD_NAME=Completed
FEISHU_BITABLE_ATTACHMENT_FIELD_NAME=Files
FEISHU_BITABLE_LINKED_RECORDS_FIELD_NAME=Dependencies
FEISHU_BITABLE_SOURCE_COMMAND_FIELD_NAME=ChatCommand
```

---

## Step 5: verify one field shape at a time

Recommended order:

1. keep `Title` as text
2. verify `List` in text mode first if possible
3. switch `Owner` to `user` only when you have real `owner_open_id`
4. switch `Estimate` to `number` only when the table field is really numeric
5. switch `Due` to `date` or `datetime` only when your command format matches the target field
6. add `Done`, `Attachment`, and `LinkedRecords` after the core row write already works

This keeps failures easier to classify.

---

## Step 6: use the fixture pack when writes fail

If the first real write fails, compare the error against:
- [`examples/table-api-error-field-not-found.json`](../examples/table-api-error-field-not-found.json)
- [`examples/table-api-error-type-mismatch.json`](../examples/table-api-error-type-mismatch.json)
- [`examples/table-api-error-permission-denied.json`](../examples/table-api-error-permission-denied.json)

Quick triage:
- `field not found` → check `FEISHU_BITABLE_*_FIELD_NAME`
- `type mismatch` → check `FEISHU_BITABLE_*_FIELD_MODE` and command shape
- `permission denied` → check app scope / tenant permission / target table access

---

## Practical rule

If you are unsure, prefer:
- fewer mapped fields
- more text mode
- one real write path at a time

This repo is strongest when it stays readable and honest, not when it tries to look magically schema-aware.
