# `/table` field mapping notes

This repo now includes a minimal `/table` workflow, but the real write path is still intentionally narrow.

This page documents what the current starter mapping assumes, where it breaks, and how to adapt it without pretending the problem is already solved.

---

## Current command shape

Supported starter command:

```text
/table add <list> <title...> / owner=<name>
```

Examples:

```text
/table add backlog item: improve webhook errors / owner=alex
/table add leads ACME follow-up / owner=sam
/table add roadmap refine onboarding copy
/table add backlog improve webhook errors / owner_open_id=ou_xxx
```

Current parsing behavior:
- command family: `/table`
- action: `add`
- first token after `add`: treated as the list name
- remaining text: treated as the title
- optional `label: title` prefix: the part before `:` becomes `Details`
- optional `/ owner=<name>`: becomes `Owner`
- optional `/ owner_open_id=<open_id>`: becomes `Owner` input for user-field mode
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
- `SourceCommand`

Default starter mode still assumes text-compatible fields.

Optional widening now available:
- `FEISHU_BITABLE_LIST_FIELD_MODE=single_select` → emits `List` as `{ "name": "..." }`
- `FEISHU_BITABLE_OWNER_FIELD_MODE=user` + `/ owner_open_id=ou_xxx` → emits `Owner` as `[{ "id": "ou_xxx" }]`

That means the safest matching table schema is:

| Field | Expected meaning | Safest field type right now |
| --- | --- | --- |
| `Title` | main record title | Text |
| `List` | bucket / list name | Text |
| `Details` | small label or extra context | Text |
| `Owner` | owner name from chat command | Text |
| `SourceCommand` | raw original slash command | Text |

If your Bitable uses these exact names and text-like field types, the starter path should be easy to wire.

---

## What the current repo does **not** handle yet

The current `/table` write path does **not** yet map richer field types such as:

- single select
- multi-select
- user / person picker
- date / datetime
- checkbox
- number
- attachment
- linked records

It also does not currently:

- fetch table schema before writing
- validate field existence before calling `create-record`
- coerce values into different field payload shapes
- auto-create missing fields
- reconcile localized field names

That is deliberate. The current milestone is about a visible, understandable starter path, not a general Bitable ORM.

---

## Recommended starter schema for first real verification

If you want the fastest path to a successful real write, create or reuse a Bitable table with these fields:

1. `Title` → Text
2. `List` → Text
3. `Details` → Text
4. `Owner` → Text
5. `SourceCommand` → Text

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

### 4. Only add schema-aware mapping when repeated failures justify it
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
- whether `Details` or `SourceCommand` is missing entirely

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
