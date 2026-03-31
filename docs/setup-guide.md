# Setup Guide

This guide is intentionally local-first.

The goal is to help you get a Feishu workflow repo running without pretending the platform setup is simpler than it is.

## What you need before coding

1. A Feishu app created in the Feishu developer console
2. The app credentials you actually need for your chosen workflow
3. A local Node.js environment
4. A clear understanding of whether you are handling:
   - bot messages
   - document APIs
   - table/base APIs
   - webhooks or callbacks

Not every workflow needs the same permissions. Start small.

## Recommended local workflow

1. Clone the repo
2. Copy `.env.example` to `.env`
3. Fill only the minimum required fields
4. Start with mock mode where possible
5. Add one real API path only after local flow shape is stable

## Suggested environment variables

These names are intentionally small and explicit.

```bash
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_BOT_NAME=feishu-flow-kit
FEISHU_MOCK_MODE=true
FEISHU_MOCK_EVENT_PATH=examples/mock-message-event.json
FEISHU_WEBHOOK_PORT=8787
FEISHU_WEBHOOK_SECRET=
FEISHU_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS=300
FEISHU_ENABLE_OUTBOUND_REPLY=false
FEISHU_ENABLE_DOC_CREATE=false
FEISHU_ENABLE_TABLE_CREATE=false
FEISHU_BITABLE_APP_TOKEN=
FEISHU_BITABLE_TABLE_ID=
FEISHU_BITABLE_LIST_FIELD_MODE=text
# text | single_select | multi_select
FEISHU_BITABLE_OWNER_FIELD_MODE=text
FEISHU_BITABLE_ESTIMATE_FIELD_MODE=text
FEISHU_BITABLE_DUE_FIELD_MODE=text
FEISHU_BITABLE_DONE_FIELD_MODE=text
FEISHU_BITABLE_ATTACHMENT_FIELD_MODE=text
FEISHU_BITABLE_LINK_FIELD_MODE=text
FEISHU_BITABLE_TITLE_FIELD_NAME=Title
FEISHU_BITABLE_LIST_FIELD_NAME=List
FEISHU_BITABLE_DETAILS_FIELD_NAME=Details
FEISHU_BITABLE_OWNER_FIELD_NAME=Owner
FEISHU_BITABLE_ESTIMATE_FIELD_NAME=Estimate
FEISHU_BITABLE_DUE_FIELD_NAME=Due
FEISHU_BITABLE_DONE_FIELD_NAME=Done
FEISHU_BITABLE_ATTACHMENT_FIELD_NAME=Attachment
FEISHU_BITABLE_LINKED_RECORDS_FIELD_NAME=LinkedRecords
FEISHU_BITABLE_SOURCE_COMMAND_FIELD_NAME=SourceCommand
LOG_LEVEL=debug
```

## Current runnable paths

### 1. Mock message workflow

```bash
npm install
npm run check
npm run dev
```

Or switch the input file directly:

```bash
FEISHU_MOCK_EVENT_PATH=examples/mock-doc-message-event.json npm run dev
FEISHU_MOCK_EVENT_PATH=examples/mock-table-rich-message-event.json FEISHU_BITABLE_LIST_FIELD_MODE=multi_select FEISHU_BITABLE_OWNER_FIELD_MODE=user FEISHU_BITABLE_ESTIMATE_FIELD_MODE=number FEISHU_BITABLE_DUE_FIELD_MODE=datetime FEISHU_BITABLE_DONE_FIELD_MODE=checkbox FEISHU_BITABLE_ATTACHMENT_FIELD_MODE=attachment FEISHU_BITABLE_LINK_FIELD_MODE=linked_record npm run dev
```

What happens in that flow:

1. typed config is loaded from env
2. the configured mock input file is read locally
3. a slash command such as `/todo ...`, `/doc ...`, or `/table ...` is parsed
4. the demo workflow generates a draft reply
5. the `/doc` path also produces a starter Feishu doc create draft alongside the markdown outline
6. the `/table` path also produces a starter Bitable create-record draft alongside the reply text
7. if real doc creation is enabled, that draft can continue into a minimal block-append step so the new doc gets a starter body
8. if real table creation is enabled, that draft can continue into a minimal `create-record` call for one configured Bitable table
9. the result is logged and printed to stdout

Starter commands available right now:
- `/todo ship webhook adapter`
- `/doc weekly launch review`
- `/table add backlog item: improve webhook errors / owner=alex`
- `/table add backlog improve webhook errors / owner_open_id=ou_xxx`
- `/table add sprint fix flaky webhook tests / estimate=5`
- `/table add sprint fix flaky webhook tests / due=2026-04-01`
- `/table add sprint close flaky webhook tests / done=true`
- `/table add sprint share demo pack / attachment_token=file_v2_demo123,file_v2_demo456`
- `/table add sprint,urgent flaky webhook tests / owner_open_id=ou_xxx / estimate=5 / due=2026-04-01T09:30:00Z / done=true`
- `/table add sprint ship follow-up / link_record_id=recA123,recB456`

For a richer `/table` local run, use:

```bash
FEISHU_MOCK_EVENT_PATH=examples/mock-table-rich-message-event.json \
FEISHU_BITABLE_LIST_FIELD_MODE=multi_select \
FEISHU_BITABLE_OWNER_FIELD_MODE=user \
FEISHU_BITABLE_ESTIMATE_FIELD_MODE=number \
FEISHU_BITABLE_DUE_FIELD_MODE=datetime \
FEISHU_BITABLE_DONE_FIELD_MODE=checkbox \
FEISHU_BITABLE_ATTACHMENT_FIELD_MODE=attachment \
FEISHU_BITABLE_LINK_FIELD_MODE=linked_record \
npm run dev
```

This is small on purpose. It gives you one end-to-end slice to extend before adding real Feishu transport code.

### 2. Local webhook server

Set mock mode off first:

```bash
FEISHU_MOCK_MODE=false npm run dev
```

The current server starts a tiny local HTTP endpoint:

- `GET /healthz`
- `POST /webhook`
- default port: `8787`
- override with `FEISHU_WEBHOOK_PORT`

Current behavior:

1. exposes `GET /healthz` for local liveness checks
2. accepts Feishu `url_verification` payloads and returns the challenge
3. accepts minimal `im.message.receive_v1` payloads
4. optionally verifies `x-lark-request-timestamp` + `x-lark-signature` when `FEISHU_WEBHOOK_SECRET` is set
5. rejects signed requests outside `FEISHU_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS` (default: 300)
6. adapts them into the repo's internal `message.received` shape
7. runs the demo workflow
8. returns a JSON body with the generated draft reply text plus a reply API request draft
9. when `FEISHU_ENABLE_OUTBOUND_REPLY=true`, it can also fetch a tenant token and send the simplest text reply path to Feishu
10. when `FEISHU_ENABLE_DOC_CREATE=true` and the workflow is `/doc`, it can also call the Feishu doc create API, then append a starter set of plain paragraph blocks, and return the created document metadata
11. when `FEISHU_ENABLE_TABLE_CREATE=true` and the workflow is `/table`, it can also call the Feishu Bitable create-record API for one configured table and return the created record metadata
12. rejects non-`POST` webhook requests with a clear `405` response

Current boundaries:
- signature verification is still intentionally small and not a substitute for a production hardening pass
- outbound reply sending is opt-in and only covers the simplest text reply path right now
- doc creation is opt-in and still intentionally small: it now covers `docx/v1/documents` plus one starter block-append step, but it still does not translate markdown into richer native document structure
- table creation is opt-in and intentionally narrow: it writes one configured Bitable table via `create-record` and currently assumes a starter text-field mapping (`Title`, `List`, `Details`, `Owner`, `SourceCommand`)
- tenant token reuse currently relies on a tiny in-memory cache only; there is still no persistence, refresh worker, or concurrency dedupe strategy
- only a narrow subset of message payload fields is normalized

If you want a concrete request/response example before reading the code, see [`/table` webhook success / error demo](./table-webhook-success-error-demo.md). The exact JSON samples are also checked into `examples/webhook-table-rich-event.json`, `examples/webhook-table-rich-response.json`, `examples/webhook-invalid-payload.json`, and `examples/webhook-invalid-response.json`.

If you are already past the happy path and need representative Bitable write failures, see [`/table` API error fixture pack](./table-api-error-fixtures.md). The fixture files live in `examples/table-api-error-field-not-found.json`, `examples/table-api-error-type-mismatch.json`, and `examples/table-api-error-permission-denied.json`.

If what you need is the schema handoff path before real write enablement, see [`/table` schema handoff demo](./table-schema-handoff-demo.md). It walks through the included fixture chain from `examples/feishu-fields-list-response.json` to `examples/feishu-fields-normalized-schema.json` and finally `examples/feishu-fields-mapping-draft.json`.

This is still a starter path, not a production webhook implementation.

## Development strategy

### Start in mock mode
Mock mode should cover:
- input payload examples
- command parsing
- workflow branching
- output shaping
- markdown/document content generation

This lets you iterate on the useful part first.

### Add real Feishu integration second
Only switch to real credentials when:
- config loading works
- logs are readable
- one example workflow already behaves correctly in mock mode

## Common setup mistakes

### 1. Starting with too many scopes
Do not request every permission up front. It makes setup heavier and harder to explain.

### 2. Mixing transport with business logic
Keep Feishu-specific request/response handling in adapters. Keep workflow logic separate.

### 3. Building for deployment too early
You do not need a full production deployment path just to validate a useful workflow.

### 4. Assuming all users have the same Feishu environment
Enterprise policies differ. Public examples should be honest about that.

### 5. Letting docs drift from config names
If the code expects `FEISHU_MOCK_MODE`, docs and `.env.example` should say the same thing. This sounds trivial, but it is a common source of friction in starter repos.

## What this repo should optimize for

- easy local reading
- low ceremony
- mockable examples
- practical workflow slices
- docs that match reality

## Permission checklist by workflow type

Start from the narrowest set you can get away with.

### For inbound webhook message parsing only
Use this when you only want to receive callback events and inspect them locally.

Checklist:
- enable the message receive event your app needs (for example `im.message.receive_v1`)
- configure the callback URL that points to your local or tunneled `/webhook`
- configure the event subscription secret if you want signature verification enabled locally

You do **not** need outbound send scopes just to parse webhook payloads.

### For outbound text replies
Use this when `FEISHU_ENABLE_OUTBOUND_REPLY=true`.

Checklist:
- app credentials that can fetch a tenant access token
- the bot/message send permission required by your Feishu app type and tenant policy
- bot enabled in the target chat or tenant context

If this path fails, verify credentials first, then bot/message scope, then tenant policy.

### For `/doc` workflow document creation
Use this when `FEISHU_ENABLE_DOC_CREATE=true`.

Checklist:
- app credentials that can fetch a tenant access token
- permission to create Feishu docs through the docx API
- permission to append blocks/content into the newly created doc
- tenant policy that allows the app to create or edit docs in the target environment

This repo currently uses a very small write path:
1. create a doc
2. append starter paragraph blocks

So if create works but content append fails, the missing permission is usually on the content-write side rather than token fetch.

### For `/table` workflow Bitable record creation
Use this when `FEISHU_ENABLE_TABLE_CREATE=true`.

Checklist:
- app credentials that can fetch a tenant access token
- permission to write records into the target Bitable app/table
- a real `FEISHU_BITABLE_APP_TOKEN`
- a real `FEISHU_BITABLE_TABLE_ID`
- a target table that has compatible starter fields, or a plan to adapt the field mapping

If your real table uses different column names, you can now remap them without touching code. Example:

```bash
FEISHU_BITABLE_TITLE_FIELD_NAME=Task
FEISHU_BITABLE_LIST_FIELD_NAME=Stage
FEISHU_BITABLE_DETAILS_FIELD_NAME=Context
FEISHU_BITABLE_OWNER_FIELD_NAME=Assignee
FEISHU_BITABLE_ESTIMATE_FIELD_NAME=Points
FEISHU_BITABLE_SOURCE_COMMAND_FIELD_NAME=ChatCommand
```

This is still manual mapping, not schema discovery. The repo will use the names you configure, but it does not fetch the real table schema first.

If you already exported or copied the target field list into JSON, you can generate a first-pass draft instead of hand-writing every line:

```bash
npm run table:mapping-draft -- examples/table-schema-sample.json
npm run table:mapping-draft -- examples/table-schema-partial.json --format json
npm run table:mapping-draft -- examples/table-schema-unmatched.json --format json --out ./table-mapping-draft.json
```

If you only have the raw Feishu field-list response body, normalize it first and then feed that result into the mapping draft generator:

```bash
npm run table:normalize-feishu-fields -- examples/feishu-fields-list-response.json
npm run table:normalize-feishu-fields -- examples/feishu-fields-list-response.json --out ./table-schema-from-feishu.json
npm run table:mapping-draft -- ./table-schema-from-feishu.json --format json
```

Use env output when you want something ready to paste into `.env`. Use JSON output when you want to inspect inferred modes and unmatched fields programmatically before turning on real writes. The expected JSON shape and sample variants are documented in [`/table` mapping generator input guide](./table-mapping-generator-inputs.md).

The generated file is only a draft. Review field names, inferred modes, and any unmatched columns before turning on real writes.

The current repo keeps this write path intentionally small:
1. parse `/table add ...`
2. build a local draft with starter fields
3. if enabled, send one `create-record` call to the configured table

Starter mapping assumptions right now:
- `Title` → text
- `List` → text by default, `{ name: ... }` with `FEISHU_BITABLE_LIST_FIELD_MODE=single_select`, or `[{ name: ... }, { name: ... }]` with `FEISHU_BITABLE_LIST_FIELD_MODE=multi_select` and a comma-separated `/table add backlog,urgent ...` list input
- `Details` → text
- `Owner` → text by default, or `[{ id: ... }]` with `FEISHU_BITABLE_OWNER_FIELD_MODE=user` + `/ owner_open_id=...`
- `Estimate` → text by default, or number with `FEISHU_BITABLE_ESTIMATE_FIELD_MODE=number` + `/ estimate=...`
- `Due` → text by default, or UTC milliseconds with `FEISHU_BITABLE_DUE_FIELD_MODE=date` + `/ due=YYYY-MM-DD`, or datetime milliseconds with `FEISHU_BITABLE_DUE_FIELD_MODE=datetime` + `/ due=ISO8601`
- `Done` → text by default, or checkbox with `FEISHU_BITABLE_DONE_FIELD_MODE=checkbox` + `/ done=true`
- `Attachment` → text by default, or `[{ file_token: ... }]` with `FEISHU_BITABLE_ATTACHMENT_FIELD_MODE=attachment` + `/ attachment_token=file_v2_xxx[,file_v2_yyy]`
- `LinkedRecords` → text by default, or `{ link_record_ids: [...] }` with `FEISHU_BITABLE_LINK_FIELD_MODE=linked_record` + `/ link_record_id=recA[,recB]`
- `SourceCommand` → text

If token fetch works but record creation fails, the usual causes are missing Bitable scope, wrong `app_token` / `table_id`, or field types/names that do not match this starter mapping.

## Token refresh handling notes

The current repo does **not** run a background refresh worker.

What it does today:
- fetch a tenant access token only when a real outbound path needs it
- reuse that token from a tiny in-memory cache until it is close to expiry
- fetch again on the next real request after the cached token expires

What that means in practice:
- local development stays simple because there is no extra refresh loop to manage
- restarting the process clears the cache, which is fine for this starter repo
- multiple processes do not share token state
- this is good enough for a small local webhook or demo workflow, but it is not meant to be the final shape for a higher-volume deployment

Current boundaries:
- no persistent token store
- no dedicated refresh daemon or cron worker
- no cross-process cache sharing
- no concurrency dedupe yet if many fresh requests all need a token at the same moment

If you want to keep this repo small, the recommended upgrade order is:
1. keep the current lazy fetch + in-memory reuse path for local work
2. add retry / re-fetch behavior around explicit token-expired API errors
3. add concurrency dedupe so one refresh can fan out to multiple waiting requests
4. only add persistence if you really have a multi-process or long-running deployment that benefits from it

A practical rule for this repo:
- do not build token refresh infrastructure before you have a workflow worth protecting
- once outbound reply or doc creation becomes stable and frequent, then it makes sense to harden token lifecycle behavior

## Related docs

- [Architecture overview](./overview.md)
- [Table / Bitable field mapping notes](./table-bitable-field-mapping.md)
- [`/table` schema mapping worksheet](./table-schema-mapping-worksheet.md)
- [`/table` mapping generator input guide](./table-mapping-generator-inputs.md)
- [`/table` webhook success / error demo](./table-webhook-success-error-demo.md)
- [`/table` API error fixture pack](./table-api-error-fixtures.md)
- [Troubleshooting by API error pattern](./troubleshooting-by-api-error-pattern.md)
