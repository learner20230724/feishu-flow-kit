# Heartbeat Log

## 2026-04-06 05:12 UTC
- 当前主线：`feishu-flow-kit`（main @ 9d26b72 ✅，v1.0.3 draft release 待 Publish）+ `llm-chat-lab` v1.3.0（8e886e8 ✅，GitHub Release 待手动创建）+ `room-measure-kit` v0.1.2（b50eb04 ✅，GitHub Release 待手动创建）
- 本次完成：修复 feishu-flow-kit weather/poll 插件无法编译运行的严重 bug——
  (1) 诊断：`plugins/examples/weather-plugin.ts` 和 `poll-plugin.ts` 从不存在的 `@feishu/rest-api` npm 包导入（404 Not Found），使用不存在的 `McpTool.onText/onCallback` API；`axios` 也不在 package.json dependencies 中
  (2) 根因：这些插件使用了与实际 `FeishuPlugin` 接口完全不同的 API 设计；`FeishuPlugin.handle()` 是同步的，不能在里面做 async HTTP 调用
  (3) 修复：重写 weather-plugin.ts — 移除 axios/@feishu/rest-api，改用同步 handle() 返回 wttr.in URL + 用法说明；在 README 注明 plugin handle 同步限制
  (4) 修复：重写 poll-plugin.ts — 移除 onCallback/api.updateMessage（需要 Feishu API client），改用 /poll \"/question\" opt1 opt2 + /vote N 子命令文本模式，内存 Map 存储
  (5) 更新 plugins/examples/README.md — 更新描述、usage、comparison table
  (6) TypeScript `tsc --noEmit` 无错误 ✅；workspace root `npm test` 101/101 pass ✅
  (7) 提交 67bf41c → rebase onto origin/main → 推送到 origin/main (9d26b72 ✅)
- 产出文件/结果：
  - `feishu-flow-kit/plugins/examples/weather-plugin.ts` (重写)
  - `feishu-flow-kit/plugins/examples/poll-plugin.ts` (重写)
  - `feishu-flow-kit/plugins/examples/README.md` (更新)
  - feishu-flow-kit main @ 9d26b72 已推送到 GitHub
- 遇到的问题：
  - `@feishu/rest-api` npm 包不存在；`FeishuPlugin.handle()` 同步限制导致插件内无法直接做 async HTTP
  - GitHub push rejection (远程有新 commit) → git pull --rebase 解决
- 下一步部署：
  - feishu-flow-kit v1.0.3 draft release Publish（需你 GitHub UI）：https://github.com/learner20230724/feishu-flow-kit/releases
  - llm-chat-lab v1.3.0 GitHub Release（需你手动）：https://github.com/learner20230724/llm-chat-lab/releases/new
  - room-measure-kit v0.1.2 GitHub Release（需你手动）：https://github.com/learner20230724/room-measure-kit/releases/new
  - feishu-flow-kit NPM_TOKEN secret 设置（Settings → Secrets → Actions）以启用 @feishu/plugin-template npm 发布
- 是否需要你介入：是（上述 4 项均需你在 GitHub UI 操作，无自动化路径）
