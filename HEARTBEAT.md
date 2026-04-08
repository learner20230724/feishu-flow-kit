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
