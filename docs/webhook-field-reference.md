# Webhook Event Field Reference

Every mock event in `examples/` and every real Feishu webhook payload follows the same shape. This page is the canonical field guide.

---

## Common top-level shape

```json
{
  "header": { ... },
  "event": { ... }
}
```

Feishu sends this wrapped in a POST body. The `header` block is metadata; the `event` block is the payload.

---

## `header`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_type` | `string` | ✅ | The event type string, e.g. `"im.message.receive_v1"`. All supported types are listed in [`src/adapters/`](./). |
| `create_time` | `string` | ✅ | ISO 8601 timestamp of when the event was created, e.g. `"2026-03-30T21:16:00Z"`. |
| `tenant_key` | `string` | ✅ | Identifies the Feishu tenant/application that owns this webhook. In local mock events this is `"local-dev-tenant"`. |

---

## `event`

### `event.sender`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sender.sender_id.open_id` | `string` | ✅ | The open ID of the user who sent the message. Prefixed `ou_`. Used to route replies or look up user info. |

### `event.message`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message.message_id` | `string` | ✅ | Unique Feishu message ID. Prefixed `om_`. Used for reply threading. |
| `message.chat_id` | `string` | ✅ | The chat (conversation) ID. Prefixed `oc_`. Distinguishes p2p from group chats. |
| `message.chat_type` | `string` | ✅ | Either `"p2p"` (1-to-1 with the bot) or `"group"`. Controls reply routing. |
| `message.content` | `string` | ✅ | **JSON string** containing the actual message body. For text messages this is `{"text": "..."}`. The slash-command parser reads the `text` field inside this string. |
| `message.create_time` | `string` | ✅ | ISO 8601 timestamp when the message was sent. |

---

## `message.content` — inner text message shape

The `content` field is always a JSON string. Parse it to read the actual text:

```json
// What content looks like for a plain text message:
{ "text": "/todo Summarize today's progress and list next actions" }

// What content looks like for a /table command:
{
  "text": "/table add sprint,urgent flaky webhook tests / owner_open_id=ou_demo_alex / estimate=5 / due=2026-04-01T09:30:00Z"
}

// What content looks like for a /doc command:
{ "text": "/doc Create a weekly report outline for Q1" }
```

The slash-command parser extracts `content.text` and routes on the first token (e.g. `/todo`, `/table`, `/doc`).

---

## Local mock events — `examples/` directory

| File | Event type | Command it exercises |
|------|-----------|-----------------------|
| `mock-message-event.json` | Custom (local) | `/todo` — plain text first demo |
| `mock-doc-message-event.json` | Custom (local) | `/doc` — document creation flow |
| `mock-table-message-event.json` | Custom (local) | `/table` — text-field-mode Bitable draft |
| `mock-table-rich-message-event.json` | Custom (local) | `/table` — richer field modes (multi_select, user, number, datetime, checkbox, attachment, linked_record) |
| `webhook-table-rich-event.json` | `im.message.receive_v1` | Same richer `/table` flow, but in real webhook shape |

All mock events use `"context": { "source": "local-mock" }` to signal mock mode. The adapter layer reads this to skip token fetches.

---

## Field constraints summary

| Field path | Constraint |
|------------|------------|
| `header.event_type` | Must match a supported adapter in `src/adapters/` |
| `event.message.content` | Must be valid JSON string |
| `event.message.content.text` | Must start with `/` for slash commands |
| `event.message.chat_type` | Must be `"p2p"` or `"group"` |
| `header.tenant_key` | Used as-is; no validation in local mock mode |
| `event.sender.sender_id.open_id` | Must be a valid Feishu open ID format (`ou_` prefix) in real integrations |

---

## Adding support for a new `event_type`

1. Add a new adapter file under `src/adapters/` that handles the new event shape.
2. Export an `adapt(event: RawEvent): AdaptedEvent` function.
3. Register the adapter in `src/server/webhook-handler.ts` under the matching `event_type` branch.
4. Add a mock fixture to `examples/` using the same `context.source: "local-mock"` convention.
5. Add a test in `test/webhook-handler.test.ts` using the fixture.
6. Document the new event type in this reference doc.

---

## Outbound reply shape (for reference)

When `FEISHU_ENABLE_OUTBOUND_REPLY=true`, the server calls the Feishu reply API. The request body shape:

```json
{
  "receive_id": "<chat_id or open_id>",
  "msg_type": "text",
  "content": "{\"text\":\"<reply text>\"}"
}
```

The `receive_id` type (`chat_id` vs `open_id`) is determined by `message.chat_type`: use `chat_id` for groups, `open_id` for p2p.

---

_Last updated: 2026-04-05_
