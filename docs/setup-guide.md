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
```

What happens in that flow:

1. typed config is loaded from env
2. the configured mock input file is read locally
3. a slash command such as `/todo ...` or `/doc ...` is parsed
4. the demo workflow generates a draft reply
5. the `/doc` path also produces a starter Feishu doc create draft alongside the markdown outline
6. if real doc creation is enabled, that draft can continue into a minimal block-append step so the new doc gets a starter body
7. the result is logged and printed to stdout

Starter commands available right now:
- `/todo ship webhook adapter`
- `/doc weekly launch review`

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
11. rejects non-`POST` webhook requests with a clear `405` response

Current boundaries:
- signature verification is still intentionally small and not a substitute for a production hardening pass
- outbound reply sending is opt-in and only covers the simplest text reply path right now
- doc creation is opt-in and still intentionally small: it now covers `docx/v1/documents` plus one starter block-append step, but it still does not translate markdown into richer native document structure
- tenant token reuse currently relies on a tiny in-memory cache only; there is still no persistence, refresh worker, or concurrency dedupe strategy
- only a narrow subset of message payload fields is normalized

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

## Next setup docs to add

- troubleshooting by API error pattern
