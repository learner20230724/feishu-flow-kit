# `/table` schema review 页面

这个页面是 `feishu-flow-kit` 里 schema handoff 路径最短、信息密度最高的 review 单页。

适合在你**不想看完整 handoff demo** 时使用，只想快速回答这几个问题：
- starter config 最终匹配到了哪些字段
- 标准化之后还保留了哪些原始 Feishu 语义提示
- 在开启真实写入前，哪些地方值得人工再看一眼
- 当前最可能需要补的 env override 是什么

它刻意是 review-first 的。
它不是 live schema discovery。
它不会替你调用 Feishu API、动态拉取 option ID，也不会保证第一次真实写入一定原样成功。

建议配合这些页面一起看：
- [`/table` schema handoff demo](./table-schema-handoff-demo.md)
- [`/table` schema handoff review checklist](./table-schema-handoff-review-checklist.md)
- [`/table` mapping generator input guide](./table-mapping-generator-inputs.md)
- [Setup guide](./setup-guide.md)

---

## 这页压缩了什么

这个仓库里完整的 handoff 路径是：

raw field-list response → normalized schema → mapping draft → `.env` review → first controlled write

完整 walkthrough 在 [`/table` schema handoff demo](./table-schema-handoff-demo.md)。
这一页则把它压成一个更适合引用的 review surface，核心围绕 advanced fixture chain：

- `examples/feishu-fields-list-response-advanced.json`
- `examples/feishu-fields-normalized-schema-advanced.json`
- `examples/feishu-fields-mapping-draft-advanced.json`

如果你只想在改 `.env` 前先看一页，就从这里开始。

![Table schema handoff review demo](./demo-table-schema-handoff-review.png)

![Table schema review page snapshot](./demo-table-schema-review-page.png)

![Table schema review share card](./demo-table-schema-review-share-card.png)

这一页现在也配了单页静态快照资产，所以你可以把 review surface 直接贴进 README、issue、setup note 或 PR comment，而不用截一大段 markdown。share-card 版本更轻，适合 README 首屏裁切、issue 链接预览，或者觉得 full-page snapshot 太密的时候使用。如果你想要更干净的浏览器渲染目标，方便本地截图或嵌入，可以打开 [`table-schema-review-snapshot.zh-CN.html`](./table-schema-review-snapshot.zh-CN.html)。英文 companion 页面在 [`table-schema-review-snapshot.html`](./table-schema-review-snapshot.html)。另外现在还有一页发布导向的资产索引 [`table-schema-review-assets.md`](./table-schema-review-assets.md)，会说明 workflow 图、full-page snapshot、share-card crop 各自适合什么场景。如果底层 SVG 有更新，直接跑 `npm run docs:export-assets` 刷新全部 PNG 即可。

---

## 快速校验

在把任何 committed fixture 当成 review 证据之前，先确认它仍和当前 CLI 行为一致：

```bash
npm run verify:table-schema-handoff
```

这个命令会同时验证两条内置链路：
- baseline handoff chain
- advanced raw-fidelity chain

---

## 最值得粘贴的一段 review block

下面是 `examples/feishu-fields-mapping-draft-advanced.json` 里最短、但仍然足够有用的一段：

```json
{
  "matches": [
    {
      "starterField": "List",
      "actualName": "Status",
      "actualType": "single_select",
      "optionCount": 3
    },
    {
      "starterField": "Due",
      "actualName": "Deadline",
      "actualType": "date",
      "rawSemanticType": "datetime",
      "dateFormatter": "yyyy-MM-dd HH:mm"
    },
    {
      "starterField": "LinkedRecords",
      "actualName": "RelatedTasks",
      "actualType": "linked_record",
      "rawSemanticType": "duplex_link",
      "linkedTableId": "tbl_related_release"
    }
  ],
  "reviewWarnings": [
    {
      "kind": "mode-mismatch",
      "actualName": "Deadline",
      "suggestedEnv": "FEISHU_BITABLE_DUE_FIELD_MODE=datetime"
    },
    {
      "kind": "link-shape-review",
      "actualName": "RelatedTasks"
    }
  ]
}
```

很多时候，reviewer 只要看这一段，就足够避开第一次真实写入里最常见的坑。

---

## 三个最强 review hint 分别意味着什么

### 1. `optionCount` 说明这个 select 字段是真 select，不是退化成 text

```json
{
  "starterField": "List",
  "actualName": "Status",
  "actualType": "single_select",
  "optionCount": 3
}
```

为什么重要：
- 它说明这个列真的带了 option metadata
- 这是一个很强的信号，说明 `FEISHU_BITABLE_LIST_FIELD_MODE=text` 太弱了
- 也能让 reviewer 确认 mapping 保留的不只是一个字段名

最常见的下一步：

```bash
FEISHU_BITABLE_LIST_FIELD_MODE=single_select
```

如果你的真实表允许多选，那就改成 `multi_select`。

### 2. `rawSemanticType=datetime` 说明 `date` mode 可能太弱

```json
{
  "starterField": "Due",
  "actualName": "Deadline",
  "actualType": "date",
  "rawSemanticType": "datetime",
  "dateFormatter": "yyyy-MM-dd HH:mm"
}
```

为什么重要：
- 当前 normalized mapping 会落到 `date`
- 但原始 Feishu metadata 仍然在说这个列更像 `datetime`
- `dateFormatter` 把 time-of-day 还保留着，没有被静默抹平

最常见的下一步：

```bash
FEISHU_BITABLE_DUE_FIELD_MODE=datetime
```

只有在你非常确定目标表就是 date-only 时，才继续保留 `date`。

### 3. `rawSemanticType=duplex_link` 让 relation shape 没有被抹掉

```json
{
  "starterField": "LinkedRecords",
  "actualName": "RelatedTasks",
  "actualType": "linked_record",
  "rawSemanticType": "duplex_link",
  "linkedTableId": "tbl_related_release"
}
```

为什么重要：
- normalized mapping 最终会落到一个通用的 `linked_record` 桶里
- 但原始 Feishu metadata 还保留了这不是“任意一个 link field”
- `linkedTableId` 也让 reviewer 在审查时能看到真实关联目标

最常见的下一步：
- 确认 linked table 确实就是你预期的那张表
- 确认第一次 live write 应该写出的是 duplex relation
- 即使 env mode 看起来已经对了，这个字段也仍值得保留在 review scope 里

---

## ReviewWarnings：优先先看什么

mapping draft 现在会额外给出一个很小的 `reviewWarnings` 区块，让 raw-vs-normalized 漂移更难被忽略。

### Mode mismatch warning

示例：

```json
{
  "kind": "mode-mismatch",
  "actualName": "Deadline",
  "rawSemanticType": "datetime",
  "reviewAction": "Check whether the target Bitable column should keep FEISHU_BITABLE_DUE_FIELD_MODE=date or be upgraded to datetime before enabling real writes.",
  "suggestedEnv": "FEISHU_BITABLE_DUE_FIELD_MODE=datetime"
}
```

怎么理解：
- 这个 draft 仍然能用
- 但当前 env mode 大概率不是最终答案
- 最安全的下一步，通常是先调一个 env，再做一次受控真实写入

### Link shape review warning

示例：

```json
{
  "kind": "link-shape-review",
  "actualName": "RelatedTasks",
  "rawSemanticType": "duplex_link",
  "reviewAction": "Confirm that the linked-record field points at the expected table and accepts the planned relation shape before the first live create-record call."
}
```

怎么理解：
- 字段本身已经匹配得足够好，可以继续推进
- 但 reviewer 仍然应该在 rollout 前再确认 relation shape 和 target table

---

## 最小 env review checklist

如果你只想走一遍最短、但仍然有用的 review loop，可以这样：

1. 运行 `npm run verify:table-schema-handoff`
2. 打开 `examples/feishu-fields-mapping-draft-advanced.json`
3. 看 `matches` 里的 `optionCount`、`rawSemanticType`、`dateFormatter`、`linkedTableId`
4. 看 `reviewWarnings` 里的 `suggestedEnv`
5. 只补最小、但能消除明显风险的 env override
6. 先做一次受控 live write，再决定要不要扩大 rollout

---

## 哪些字段通常低风险，哪些值得警惕

通常较低风险：
- 名字一眼就对得上的 title/text 字段
- 已经很明确是 number 的 `Estimate`
- 已经很明确像 checkbox 的 `Done`

通常值得多看一眼：
- date vs datetime
- single link vs duplex link
- 带真实 option metadata 的 select 字段
- 靠 heuristic 才勉强匹配上的本地化 / alias 字段名
- 通过 env 做了较重 starter-field remap 的表

---

## 这页和其他文档怎么分工

以下场景适合看这页：
- 你只想看一个紧凑 review surface
- 你需要一段可引用 JSON block 用在 PR 或 setup note 里
- 你已经接近要开启真实写入

以下场景更适合看 [`/table` schema handoff demo](./table-schema-handoff-demo.md)：
- 你需要完整理解 raw response → normalized schema → mapping draft 的 walkthrough
- 你要向别的贡献者解释 handoff 路径
- 你在检查 committed fixtures 是否仍然把整条链路写清楚了

以下场景更适合看 [`/table` schema handoff review checklist](./table-schema-handoff-review-checklist.md)：
- 你想要一个 checklist 形式的人工 gate
- 你在准备第一次真实 Bitable 写入
- 你需要更明确的 go / no-go 清单
