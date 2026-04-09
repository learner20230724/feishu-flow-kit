# Webhook Testing Guide

How to test your feishu-flow-kit webhook locally.

## Prerequisites

- Server running locally (`npm run dev`)
- A Feishu bot app with webhook endpoint configured
- `FEISHU_APP_ID` and `FEISHU_APP_SECRET` set

## Quick Test with Sample Events

Use the built-in test script to send sample webhook payloads to your local server:

```bash
# Send a single test event
bash ./scripts/test-webhook-local.sh ./examples/webhook-events/message-text-p2p.json

# Send all sample events in sequence
bash ./scripts/test-webhook-local.sh all
```

The script sends real Feishu webhook event payloads and prints the server's response.

### Available Sample Events

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

> **Note:** All sample events use the `local-dev-tenant` tenant key. See `examples/webhook-events/README.md` for the full payload format. A Chinese translation is also available at `examples/webhook-events/README.zh-CN.md`.

## Using Mock Events

For local development without a live Feishu connection, set the mock event path:

```bash
FEISHU_MOCK_EVENT_PATH=./examples/mock-message-event.json npm run dev
```

Sample mock files are in `examples/`:
- `mock-message-event.json` — plain text message
- `mock-doc-message-event.json` — text with document link
- `mock-table-message-event.json` — table workflow trigger
- `mock-table-rich-message-event.json` — rich text table message

## Simulating Events via Postman

Import `docs/postman-collection.json` into Postman. The collection includes pre-configured requests for:

- **URL Verification** — `POST /webhook` with `{type: 'url_verification', challenge: '...'}`
- **Message Simulation** — `POST /webhook` with various `im.message.receive_v1` events
- **Built-in Commands** — `/doc`, `/table`, `/help` message payloads

Set the `Content-Type: application/json` header and the `X-Feishu-Signature` header (or disable signature verification during local dev with `FEISHU_WEBHOOK_SECRET=dev`).

## Inspecting the Request Flow

1. Set `DEBUG=*` (or `DEBUG=feishu-flow-kit`) before starting the server to see detailed request logs
2. Each webhook event is logged with its type, message ID, and sender
3. The server responds with a card message or echo based on the command

## Checking Logs

```bash
# Follow server logs
npm run dev | grep -i webhook

# Check the health endpoint
curl http://localhost:8787/healthz
```

## Disabling Signature Verification (Local Dev Only)

In `.env.local` (never commit this):

```env
FEISHU_WEBHOOK_SECRET=dev
```

This bypasses the HMAC signature check so you can send test events without signing them.
