# Heartbeat Log

## 2026-04-06 09:27 UTC
- 当前主线：`feishu-flow-kit`（main @ 7966233 ✅，v1.0.3 tag ✅）+ `llm-chat-lab`（main @ 93d2922 🆕，v1.3.0）+ `room-measure-kit` v0.1.2（b50eb04 ✅）
- 本次完成：修复 llm-chat-lab 测试环境 + 提交测试基础设施——
  (1) 发现 port 4173 残留进程导致首次测试失败（40/41 pass，EADDRINUSE）
  (2) Kill 残留 node 进程后重跑，41/41 tests pass ✅
  (3) 提交 test/server.test.mjs（426行）+ server.mjs exports + package.json test script → 推送到 origin/main ✅
  (4) 测试覆盖：substituteVars / buildVarContext / mockResponse / parseCostToCents 单元测试 + 12个API集成测试
- 产出文件/结果：
  - `llm-chat-lab/test/server.test.mjs`（新建，40个测试用例）
  - `llm-chat-lab/server.mjs` — 导出 4 个核心函数供测试
  - `llm-chat-lab/package.json` — 新增 `"test": "node --test test/server.test.mjs"`
  - llm-chat-lab main @ 93d2922 已推送到 GitHub
- 遇到的问题：port 4173 残留进程（上次测试遗留），kill 后解决
- 下一步部署：
  - feishu-flow-kit v1.0.3 draft release Publish（需你 GitHub UI）：https://github.com/learner20230724/feishu-flow-kit/releases
  - feishu-flow-kit NPM_TOKEN secret（Settings → Secrets → Actions）→ 启用 @feishu/plugin-template npm 发布
  - llm-chat-lab v1.3.0 GitHub Release（手动）：https://github.com/learner20230724/llm-chat-lab/releases/new
  - room-measure-kit v0.1.2 GitHub Release（手动）：https://github.com/learner20230724/room-measure-kit/releases/new
- 是否需要你介入：是（上述 4 项均需 GitHub UI 操作，无自动化路径）

## 2026-04-06 08:57 UTC
- 当前主线：`feishu-flow-kit`（main @ 7966233 🆕，v1.0.3 tag ✅）+ `llm-chat-lab` v1.3.0（8e886e8 ✅）+ `room-measure-kit` v0.1.2（b50eb04 ✅）
- 本次完成：更新 ROADMAP.md 至 v1.0.3——
  (1) 标记 M6.9 Plugin ecosystem scaffolding 为完成状态（plugin template + CLI scaffolder + plugin README）
  (2) 新增 v1.0.3 release summary：plugin system、npm template、Postman collection、troubleshooting FAQ、commands reference、production deploy stack、release automation、interactive demo、security policy、Dependabot
  (3) 更新 "Current next step" 为 v1.0.3（当前状态）并列举未来方向（E2E testing、npm publish、/doc nested structures）
  (4) `npm run check` ✅ / `npm test` 107/107 ✅
  (5) 提交 7966233 → 推送到 origin/main ✅
- 产出文件/结果：
  - `feishu-flow-kit/ROADMAP.md` — 更新 v1.0.3 release 条目 + M6.9 完成状态
  - feishu-flow-kit main @ 7966233 已推送到 GitHub
- 遇到的问题：无
- 下一步部署：
  - feishu-flow-kit v1.0.3 draft release Publish（需你 GitHub UI）：https://github.com/learner20230724/feishu-flow-kit/releases
  - feishu-flow-kit NPM_TOKEN secret（Settings → Secrets → Actions）→ 启用 @feishu/plugin-template npm 发布
  - llm-chat-lab v1.3.0 GitHub Release（手动）：https://github.com/learner20230724/llm-chat-lab/releases/new
  - room-measure-kit v0.1.2 GitHub Release（手动）：https://github.com/learner20230724/room-measure-kit/releases/new
- 是否需要你介入：是（上述 4 项均需 GitHub UI 操作，无自动化路径）

## 2026-04-06 08:42 UTC
- 当前主线：`feishu-flow-kit`（main @ da188c1 🆕，v1.0.3 tag ✅）+ `llm-chat-lab` v1.3.0（8e886e8 ✅）+ `room-measure-kit` v0.1.2（b50eb04 ✅）
- 本次完成：新增 5 个标准 OSS 资源文件——
  (1) `SECURITY.md`（~3KB）— 完整安全策略：支持版本表、漏洞报告流程（GitHub Private + Email）、4 级时间线响应（24h→30d）、严重性评级（Critical/High/Medium/Low）、生产部署安全最佳实践（TLS/凭证轮换/ngrok/插件隔离/令牌缓存）
  (2) `.github/CODEOWNERS` — 自动reviewer分配：default / workflows / packages/plugin-template / src/core+plugins
  (3) `.github/dependabot.yml` — 每周自动更新：npm main + packages/plugin-template（按prod/dev分组）、GitHub Actions；限制5个PR/周
  (4) `.github/ISSUE_TEMPLATE/bug_report.md` — 结构化bug报告：环境/日志/配置/env字段、已尝试步骤checklist、FAQs提示
  (5) `.github/ISSUE_TEMPLATE/feature_request.md` — 功能请求模板：Pain Point / Proposed Solution / Suggested Approach / Alternatives Considered + checklist
  (6) `npm run check` ✅ / `npm test` 107/107 ✅（vs 之前 107/107）
  (7) 提交 da188c1 → 推送到 origin/main ✅
- 产出文件/结果：
  - `feishu-flow-kit/SECURITY.md`（新建，~3KB）
  - `feishu-flow-kit/.github/CODEOWNERS`（新建）
  - `feishu-flow-kit/.github/dependabot.yml`（新建）
  - `feishu-flow-kit/.github/ISSUE_TEMPLATE/bug_report.md`（新建）
  - `feishu-flow-kit/.github/ISSUE_TEMPLATE/feature_request.md`（新建）
  - feishu-flow-kit main @ da188c1 已推送到 GitHub
- 遇到的问题：无
- 下一步部署：
  - feishu-flow-kit v1.0.3 draft release Publish（需你 GitHub UI）：https://github.com/learner20230724/feishu-flow-kit/releases
  - feishu-flow-kit NPM_TOKEN secret（Settings → Secrets → Actions）→ 启用 @feishu/plugin-template npm 发布
  - llm-chat-lab v1.3.0 GitHub Release（手动）：https://github.com/learner20230724/llm-chat-lab/releases/new
  - room-measure-kit v0.1.2 GitHub Release（手动）：https://github.com/learner20230724/room-measure-kit/releases/new
- 是否需要你介入：是（上述 4 项均需 GitHub UI 操作，无自动化路径）

## 2026-04-06 08:27 UTC
- 当前主线：`feishu-flow-kit`（main @ 5633801 🆕，v1.0.3 tag ✅）+ `llm-chat-lab` v1.3.0（8e886e8 ✅）+ `room-measure-kit` v0.1.2（b50eb04 ✅）
- 本次完成：新增 Postman Collection 使用指南 `docs/postman-collection.md`——
  (1) 导入collection步骤 + 环境变量参考表（base_url / webhook_path / feishu_api_base / verify_token / tenant_access_token）
  (2) 按文件夹逐请求详解：Setup First / Health & Status / Webhook Endpoints（5个请求）/ Feishu API（3个请求）
  (3) 包含 URL验证握手、/doc命令、/table命令、/help命令的预期响应说明
  (4) 端到端测试流程（6步组合）
  (5) CI环境使用 `npm run demo:static` 替代 Postman
  (6) 常见错误排查表（401/verify_token/unsupported_event_type/card渲染/block空内容）
  (7) `npm run check` ✅ / `npm test` 107/107 ✅
  (8) 提交 5633801 → 推送到 origin/main ✅
- 产出文件/结果：
  - `feishu-flow-kit/docs/postman-collection.md`（新建，~200行，6.7KB）
  - feishu-flow-kit main @ 5633801 已推送到 GitHub
- 遇到的问题：无
- 下一步部署：
  - feishu-flow-kit v1.0.3 draft release Publish（需你 GitHub UI）：https://github.com/learner20230724/feishu-flow-kit/releases
  - feishu-flow-kit NPM_TOKEN secret（Settings → Secrets → Actions）→ 启用 @feishu/plugin-template npm 发布
  - llm-chat-lab v1.3.0 GitHub Release（手动）：https://github.com/learner20230724/llm-chat-lab/releases/new
  - room-measure-kit v0.1.2 GitHub Release（手动）：https://github.com/learner20230724/room-measure-kit/releases/new
- 是否需要你介入：是（上述 4 项均需 GitHub UI 操作，无自动化路径）

## 2026-04-06 07:57 UTC
- 当前主线：`feishu-flow-kit`（main @ 5836b06 🆕，v1.0.3 tag ✅）+ `llm-chat-lab` v1.3.0（8e886e8 ✅）+ `room-measure-kit` v0.1.2（b50eb04 ✅）
- 本次完成：清理残留测试文件 + 更新 README block types 文档——
  (1) 删除 `test-code-block.mjs`（上次 heartbeat 遗留的临时测试文件）
  (2) 将 `test-code-block.mjs` 加入 `.gitignore`
  (3) 更新 README "What you get" 表格：将 `/doc` 的描述从泛泛的 "Rich block authoring incl. bold/italic/code/links" 改为精确列出 10 种 block type（para, h1/h2/h3, bullet, ordered, todo, fenced code, quote, divider + inline styles）
  (4) `npm run check` ✅ / `npm test` 107/107 ✅
  (5) 提交 5836b06 → 推送到 origin/main ✅
- 产出文件/结果：
  - `feishu-flow-kit/.gitignore` — 新增 test-code-block.mjs
  - `feishu-flow-kit/README.md` — 更新 /doc 功能描述，精确列出 10 种 block types
  - feishu-flow-kit main @ 5836b06 已推送到 GitHub
- 遇到的问题：无
- 下一步部署：
  - feishu-flow-kit v1.0.3 draft release Publish（需你 GitHub UI）：https://github.com/learner20230724/feishu-flow-kit/releases
  - feishu-flow-kit NPM_TOKEN secret（Settings → Secrets → Actions）→ 启用 @feishu/plugin-template npm 发布
  - llm-chat-lab v1.3.0 GitHub Release（手动）：https://github.com/learner20230724/llm-chat-lab/releases/new
  - room-measure-kit v0.1.2 GitHub Release（手动）：https://github.com/learner20230724/room-measure-kit/releases/new
- 是否需要你介入：是（上述 4 项均需 GitHub UI 操作，无自动化路径）

## 2026-04-06 07:42 UTC
- 当前主线：`feishu-flow-kit`（main @ 16fd59c 🆕，v1.0.3 tag ✅）+ `llm-chat-lab` v1.3.0（8e886e8 ✅）+ `room-measure-kit` v0.1.2（b50eb04 ✅）
- 本次完成：commit 并推送 build-doc-block-children-draft.ts 的 uncommitted 改动——
  (1) 发现 uncommitted diff：ordered list / fenced code / inline code / quote / divider block 支持代码
  (2) 运行 test-code-block.mjs 验证：ordered list ✅ / multi-line fenced code ✅ 均正确
  (3) 新增 inline code block 专用测试（console.log(1) → block_type 17 + inline_code style）
  (4) `npm run check` ✅ / `npm test` 107/107 ✅（vs 之前 106/106）
  (5) 清理 test-code-block.mjs；提交 16fd59c → 推送到 origin/main ✅
- 产出文件/结果：
  - `feishu-flow-kit/src/adapters/build-doc-block-children-draft.ts` — 新增 ordered(14)/code(17)/quote(18)/divider(22) + fenced code pre-processor
  - `feishu-flow-kit/test/doc-blocks.test.ts` — 新增 inline code block 测试用例
  - feishu-flow-kit main @ 16fd59c 已推送到 GitHub
- 遇到的问题：无
- 下一步部署：
  - feishu-flow-kit v1.0.3 draft release Publish（需你 GitHub UI）：https://github.com/learner20230724/feishu-flow-kit/releases
  - feishu-flow-kit NPM_TOKEN secret（Settings → Secrets → Actions）→ 启用 @feishu/plugin-template npm 发布
  - llm-chat-lab v1.3.0 GitHub Release（手动）：https://github.com/learner20230724/llm-chat-lab/releases/new
  - room-measure-kit v0.1.2 GitHub Release（手动）：https://github.com/learner20230724/room-measure-kit/releases/new
- 是否需要你介入：是（上述 4 项均需 GitHub UI 操作，无自动化路径）

## 2026-04-06 07:27 UTC
- 当前主线：`feishu-flow-kit`（main @ ddd2905 🆕，v1.0.3 tag ✅）+ `llm-chat-lab` v1.3.0（8e886e8 ✅）+ `room-measure-kit` v0.1.2（b50eb04 ✅）
- 本次完成：修复 doc-blocks.test.ts 中的错误断言 + 新增 4 个 block-type 测试——
  (1) 发现问题：uncommitted 测试（working directory 有 120 行未提交 diff）中的 inline-code 断言错误：期望 `'Configure \`.env\`'` 但实际 `parseInlineSpans` 会正确地剥离 inline code 的 backticks，返回 `'Configure .env'`
  (2) 根因：parseInlineSpans 函数的 inline code 处理逻辑（match[1].slice(1,-1)）会剥离 backticks，join 后得到不含 backticks 的字符串
  (3) 修复：将期望值改为 `'Configure .env'`，并修正注释说明
  (4) 同时新增 4 个 block-type 测试：ordered list / fenced code / quote / divider，以及 1 个 mixed-content 集成测试
  (5) `npm run check` ✅ / `npm test` 106/106 ✅（之前 105 pass / 1 fail）
  (6) 提交 ddd2905 → 推送到 origin/main ✅
- 产出文件/结果：
  - `feishu-flow-kit/test/doc-blocks.test.ts` — 修正断言 + 5 个新测试用例
  - feishu-flow-kit main @ ddd2905 已推送到 GitHub
- 遇到的问题：无
- 下一步部署：
  - feishu-flow-kit v1.0.3 draft release（需 GitHub UI Publish）：https://github.com/learner20230724/feishu-flow-kit/releases
  - feishu-flow-kit NPM_TOKEN secret 设置（Settings → Secrets → Actions）→ 启用 @feishu/plugin-template npm 发布
  - llm-chat-lab v1.3.0 GitHub Release（手动）：https://github.com/learner20230724/llm-chat-lab/releases/new
  - room-measure-kit v0.1.2 GitHub Release（手动）：https://github.com/learner20230724/room-measure-kit/releases/new
- 是否需要你介入：是（上述 4 项均需 GitHub UI 操作，无自动化路径）

## 2026-04-06 06:42 UTC
- 当前主线：`feishu-flow-kit`（main @ fd00bb5 🆕，v1.0.3 tag ✅）+ `llm-chat-lab` v1.3.0（8e886e8 ✅）+ `room-measure-kit` v0.1.2（b50eb04 ✅，位于 `publish/room-measure-kit/`）
- 本次完成：修复 create-plugin.mjs 脚手架 bug — 
  (1) 原问题：`replaceAll('template', name)` 无差别替换所有 'template' 字符串，包括 Feishu card header 中的 `template: 'green'`（无引号包裹），导致生成的插件产生非法 JS 对象键如 `test-plugin: 'green'`
  (2) 修复方案：改为只替换带引号的 `'template'` / `"template"`（覆盖 name 字段和 register() 调用），保留无引号的 `template` 在示例代码中
  (3) 验证：scaffolder 创建 hello-world 插件，`name: 'hello-world'` ✓ 和 `template: 'green'` ✓ 均正确
  (4) `npx tsc --noEmit` 无错误；提交 fd00bb5 → 推送到 origin/main ✅；清理 test scaffold，提交 09fc635
- 产出文件/结果：
  - `feishu-flow-kit/scripts/create-plugin.mjs` — 替换策略从全局 replaceAll 改为精准 quoted-only 替换
  - feishu-flow-kit main @ fd00bb5 已推送到 GitHub
- 遇到的问题：无
- 下一步部署：
  - feishu-flow-kit v1.0.3 draft release（需 GitHub UI Publish）：https://github.com/learner20230724/feishu-flow-kit/releases
  - feishu-flow-kit NPM_TOKEN secret 设置（Settings → Secrets → Actions）→ 启用 @feishu/plugin-template npm 发布
  - llm-chat-lab v1.3.0 GitHub Release（手动）：https://github.com/learner20230724/llm-chat-lab/releases/new
  - room-measure-kit v0.1.2 GitHub Release（手动）：https://github.com/learner20230724/room-measure-kit/releases/new
- 是否需要你介入：是（上述 4 项均需 GitHub UI 操作，无自动化路径）

## 2026-04-06 06:12 UTC
- 当前主线：`feishu-flow-kit`（main @ c63211d 🆕，v1.0.3 tag ✅）+ `llm-chat-lab` v1.3.0（8e886e8 ✅）+ `room-measure-kit` v0.1.2（b50eb04 ✅，位于 `publish/room-measure-kit/`）
- 本次完成：新增 `docs/DEMO.md` — 完整的 feishu-flow-kit 演示指南——
  (1) 记录了 `npm run demo` 的 8 个步骤详解（Prerequisites / Quick Start / Server Startup / Webhook Event / Processing Pipeline / Feishu Card Response / Available Commands / Architecture Overview）
  (2) 包含 ASCII 格式的 Server startup 输出、Feishu card 响应示例、Architecture 流程图
  (3) 说明了 TTY 动画模式 vs 非 TTY 静态模式的区别
  (4) 提供了静态 demo（CI/CI 环境）输出示例
  (5) 提交 c63211d → 已推送到 origin/main ✅
- 产出文件/结果：
  - `feishu-flow-kit/docs/DEMO.md`（新建，148 行，4.9KB）
  - feishu-flow-kit main @ c63211d 已推送到 GitHub
- 遇到的问题：无
- 下一步部署：
  - feishu-flow-kit v1.0.3 draft release（需 GitHub UI Publish）：https://github.com/learner20230724/feishu-flow-kit/releases
  - feishu-flow-kit NPM_TOKEN secret 设置（Settings → Secrets → Actions）→ 启用 @feishu/plugin-template npm 发布
  - llm-chat-lab v1.3.0 GitHub Release（手动）：https://github.com/learner20230724/llm-chat-lab/releases/new
  - room-measure-kit v0.1.2 GitHub Release（手动）：https://github.com/learner20230724/room-measure-kit/releases/new
- 是否需要你介入：是（上述 4 项均需 GitHub UI 操作，无自动化路径）

## 2026-04-06 05:57 UTC
- 当前主线：`feishu-flow-kit`（main @ 97a53ed ✅，v1.0.3 tag 推送）+ `llm-chat-lab` v1.3.0（8e886e8 ✅）+ `room-measure-kit` v0.1.2（b50eb04 ✅，位于 `publish/room-measure-kit/`）
- 本次完成：全项目健康检查——
  (1) `feishu-flow-kit` — `npm run build` ✅ / `npm run check` ✅ / `npm test` 101/101 ✅ / `npm run demo:plugins` ✅（8 步骤全通过）
  (2) `publish/room-measure-kit` — `npm run build` ✅（1.41s，chunk size warning 可忽略）/ `npm test` 9/9 ✅
  (3) 确认 `room-measure-kit` 实际位于 `workspace/publish/room-measure-kit/`，非根目录缺失（之前日志"目录不存在"系路径理解有误）
- 产出文件/结果：
  - feishu-flow-kit 全套验证通过（build + check + 101 tests + demo）
  - room-measure-kit build + 9 tests 通过
- 遇到的问题：无
- 下一步部署：
  - feishu-flow-kit v1.0.3 release-publish.yml 理论上在 tag push 时自动发布（需 GitHub UI 确认）
  - feishu-flow-kit NPM_TOKEN secret（Settings → Secrets → Actions）→ 启用 @feishu/plugin-template npm 发布
  - llm-chat-lab v1.3.0 GitHub Release（手动）：https://github.com/learner20230724/llm-chat-lab/releases/new
  - room-measure-kit v0.1.2 GitHub Release（手动）：https://github.com/learner20230724/room-measure-kit/releases/new
- 是否需要你介入：是（上述 4 项均需 GitHub UI 操作）

## 2026-04-06 05:42 UTC
- 当前主线：`feishu-flow-kit`（main @ 97a53ed ✅ `npm run demo` + `demo:plugins` 脚本修复，v1.0.3 tag 已推送待 Publish）+ `llm-chat-lab` v1.3.0（8e886e8 ✅，GitHub Release 待手动）+ `room-measure-kit`（目录不存在，需确认）
- 本次完成：修复 README 文档与 package.json 不匹配问题——
  (1) README 声称 `npm run demo` 和 `npm run demo:plugins` 可用，但 package.json 缺少对应 script 条目
  (2) 添加 `"demo": "node scripts/demo-interactive.mjs"` 和 `"demo:plugins": "node scripts/demo-interactive.mjs --speed fast"` 到 package.json
  (3) 验证 `npm run demo -- --speed fast` ✅ / `npm run check` ✅
  (4) 提交 97a53ed → 推送到 origin/main ✅
- 产出文件/结果：
  - `feishu-flow-kit/package.json` — 新增 demo + demo:plugins npm scripts
  - feishu-flow-kit main @ 97a53ed 已推送到 GitHub
- 遇到的问题：无
- 下一步部署：
  - feishu-flow-kit v1.0.3 draft release 已在 tag v1.0.3 push 时由 release-draft.yml 创建（tag 800d579 → 比当前 main 329cc0e 早一个 commit）；release-publish.yml 应已在 tag push 时自动发布；需确认 GitHub：https://github.com/learner20230724/feishu-flow-kit/releases
  - feishu-flow-kit NPM_TOKEN secret 设置（Settings → Secrets → Actions）以启用 @feishu/plugin-template npm 发布
  - llm-chat-lab v1.3.0 GitHub Release（需手动）：https://github.com/learner20230724/llm-chat-lab/releases/new
- 是否需要你介入：是（NPM_TOKEN secret + llm-chat-lab release）

## 2026-04-06 05:27 UTC
- 当前主线：`feishu-flow-kit`（main @ 329cc0e ✅ 新增 VS Code 配置，v1.0.3 draft release 待 Publish）+ `llm-chat-lab` v1.3.0（8e886e8 ✅，GitHub Release 待手动）+ `room-measure-kit` v0.1.2（b50eb04 ✅，GitHub Release 待手动）
- 本次完成：添加 VS Code 配置 + .editorconfig 改进开发体验——
  (1) `.vscode/extensions.json` — 推荐 ESLint、Prettier、Error Lens、VS Code Test Runner、TypeScript Nightly 扩展
  (2) `.vscode/settings.json` — format-on-save、workspace TSdk、严格 TS 设置
  (3) `.vscode/launch.json` — 3 个调试配置：dev server、current test file、mock event
  (4) `.editorconfig` — 统一字符集、EOL、缩进风格（所有编辑器）
  (5) `npm run check` ✅ `tsc --noEmit` 无错误；`npm test` 101/101 pass ✅
  (6) 提交 329cc0e → 推送到 origin/main ✅
- 产出文件/结果：
  - `feishu-flow-kit/.editorconfig` (新建)
  - `feishu-flow-kit/.vscode/extensions.json` (新建)
  - `feishu-flow-kit/.vscode/settings.json` (新建)
  - `feishu-flow-kit/.vscode/launch.json` (新建)
  - feishu-flow-kit main @ 329cc0e 已推送到 GitHub
- 遇到的问题：无
- 下一步部署：
  - feishu-flow-kit v1.0.3 draft release Publish（需你 GitHub UI）：https://github.com/learner20230724/feishu-flow-kit/releases
  - llm-chat-lab v1.3.0 GitHub Release（需你手动）：https://github.com/learner20230724/llm-chat-lab/releases/new
  - room-measure-kit v0.1.2 GitHub Release（需你手动）：https://github.com/learner20230724/room-measure-kit/releases/new
  - feishu-flow-kit NPM_TOKEN secret 设置（Settings → Secrets → Actions）以启用 @feishu/plugin-template npm 发布
- 是否需要你介入：是（上述 4 项均需你在 GitHub UI 操作，无自动化路径）
