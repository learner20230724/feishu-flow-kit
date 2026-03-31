# `/table` schema handoff demo

This page shows the shortest reviewable path from a raw Feishu field-list API response to a mapping draft that `feishu-flow-kit` can use.

It is meant for schema handoff and review.
It is **not** live schema discovery.
It does not call Feishu APIs for you, fetch option IDs dynamically, or prove that the final table write will succeed unchanged.

Use it when you have already exported a field list from Feishu and want one repo-local trail that teammates can inspect.

Use it together with:
- [`/table` mapping generator input guide](./table-mapping-generator-inputs.md)
- [`/table` schema mapping worksheet](./table-schema-mapping-worksheet.md)
- [Setup guide](./setup-guide.md)

---

## Included sample artifacts

This repo now includes one fixture chain in `examples/`:

- `feishu-fields-list-response.json` — raw Feishu-like field-list response
- `feishu-fields-normalized-schema.json` — normalized schema JSON after the first handoff step
- `feishu-fields-mapping-draft.json` — structured mapping draft after alias matching and mode inference

That gives you one stable, reviewable example of:

raw response → normalized schema → mapping draft

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

Example excerpt:

```json
{
  "tableName": "Sprint Tasks",
  "appToken": "app_demo123",
  "tableId": "tbl_demo456",
  "fields": [
    {
      "name": "Task",
      "type": "text",
      "sourceTypeId": 1,
      "sourceFieldId": "fldTitle001",
      "uiType": "Text",
      "isPrimary": true
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

The resulting draft keeps four things in one file:
- `source`
- `config`
- `matches`
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
