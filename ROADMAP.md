# feishu-flow-kit roadmap

## Goal
Build a clean starter kit for Feishu-centered automations and workflow tools that can be published as a practical GitHub repo.

## MVP
- Local config example
- Minimal Feishu event handler structure
- Logging helpers
- Retry helper
- One example workflow
- README in English + Chinese

## Milestones

### M1 — Repository skeleton
- [x] README.md
- [x] README.zh-CN.md
- [x] package.json
- [x] src/ directory
- [x] examples/ directory
- [x] docs/overview.md

### M2 — Minimal runtime
- [x] config loader
- [ ] retry helper
- [x] event type definitions
- [x] example handler

### M3 — Demo workflows
- [x] message event demo
- [x] docs automation demo (`/doc` → create doc + starter block append)
- [x] inline markdown span support (bold, italic, code, strikethrough, link)
- [x] table automation demo (`/table` → draft + opt-in create-record path)
- [x] local mock event runner

### M4 — Packaging
- [x] demo SVG diagram
- [x] CHANGELOG.md
- [x] issue list
- [x] release checklist
- [x] GitHub repo metadata (description, keywords, repository URL)

### M5 — Next increment (locked)
- [x] decide the next visible milestone
- [x] table / bitable slash-command workflow (**chosen**)
- [x] richer table field mapping (date / number / linked record)
- [x] richer inline doc formatting (nested styles, auto-link)
- [x] DX polish (mapping draft CLI now supports env output, file output, structured JSON review artifacts, documented input/sample variants, a raw Feishu field-list normalizer for schema handoff, baseline + advanced fixture-backed handoff demos that show raw response → normalized schema → mapping draft, and a dedicated verification script that re-checks both committed fixture chains)
- [x] select-option handoff assets (smaller rollout-facing review asset, standalone override sample, minimal override-shape verification, and release-facing review-image / snapshot docs)

Notes:
- M5 plan doc: `docs/m5-table-workflow-plan.md`
- Current M5 posture: `/table` is already useful as a draft-first starter path, and the repo now has a fuller schema-handoff surface for real-table review before enabling writes.

## Current next step
M5 is now complete (all items checked). The `/table` schema handoff system covers draft-first workflow, config-backed field mapping, CLI validation, and select-option override assets. M6 is drafted (see below). Current next step: M6.3 i18n (string extraction, bilingual reply) or M6.4 Error resilience (structured logger + retry). M6.1 and M6.2 are done.

---

## M6 — Production hardening & v1.0 launch pad

> **Goal:** Close the gap between "working starter kit" and "deployable v1.0 project" — covering deployment, CI, internationalization, and error-resilience.

### M6.1 — Deployment guide
- [x] Docker image (`Dockerfile`) with multi-stage build
- [x] `docker-compose.yml` for local full-stack mock
- [ ] VPS/deployment how-to (Railway / Render / fly.io / manual Ubuntu) — see docs/deployment.md
- [x] Health-check endpoint (`GET /healthz`) — done
- [x] Environment-variable validation on startup (fail-fast with clear messages) — done

### M6.2 — GitHub Actions CI
- [x] `test.yml` — run `npm test` + `npm run typecheck` on every PR and push to `main`
- [x] `lint.yml` — run ESLint (if configured), otherwise skip
- [x] Test matrix: Node 20 + 22

### M6.3 — Internationalization (i18n)
- [ ] Extract all user-facing reply strings into `src/i18n/en.ts` and `src/i18n/zh.ts`
- [ ] Bot reply language follows `event.source.language` when available, falls back to EN
- [ ] README / docs already bilingual — keep in sync with new strings

### M6.4 — Error resilience & observability
- [ ] Structured logger ( Pino or `console.log` JSON mode in production)
- [ ] Per-API retry with exponential back-off (separate from existing retry helper — make it webhook-request-aware)
- [ ] Sentry / error-tracking config stub for easy opt-in
- [ ] `GET /status` endpoint: uptime, env-mode flags, last event timestamp

### M6.5 — v1.0 release checklist
- [ ] Bump `package.json` version to `1.0.0`
- [ ] Write `CHANGELOG.md` v1.0.0 entry
- [ ] Create GitHub Release with full asset list
- [ ] Update repo description + topics on GitHub
- [ ] Verify all README links and screenshots are current

### Notes
- M6 is designed to be parallelizable where possible (e.g. Docker and CI can be done independently)
- No new user-facing features — only hardening and DX improvements
- Target: v1.0 should be "deploy to Railway in 10 minutes" capable
