# Postman Collection Guide

A step-by-step guide for importing and using the **Feishu Flow Kit — API Demo** Postman collection to explore and test feishu-flow-kit endpoints locally or in production.

---

## 1 — Import the collection

1. Open Postman (or Postman for Web at [postman.com](https://postman.com))
2. Click **Import** → select the file **`docs/postman-collection.json`**
3. The collection **Feishu Flow Kit — API Demo** should appear in the left sidebar

---

## 2 — Configure the environment

The collection uses these environment variables. **Clone the default environment** (or create a new one) and fill in your values:

| Variable | Example value | Description |
|---|---|---|
| `base_url` | `http://localhost:8787` | Where feishu-flow-kit is running |
| `webhook_path` | `/webhook` | Webhook path (matches `FEISHU_WEBHOOK_PATH`) |
| `feishu_api_base` | `https://open.feishu.cn` | Feishu Open Platform base URL |
| `verify_token` | `your-verify-token` | Matches `FEISHU_VERIFY_TOKEN` env var |
| `tenant_access_token` | `t-xxxxx` | Obtained via Feishu OAuth; auto-refreshed by the bot |

### Quick local setup

```bash
# Terminal 1 — start the bot in mock mode
cd feishu-flow-kit
cp .env.example .env
# Fill in .env with your test credentials
npm run dev

# Terminal 2 — trigger a mock event (alternative to Postman)
node scripts/demo-interactive.mjs
```

### Verify the bot is up

```bash
curl http://localhost:8787/status
```

You should see JSON with `status: "ok"`, `mode: "mock"`, and `uptime`.

---

## 3 — Walk through the collection

### 🛠️ Setup First

**GET** `{{base_url}}/` (root)

Confirms the server is reachable. Returns a welcome message or 404 depending on routing. Always test this first before hitting webhook endpoints.

---

### 🔍 Health & Status

**GET** `{{base_url}}/status`

Returns a JSON object with:
- `status` — overall health (`"ok"` when healthy)
- `uptime` — seconds since server start
- `event_count` — total events processed in this session
- `mode` — `"mock"` or `"production"`
- `last_event_at` — ISO timestamp of the last received event

No authentication required.

---

### 📡 Webhook Endpoints

These four requests simulate incoming Feishu events. Each is a `POST` to `{{base_url}}{{webhook_path}}` with a different payload.

#### 3a — URL Verification (one-time)

**POST** `{{base_url}}{{webhook_path}}?challenge=xxx&verify_token=xxx&type=url_verification`

Feishu calls this when you first configure the webhook URL in the Feishu Open Platform console. The bot should respond with HTTP 200 and echo back the `challenge` parameter.

> Fill in `challenge` and `verify_token` as query params in Postman before sending.

#### 3b — `/doc` command

Sends a mock message event with content `/doc`. The bot parses the command and responds with a Feishu Card containing a doc draft (document title, block children built from the message content).

Expected response: a Feishu Card JSON payload. In mock mode the card is logged to the console and also returned as the HTTP response.

#### 3c — `/table` command

Sends a mock message event with content `/table`. The bot responds with a Feishu Card offering to create a bitable table, showing a schema handoff review before opt-in record creation.

Expected response: a Feishu Card with action buttons (`/table confirm <token>` to proceed, `/table cancel` to discard).

#### 3d — `/help` command

Sends a mock message event with content `/help`. The bot responds with a dynamic card listing all registered slash commands — both built-in (`/doc`, `/table`) and any loaded from `FEISHU_PLUGINS`.

#### 3e — raw message event (incoming Feishu message)

Sends a minimal Feishu message event payload (`post` message type). Useful for debugging how the bot classifies and routes events when they arrive from a real Feishu workspace.

---

### 🔑 Feishu API (Auth Required)

These requests call the **Feishu Open Platform API directly** (not through the bot). They require a valid `tenant_access_token`.

#### Obtaining a tenant_access_token

```bash
# Using your app_id and app_secret from the Feishu console
curl -X POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal \
  -H 'Content-Type: application/json' \
  -d '{"app_id": "cli_xxxxx", "app_secret": "xxxxx"}'
```

Copy the `tenant_access_token` from the response into your Postman environment variable.

#### 3f — Send a message

**POST** `{{feishu_api_base}}/open-apis/im/v1/messages?receive_id_type=open_id`

Sends a text message to a user or chat via the Feishu IM API. Requires `Content-Type: application/json` header and `Authorization: Bearer {{tenant_access_token}}`.

#### 3g — Create a Feishu Doc

**POST** `{{feishu_api_base}}/open-apis/docx/v1/documents`

Creates a new Feishu document. The bot uses this internally when processing `/doc confirm`. Useful to pre-create docs before the bot's draft flow.

#### 3h — List bitable apps

**GET** `{{feishu_api_base}}/open-apis/bitable/v1/apps`

Lists all bitable bases accessible to the bot's Feishu app. Use this to find the correct `table_id` to plug into the `/table` command's schema mapping flow.

---

## 4 — End-to-end test flow

Combine requests in a Postman folder to simulate a real session:

```
1. GET /status              → confirm bot is up
2. POST /url_verification    → one-time webhook handshake
3. POST /webhook (/help)     → verify dynamic command listing works
4. POST /webhook (/doc)      → check doc draft card renders
5. POST /webhook (/table)    → check table schema handoff card renders
```

---

## 5 — Using with(mock) events in CI

The Postman collection is useful for manual exploration. For automated CI checks, the bot provides static mock output via:

```bash
npm run demo:static    # outputs full mock event → card response
```

See `docs/DEMO.md` for the complete demo workflow and mock event format.

---

## 6 — Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| `401 Unauthorized` on Feishu API requests | `tenant_access_token` expired or missing | Re-fetch token (expires in 2 hours) |
| Bot returns `{"error": "verify_token_mismatch"}` | `verify_token` param doesn't match `FEISHU_VERIFY_TOKEN` env | Set correct `verify_token` in Postman query params |
| Bot returns `{"error": "unsupported_event_type"}` | Payload `event_type` not handled | Check `src/core/event-router.ts` for supported types |
| Card doesn't render in Feishu | Card schema version mismatch | Ensure `card` module version matches Feishu platform version |
| `/doc` command returns empty blocks | Block children payload malformed | Run `npm test` to verify block builder; check `src/adapters/build-doc-block-children-draft.ts` |
