# Sample Webhook Events

Realistic [Feishu im.message.receive_v1][event-docs] payloads you can use to test the bot
locally — no ngrok, no live Feishu app credentials required.

[event-docs]: https://open.feishu.cn/document/server-docs/im-v1/message/events

## Files

| File | Command / Scenario | Chat type | Language |
|------|--------------------|-----------|----------|
| `message-text-p2p.json` | `/doc Q2 product launch plan` | p2p | en |
| `message-table-command.json` | `/table Sprint tasks` | p2p | en |
| `message-help-command.json` | `/help` | p2p | en |
| `message-greeting-plugin.json` | `/greeting Alice` (plugin) | p2p | en |
| `message-poll-plugin.json` | `/poll Which feature first?` (plugin) | p2p | en |
| `message-zh-lang.json` | `/doc 每周项目进展报告` | p2p | zh |
| `message-group-chat.json` | `/doc meeting notes` | group | en |
| `message-todo-command.json` | `/todo Review PR #42` | p2p | en |
| `message-doc-command-doc.json` | `/doc` (no args) | p2p | en |
| `message-table-command-no-arg.json` | `/table` (no args) | p2p | en |

## Format

All files use the official Feishu `im.message.receive_v1` envelope structure:

```json
{
  "header": {
    "event_type": "im.message.receive_v1",
    "create_time": "2026-04-04T10:00:00Z",
    "tenant_key": "local-dev-tenant"
  },
  "event": {
    "message": {
      "message_id": "om_01HW...",
      "chat_id": "oc_11AA...",
      "chat_type": "p2p",
      "content": "{\"text\":\"/doc ...\"}",
      "create_time": "1743751200"
    },
    "sender": {
      "sender_id": { "open_id": "ou_aa11..." },
      "language": "en"
    }
  }
}
```

> **Note:** The `content` field is a JSON string. The inner `text` value is what the
> command parser receives.

## Method 1 — `test-webhook-local.sh` (recommended)

```bash
# Start the bot first
npm start

# Send one specific event
./scripts/test-webhook-local.sh examples/webhook-events/message-doc-command.json

# Or send all events in sequence
./scripts/test-webhook-local.sh all

# With a custom server URL
BASE_URL=http://localhost:3000 ./scripts/test-webhook-local.sh all
```

## Method 2 — Direct curl

```bash
curl -X POST http://localhost:8787/webhook \
  -H "Content-Type: application/json" \
  -d @examples/webhook-events/message-text-p2p.json
```

## Method 3 — Postman / Insomnia

Import `docs/postman-collection.json` (see [Postman Setup](../postman-collection.md)),
then replace the request body with the contents of any file in this directory.

## Method 4 — VS Code REST Client

Create a `.http` file in the project root:

```http
POST http://localhost:8787/webhook
Content-Type: application/json

< examples/webhook-events/message-text-p2p.json
```

## Tenant key

All samples use `local-dev-tenant`. If your bot uses multi-tenant mode, set
`FEISHU_TENANTS` to include an entry for `local-dev-tenant` in `.env`.

## Adding new samples

Copy any existing `.json`, change `message.message_id` to a unique value, update
`message.text` to the command you want to test, and optionally set `sender.language`
to `zh` to exercise the i18n path.
