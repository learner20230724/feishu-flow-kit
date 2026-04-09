# Troubleshooting Guide

Common issues and solutions for feishu-flow-kit.

---

## 🔌 Webhook Not Receiving Events

### Symptom: Bot doesn't respond to messages

**Check 1 — ngrok URL mismatch**

Feishu requires your webhook URL to match exactly what your server sends in verification. If you restart ngrok, the URL changes and Feishu still points to the old one.

```bash
# Check your current ngrok URL
curl https://your-ngrok-url.ngrok.io/status

# Update webhook URL in Feishu Open Platform console
# Required: HTTPS URL, must respond to GET /webhook with challenge parameter
```

**Check 2 — Server not running**

```bash
npm run dev        # development
node dist/index.js # production (after npm run build)
docker compose up  # via Docker
```

**Check 3 — ngrok tunnel not active**

```bash
ngrok http 8787    # or whatever PORT your server uses
```

**Check 4 — Wrong event subscription**

In Feishu Open Platform → Your App → Event Subscriptions:
- Enable `im.message.receive_v1`
- Set callback URL to your HTTPS webhook URL
- Verify the URL is accessible from the internet (not localhost)

---

## 🔑 Authentication Errors

### Symptom: `401` or `40101` errors in logs

**Cause: App access token expired**

Feishu app access tokens expire after 2 hours. The bot auto-refreshes them, but if you see repeated auth failures:

```bash
# Verify credentials in .env
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Check token status
curl -X GET "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" \
  -H "Content-Type: application/json" \
  -d '{"app_id":"'"$FEISHU_APP_ID"'","app_secret":"'"$FEISHU_APP_SECRET"'"}'
```

### Symptom: `99991664` —蜡token无效

Tenant access token has expired. This is auto-managed by the SDK. If you see this persistently, check that your app's `Enable client credentials for tenant access token` setting is on in the Feishu console.

### Symptom: Bot posts "无法获取 tenant token"

Your `FEISHU_APP_ID` or `FEISHU_APP_SECRET` is incorrect. Double-check the values in the Feishu Open Platform console → Credentials & Basic Info.

---

## 📄 Document Creation Fails

### Symptom: `/doc` command doesn't create a document

1. **Permission required**: The bot needs `docx` permission in Feishu Open Platform → Permissions Management:
   - `docx:document:readonly` (at minimum for doc creation)
   - `docx:document:create`

2. **Document creation is async**: The bot sends a draft reply immediately. Check the Feishu document list to confirm the doc was actually created.

3. **If using `/doc outline`**: Ensure the outline format is valid Lark Markdown (see [Rich Content Format](./developer-guide.md#rich-content-format)).

---

## 📊 Table Record Creation Fails

### Symptom: `/table` doesn't create a record

**Check 1 — Bitable permission**

The bot needs:
- `bitable:app:readonly` (minimum)
- `bitable:app:create`

**Check 2 — App table ID is correct**

```bash
# Find your app table ID from the bitable URL:
# https://your-org.feishu.cn/base/{appToken}?table={tableId}&...
```

**Check 3 — Field names match**

The `/table` command maps human field names (like "Status", "Owner") to actual bitable field IDs. If it fails, check that your draft field names exactly match the bitable column names, including case.

**Check 4 — Field types are supported**

See [Supported Bitable Field Types](../README.md#supported-bitable-field-types) for the list of auto-mapped field types. Unsupported types (lookup, member, etc.) are skipped with a warning in the logs.

---

## 🌐 Docker Deployment Issues

### Symptom: Container starts but immediately exits

```bash
docker compose up
docker compose logs -f
```

Common causes:
- **Missing `.env`**: Copy `.env.production.example` to `.env` and fill in your values
- **Port already in use**: Change `PORT` in `.env` (e.g., `PORT=8788`)
- **ngrok URL not configured**: Webhook URL in Feishu console must match `VPS_FQDN`

### Symptom: HTTPS/TLS certificate errors

Traefik auto-provisions Let's Encrypt certificates. If certs fail:
- Ensure `VPS_FQDN` points to your server's public IP (A record, not CNAME)
- Ensure ports 80 and 443 are open in your firewall
- Check Traefik dashboard at `http://your-domain:8080`

### Symptom: `nginx: [emerg] host not found`

If using Docker Compose with an external service, ensure the service name resolves. Check `docker network inspect bridge`.

---

## 🔧 Plugin System Issues

### Symptom: Custom plugin doesn't load

**Check 1 — `FEISHU_PLUGINS` env var format**

```bash
# Correct — absolute path or module specifier
FEISHU_PLUGINS=./plugins/my-plugin.js

# For npm packages:
FEISHU_PLUGINS=@my-org/my-feishu-plugin
```

**Check 2 — Plugin exports the correct interface**

```typescript
// Named export
export const plugin: FeishuPlugin = { ... }

// Or factory function
export function createPlugin(config: PluginConfig): FeishuPlugin { ... }
```

**Check 3 — No command name collisions**

Each plugin command name must be unique. Two plugins registering `/test` will conflict. The first one to register wins.

**Check 4 — Restart the server**

Plugins are loaded at startup. Changes require a restart.

---

## 🌐 ngrok Specific Issues

### ngrok URL changes on restart

Free ngrok sessions give you a new URL each time you restart. For production, use a paid ngrok plan with a fixed URL, or use a proper domain with a DNS A record pointing to your VPS.

### ngrok shows "This site cannot be reached"

Your server isn't running, or ngrok tunnel isn't active. Start the server first, then start ngrok.

### Webhook verification fails

The verification requires your server to respond to a POST request with a JSON body containing `{type: 'url_verification', challenge: '...'}` — Feishu does NOT use GET with query parameters. If verification fails:
- Confirm the URL is HTTPS (Feishu requires HTTPS)
- Confirm the server is running and accessible from the internet
- Check that `POST /webhook` with JSON body `{type: 'url_verification', challenge: '...'}` returns `{challenge: '...'}`

---

## 📋 Debugging Tips

### Enable debug logging

```bash
LOG_LEVEL=debug node dist/index.js
```

This outputs structured logs with `requestId` for tracing each event.

### Check server status

```bash
curl https://your-webhook-url/status
```

Returns JSON with `uptimeSeconds`, `eventCount`, `lastEventAt`, and server flags.

### Check which plugins are loaded

After server start, look for this log line:
```
Plugin system loaded, plugins: greeting,poll,help
```

If empty, no plugins were found — check `FEISHU_PLUGINS` and plugin file paths.

### Test a webhook event locally

```bash
# Send a test message event
bash ./scripts/test-webhook-local.sh ./examples/webhook-events/message-text-p2p.json

# Send all test events
bash ./scripts/test-webhook-local.sh all
```

See [Webhook Testing Guide](./webhook-testing-guide.md) for full details.

---

## 🆘 Still Stuck?

1. Search existing [GitHub Issues](https://github.com/learner20230724/feishu-flow-kit/issues)
2. Run with `LOG_LEVEL=debug` and collect the requestId from the failing request
3. Check [developer-guide.md](./developer-guide.md) for architecture details
4. Open a new issue with your `requestId` and error log
