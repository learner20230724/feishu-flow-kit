# feishu-flow-kit

[![CI](https://github.com/learner20230724/feishu-flow-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/learner20230724/feishu-flow-kit/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

一个本地优先的 Feishu 自动化与 AI 工作流起步仓库。

> [English](./README.md) | 简体中文

## 为什么做这个

很多飞书自动化示例要么太窄，只覆盖一个小场景；要么强绑定某个内部环境；要么一上来就把工程复杂度拉满，不适合快速验证工作流。

这个项目想提供一个更干净的起点：
- 本地优先
- 结构清楚
- 不依赖很多基础设施
- 能自然长成真实工作流

## 它是什么

`feishu-flow-kit` 是一个围绕飞书生态的 starter repo，适合用来做：
- 消息驱动的自动化
- 机器人触发的工作流
- 飞书文档 / 表格辅助工具
- 轻量 AI 内部工具
- 先本地演示、后续再正式部署的 demo

## MVP 目标

- 小而易懂的项目结构
- 带类型的配置加载
- 可复用的 Feishu 事件 / 消息适配层
- 基础结构化日志
- 1 到 2 个真实可跑的工作流示例
- 不引入多余的平台仪式感

## 不做什么

- 不假装替代完整平台 SDK
- 不用过度抽象把 Feishu 的实际复杂度藏起来
- 不为简单场景强行引入重服务器架构

## 项目结构

```text
.
  README.md
  README.zh-CN.md
  src/
    core/
    adapters/
    workflows/
    config/
    server/
    types/
  examples/
  docs/
```

## 运行原理

```
Feishu 消息事件
        │
        ▼
┌───────────────────┐
│   POST /webhook   │  ← url_verification / im.message.receive_v1
│   （本地服务）     │
└────────┬──────────┘
         │ 适配原始 payload
         ▼
┌───────────────────┐
│  slash-command    │  ← /todo ...  /doc ...  /table ...
│     解析器        │
└────────┬──────────┘
         │ 路由到 workflow
    ┌────┴──────────┬────┐
    ▼               ▼    ▼
 /todo            /doc  /table
  流程             流程   流程
    │               │      │
    │          创建 Feishu 文档
    │          + 追加正文 blocks
    │                      │
    ▼               ▼      ▼
 draft reply JSON   doc draft   bitable create-record draft
  （可选：真实发送 Feishu 回复）
```

以上全部可在本地用 mock 事件跑通。设置 `FEISHU_ENABLE_OUTBOUND_REPLY=true`、`FEISHU_ENABLE_DOC_CREATE=true` 或 `FEISHU_ENABLE_TABLE_CREATE=true`，即可把对应路径从 draft 模式切到真实 Feishu API 调用。对于 `/table`，还可以用 `FEISHU_BITABLE_LIST_FIELD_MODE=single_select` 或 `multi_select`、`FEISHU_BITABLE_OWNER_FIELD_MODE=user`、`FEISHU_BITABLE_ESTIMATE_FIELD_MODE=number`、`FEISHU_BITABLE_DUE_FIELD_MODE=date` 或 `datetime`、`FEISHU_BITABLE_DONE_FIELD_MODE=checkbox`，以及 `FEISHU_BITABLE_ATTACHMENT_FIELD_MODE=attachment`、`FEISHU_BITABLE_LINK_FIELD_MODE=linked_record`，逐步把字段映射从 text 扩到更贴近真实 Bitable 的 payload。如果你的 Bitable 字段名不是 starter 默认的 `Title / List / Details / ...`，现在也可以直接用 `FEISHU_BITABLE_TITLE_FIELD_NAME=Task`、`FEISHU_BITABLE_LIST_FIELD_NAME=Stage`、`FEISHU_BITABLE_SOURCE_COMMAND_FIELD_NAME=ChatCommand` 这类环境变量做字段名重映射，不用先改代码。

## Demo 资产

![本地 webhook → /doc 工作流演示](./docs/demo-webhook-doc-flow.svg)

![本地 webhook → /table 工作流演示](./docs/demo-webhook-table-flow.svg)

仓库里附带了两张静态展示资产，确保即使没有本地运行，第一页也有可见的结构说明。

## 本地 demo

```bash
npm install
npm run dev
```

默认会以 mock 模式运行，并读取 `examples/mock-message-event.json`。你也可以用 `FEISHU_MOCK_EVENT_PATH` 切换示例输入，例如：

```bash
FEISHU_MOCK_EVENT_PATH=examples/mock-doc-message-event.json npm run dev
FEISHU_MOCK_EVENT_PATH=examples/mock-table-message-event.json npm run dev
FEISHU_MOCK_EVENT_PATH=examples/mock-table-rich-message-event.json FEISHU_BITABLE_LIST_FIELD_MODE=multi_select FEISHU_BITABLE_OWNER_FIELD_MODE=user FEISHU_BITABLE_ESTIMATE_FIELD_MODE=number FEISHU_BITABLE_DUE_FIELD_MODE=datetime FEISHU_BITABLE_DONE_FIELD_MODE=checkbox FEISHU_BITABLE_ATTACHMENT_FIELD_MODE=attachment FEISHU_BITABLE_LINK_FIELD_MODE=linked_record npm run dev
```

当前 demo 路径是：

1. 加载带类型的配置
2. 读取一条 mock Feishu 消息事件
3. 解析 `/todo ...`、`/doc ...` 或 `/table ...` 这样的 slash command
4. 运行最小 workflow
5. 输出 reply draft

目前仓库里已经可直接演示的命令：
- `/todo ship webhook adapter`
- `/doc weekly launch review`
- `/table add backlog item: improve webhook errors / owner=alex`
- `/table add backlog improve webhook errors / owner_open_id=ou_xxx`
- `/table add sprint fix flaky webhook tests / estimate=5`
- `/table add sprint fix flaky webhook tests / due=2026-04-01`
- `/table add sprint close flaky webhook tests / done=true`
- `/table add sprint share demo pack / attachment_token=file_v2_demo123,file_v2_demo456`
- `/table add sprint,urgent flaky webhook tests / owner_open_id=ou_xxx / estimate=5 / due=2026-04-01T09:30:00Z / done=true`
- `/table add sprint ship follow-up / link_record_id=recA123,recB456`

当前 mock 输入示例：
- `examples/mock-message-event.json` → `/todo` 流程
- `examples/mock-doc-message-event.json` → `/doc` 流程
- `examples/mock-table-message-event.json` → `/table` text-first 流程
- `examples/mock-table-rich-message-event.json` → `/table` richer field-mode 流程（`multi_select` + `user` + `number` + `datetime` + `checkbox` + `attachment` + `linked_record`）
- `examples/webhook-table-rich-event.json` + `examples/webhook-table-rich-response.json` → fixture-backed `/table` webhook 成功示例
- `examples/webhook-invalid-payload.json` + `examples/webhook-invalid-response.json` → fixture-backed invalid webhook 失败示例
- `examples/table-api-error-field-not-found.json` → fixture-backed 字段不存在失败示例
- `examples/table-api-error-type-mismatch.json` → fixture-backed 字段类型不匹配失败示例
- `examples/table-api-error-permission-denied.json` → fixture-backed Bitable 写权限失败示例

这个 demo 刻意保持很小，但已经足够证明仓库能把真实输入跑过一条清楚、可读的本地链路。

## 当前 webhook slice

仓库现在已经有一条最小可用的 Feishu 本地 webhook 路径。

当前范围：
- 提供 `GET /healthz` 方便做本地存活检查
- 提供 `POST /webhook`
- 支持处理 `url_verification`
- 接收最小 `im.message.receive_v1` payload
- 把原始 callback 适配成仓库内部统一的 `message.received` 事件
- 运行现有 demo workflow，并返回 draft reply JSON
- 当 `FEISHU_ENABLE_OUTBOUND_REPLY=true` 且 app 凭据齐全时，可选发送真实 Feishu 文本回复
- 当 `FEISHU_ENABLE_DOC_CREATE=true` 且 app 凭据齐全时，可选从 `/doc` workflow 创建真实 Feishu 文档
- 创建文档后，还可以继续追加一段最小 starter body，支持 heading / bullet / todo / paragraph 等原生 block，避免新文档是空的
- `/webhook` 对非 POST 请求返回明确的 `405`
- 当配置 `FEISHU_WEBHOOK_SECRET` 时，可选校验 `x-lark-request-timestamp` 与 `x-lark-signature`
- 会拒绝超出可配置 replay window 的签名请求

当前限制：
- 签名校验仍刻意保持很小，不是生产级安全审计的替代品
- outbound reply 仍是显式 opt-in，只覆盖最简单的文本回复路径
- doc create 也还是 starter 级：block append 目前支持 heading1/2/3、bullet list、todo（含 checked 状态）和普通 paragraph，并且在 paragraph / bullet / todo / heading 文本里保留行内 markdown 格式（**粗体**、*斜体*、`代码`、~~删除线~~、`[文字](url)` 链接）
- token cache 目前只是一个很小的内存缓存，还没有 refresh daemon、持久化或并发去重
- 当前只覆盖了较窄的一段消息 payload

这已经足够做本地联调与 repo 级结构验证，但仍然是一个 starter implementation。

## 测试

```bash
npm run check
npm test
```

当前测试覆盖：
- slash command 解析
- `/todo`、`/doc` 与 `/table` 的 demo workflow 行为
- webhook payload 适配
- webhook 签名生成与校验
- outbound reply request draft 生成
- 最小 tenant token 获取 + 文本 reply sender 流程
- webhook `/doc` 路径里的最小 Feishu doc create 与 starter richer-block append 流程
- 最小 Bitable create-record 请求，以及 webhook `/table` 路径的 opt-in 真实写入链路
- `GET /healthz` 与 `POST /webhook` 的本地 HTTP 行为

## 可继续扩展的 workflow 方向

仓库里已经能直接跑的：
- `/todo ...` → 把请求整理成一个简短 action-list draft
- `/doc ...` → 把主题转成 markdown 风格 outline，并可进一步创建 Feishu 文档、追加最小原生 docx 正文（headings / bullets / todos / paragraphs）
- `/table ...` → 把一段短的 record 请求转成 Bitable create-record draft（本地优先，真实写入显式 opt-in；当前已可通过配置把 `List` 扩到 single-select 或 multi-select、把 `Owner` 扩到 user payload、把 `Estimate` 扩到 number payload、把 `Due` 扩到 date/datetime 时间戳 payload、把 `Done` 扩到 checkbox payload、把 `Attachment` 扩到 file-token attachment payload，并把 `LinkedRecords` 扩到 linked-record payload；同时也支持用环境变量把 starter 字段名重映射到真实表结构）

下一批比较合适的方向：
- 将选定的飞书内容同步到本地 markdown 工作区
- 从结构化聊天命令触发一个小型审批辅助流程

## 为什么优先本地

对于早期工具，本地优先通常更适合：
- 配置更少
- 调试更快
- 移动部件更少
- 更适合做公开示例

后续如果需要，再补 deployment pieces 就可以。

## 文档

- [Setup guide](./docs/setup-guide.md)
- [Architecture overview](./docs/overview.md)
- [`/table` 字段映射说明](./docs/table-bitable-field-mapping.md)
- [`/table` webhook 成功 / 失败示例](./docs/table-webhook-success-error-demo.md)
- [`/table` API error fixture 资产包](./docs/table-api-error-fixtures.md)
- [按 API 报错模式排查](./docs/troubleshooting-by-api-error-pattern.md)
- [GitHub 仓库元数据](./docs/github-repo-meta.md)
- [无浏览器环境下发布到 GitHub](./docs/publish-to-github.md)

## 参与贡献

贡献范围、本地运行方式和 PR 预期见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 路线图

- [x] 建最小 TypeScript 项目骨架
- [x] 定义配置 schema
- [x] 加入基础 mock event runner
- [x] 加入 slash-command parsing 示例
- [x] 加入面向真实 webhook / bot payload 的 Feishu adapter interface
- [x] 再补一个可运行 workflow 示例
- [x] 写清 setup guide 与真实约束
- [x] 把 `/doc` block append 从纯 paragraph 升级到 starter richer docx blocks
- [x] 补截图或 demo 图

## 写法与范围说明

这个仓库应该保持实用。不要夸张 AI 话术，不要伪造产品成熟度，也不要用空泛的“agent 魔法”掩盖真实边界。

目标很简单：让 Feishu workflow 实验更容易开始，也更容易公开分享。

## Star history

[![Star History Chart](https://api.star-history.com/svg?repos=learner20230724/feishu-flow-kit&type=Date)](https://star-history.com/#learner20230724/feishu-flow-kit&Date)

## License

MIT，见 [LICENSE](./LICENSE)。
