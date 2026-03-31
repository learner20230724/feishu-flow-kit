# `/table` select-option handoff asset

This page pulls the select-option part of the schema handoff into one smaller rollout-facing artifact.

Use it when the mapping draft already found a `single_select` or `multi_select` target column and you want something easier to paste into setup notes, PR review, or rollout comments than the full `reviewWarnings` block.

It is still a review asset, not live option discovery. It does not fetch current option IDs from Feishu for you.

Use it together with:
- [`/table` schema handoff demo](./table-schema-handoff-demo.md)
- [`/table` schema review page](./table-schema-review-page.md)
- [`/table` schema handoff review checklist](./table-schema-handoff-review-checklist.md)
- [`/table` select-option override schema draft](./table-select-option-override-schema.md)

---

## What it is for

The mapping draft now emits `selectOptionReviewDrafts` so the select-column review step does not stay buried inside the larger JSON output.

That smaller asset is meant to answer four rollout questions quickly:
- which starter field matched the live select column
- whether the column is `single_select` or `multi_select`
- which option labels are visible in the sampled schema export
- what the smallest label → option-id remap draft looks like if the rollout needs explicit review notes or an override layer

---

## Example source

The advanced fixture chain includes one review-ready select artifact in:

```text
examples/feishu-fields-mapping-draft-advanced.json
```

The relevant block looks like this:

```json
{
  "selectOptionReviewDrafts": [
    {
      "starterField": "List",
      "actualName": "Status",
      "actualType": "single_select",
      "inferredMode": "single_select",
      "optionCount": 3,
      "optionLabelSample": ["Todo", "Doing", "Done"],
      "sourcePropertyExcerpt": {
        "options": [
          { "id": "opt_todo", "name": "Todo" },
          { "id": "opt_doing", "name": "Doing" },
          { "id": "opt_done", "name": "Done" }
        ]
      },
      "optionRemapDraft": {
        "sourceFieldMode": "single_select",
        "strategy": "label_to_option_id",
        "entries": [
          { "sourceLabel": "Todo", "targetLabel": "Todo", "targetOptionId": "opt_todo" },
          { "sourceLabel": "Doing", "targetLabel": "Doing", "targetOptionId": "opt_doing" },
          { "sourceLabel": "Done", "targetLabel": "Done", "targetOptionId": "opt_done" }
        ],
        "overrideExample": {
          "field": "List",
          "mode": "single_select",
          "byLabel": {
            "Todo": "opt_todo",
            "Doing": "opt_doing",
            "Done": "opt_done"
          }
        }
      }
    }
  ]
}
```

---

## Why this smaller asset exists

The full mapping draft is still the source of truth, but select rollout review usually wants a much smaller excerpt.

In practice, reviewers often only need:
- the live column name
- the expected select mode
- a tiny option label sample
- a copyable label → option-id map

That is why `optionRemapDraft.overrideExample` now exists. It turns the review result into a shape that is easier to copy into setup notes, issue comments, or a thin override layer.

---

## Smallest copyable excerpt

If you only need the rollout-facing core, this is the shortest useful block to quote:

```json
{
  "field": "List",
  "mode": "single_select",
  "byLabel": {
    "Todo": "opt_todo",
    "Doing": "opt_doing",
    "Done": "opt_done"
  }
}
```

That excerpt is intentionally tiny:
- `field` tells you which starter field this review note belongs to
- `mode` keeps the select shape explicit
- `byLabel` is the part most likely to be pasted forward

The repo now also includes the same shape as a standalone sample file you can copy or attach directly:

```text
examples/table-select-option-override-sample.json
```

---

## Review checklist

Before enabling real writes for a select column, confirm:

1. the matched live column is still the right one
2. `single_select` vs `multi_select` still matches the workflow expectation
3. labels in the real table still match the workflow values you plan to send
4. if labels drifted, you either rename the live options or record an explicit remap before rollout

---

## Verification loop

Refresh and verify the committed handoff fixtures, including the standalone select-option override sample, with:

```bash
npm run verify:table-schema-handoff
```

That verify step now checks two things for the override sample: the extracted example still matches the committed sample file, and the sample itself still fits the minimal `field` / `mode` / `byLabel` contract.

If you want the full context behind the smaller select asset, go back to the advanced fixture chain in [`/table` schema handoff demo](./table-schema-handoff-demo.md).
