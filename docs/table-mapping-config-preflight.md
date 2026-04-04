# `/table` mapping config preflight

This page documents the smallest rollout-time safety check currently built into `feishu-flow-kit` for `/table`.

Use it when you already have:
- a normalized field-list export
- a candidate `.env` mapping for your target Bitable
- a desire to catch obvious field-name / field-type drift **before** the first real create-record call

It is intentionally small.
It does not fetch schema live.
It does not mutate Feishu.
It does not promise a full schema-aware write layer.

What it does do is compare your current `FEISHU_BITABLE_*` config against one normalized schema file and tell you where the starter contract is clearly out of alignment.

Use it together with:
- [`/table` field mapping notes](./table-bitable-field-mapping.md)
- [`/table` schema handoff demo](./table-schema-handoff-demo.md)
- [`/table` schema review page](./table-schema-review-page.md)
- [Release checklist](./release-checklist.md)

---

## When this is worth running

Run the preflight when:
- you just generated or edited a `.env` mapping draft
- the target table uses renamed fields like `Task`, `Status`, or `Deadline`
- you widened one or two starter fields from `text` into `single_select`, `user`, `number`, `date`, `attachment`, or `linked_record`
- you want a local review gate before enabling `FEISHU_ENABLE_TABLE_CREATE=true`
- you want release / CI to fail on obvious mapping drift instead of discovering it only after a live write attempt

Skip it if you are still at the earliest text-only mock stage and have not even picked a real table schema yet.

---

## Command

```bash
npm run table:validate-mapping-config -- <schema.json> [--env-file <path>] [--strict-raw]
```

Examples:

```bash
npm run table:validate-mapping-config -- examples/feishu-fields-normalized-schema.json
npm run table:validate-mapping-config -- examples/feishu-fields-normalized-schema-advanced.json --env-file examples/table-mapping-advanced.env
npm run table:validate-mapping-config -- examples/feishu-fields-normalized-schema-advanced.json --env-file examples/table-mapping-advanced.env --strict-raw
```

Input expectation:
- the JSON must contain a top-level `fields` array
- the file is expected to look like output from `npm run table:normalize-feishu-fields -- ...`

Env source behavior:
- without `--env-file`, the validator uses `process.env` plus starter defaults
- with `--env-file`, file values override defaults for the validation run

---

## What gets checked

The validator currently checks the starter `/table` mapping contract for these fields:

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

For each one, it verifies:
- which configured field name is being targeted
- whether that field exists in the normalized schema
- whether the configured mode is allowed by the current starter contract
- whether the normalized field type matches the configured mode

Current supported widened modes include:
- `List` → `single_select`, `multi_select`
- `Owner` → `user`
- `Estimate` → `number`
- `Due` → `date`, `datetime`
- `Done` → `checkbox`
- `Attachment` → `attachment`
- `LinkedRecords` → `linked_record`

---

## Example output

A successful run looks like this shape:

```text
Validating /table mapping against feishu-fields-normalized-schema-advanced.json (Release tasks)
✓ Title -> Task (text)
✓ List -> Status (single_select)
✓ Details -> Notes (text)
✓ Owner -> Owner (user)
✓ Estimate -> Effort (number)
✓ Due -> Deadline (date)
✓ Done -> Completed (checkbox)
✓ Attachment -> Files (attachment)
✓ LinkedRecords -> RelatedTasks (linked_record)
✓ SourceCommand -> SourceCommand (text)
Env source: examples/table-mapping-advanced.env

Warnings:
- Deadline: configured mode is date, but raw Feishu semantics still say datetime
- RelatedTasks: linked_record is valid, but raw Feishu semantics still distinguish duplex_link

/table mapping config looks aligned with the provided schema.
```

That is a pass, but not a silent pass.
It tells you the starter contract is aligned enough to continue, while still surfacing the semantic edges that are easiest to miss during rollout.

---

## What warnings mean

The validator currently keeps two raw-semantic drift cases visible:

### 1. `datetime` → `date`

If the normalized schema says a field is `date`, but the retained raw Feishu semantic type still says `datetime`, the validator warns by default:

```text
Deadline: configured mode is date, but raw Feishu semantics still say datetime
```

Interpretation:
- your mapping is structurally acceptable
- but you may be flattening away time-of-day semantics too early

Typical next move:
- keep `date` if the real rollout should be date-only
- switch to `FEISHU_BITABLE_DUE_FIELD_MODE=datetime` if the real table behavior should preserve timestamps

### 2. `duplex_link` / `single_link` → `linked_record`

If the normalized schema lands on `linked_record`, but the raw semantic type still distinguishes link shape, the validator warns:

```text
RelatedTasks: linked_record is valid, but raw Feishu semantics still distinguish duplex_link
```

Interpretation:
- the field is good enough for the starter contract
- but relation shape still deserves one human review before the first real write

Typical next move:
- confirm the linked target table is the one you intended
- confirm the rollout expects this relation direction and shape

---

## What `--strict-raw` changes

By default, raw-semantic drift stays a warning.

If you add `--strict-raw`, at least the `datetime`→`date` drift is upgraded into a hard failure:

```bash
npm run table:validate-mapping-config -- examples/feishu-fields-normalized-schema-advanced.json --env-file examples/table-mapping-advanced.env --strict-raw
```

Use strict mode when:
- you want release verification to block on semantic drift
- you are preparing CI or a pre-publish gate
- your team already agreed that `date` vs `datetime` should never be silently normalized away

Use normal mode when:
- you still want the warning visible
- but you do not want every review run to fail on known drift yet

---

## Common failure cases

### Field name missing

Example failure:

```text
List: configured field "Stage" was not found in schema
```

Usual meaning:
- your env file points at a column name that is not present in the normalized export
- or the target schema file is stale

Check:
- field name spelling and capitalization
- whether you exported the right table
- whether your `.env` was copied from an older handoff note

### Field type mismatch

Example failure:

```text
Owner: field "Owner" is text, but config expects user
```

Usual meaning:
- the env mode says widened payload
- but the actual normalized schema is still a different type

Check:
- whether the table column was widened in Feishu yet
- whether the normalized export is fresh
- whether your env mode should temporarily stay on `text`

### Unsupported starter mode

Example failure:

```text
Estimate: configured mode "currency" is not supported by the starter contract
```

Usual meaning:
- you are asking the starter mapping layer to support a mode it does not implement yet

Check:
- whether the field should stay on a currently supported mode
- whether this is the moment to widen the repo capability rather than just the env file

---

## Good rollout habit

A practical sequence is:

1. normalize the Feishu field-list response
2. draft or edit `.env`
3. run `table:validate-mapping-config`
4. fix obvious name / mode drift
5. decide whether raw warnings stay warnings or should become strict failures
6. only then enable real `/table` writes

That keeps the first live create-record attempt boring, which is usually the right goal.
