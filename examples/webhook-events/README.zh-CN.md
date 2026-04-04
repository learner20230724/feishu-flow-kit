# 示例 Webhook 事件

本地测试用的真实 [飞书 im.message.receive_v1][event-docs] 格式消息体，
无需 ngrok、无需真实的飞书应用凭证。

[event-docs]: https://open.feishu.cn/document/server-docs/im-v1/message/events

## 文件列表

| 文件 | 命令 / 场景 | 聊天类型 | 语言 |
|------|-------------|---------|------|
| `message-text-p2p.json` | `/doc Q2 产品发布计划` | p2p | en |
| `message-table-command.json` | `/table 冲刺任务` | p2p | en |
| `message-help-command.json` | `/help` | p2p | en |
| `message-greeting-plugin.json` | `/greeting Alice`（插件） | p2p | en |
| `message-poll-plugin.json` | `/poll 优先发哪个功能？`（插件） | p2p | en |
| `message-zh-lang.json` | `/doc 每周项目进展报告` | p2p | zh |
| `message-group-chat.json` | `/doc 会议纪要` | group | en |
| `message-todo-command.json` | `/todo 评审 PR #42` | p2p | en |
| `message-doc-command-doc.json` | `/doc`（无参数） | p2p | en |
| `message-table-command-no-arg.json` | `/table`（无参数） | p2p | en |

## 格式说明

所有文件均使用飞书官方 `im.message.receive_v1` 信封结构：

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

> **注意：** `content` 字段是 JSON 字符串。内部 `text` 值才是命令解析器收到的内容。

## 方式一 — `test-webhook-local.sh`（推荐）

```bash
# 先启动机器人
npm start

# 发送单个事件
./scripts/test-webhook-local.sh examples/webhook-events/message-doc-command.json

# 或按顺序发送所有事件
./scripts/test-webhook-local.sh all

# 指定不同服务器地址
BASE_URL=http://localhost:3000 ./scripts/test-webhook-local.sh all
```

## 方式二 — 直接 curl

```bash
curl -X POST http://localhost:8787/webhook \
  -H "Content-Type: application/json" \
  -d @examples/webhook-events/message-text-p2p.json
```

## 方式三 — VS Code REST Client

在项目根目录创建 `.http` 文件：

```http
POST http://localhost:8787/webhook
Content-Type: application/json

< examples/webhook-events/message-text-p2p.json
```

## 多租户说明

所有示例使用 `local-dev-tenant`。如果启用多租户模式，需在 `.env` 的 `FEISHU_TENANTS`
中包含 `local-dev-tenant` 的配置项。

## 新增示例

复制任意现有 `.json` 文件，修改 `message.message_id` 为唯一值，
修改 `message.text` 为待测命令，必要时设置 `sender.language` 为 `zh` 以测试 i18n 路径。
