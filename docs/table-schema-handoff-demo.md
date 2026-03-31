# `/table` schema handoff demo

This page shows the shortest reviewable path from a raw Feishu field-list API response to a mapping draft that `feishu-flow-kit` can use.

It is meant for schema handoff and review.
It is **not** live schema discovery.
It does not call Feishu APIs for you, fetch option IDs dynamically, or prove that the final table write will succeed unchanged.

Use it when you have already exported a field list from Feishu and want one repo-local trail that teammates can inspect.

Use it together with:
- [`/table` mapping generator input guide](./table-mapping-generator-inputs.md)
- [`/table` schema mapping worksheet](./table-schema-mapping-worksheet.md)
- [`/table` schema handoff review checklist](./table-schema-handoff-review-checklist.md)
- [`/table` select-option handoff asset](./table-select-option-handoff.md)
- [Setup guide](./setup-guide.md)

---

## Included sample artifacts

This repo now includes two fixture chains in `examples/`:

### Baseline handoff chain

- `feishu-fields-list-response.json` — raw Feishu-like field-list response
- `feishu-fields-normalized-schema.json` — normalized schema JSON after the first handoff step
- `feishu-fields-mapping-draft.json` — structured mapping draft after alias matching and mode inference

### Advanced raw-fidelity chain

- `feishu-fields-list-response-advanced.json` — raw field-list response with `DateTime`, `DuplexLink`, and select options metadata
- `feishu-fields-normalized-schema-advanced.json` — normalized schema fixture that keeps `dateFormatter`, `rawSemanticType`, `linkedTableId`, and `optionCount` visible
- `feishu-fields-mapping-draft-advanced.json` — mapping draft fixture that carries those review hints forward into `matches` and `reviewWarnings`

Together they give you two stable, reviewable examples of:

raw response → normalized schema → mapping draft

You can also verify that the committed normalized schema and mapping draft fixtures still match current CLI behavior:

```bash
npm run verify:table-schema-handoff
```

A small visual review asset is also included if you want something easier to paste into a README, issue, or PR than a long prose explanation:

![Table schema handoff review demo](./demo-table-schema-handoff-review.png)

If you want a cleaner browser-render target for screenshots or embeds, there is now also a standalone HTML snapshot page at [`table-schema-review-snapshot.html`](./table-schema-review-snapshot.html). A Chinese companion snapshot page now lives at [`table-schema-review-snapshot.zh-CN.html`](./table-schema-review-snapshot.zh-CN.html) for setup notes or review threads that need the surrounding explanation in Chinese. If the source SVG changes, refresh the PNG with `npm run docs:export-svg-png -- ./docs/demo-table-schema-handoff-review.svg --out ./docs/demo-table-schema-handoff-review.png`.

---

## Step 1: start from raw Feishu field-list JSON

Example input:

```bash
cat examples/feishu-fields-list-response.json
```

This fixture uses a Feishu-style response shape with:
- `data.app_token`
- `data.table_id`
- `data.table_name`
- `data.items[]`
- each item carrying `field_name`, `type`, `field_id`, and `ui_type`

The normalizer currently accepts these raw shapes:

```json
{ "items": [ ... ] }
```

```json
{ "data": { "items": [ ... ] } }
```

```json
[ ... ]
```

---

## Step 2: normalize the raw response into generator input

```bash
npm run table:normalize-feishu-fields -- examples/feishu-fields-list-response.json --out examples/feishu-fields-normalized-schema.json
```

The normalized file keeps the parts needed for handoff:
- top-level `tableName`
- top-level `appToken`
- top-level `tableId`
- `fields[]` with normalized `name` and `type`
- light source metadata such as `sourceTypeId`, `sourceFieldId`, and `uiType`
- selected raw-fidelity hints such as `rawSemanticType`, `dateFormatter`, `linkedTableId`, `optionCount`, and `sourceProperty`
- selected raw-property hints for review, such as `rawSemanticType`, `dateFormatter`, `linkedTableId`, `optionCount`, and the original `sourceProperty`

Example excerpt:

```json
{
  "tableName": "Sprint Tasks",
  "appToken": "app_demo123",
  "tableId": "tbl_demo456",
  "fields": [
    {
      "name": "TargetDate",
      "type": "date",
      "sourceTypeId": 5,
      "sourceFieldId": "fldDue001",
      "uiType": "DateTime",
      "rawSemanticType": "datetime",
      "sourceProperty": {
        "date_formatter": "yyyy-MM-dd"
      },
      "dateFormatter": "yyyy-MM-dd"
    },
    {
      "name": "Dependencies",
      "type": "linked_record",
      "sourceTypeId": 18,
      "sourceFieldId": "fldLinked001",
      "uiType": "SingleLink",
      "rawSemanticType": "single_link",
      "sourceProperty": {
        "table_id": "tbl_dependency"
      },
      "linkedTableId": "tbl_dependency"
    }
  ]
}
```

This step is useful when your integration notes still look like copied API output and you want something smaller, cleaner, and repo-safe to review.

---

## Step 3: turn the normalized schema into a mapping draft

```bash
npm run table:mapping-draft -- examples/feishu-fields-normalized-schema.json --format json --out examples/feishu-fields-mapping-draft.json
```

The resulting draft keeps six things in one file:
- `source`
- `config`
- `matches`
- `reviewWarnings`
- `selectOptionReviewDrafts`
- `unmatched`

Example excerpt:

```json
{
  "config": {
    "FEISHU_ENABLE_TABLE_CREATE": "true",
    "FEISHU_BITABLE_APP_TOKEN": "app_demo123",
    "FEISHU_BITABLE_TABLE_ID": "tbl_demo456",
    "FEISHU_BITABLE_LIST_FIELD_MODE": "single_select",
    "FEISHU_BITABLE_OWNER_FIELD_MODE": "user",
    "FEISHU_BITABLE_ESTIMATE_FIELD_MODE": "number",
    "FEISHU_BITABLE_DUE_FIELD_MODE": "date",
    "FEISHU_BITABLE_DONE_FIELD_MODE": "checkbox",
    "FEISHU_BITABLE_ATTACHMENT_FIELD_MODE": "attachment",
    "FEISHU_BITABLE_LINK_FIELD_MODE": "linked_record",
    "FEISHU_BITABLE_TITLE_FIELD_NAME": "Task"
  }
}
```

This is the review artifact to inspect before enabling real writes.

`reviewWarnings` is where the current CLI now surfaces the most important handoff review signals. In the included fixture chains, that means:
- select columns with existing option sets stay visible as an explicit option-label / option-ID review step
- `TargetDate` still carries raw `datetime` semantics even though the normalized mapping draft lands on `date`
- `Dependencies` still carries raw `single_link` semantics even though the normalized mapping draft lands on `linked_record`

That warning layer is intentionally small. It does not auto-fix the mapping for you. It exists to make the fields most likely to need a human second look harder to miss during handoff.

Each warning now also carries a little more review guidance:
- `reviewAction` — the concrete thing to verify before enabling live writes
- `suggestedEnv` — a suggested env override when there is an obvious next move
- `reviewChecklist` — a short, machine-readable checklist you can keep in JSON review artifacts or CI snapshots
- `optionLabelSample` — a tiny select-label sample so the reviewer can see likely live values without reopening the raw response
- `sourcePropertyExcerpt` — a trimmed raw-property excerpt for the warning case when a quick schema spot-check is useful

If you want the select-option part as a smaller rollout-ready asset instead of digging through the full warning list, the same JSON draft now also emits `selectOptionReviewDrafts`. It is just the reusable select-option subset: field name, mode, option label sample, trimmed raw excerpt, and the label→option-id remap draft you might paste into setup notes or a tiny override layer. That remap draft now also carries a small `overrideExample` object, so reviewers can copy a label→option-id map directly instead of reconstructing it from `entries` by hand.

Example warning shape:

```json
{
  "kind": "mode-mismatch",
  "actualName": "TargetDate",
  "rawSemanticType": "datetime",
  "reviewAction": "Check whether the target Bitable column should keep FEISHU_BITABLE_DUE_FIELD_MODE=date or be upgraded to datetime before enabling real writes.",
  "suggestedEnv": "FEISHU_BITABLE_DUE_FIELD_MODE=datetime",
  "reviewChecklist": [
    "Confirm whether the column stores date-only values or date-time values in the real table.",
    "If time-of-day matters, switch the env mode to datetime before first live create-record calls.",
    "Run one controlled write and compare the stored value in Bitable before rolling out wider."
  ]
}
```

If you prefer env output instead of JSON, the same warning block is now rendered once, with inline `action:` and `suggested env:` hints, so the pasteable draft still tells the reviewer what to do next.

---

## Advanced review excerpt

The advanced fixture chain is meant to be quoteable in PRs, setup notes, and schema review comments, so here is the shortest useful excerpt from `examples/feishu-fields-mapping-draft-advanced.json`:

```json
{
  "matches": [
    {
      "starterField": "List",
      "actualName": "Status",
      "actualType": "single_select",
      "optionCount": 3,
      "optionLabelSample": ["Todo", "Doing", "Done"]
    },
    {
      "starterField": "Due",
      "actualName": "Deadline",
      "actualType": "date",
      "rawSemanticType": "datetime",
      "dateFormatter": "yyyy-MM-dd HH:mm"
    },
    {
      "starterField": "LinkedRecords",
      "actualName": "RelatedTasks",
      "actualType": "linked_record",
      "rawSemanticType": "duplex_link",
      "linkedTableId": "tbl_related_release"
    }
  ],
  "reviewWarnings": [
    {
      "kind": "mode-mismatch",
      "actualName": "Deadline",
      "suggestedEnv": "FEISHU_BITABLE_DUE_FIELD_MODE=datetime"
    },
    {
      "kind": "link-shape-review",
      "actualName": "RelatedTasks"
    }
  ]
}
```

That one excerpt makes the highest-signal review hints visible in a few lines:
- `optionCount` + `optionLabelSample` show the select field is not just a generic text fallback and let the reviewer see likely live values before opening the warning block
- `optionLabelSample` and `sourcePropertyExcerpt` let the reviewer see real option names and a small raw excerpt without reopening the original field-list export
- `dateFormatter` + `rawSemanticType=datetime` makes it obvious that `date` mode may be too weak for the real column
- `rawSemanticType=duplex_link` + `linkedTableId` keeps the linked-table relation shape visible instead of collapsing it into a generic `linked_record`

If someone only reads one JSON block before touching `.env`, this is the one worth pasting into the review thread.

---

## Why keep both normalized schema and mapping draft

The two files answer different questions.

`feishu-fields-normalized-schema.json` answers:
- what did Feishu say the table schema looks like?
- what did we preserve from the API export?
- what are the real field names and types before alias matching?

`feishu-fields-mapping-draft.json` answers:
- how does the repo map that schema back onto starter fields?
- which field modes were inferred?
- which columns were left unmatched?
- what env config should a first pass try?

Keeping both makes review easier than jumping straight from raw API JSON to `.env` lines.

---

## Practical review flow

For a real tenant handoff, the safest sequence is:

1. export or copy a field-list response once
2. normalize it into a small schema artifact
3. generate a structured mapping draft
4. review `matches` and `unmatched`
5. copy only the config you actually want into `.env`
6. turn on one real `/table` write path at a time

That keeps the repo honest and leaves a paper trail when someone later asks why a mapping was chosen.

---

## Known limits

Current limits are deliberate:
- no live schema fetch
- no automatic select option ID resolution
- no linked-table metadata expansion beyond the raw field type hint
- no multilingual alias coverage guarantee
- no proof that the slash-command payload shape matches your tenant's select options or linked-table constraints

So treat this as a schema handoff helper, not as final truth.

It is a good first-pass repo asset because it makes the review path visible, reproducible, and publishable.
