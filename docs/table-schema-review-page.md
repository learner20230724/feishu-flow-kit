# `/table` schema review page

This page is the shortest high-signal review surface for the schema handoff path in `feishu-flow-kit`.

Use it when you do **not** want the full walkthrough from the handoff demo, and instead need one page that answers:
- what fields matched the starter config
- what raw Feishu hints are still visible after normalization
- what needs a human second look before live writes
- which env overrides are the most likely next move

It is intentionally review-first.
It is not live schema discovery.
It does not call Feishu APIs, fetch option IDs dynamically, or guarantee that the first real write will succeed unchanged.

Use it together with:
- [`/table` schema handoff demo](./table-schema-handoff-demo.md)
- [`/table` schema handoff review checklist](./table-schema-handoff-review-checklist.md)
- [`/table` mapping generator input guide](./table-mapping-generator-inputs.md)
- [Setup guide](./setup-guide.md)

---

## What this page compresses

The full handoff path in this repo is:

raw field-list response → normalized schema → mapping draft → `.env` review → first controlled write

The long-form walkthrough lives in [`/table` schema handoff demo](./table-schema-handoff-demo.md).
This page compresses that into one quoteable review surface built around the advanced fixture chain:

- `examples/feishu-fields-list-response-advanced.json`
- `examples/feishu-fields-normalized-schema-advanced.json`
- `examples/feishu-fields-mapping-draft-advanced.json`

If you only need one page to review before touching `.env`, start here.

![Table schema handoff review demo](./demo-table-schema-handoff-review.png)

![Table schema review page snapshot](./demo-table-schema-review-page.png)

![Table schema review share card](./demo-table-schema-review-share-card.png)

This page now also has single-page static snapshot assets, so the review surface can be pasted into a README, issue, setup note, or PR comment without requiring a long markdown capture. The share-card variant is intentionally smaller and works better for README hero crops, issue links, or other places where the full page snapshot feels too dense. If you want a cleaner browser-render target for local screenshots or embeds, open [`table-schema-review-snapshot.html`](./table-schema-review-snapshot.html). A Chinese companion page is also included at [`table-schema-review-snapshot.zh-CN.html`](./table-schema-review-snapshot.zh-CN.html) so the same review surface can be shared without translating the surrounding note on the fly. There is now also a release-facing asset index at [`table-schema-review-assets.md`](./table-schema-review-assets.md) that explains when to use the workflow image, the full-page snapshot, or the share-card crop. If the underlying SVG sources change, refresh the PNG assets with `npm run docs:export-assets`, or export them individually with `npm run docs:export-svg-png -- ./docs/demo-table-schema-handoff-review.svg --out ./docs/demo-table-schema-handoff-review.png`, `npm run docs:export-svg-png -- ./docs/demo-table-schema-review-page.svg --out ./docs/demo-table-schema-review-page.png`, and `npm run docs:export-svg-png -- ./docs/demo-table-schema-review-share-card.svg --out ./docs/demo-table-schema-review-share-card.png`.

---

## Quick verification

Before using any committed fixture as review evidence, confirm it still matches current CLI behavior:

```bash
npm run verify:table-schema-handoff
```

That command verifies both included fixture chains:
- baseline handoff chain
- advanced raw-fidelity chain

---

## One review block worth pasting

This is the shortest useful excerpt from `examples/feishu-fields-mapping-draft-advanced.json`:

```json
{
  "matches": [
    {
      "starterField": "List",
      "actualName": "Status",
      "actualType": "single_select",
      "optionCount": 3
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

This one block usually tells the reviewer enough to avoid the most common first-write mistakes.

---

## What the three strongest hints mean

### 1. `optionCount` means the select field is real, not just text

```json
{
  "starterField": "List",
  "actualName": "Status",
  "actualType": "single_select",
  "optionCount": 3
}
```

Why it matters:
- it tells you the column is carrying actual option metadata
- it is a good signal that `FEISHU_BITABLE_LIST_FIELD_MODE=text` is too weak
- it gives reviewers confidence that the mapping is preserving more than a bare field name

Typical next move:

```bash
FEISHU_BITABLE_LIST_FIELD_MODE=single_select
```

If your real table allows multiple options instead, switch to `multi_select`.

### 2. `rawSemanticType=datetime` means `date` mode may be too weak

```json
{
  "starterField": "Due",
  "actualName": "Deadline",
  "actualType": "date",
  "rawSemanticType": "datetime",
  "dateFormatter": "yyyy-MM-dd HH:mm"
}
```

Why it matters:
- normalized mapping currently lands on `date`
- raw Feishu metadata still says the source column behaves like `datetime`
- the formatter keeps time-of-day visible instead of silently collapsing it away

Typical next move:

```bash
FEISHU_BITABLE_DUE_FIELD_MODE=datetime
```

Use `date` only if you are sure the target table is intentionally date-only.

### 3. `rawSemanticType=duplex_link` keeps relation shape visible

```json
{
  "starterField": "LinkedRecords",
  "actualName": "RelatedTasks",
  "actualType": "linked_record",
  "rawSemanticType": "duplex_link",
  "linkedTableId": "tbl_related_release"
}
```

Why it matters:
- normalized mapping lands on the generic `linked_record` bucket
- raw Feishu metadata still tells you this is not just any link field
- `linkedTableId` makes the target relation visible during review

Typical next move:
- confirm the linked table really is the one you expect
- confirm the first live write should create a duplex relation in that table shape
- keep the link field in review scope even if the env mode already looks correct

---

## ReviewWarnings: what to act on first

The mapping draft now carries a small `reviewWarnings` section so raw-vs-normalized drift is hard to miss.

### Mode mismatch warning

Example:

```json
{
  "kind": "mode-mismatch",
  "actualName": "Deadline",
  "rawSemanticType": "datetime",
  "reviewAction": "Check whether the target Bitable column should keep FEISHU_BITABLE_DUE_FIELD_MODE=date or be upgraded to datetime before enabling real writes.",
  "suggestedEnv": "FEISHU_BITABLE_DUE_FIELD_MODE=datetime"
}
```

Interpretation:
- the draft is usable
- but the current env mode is probably not the final one
- the safest next step is one env adjustment plus one controlled real write

### Link shape review warning

Example:

```json
{
  "kind": "link-shape-review",
  "actualName": "RelatedTasks",
  "rawSemanticType": "duplex_link",
  "reviewAction": "Confirm that the linked-record field points at the expected table and accepts the planned relation shape before the first live create-record call."
}
```

Interpretation:
- the field matched correctly enough to keep moving
- but the reviewer should still check the relation shape and target table before rollout

---

## Fast env review checklist

If you only want the smallest useful review loop, use this:

1. Run `npm run verify:table-schema-handoff`
2. Open `examples/feishu-fields-mapping-draft-advanced.json`
3. Check the `matches` block for `optionCount`, `rawSemanticType`, `dateFormatter`, and `linkedTableId`
4. Check `reviewWarnings` for `suggestedEnv`
5. Apply the smallest env override that removes obvious mismatch risk
6. Do one controlled live write before broad rollout

---

## Good defaults vs fields that deserve suspicion

Usually low-risk:
- title/text fields with obvious name matches
- `Estimate` when the column is already clearly numeric
- `Done` when the column is already clearly checkbox-like

Usually worth a second look:
- date vs datetime
- single link vs duplex link
- select fields with real options metadata
- localized or aliased field names that matched heuristically
- tables where the starter field names were heavily remapped by env

---

## When to use this page vs the other docs

Use this page when:
- you need one compact review surface
- you want a quoteable JSON block for PRs or setup notes
- you are close to enabling real writes

Use [`/table` schema handoff demo](./table-schema-handoff-demo.md) when:
- you need the full raw response → normalized schema → mapping draft walkthrough
- you want to explain the handoff path to another contributor
- you are checking whether committed fixtures still describe the full chain clearly

Use [`/table` schema handoff review checklist](./table-schema-handoff-review-checklist.md) when:
- you want the manual gate in checklist form
- you are preparing the first real Bitable write
- you need a more explicit go/no-go list
