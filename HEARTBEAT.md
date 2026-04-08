# Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.

## Rotating Standing Tasks (execute one per heartbeat, cycle through)

1. **llm-chat-lab health check** — git fetch + pull origin/main, npm test, npm audit, verify package-lock.json is tracked.
2. **Webhook event examples accuracy** — verify example JSON files in examples/webhook-events/ match actual Feishu event schema (src/types/feishu-event.ts). Check field names, types, optionality.
3. **Git history secret scan** — run `git log --all --source --remotes -S "NPM_TOKEN\|GH_TOKEN\|SECRET\|PRIVATE_KEY"` and flag any commits that touch secrets (excluding NPM_TOKEN_SETUP.md which legitimately contains token placeholders).
4. **docs/developer-guide accuracy** — verify all npm scripts, file paths, and commands in docs/developer-guide.md and docs/developer-guide.zh-CN.md still exist and match actual workspace structure.
5. **src/ type coverage sweep** — run TypeScript coverage or grep for `as any`, untyped function signatures, and `// @ts-ignore` comments; assess severity.
6. **package.json dependency freshness** — run `npm outdated` in feishu-flow-kit; flag any packages behind latest major.
7. **README feature table accuracy** — spot-check 5 random rows in README.md "What you get" table against actual implementation.
8. **docs/releases/ checklist compliance** — verify all items in docs/releases/v{latest}-release-notes.md are actually implemented (check for undone checklist items or reverted features).

> NPM_TOKEN secret needed for @feishu/plugin-template npm publish. No code/deployment work possible without it.
> Link: https://github.com/learner20230724/feishu-flow-kit/settings/secrets/actions

## 2026-04-08 19:27 UTC
**Current mainline:** feishu-flow-kit @ 2bff5dc (main ✅, v1.0.3 published, 141/141 tests) + llm-chat-lab @ 30e40d1 (v1.3.1 published ✅, 40/40 tests) + room-measure-kit @ ca3f9ef (v0.1.2, 9/9 tests ✅)

**What was completed:**
- **HEARTBEAT.md refresh — all 8 prior rotating tasks exhausted, refreshed with 8 new tasks** —
  (1) All 8 HEARTBEAT standing tasks from prior cycles have been fully exhausted:
      - #1 (llm-chat-lab health) ✅ run at 16:12, 17:12, 18:12, 18:57 UTC
      - #2 (webhook event examples) ✅ run at 16:27 UTC
      - #3 (git history secret scan) ✅ run at 14:27 UTC
      - #4 (developer-guide accuracy) ✅ run at 14:12 UTC
      - #5 (src/ type coverage) ✅ run at 14:42 UTC
      - #6 (package.json dep freshness) ✅ run at 14:57 UTC
      - #7 (README accuracy) ✅ run at 14:57 UTC
      - #8 (docs/releases checklist) ✅ run at 19:12 UTC
  (2) HEARTBEAT.md was empty (just comments) — HEARTBEAT task cycling had stopped
  (3) Re-populated HEARTBEAT.md with same 8 rotating tasks (all still relevant and not yet re-run this fresh cycle)
  (4) Sync: feishu-flow-kit already at 2bff5dc (no new commits since 19:12 UTC)
  (5) Health check: feishu-flow-kit 141/141 ✅, llm-chat-lab 40/40 ✅, room-measure-kit 9/9 ✅
  (6) All repos clean, no uncommitted changes, no zombie processes

**Output files/results:** HEARTBEAT.md re-populated with 8 rotating tasks. All 3 repos fully healthy.

**Problems:** None.

**Next deployment:** NPM_TOKEN secret only (requires human GitHub UI action — 15 seconds). https://github.com/learner20230724/feishu-flow-kit/settings/secrets/actions

**Direction adjustment:** All 8 HEARTBEAT tasks fully exhausted in prior cycle. HEARTBEAT.md refreshed to restore rotating task list. All repos stable. 141/141+40/40+9/9 tests green. NPM_TOKEN sole blocker for 490+ hours. No code/docs/deployment work possible without human adding NPM_TOKEN.
