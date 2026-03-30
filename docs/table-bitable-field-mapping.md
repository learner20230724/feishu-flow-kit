# `/table` field mapping notes

This repo now includes a minimal `/table` workflow, but the real write path is still intentionally narrow.

This page documents what the current starter mapping assumes, where it breaks, and how to adapt it without pretending the problem is already solved.

If you want a copy-paste helper for mapping a real table into `.env` variables, use [`/table` schema mapping worksheet](./table-schema-mapping-worksheet.md).

---

## Current command shape

Supported starter command:

```text
/table add <list> <title...> / owner=<name>
```

If you want to see the current handler behavior end-to-end, including one valid webhook response and one invalid-payload failure, see [`/table` webhook success / error demo](./table-webhook-success-error-demo.md).

Examples:

```text
/table add backlog item: improve webhook errors / owner=alex
/table add leads ACME follow-up / owner=sam
/table add roadmap refine onboarding copy
/table add backlog improve webhook errors / owner_open_id=ou_xxx
/table add sprint fix flaky webhook tests / estimate=5
/table add sprint,urgent flaky webhook tests / owner_open_id=ou_demo_alex / estimate=5 / due=2026-04-01T09:30:00Z / done=true / attachment_token=file_v2_demo123,file_v2_demo456 / link_record_id=rec_demo_task_1,rec_demo_task_2
/table add sprint fix flaky webhook tests / due=2026-04-01
/table add sprint close flaky webhook tests / done=true
```

Current parsing behavior:
- command family: `/table`
- action: `add`
- first token after `add`: treated as the list name
- in `multi_select` list mode, that list token can be comma-separated like `backlog,urgent`
- remaining text: treated as the title
- optional `label: title` prefix: the part before `:` becomes `Details`
- optional `/ owner=<name>`: becomes `Owner`
- optional `/ owner_open_id=<open_id>`: becomes `Owner` input for user-field mode
- optional `/ estimate=<number>`: becomes `Estimate`
- optional `/ due=<YYYY-MM-DD-or-ISO8601>`: becomes `Due`
- optional `/ done=<true-or-false>`: becomes `Done`
- optional `/ attachment_token=<file_token[,file_token]>`: becomes `Attachment` input for attachment-field mode
- optional `/ link_record_id=<record_id[,record_id]>`: becomes `LinkedRecords` input for linked-record field mode
- original chat command is kept as `SourceCommand`

Example:

```text
/table add backlog item: improve webhook errors / owner=alex
```

becomes:

```json
{
  "Title": "improve webhook errors",
  "List": "backlog",
  "Details": "item",
  "Owner": "alex",
  "SourceCommand": "/table add backlog item: improve webhook errors / owner=alex"
}
```

---

## Current starter field mapping

The current adapter builds a `create-record` request with this field set:

- `Title`
- `List`
- `Details` (optional)
- `Owner` (optional)
- `Estimate` (optional)
- `Due` (optional)
- `Done` (optional)
- `Attachment` (optional)
- `LinkedRecords` (optional)
- `SourceCommand`

Default starter mode still assumes text-compatible fields.

Optional field-name remapping is now available too:
- `FEISHU_BITABLE_TITLE_FIELD_NAME=Task`
- `FEISHU_BITABLE_LIST_FIELD_NAME=Stage`
- `FEISHU_BITABLE_DETAILS_FIELD_NAME=Context`
- `FEISHU_BITABLE_OWNER_FIELD_NAME=Assignee`
- `FEISHU_BITABLE_ESTIMATE_FIELD_NAME=Points`
- `FEISHU_BITABLE_DUE_FIELD_NAME=TargetDate`
- `FEISHU_BITABLE_DONE_FIELD_NAME=Completed`
- `FEISHU_BITABLE_ATTACHMENT_FIELD_NAME=Files`
- `FEISHU_BITABLE_LINKED_RECORDS_FIELD_NAME=Dependencies`
- `FEISHU_BITABLE_SOURCE_COMMAND_FIELD_NAME=ChatCommand`

That means you can keep the current command shape while targeting a table that does **not** literally use `Title`, `List`, `Details`, `Owner`, `Estimate`, `Due`, `Done`, `Attachment`, `LinkedRecords`, and `SourceCommand` as column names.

That means the safest matching table schema is:

| Field | Expected meaning | Safest field type right now |
| --- | --- | --- |
| `Title` | main record title | Text |
| `List` | bucket / list name | Text by default, SingleSelect or MultiSelect when enabled |
| `Details` | small label or extra context | Text |
| `Owner` | owner name from chat command | Text |
| `Estimate` | rough effort or size | Text by default, Number when enabled |
| `Due` | target date or due timestamp | Text by default, Date / Datetime when enabled |
| `Done` | completion state from chat command | Text by default, Checkbox when enabled |
| `Attachment` | uploaded file tokens from chat or prior workflow | Text by default, Attachment when enabled |
| `LinkedRecords` | linked records to other planning items | Text by default, Linked Record when enabled |
| `SourceCommand` | raw original slash command | Text |

If your Bitable uses these exact names and text-like field types, the starter path should be easy to wire.

---

## What the current repo does **not** handle yet

The current `/table` write path is already wider than the original text-only starter, but it still does **not** yet handle things like:

- automatic schema discovery from the target Bitable table
- preflight validation that compares your configured field-name overrides against the real schema before `create-record`
- automatic coercion for arbitrary field types beyond the current starter modes
- option discovery or auto-create for select fields
- localized field-name lookup without explicit env var remapping
- richer formula / lookup / rollup / relation-aware behavior

It also does not currently:

- fetch table schema before writing
- validate field existence before calling `create-record`
- coerce values into different field payload shapes beyond the current starter modes
- auto-create missing fields
- reconcile localized field names automatically (manual field-name overrides are supported, schema discovery is not)

That is deliberate. The current milestone is about a visible, understandable starter path, not a general Bitable ORM.

---

## Recommended starter schema for first real verification

If you want the fastest path to a successful real write, create or reuse a Bitable table with these fields:

1. `Title` → Text
2. `List` → Text
3. `Details` → Text
4. `Owner` → Text
5. `Estimate` → Text or Number
6. `Due` → Text or Date / Datetime
7. `Attachment` → Text or Attachment
8. `LinkedRecords` → Text or Linked Record
9. `SourceCommand` → Text

This keeps the first real integration honest:
- command parsing stays simple
- request payload stays readable
- failures are easier to classify
- docs stay aligned with actual code

Once that works, widen one field at a time.

---

## How to widen the mapping safely

A practical order:

### 1. Keep `Title` as text
Do not make the first field fancy. Keep one stable anchor field so failed writes are easier to debug.

### 2. Upgrade `Owner` second
If you need richer ownership handling, `Owner` is a reasonable next field to evolve.

Current starter options:
- keep it as text with `/ owner=<name>`
- set `FEISHU_BITABLE_OWNER_FIELD_MODE=user`
- send `/ owner_open_id=<open_id>` so the outbound payload becomes `[{ id: open_id }]`

That keeps the command shape small while making one real person-picker schema usable.

### 3. Upgrade `List` into select only after text mode works
A select field is useful, but it adds one more failure class:
- option missing
- wrong value shape
- select label mismatch

Treat that as a follow-up, not a first step.

Current starter options:
- `FEISHU_BITABLE_LIST_FIELD_MODE=single_select` for one bucket value
- `FEISHU_BITABLE_LIST_FIELD_MODE=multi_select` for comma-separated list values like `backlog,urgent`

### 4. Upgrade `Estimate`, `Due`, `Attachment`, or `LinkedRecords` one at a time
These are good next fields because they map to common planning-table schemas.

Current starter options:
- `FEISHU_BITABLE_ESTIMATE_FIELD_MODE=number` for rough effort values
- `FEISHU_BITABLE_DUE_FIELD_MODE=date` for `YYYY-MM-DD`
- `FEISHU_BITABLE_DUE_FIELD_MODE=datetime` for ISO8601 timestamps
- `FEISHU_BITABLE_ATTACHMENT_FIELD_MODE=attachment` for comma-separated file tokens like `file_v2_demo123,file_v2_demo456`
- `FEISHU_BITABLE_LINK_FIELD_MODE=linked_record` for comma-separated record IDs like `recA123,recB456`

A practical habit is to prove `Estimate`, `Due`, `Attachment`, and `LinkedRecords` separately before combining them in the same real table.

### 5. Only add schema-aware mapping when repeated failures justify it
If real usage shows repeated confusion around field types or names, then it becomes worth adding:
- schema fetch
- explicit mapping config
- better per-field error messages

---

## Common failure patterns for `/table`

### Pattern: token fetch works, but record creation fails immediately

Usual causes:
- wrong `FEISHU_BITABLE_APP_TOKEN`
- wrong `FEISHU_BITABLE_TABLE_ID`
- app has no write permission for the target table

Check:
- app token points to the intended Bitable app
- table ID points to the intended table
- the app has record-write permission in that tenant

---

### Pattern: record creation fails only for some commands

Usual causes:
- field name exists, but field type is not text-compatible
- one optional field exists in a different type than expected
- command content becomes invalid for that table schema

Check:
- whether `Owner` is a user field instead of text
- whether `List` is a select field instead of text
- whether `Estimate` is a number field instead of text
- whether `Due` is a date/datetime field instead of text
- whether `Attachment` is an attachment field instead of text
- whether `LinkedRecords` is a linked-record field instead of text
- whether `Details` or `SourceCommand` is missing entirely

---

### Pattern: date field is configured, but Due still fails

Usual causes:
- `FEISHU_BITABLE_DUE_FIELD_MODE=date` is enabled, but the input is not `YYYY-MM-DD`
- `FEISHU_BITABLE_DUE_FIELD_MODE=datetime` expects an ISO8601 timestamp, but the command sends a loose local format
- the target field is Date while the table actually expects Datetime, or the reverse

Check:
- for date mode, use `/ due=2026-04-01`
- for datetime mode, use `/ due=2026-04-01T09:30:00Z`
- verify the target field type in Bitable matches the mode you enabled

---

### Pattern: one table works, another table does not

Usual cause:
- the repo currently assumes a starter schema, but your other table has different field names or types

Check:
- exact field names, including capitalization
- exact field types
- whether all starter fields exist in that table

---

### Pattern: the workflow returns a draft, but no real record is written

Usual causes:
- `FEISHU_ENABLE_TABLE_CREATE=false`
- outbound write is disabled on purpose

Check:
- set `FEISHU_ENABLE_TABLE_CREATE=true`
- confirm `FEISHU_BITABLE_APP_TOKEN` and `FEISHU_BITABLE_TABLE_ID` are both set

---

## Current environment variables involved

```bash
FEISHU_ENABLE_TABLE_CREATE=false
FEISHU_BITABLE_APP_TOKEN=
FEISHU_BITABLE_TABLE_ID=
FEISHU_BITABLE_LIST_FIELD_MODE=text
FEISHU_BITABLE_OWNER_FIELD_MODE=text
FEISHU_BITABLE_ESTIMATE_FIELD_MODE=text
FEISHU_BITABLE_DUE_FIELD_MODE=text
FEISHU_BITABLE_DONE_FIELD_MODE=text
FEISHU_BITABLE_ATTACHMENT_FIELD_MODE=text
FEISHU_BITABLE_LINK_FIELD_MODE=text
```

The current outbound write path is opt-in.

That means you can always start with local draft inspection first, confirm the generated field payload looks right, and only then enable real writes.

---

## Practical rule for this repo

If you are publishing or sharing this starter publicly, prefer this order:

1. prove the draft path locally
2. prove one real table with a text-only schema
3. document the exact field assumptions
4. widen mapping only when a concrete use case needs it

That keeps the repo readable and avoids shipping fake generality.
