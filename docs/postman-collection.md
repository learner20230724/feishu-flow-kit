# Postman Collection — API Demo

A ready-to-use [Postman](https://www.postman.com/) collection for testing feishu-flow-kit endpoints.

**[⬇ Download postman-collection.json](./postman-collection.json)**

---

## Quick Start

### 1. Import the Collection

1. Open Postman → **File → Import**
2. Drag `postman-collection.json` into the dialog (or click "Upload Files")
3. The collection **"Feishu Flow Kit — API Demo"** will appear in your sidebar

### 2. Configure Your Environment

Create a new Postman environment (top-right → **⚙ Manage Environments → Add**):

| Variable | Value | Notes |
|---|---|---|
| `base_url` | `http://localhost:8787` | Local bot server |
| `webhook_path` | `/webhook` | Webhook path |
| `app_id` | `cli_xxx` | From your Feishu app credentials |
| `app_secret` | `xxx` | From your Feishu app credentials |
| `verification_token` | `xxx` | Set in Feishu webhook config |
| `encrypt_key` | `xxx` | Encryption key (only if enabled) |
| `feishu_api_base` | `https://open.feishu.cn` | Feishu API base |
| `tenant_access_token` | _(leave empty)_ | Auto-filled by pre-request script |

Select the environment in the top-right dropdown before sending requests.

### 3. Run the Collection

**Order matters for the Feishu API folder** — run these first:

1. 🛠️ **Get Tenant Access Token** — fetches and caches your auth token
2. 🔑 **Send Message (Reply)** — test the Feishu IM API
3. 🔑 **Create Document** — test Doc creation
4. 🔑 **List Tables** — find table tokens for `/table` testing

---

## What's in the Collection

### 🛠️ Setup First

- **Get Tenant Access Token** — calls `POST /auth/v3/tenant_access_token/internal`. A pre-request script auto-refreshes this before every auth-required request.

### 🔍 Health & Status

- **GET /status** — server health check. Returns `uptimeSeconds`, `eventCount`, `lastEventAt`, and flags. No auth needed.
- **GET /** — root endpoint.

### 📡 Webhook Endpoints

- **GET /webhook (URL Verification)** — Feishu webhook handshake. Set `challenge`, `verify_token`, and `type=url_verification` as query params.
- **POST /webhook (Simulate Incoming Message)** — injects a fake `im.message.receive_v1` event. Change the `content` text to try different commands:
  - `"hello"` → greeting response
  - `"/doc My Doc Title"` → doc creation draft
  - `"/table My Table"` → bitable table draft
  - `"/help"` → dynamic command list
- **POST /webhook (Simulate /doc Command)** — ready-made `/doc` payload
- **POST /webhook (Simulate /table Command)** — ready-made `/table` payload
- **POST /webhook (Simulate /help Command)** — ready-made `/help` payload

### 🔑 Feishu API (Auth Required)

These call the real Feishu API using the auto-refreshed tenant token:

- **Send Message** — `POST /im/v1/messages`
- **Create Document** — `POST /docx/v1/documents`
- **List Tables** — `GET /bitable/v1/apps`

---

## Environment by Use Case

### Local Development

```
base_url = http://localhost:8787
feishu_api_base = https://open.feishu.cn
app_id = cli_xxx (from ngrok or local proxy)
app_secret = xxx
verification_token = xxx
```

### Production (VPS)

```
base_url = https://your-domain.com
feishu_api_base = https://open.feishu.cn
app_id = cli_xxx
app_secret = xxx
verification_token = xxx
encrypt_key = xxx
```

---

## Webhook Testing with ngrok

To test real Feishu webhook events:

```bash
# Terminal 1 — run the bot
npm start

# Terminal 2 — ngrok tunnel
ngrok http 8787

# Copy the https://forwarding-url from ngrok output
# Paste it into Feishu Developer Console → Event Subscription → Request URL
# Format: https://xxx.ngrok.io/webhook
```

Then use Postman to send simulated events to `POST http://localhost:8787/webhook`, or configure ngrok to forward real Feishu events to your local bot.

---

## Writing Test Assertions

Example Postman test for `GET /status`:

```javascript
pm.test("Server is healthy", () => {
    const json = pm.response.json();
    pm.expect(json.uptimeSeconds).to.be.above(0);
    pm.expect(json.flags).to.have.property('feishuWebhookVerified');
});
```

Example for message simulation:

```javascript
pm.test("Response is success", () => {
    const json = pm.response.json();
    pm.expect(json.code).to.eql(0);
    pm.expect(json.msg).to.eql('success');
});
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `401 Unauthorized` on Feishu API | Run **Get Tenant Access Token** first, or check `app_id` / `app_secret` |
| `GET /status` returns 404 | Bot server not running — `npm start` first |
| Webhook verification fails | Check `verification_token` matches Feishu console exactly |
| Message simulation gets no reply | Ensure the bot is running; check `base_url` points to the right server |
| Pre-request script fails silently | Check Postman console (View → Show Postman Console) for errors |
