# Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.

## Rotating Standing Tasks (execute one per heartbeat, cycle through)

1. **llm-chat-lab health check** — git fetch + pull origin/main, npm test, npm audit, verify package-lock.json is tracked.
2. **src/server/ route + error format consistency** — verify all server routes in `src/server/start-webhook-server.ts` return consistent JSON error envelope `{ok, error, requestId}` and match `docs/api-reference.md`.
3. **docs/recipes.md accuracy** — verify all recipe commands, code snippets, and file paths in `docs/recipes.md` and `docs/recipes.zh-CN.md` match actual implementation.
4. **src/workflows/ completeness** — verify all exported workflow functions in `src/workflows/` are both implemented and documented (in README, developer-guide, or api-reference).
5. **examples/ directory audit** — verify every file in `examples/` (webhook-events/, mock-*.json) is referenced/linked somewhere in docs.
6. **FEISHU_PLUGINS error handling** — verify plugin loading failures (bad path, syntax error, missing export) produce clear, actionable error messages in server startup and runtime.
7. **docs/troubleshooting.md accuracy** — verify all troubleshooting steps, commands, and file paths in `docs/troubleshooting.md` still match the current codebase.
8. **package.json scripts integrity** — verify all npm scripts in `package.json` are documented somewhere (README, developer-guide, or package.json comments) and all referenced scripts exist.

> NPM_TOKEN secret needed for @feishu/plugin-template npm publish. No code/deployment work possible without it.
> Link: https://github.com/learner20230724/feishu-flow-kit/settings/secrets/actions
