# Troubleshooting (by API error pattern)

This repo is intentionally a starter kit, so the most common failures are predictable: missing permissions, missing bot membership, webhook signature mismatch, or calling a write API without enabling the outbound flags.

This page is meant to be **fast to scan** while you're iterating locally.

> Notes
> - Feishu error payloads vary by endpoint. Always keep the raw response (HTTP status + body + request_id) in your logs.
> - This doc lists *patterns* rather than exhaustive codes.

---

## 0. First checks (before you chase the wrong thing)

1. Confirm which mode you're in:
   - mock: `FEISHU_MOCK_MODE=true`
   - real webhook: `FEISHU_MOCK_MODE=false`
2. Confirm which outbound paths you actually enabled:
   - text reply: `FEISHU_ENABLE_OUTBOUND_REPLY=true`
   - doc create + block append: `FEISHU_ENABLE_DOC_CREATE=true`
3. Confirm you are using the right credentials:
   - `FEISHU_APP_ID` + `FEISHU_APP_SECRET`
4. Confirm the local server is reachable:
   - `GET /healthz`

If any of the above is wrong, every downstream error becomes noise.

---

## 1. Webhook handshake failures

### Pattern: `url_verification` never succeeds / Feishu says callback URL invalid

What it usually means:
- your `/webhook` endpoint is not reachable from Feishu (tunnel / firewall / wrong port)
- your server isn't handling `url_verification` correctly

What to check:
- your tunnel points to the same port as `FEISHU_WEBHOOK_PORT`
- you can `curl` your own endpoint from the machine that runs the tunnel
- your handler returns the challenge for `url_verification`

Local checks:
- `npm run dev` and verify you see `GET /healthz` + `POST /webhook` logs
- if your tunnel is flaky, start by printing the raw request body in the webhook handler

---

### Pattern: signature mismatch / request rejected when `FEISHU_WEBHOOK_SECRET` is set

What it usually means:
- your webhook secret is not the same as the secret configured in Feishu console
- you are validating the wrong headers
- timestamp drift is outside your configured replay window

What to check:
- `FEISHU_WEBHOOK_SECRET` is exactly the event subscription secret
- the headers exist and match Feishu docs:
  - `x-lark-request-timestamp`
  - `x-lark-signature`
- `FEISHU_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS` is not too small for your environment
- system clock on your machine is correct

Debug tactic:
- temporarily disable signature verification (unset `FEISHU_WEBHOOK_SECRET`) to prove transport works
- then re-enable and debug only the signature layer

---

## 2. Token / auth failures

### Pattern: cannot fetch tenant token / 401 / `invalid app credentials`

What it usually means:
- wrong `FEISHU_APP_ID` / `FEISHU_APP_SECRET`
- app is not enabled / not installed for the tenant you are testing in

What to check:
- copy credentials directly from the Feishu developer console
- ensure the app is in the right tenant and has required permissions approved

---

### Pattern: API calls sometimes succeed, then start failing after a while

What it usually means:
- token expired and the retry path didn't refresh it

This repo behavior:
- uses a tiny in-memory cache and lazy re-fetch when needed
- restart clears cached tokens

What to check:
- confirm the failing request happens after long idle time
- restart the process once to see if it immediately fixes it

If you need to harden this:
- add explicit retry on token-expired errors
- add concurrency dedupe so one refresh fan-outs to many requests

---

## 3. Outbound reply failures (text message send)

### Pattern: inbound webhook works, but outbound reply fails

What it usually means:
- `FEISHU_ENABLE_OUTBOUND_REPLY` is still false
- the bot isn't in the chat
- missing send-message permission scope

What to check:
- set `FEISHU_ENABLE_OUTBOUND_REPLY=true`
- ensure the bot is actually added to the target chat
- confirm your app has the message send permission your Feishu tenant requires

---

## 4. `/doc` workflow failures (doc create + block append)

### Pattern: doc create disabled / no doc is created

What it usually means:
- `FEISHU_ENABLE_DOC_CREATE` is false

What to check:
- set `FEISHU_ENABLE_DOC_CREATE=true`

---

### Pattern: doc is created, but block append fails

What it usually means:
- missing permission for writing doc content (block append) even if doc creation itself is allowed
- wrong doc token / wrong endpoint shape

What to check:
- confirm doc content-write permissions are granted (not just create)
- log the document token returned by the create call
- log the block-append request payload and response body

---

### Pattern: blocks are appended, but formatting looks wrong

What it usually means:
- markdown span parsing is intentionally small and non-nested

Current supported inline spans in this repo:
- `**bold**`
- `*italic*`
- `` `inline code` ``
- `~~strikethrough~~`
- `[text](url)`

Current limits:
- no nested / combined styles
- no autolink detection

If you need more:
- add a real markdown inline parser (or a constrained subset) and map spans to Feishu text runs

---

## 5. "Permission denied" class errors

### Pattern: `permission denied` / `forbidden` / 403-like errors

What it usually means:
- app scopes are missing or not approved
- tenant policy blocks the action

What to do:
- identify the exact endpoint that failed
- map it to the smallest required permission
- verify the permission is approved for your tenant

Tip:
- if create works but append fails, permissions are usually missing on the *content write* side.

---

## 6. When you get a new error code

A fast way to extend this doc without turning it into a wall of text:

1. capture: endpoint + HTTP status + response body + request_id
2. classify: auth vs transport vs permission vs payload shape
3. add one new section under the closest pattern above

If you want this repo to stay starter-friendly:
- keep the troubleshooting doc pattern-based
- link out to official Feishu docs only when needed
