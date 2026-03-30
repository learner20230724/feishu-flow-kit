# `/table` webhook success / error demo

This page shows one small `/table` webhook path that succeeds, plus one invalid-payload case that fails early.

The point is not to fake production readiness. It is to make the current starter behavior visible before you wire real Feishu credentials.

The JSON payloads and handler responses shown here are also checked into `examples/` and asserted in `test/webhook-handler.test.ts`, so this page now points at fixture-backed assets instead of one-off hand-written samples.

---

## Success case: valid webhook payload → `/table` draft response

Webhook-style input:

```json
{
  "header": {
    "event_type": "im.message.receive_v1",
    "create_time": "2026-03-30T21:16:00Z",
    "tenant_key": "tenant_demo"
  },
  "event": {
    "sender": {
      "sender_id": {
        "open_id": "ou_demo_sender"
      }
    },
    "message": {
      "message_id": "om_table_rich_demo",
      "chat_id": "oc_demo_chat",
      "chat_type": "group",
      "content": "{\"text\":\"/table add sprint,urgent flaky webhook tests / owner_open_id=ou_demo_alex / estimate=5 / due=2026-04-01T09:30:00Z / done=true / attachment_token=file_v2_demo123,file_v2_demo456 / link_record_id=rec_demo_task_1,rec_demo_task_2\"}",
      "create_time": "2026-03-30T21:16:00Z"
    }
  }
}
```

Example local run for the richer field modes:

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

What the draft reply shows in local mock mode:

```text
Table workflow draft
- list: sprint,urgent
- title: flaky webhook tests
- owner_open_id: ou_demo_alex
- estimate: 5
- due: 2026-04-01T09:30:00Z
- done: true
- attachment_token: file_v2_demo123,file_v2_demo456
- link_record_id: rec_demo_task_1,rec_demo_task_2
- list field mode: multi_select
- owner field mode: user
- estimate field mode: number
- due field mode: datetime
- done field mode: checkbox
- attachment field mode: attachment
- link field mode: linked_record

Draft fields:
- Title: flaky webhook tests
- List: [{"name":"sprint"},{"name":"urgent"}]
- SourceCommand: /table add sprint,urgent flaky webhook tests / owner_open_id=ou_demo_alex / estimate=5 / due=2026-04-01T09:30:00Z / done=true / attachment_token=file_v2_demo123,file_v2_demo456 / link_record_id=rec_demo_task_1,rec_demo_task_2
- Owner: [{"id":"ou_demo_alex"}]
- Estimate: 5
- Due: 1775035800000
- Done: true
- Attachment: [{"file_token":"file_v2_demo123"},{"file_token":"file_v2_demo456"}]
- LinkedRecords: {"link_record_ids":["rec_demo_task_1","rec_demo_task_2"]}

Next: wire the draft into a real Bitable create-record call (opt-in).
```

Example webhook handler response shape with real webhook-style input but outbound writes still disabled:

```json
{
  "statusCode": 200,
  "body": {
    "ok": true,
    "eventType": "message.received",
    "messageId": "om_table_rich_demo",
    "tags": ["table", "demo"],
    "replyText": "Table workflow draft\n- list: sprint,urgent\n- title: flaky webhook tests\n- owner_open_id: ou_demo_alex\n- estimate: 5\n- due: 2026-04-01T09:30:00Z\n- done: true\n- attachment_token: file_v2_demo123,file_v2_demo456\n- link_record_id: rec_demo_task_1,rec_demo_task_2\n- list field mode: multi_select\n- owner field mode: user\n- estimate field mode: number\n- due field mode: datetime\n- done field mode: checkbox\n- attachment field mode: attachment\n- link field mode: linked_record\n\nDraft fields:\n- Title: flaky webhook tests\n- List: [{\"name\":\"sprint\"},{\"name\":\"urgent\"}]\n- SourceCommand: /table add sprint,urgent flaky webhook tests / owner_open_id=ou_demo_alex / estimate=5 / due=2026-04-01T09:30:00Z / done=true / attachment_token=file_v2_demo123,file_v2_demo456 / link_record_id=rec_demo_task_1,rec_demo_task_2\n- Owner: [{\"id\":\"ou_demo_alex\"}]\n- Estimate: 5\n- Due: 1775035800000\n- Done: true\n- Attachment: [{\"file_token\":\"file_v2_demo123\"},{\"file_token\":\"file_v2_demo456\"}]\n- LinkedRecords: {\"link_record_ids\":[\"rec_demo_task_1\",\"rec_demo_task_2\"]}\n\nNext: wire the draft into a real Bitable create-record call (opt-in).",
    "tableRecordDraft": {
      "endpoint": "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records",
      "method": "POST",
      "body": {
        "fields": {
          "Title": "flaky webhook tests",
          "List": [
            { "name": "sprint" },
            { "name": "urgent" }
          ],
          "SourceCommand": "/table add sprint,urgent flaky webhook tests / owner_open_id=ou_demo_alex / estimate=5 / due=2026-04-01T09:30:00Z / done=true / attachment_token=file_v2_demo123,file_v2_demo456 / link_record_id=rec_demo_task_1,rec_demo_task_2",
          "Owner": [{ "id": "ou_demo_alex" }],
          "Estimate": 5,
          "Due": 1775035800000,
          "Done": true,
          "Attachment": [
            { "file_token": "file_v2_demo123" },
            { "file_token": "file_v2_demo456" }
          ],
          "LinkedRecords": {
            "link_record_ids": ["rec_demo_task_1", "rec_demo_task_2"]
          }
        }
      },
      "notes": [
        "Local-first draft only. Replace {app_token} and {table_id} before wiring to a real Bitable write.",
        "List is emitted as a multi-select payload ([{ name }]) using comma-separated list values. Owner is emitted as a Bitable user field payload ([{ id }]). Estimate is emitted as a numeric payload. Due is emitted as a datetime timestamp payload (milliseconds). Done is emitted as a checkbox payload (boolean). Attachment is emitted as a Bitable attachment payload ([{ file_token }]) using comma-separated file tokens. LinkedRecords is emitted as a Bitable linked-record payload ({ link_record_ids }) using comma-separated record IDs. Title, Details, and SourceCommand still assume text-compatible fields."
      ]
    },
    "tableCreate": {
      "attempted": false,
      "skippedReason": "FEISHU_ENABLE_TABLE_CREATE is disabled."
    },
    "outboundReply": {
      "attempted": false,
      "skippedReason": "FEISHU_ENABLE_OUTBOUND_REPLY is disabled."
    }
  }
}
```

Fixture files for this success path:
- `examples/webhook-table-rich-event.json`
- `examples/webhook-table-rich-response.json`

What this proves:
- webhook payload adaptation works
- `/table` parsing works for the current starter command shape
- widened field modes are visible before real Bitable writes are enabled
- the outbound `create-record` body stays inspectable

---

## Error case: invalid webhook payload

Example input:

```json
{
  "type": "unknown"
}
```

Current response:

```json
{
  "statusCode": 400,
  "body": {
    "ok": false,
    "error": "Unsupported or invalid webhook payload."
  }
}
```

Fixture files for this failure path:
- `examples/webhook-invalid-payload.json`
- `examples/webhook-invalid-response.json`

This is the current early-fail behavior when the payload is neither:
- `url_verification`
- nor a supported `im.message.receive_v1` webhook event

---

## Why this doc exists

The repo already had parser tests, workflow tests, and a `/table` flow diagram.

What was still missing was one outward-facing page that shows:
- the exact webhook payload shape the handler expects
- what a richer `/table` success path looks like before real writes are enabled
- what the current invalid-payload failure looks like

That makes the starter boundary easier to understand without reading the whole codebase first.

If you want a matching set of more realistic create-record failure shapes, see [`table-api-error-fixtures.md`](./table-api-error-fixtures.md).
