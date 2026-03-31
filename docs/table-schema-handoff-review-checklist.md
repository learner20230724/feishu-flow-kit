# `/table` schema handoff review checklist

This page is for the human review step between:

1. raw Feishu field-list export
2. normalized schema artifact
3. generated mapping draft
4. real `.env` config

It is intentionally small and practical.

Use it together with:
- [`/table` schema handoff demo](./table-schema-handoff-demo.md)
- [`/table` mapping generator input guide](./table-mapping-generator-inputs.md)
- [`/table` API error fixture pack](./table-api-error-fixtures.md)

---

## When to use this checklist

Use it when you already have these files:
- raw field-list response JSON
- normalized schema JSON
- generated mapping draft JSON or env output

The goal is simple:
- catch the mismatches the scripts cannot safely decide for you
- avoid enabling real writes on a silently wrong mapping

---

## Quick pass

Before deeper review, confirm these basics:

- [ ] `appToken` and `tableId` point to the table you actually want
- [ ] normalized schema was generated from the latest exported raw response
- [ ] mapping draft was generated from that normalized schema, not from an older copy
- [ ] unmatched fields were reviewed instead of ignored blindly
- [ ] you only plan to enable the fields you truly need right now

---

## Field-name review

For each starter field you want to use, confirm:

- [ ] `Title` maps to the real primary text/title column you expect
- [ ] `List` maps to the real bucket/stage/status column
- [ ] `Details` maps to an optional text/context column, not a structured field by mistake
- [ ] `Owner` maps to the intended assignee/owner column
- [ ] `Estimate` maps to points/effort only if that column really means estimate
- [ ] `Due` maps to the real due/target date field, not a created/updated timestamp
- [ ] `Done` maps to actual completion state, not a status select pretending to be boolean
- [ ] `Attachment` maps to a file/attachment column, not a URL/text column unless you intentionally want text mode
- [ ] `LinkedRecords` maps to the intended dependency/relation column
- [ ] `SourceCommand` maps to a safe trace/debug column, not a user-facing summary field

---

## Mode review

Check every inferred mode before trusting it.

### `List`
- [ ] `text` is acceptable for the target table, or
- [ ] `single_select` matches one-option semantics, or
- [ ] `multi_select` matches comma-separated multi-bucket semantics
- [ ] select labels in the slash command are values that really exist in the target table

### `Owner`
- [ ] `text` is intentional, or
- [ ] `user` is correct and you really have `owner_open_id` values available

### `Estimate`
- [ ] `text` is intentional, or
- [ ] `number` matches a true numeric field and your command values are numeric

### `Due`
- [ ] `text` is intentional, or
- [ ] `date` matches day-level due dates, or
- [ ] `datetime` matches timestamp-level due dates
- [ ] if the raw field looked like Feishu type `5`, double-check whether UI semantics are date-only or datetime

### `Done`
- [ ] `text` is intentional, or
- [ ] `checkbox` is correct and the target field is boolean-like

### `Attachment`
- [ ] `text` is intentional, or
- [ ] `attachment` is correct and the workflow will supply real file tokens

### `LinkedRecords`
- [ ] `text` is intentional, or
- [ ] `linked_record` is correct and the workflow will supply real record IDs from the linked table
- [ ] if the raw field came from `single_link` or `duplex_link`, confirm which linked table it actually points to

---

## Raw-property fidelity review

These are the places where the current handoff scripts are intentionally conservative.

- [ ] if raw response shows `ui_type=DateTime` or similar, confirm whether collapsing to `date` lost important time semantics
- [ ] if raw response shows `single_link` / `duplex_link`, confirm that treating both as `linked_record` is good enough for this workflow
- [ ] if the raw field has option metadata, confirm you do not need stable option IDs at this stage
- [ ] if the raw field has special constraints or formatting rules, confirm text-mode fallback is still acceptable

---

## Unmatched fields review

Unmatched fields are not automatically bad. They are only bad when you expected them to be used.

For every unmatched field, decide one of these on purpose:

- [ ] ignore for now
- [ ] add later in a follow-up iteration
- [ ] rename an env mapping so it gets matched
- [ ] keep it out because it is irrelevant to `/table`

If many important fields are unmatched, do **not** enable real writes yet.

---

## Real-write readiness review

Before turning on `FEISHU_ENABLE_TABLE_CREATE=true`, confirm:

- [ ] draft output from `/table` already looks correct locally
- [ ] field names in env match the reviewed mapping draft
- [ ] field modes in env match the reviewed schema semantics
- [ ] you are enabling the smallest useful subset first
- [ ] you know which failure class to look for first: field-not-found, type-mismatch, or permission-denied

---

## Suggested first-write order

Safest order:

1. `Title`
2. `List`
3. `Details`
4. `Owner`
5. `SourceCommand`
6. then one richer field at a time (`Estimate`, `Due`, `Done`, `Attachment`, `LinkedRecords`)

This keeps blame assignment simple when the first real write fails.

---

## If review fails

Use the fixture pack for fast classification:

- field name wrong → [`table-api-error-field-not-found.json`](../examples/table-api-error-field-not-found.json)
- field type wrong → [`table-api-error-type-mismatch.json`](../examples/table-api-error-type-mismatch.json)
- permission wrong → [`table-api-error-permission-denied.json`](../examples/table-api-error-permission-denied.json)

And then go back to:
- normalized schema
- mapping draft
- env config

in that order.

---

## Practical rule

Do not ask the generator to be more certain than it really is.

If something looks ambiguous in review, keep the mapping smaller, keep more fields in text mode, and verify one real write before widening the schema further.
