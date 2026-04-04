# `/table` mapping config preflight（配置预检）

这页文档专门说明 `feishu-flow-kit` 里目前最小、但已经很实用的一层 `/table` rollout 前安全检查。

适合在你已经有这些东西时使用：
- 一份标准化后的字段清单导出
- 一份准备给目标 Bitable 使用的 `.env` 映射
- 希望在第一次真实 create-record 之前，先把明显的字段名 / 字段类型漂移挡住

它刻意保持很小。
它不会 live 拉 schema。
它不会修改 Feishu。
它也不假装自己已经是完整 schema-aware write layer。

它真正做的事情，是把当前 `FEISHU_BITABLE_*` 配置和一份 normalized schema 逐项对照，告诉你 starter contract 明显没对齐的地方。

建议配合这些页面一起看：
- [`/table` 字段映射说明](./table-bitable-field-mapping.md)
- [`/table` schema handoff demo](./table-schema-handoff-demo.md)
- [`/table` schema review 页面](./table-schema-review-page.zh-CN.md)
- [Release checklist](./release-checklist.md)

---

## 什么情况下值得跑

这些场景都值得先跑一次 preflight：
- 你刚生成或手改了一版 `.env` mapping draft
- 目标表字段名不是默认的 `Title / List / Due`，而是 `Task / Status / Deadline` 这类名字
- 你把一两个 starter 字段从 `text` 扩成了 `single_select`、`user`、`number`、`date`、`attachment` 或 `linked_record`
- 你想在 `FEISHU_ENABLE_TABLE_CREATE=true` 之前，先有一个本地 gate
- 你希望 release / CI 在明显 mapping 漂移上直接失败，而不是等到真实写入才发现

如果你还停留在最早期的 text-only mock 阶段，甚至还没选定真实表结构，那就不用急着跑这一层。

---

## 命令

```bash
npm run table:validate-mapping-config -- <schema.json> [--env-file <path>] [--strict-raw]
```

示例：

```bash
npm run table:validate-mapping-config -- examples/feishu-fields-normalized-schema.json
npm run table:validate-mapping-config -- examples/feishu-fields-normalized-schema-advanced.json --env-file examples/table-mapping-advanced.env
npm run table:validate-mapping-config -- examples/feishu-fields-normalized-schema-advanced.json --env-file examples/table-mapping-advanced.env --strict-raw
```

输入要求：
- JSON 顶层需要有 `fields` 数组
- 文件形状应当接近 `npm run table:normalize-feishu-fields -- ...` 的输出

env 来源规则：
- 不带 `--env-file` 时，validator 使用 `process.env` + starter 默认值
- 带上 `--env-file` 时，文件里的值会覆盖本次校验所用的默认值

---

## 它会检查什么

当前 validator 会覆盖 starter `/table` 映射合同里的这些字段：

- `Title`
- `List`
- `Details`
- `Owner`
- `Estimate`
- `Due`
- `Done`
- `Attachment`
- `LinkedRecords`
- `SourceCommand`

对每个字段，它会检查：
- 当前配置实际指向哪个字段名
- 这个字段是否存在于 normalized schema
- 当前 mode 是否在 starter contract 支持范围内
- normalized field type 是否和当前 mode 对得上

当前支持的 widened mode 包括：
- `List` → `single_select`、`multi_select`
- `Owner` → `user`
- `Estimate` → `number`
- `Due` → `date`、`datetime`
- `Done` → `checkbox`
- `Attachment` → `attachment`
- `LinkedRecords` → `linked_record`

---

## 输出长什么样

一次成功运行大概会长这样：

```text
Validating /table mapping against feishu-fields-normalized-schema-advanced.json (Release tasks)
✓ Title -> Task (text)
✓ List -> Status (single_select)
✓ Details -> Notes (text)
✓ Owner -> Owner (user)
✓ Estimate -> Effort (number)
✓ Due -> Deadline (date)
✓ Done -> Completed (checkbox)
✓ Attachment -> Files (attachment)
✓ LinkedRecords -> RelatedTasks (linked_record)
✓ SourceCommand -> SourceCommand (text)
Env source: examples/table-mapping-advanced.env

Warnings:
- Deadline: configured mode is date, but raw Feishu semantics still say datetime
- RelatedTasks: linked_record is valid, but raw Feishu semantics still distinguish duplex_link

/table mapping config looks aligned with the provided schema.
```

这代表它是通过的，但不是“静默通过”。

也就是说：starter contract 已经足够对齐，可以继续推进；但那些 rollout 时最容易被忽略的语义边角，仍然会被保留下来提醒你。

---

## warning 分别是什么意思

当前 validator 会把两类 raw-semantic drift 明确保留下来：

### 1. `datetime` → `date`

如果 normalized schema 说字段是 `date`，但保留下来的 raw Feishu semantic type 仍然是 `datetime`，默认会给 warning：

```text
Deadline: configured mode is date, but raw Feishu semantics still say datetime
```

怎么理解：
- 结构上它还是可接受的
- 但你可能过早把 time-of-day 语义压扁了

常见下一步：
- 如果真实 rollout 本来就应该只保留日期，那继续用 `date`
- 如果真实表行为应该保留时间戳，那改成 `FEISHU_BITABLE_DUE_FIELD_MODE=datetime`

### 2. `duplex_link` / `single_link` → `linked_record`

如果 normalized schema 最终落在 `linked_record`，但 raw semantic type 还保留着更具体的 link shape，validator 会给 warning：

```text
RelatedTasks: linked_record is valid, but raw Feishu semantics still distinguish duplex_link
```

怎么理解：
- 对 starter contract 来说，这个字段已经足够可用
- 但 relation shape 仍然值得在第一次真实写入前人工再看一眼

常见下一步：
- 确认 linked target table 就是你想连的那张表
- 确认 rollout 预期的 relation direction / shape 确实一致

---

## `--strict-raw` 会改变什么

默认情况下，raw-semantic drift 只是 warning。

如果加 `--strict-raw`，至少 `datetime`→`date` 这类漂移会升级成 hard failure：

```bash
npm run table:validate-mapping-config -- examples/feishu-fields-normalized-schema-advanced.json --env-file examples/table-mapping-advanced.env --strict-raw
```

适合 strict mode 的情况：
- 你希望 release verify 在语义漂移上直接卡住
- 你在准备 CI 或 pre-publish gate
- 团队已经明确约定不允许把 `date` / `datetime` 的差异静默吞掉

适合默认模式的情况：
- 你仍希望 warning 可见
- 但暂时不想让每次 review 都因为已知漂移直接失败

---

## 常见失败场景

### 字段名不存在

示例：

```text
List: configured field "Stage" was not found in schema
```

通常意味着：
- env 文件指向了 schema 里不存在的列名
- 或者你拿来校验的 schema 文件已经过时

优先检查：
- 字段名拼写和大小写
- 导出的是否真的是目标表
- `.env` 是否从旧 handoff note 复制过来但没更新

### 字段类型不匹配

示例：

```text
Owner: field "Owner" is text, but config expects user
```

通常意味着：
- env mode 已经切到 widened payload
- 但真实 normalized schema 还是另一种类型

优先检查：
- Feishu 里的列是不是还没真正改成目标类型
- normalized export 是否是最新导出的
- 当前 env mode 是否应该暂时回退到 `text`

### starter mode 本身不支持

示例：

```text
Estimate: configured mode "currency" is not supported by the starter contract
```

通常意味着：
- 你希望 starter mapping 层支持一个它还没实现的 mode

优先检查：
- 这个字段是否应该先停留在当前已支持的 mode
- 现在是不是该扩 repo capability，而不是只改 env

---

## 一个比较稳的 rollout 习惯

建议顺序是：

1. 先标准化 Feishu field-list response
2. 生成或手改 `.env`
3. 跑 `table:validate-mapping-config`
4. 先修掉明显的 name / mode drift
5. 决定 raw warning 该继续保留 warning，还是升级成 strict failure
6. 然后再启真实 `/table` 写入

这样做的目标很简单：让第一次 live create-record 尽量无聊一点。一般来说，这反而是最好的结果。
