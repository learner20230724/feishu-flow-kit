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
- [x] retry helper (implemented in M6.4 — `src/core/retry.ts` with exponential backoff)
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
M5 is complete. M6 is fully done (M6.1–M6.8 all checked). feishu-flow-kit v1.0.2 is the current release, with GHCR Docker publish workflow verified working. Developer guide (M6.7) and multi-tenant guide (M6.8) cover all production patterns.

**Plugin system** (`src/core/plugin-system.ts`, `docs/plugin-system.md`) was implemented as a v1.0.2 enhancement — allows adding new slash commands via `FEISHU_PLUGINS` env var with zero core code changes. Reference plugins in `plugins/` (`/ping`, `/poll`).

No blocking roadmap items. Optional future directions: real Feishu workspace E2E testing (needs credentials), or multi-tenant real-world usage patterns.

---

## M6 — Production hardening & v1.0 launch pad

> **Goal:** Close the gap between "working starter kit" and "deployable v1.0 project" — covering deployment, CI, internationalization, and error-resilience.

### M6.1 — Deployment guide
- [x] Docker image (`Dockerfile`) with multi-stage build
- [x] `docker-compose.yml` for local full-stack mock
- [x] VPS/deployment how-to (Railway / Render / fly.io / manual Ubuntu) — see docs/deployment.md
- [x] Health-check endpoint (`GET /healthz`) — done
- [x] Environment-variable validation on startup (fail-fast with clear messages) — done
- [x] Developer guide (EN + ZH): architecture overview, adding slash commands, adapter patterns, retry/resilience, testing, project structure, Docker reference — see docs/developer-guide.md
- [x] Docker image (`Dockerfile`) with multi-stage build
- [x] `docker-compose.yml` for local full-stack mock
- [x] VPS/deployment how-to (Railway / Render / fly.io / manual Ubuntu) — see docs/deployment.md
- [x] Health-check endpoint (`GET /healthz`) — done
- [x] Environment-variable validation on startup (fail-fast with clear messages) — done

### M6.2 — GitHub Actions CI
- [x] `test.yml` — run `npm test` + `npm run typecheck` on every PR and push to `main`
- [x] `lint.yml` — run ESLint (if configured), otherwise skip
- [x] Test matrix: Node 20 + 22

### M6.3 — Internationalization (i18n)
- [x] Extract all user-facing reply strings into `src/i18n/en.ts` and `src/i18n/zh.ts`
- [x] Bot reply language follows `event.source.language` when available, falls back to EN
- [x] README / docs already bilingual — keep in sync with new strings

### M6.4 — Error resilience & observability
- [x] Structured logger ( Pino or `console.log` JSON mode in production)
- [x] Per-API retry with exponential back-off (separate from existing retry helper — make it webhook-request-aware)
- [x] Sentry / error-tracking config stub for easy opt-in
- [x] `GET /status` endpoint: uptime, env-mode flags, last event timestamp

### M6.5 — v1.0 release checklist
- [x] Bump `package.json` version to `1.0.0`
- [x] Write `CHANGELOG.md` v1.0.0 entry
- [x] Create GitHub Release with full asset list
- [x] Update repo description + topics on GitHub
- [x] Verify all README links and screenshots are current

### M6.7 — Developer guide (EN + ZH)
- [x] Architecture overview and request flow diagram
- [x] How to add a new slash command (4-step walkthrough with code examples)
- [x] Adapter pattern: draft builders / maybe adapters / request adapters
- [x] Retry & resilience: withRetry usage + Feishu error codes
- [x] Configuration and feature flag patterns
- [x] Testing guide: loadMockMessageEvent, vi.mock, coverage
- [x] Full project structure reference
- [x] Docker usage quick reference
- [x] Multi-tenant support: single-app vs multi-tenant mode, FEISHU_TENANTS format, tenant routing, per-tenant overrides, runtime tenant addition

### M6.8 — Multi-tenant deployment guide
- [x] Multi-tenant section in deploy/README.md (Docker Compose stack, FEISHU_TENANTS example)
- [x] Multi-tenant example in deploy/.env.production.example

### M6.6 — GHCR Docker publish workflow (post-v1.0.0 fixes)
- [x] Full rewrite of `.github/workflows/publish.yml` — fix YAML parsing of `}}`, permissions, checkout/buildx steps, digest output
- [x] Switch to manual `docker login` via `GITHUB_TOKEN` for reliable GHCR authentication
- [x] Docker documentation: multi-stage Dockerfile, `docker-compose.yml` with healthcheck, deployment guide (Railway/Render/fly.io/Ubuntu), Docker usage section in README (EN/ZH)
- [x] v1.0.1 patch release with CHANGELOG entry

### Notes
- M6 is designed to be parallelizable where possible (e.g. Docker and CI can be done independently)
- No new user-facing features — only hardening and DX improvements
- Target: v1.0 should be "deploy to Railway in 10 minutes" capable
