# `/table` select-option override schema draft

This page defines the smallest stable shape for a select-option override asset.

It is not a live config reader yet.
It is a repo-level contract draft so setup notes, handoff docs, fixture assets, and a future CLI consumer can all point at the same shape.

Use it together with:
- [`/table` select-option handoff asset](./table-select-option-handoff.md)
- [`/table` schema handoff demo](./table-schema-handoff-demo.md)
- [`examples/table-select-option-override-sample.json`](../examples/table-select-option-override-sample.json)
- [`examples/table-select-option-override-bundle-sample.json`](../examples/table-select-option-override-bundle-sample.json)

---

## Why this exists

The repo already emits `selectOptionReviewDrafts[*].optionRemapDraft.overrideExample` and now also ships a standalone sample JSON file.

What was still missing was one explicit page that says: this is the intended minimal schema if we later let tooling consume the same asset.

That keeps rollout notes, review comments, and future implementation work aligned around one tiny contract instead of several slightly different ad-hoc snippets.

---

## Draft schema

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

### Field meanings

- `field` — starter field identity, not the live column name. Current example: `List`.
- `mode` — expected select shape. Current allowed values: `single_select`, `multi_select`.
- `byLabel` — label → live option-id map for the values your workflow may send.

---

## Contract rules

Treat the draft shape above with these rules:

1. `field` should stay tied to the starter-field vocabulary already used by mapping drafts.
2. `mode` should describe the expected workflow payload shape, not just copy UI wording from Feishu.
3. `byLabel` keys should be the workflow-facing labels.
4. `byLabel` values should be live Feishu option IDs when known.
5. If an option ID is not yet confirmed, do not fake it. Keep the review asset in `selectOptionReviewDrafts` until the live table is checked.

---

## Current non-goals

This draft intentionally does **not** define:

- live column-name lookup
- automatic option creation
- fallback label rewriting rules
- per-environment merges
- multi-table override bundles

Those can come later if the CLI actually starts consuming this asset.

---

## Relationship to current artifacts

Today the same idea appears in three places:

1. `selectOptionReviewDrafts[*].optionRemapDraft.entries` — fuller review detail
2. `selectOptionReviewDrafts[*].optionRemapDraft.overrideExample` — smallest inline copyable block
3. `examples/table-select-option-override-sample.json` — standalone sample file

This page is the contract note that ties those three together.

There is now also a minimal bundle sample at `examples/table-select-option-override-bundle-sample.json` so future tooling does not have to guess how multiple override blocks should be grouped in one file.

---

## Verification loop

If you update the mapping draft fixtures or select-option handoff docs, re-run:

```bash
npm run table:validate-select-option-override -- examples/table-select-option-override-sample.json
npm run table:validate-select-option-override -- examples/table-select-option-override-bundle-sample.json --field List
npm run verify:table-schema-handoff
npm run check
```

`npm run table:validate-select-option-override` is the small reusable CLI check for this contract. It accepts a single override object, an array of override objects, or a bundle object with `overrides`.

`npm run verify:table-schema-handoff` still verifies the full baseline + advanced fixture chains, and now reuses the same validator so the contract only lives in one place: `field` must stay a non-empty string, `mode` must be `single_select` or `multi_select`, and `byLabel` must stay a non-empty label → option-id object.
