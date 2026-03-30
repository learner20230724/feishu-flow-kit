# `/table` API error fixture pack

This page does not pretend to be a full catalog of Feishu Bitable failures.

It gives the starter repo three **fixture-backed** failure shapes that are common enough to matter when you switch `/table` from draft mode to real create-record writes:

- field not found
- field type mismatch
- permission denied

These fixture files live in `examples/` so the failure patterns are easy to quote in docs, issues, and future tests.

---

## 1. Field not found

Fixture:
- `examples/table-api-error-field-not-found.json`

Typical meaning:
- the target Bitable table does not contain one of the starter field names
- or the field exists, but the repo mapping name does not match exactly

Most common trigger in this starter:
- you enabled a richer field mode such as `Due`, `Done`, or `Owner`, but the target table still uses a different column name

What to check:
- `Title`
- `List`
- `Details`
- `Owner`
- `Estimate`
- `Due`
- `Done`
- `SourceCommand`

---

## 2. Field type mismatch

Fixture:
- `examples/table-api-error-type-mismatch.json`

Typical meaning:
- the outbound payload shape does not match the target column type

Examples:
- `Due` column is date/datetime, but you still send plain text
- `Estimate` column is number, but the mode is still text
- `Done` column is checkbox, but the mode is still text

Fast checks:
- `FEISHU_BITABLE_ESTIMATE_FIELD_MODE=number`
- `FEISHU_BITABLE_DUE_FIELD_MODE=date` or `datetime`
- `FEISHU_BITABLE_DONE_FIELD_MODE=checkbox`

---

## 3. Permission denied

Fixture:
- `examples/table-api-error-permission-denied.json`

Typical meaning:
- the app can authenticate, but does not have write permission for the target Bitable app/table
- or the configured app/table token pair points at the wrong target

Fast checks:
- `FEISHU_ENABLE_TABLE_CREATE=true`
- `FEISHU_BITABLE_APP_TOKEN`
- `FEISHU_BITABLE_TABLE_ID`
- Feishu-side record write permission for the app

---

## Why keep these as fixtures

Happy-path demos drift easily.

Failure examples drift too — often faster, because people rewrite them from memory.

Keeping a tiny fixture pack in `examples/` means the repo can point to stable, inspectable JSON instead of vague prose whenever someone asks:

- "what does field-not-found look like here?"
- "what kind of mismatch are we talking about?"
- "how do I distinguish permission issues from schema issues?"
