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
bash ./scripts/test-webhook-local.sh ./examples/webhook-events/im-message-receive-hello.json

# Send all sample events in sequence
bash ./scripts/test-webhook-local.sh all
```

The script sends real Feishu webhook event payloads and prints the server's response.

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
