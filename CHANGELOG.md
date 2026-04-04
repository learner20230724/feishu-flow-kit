# Changelog

All notable changes to this project will be documented in this file.

This repo intentionally starts small: it aims to be a clean, local-first starter kit for practical Feishu automations (webhook/event handling + a few opinionated workflows).

## [1.0.1] — 2026-04-04

### Fixed
- **GHCR Docker publish workflow** — full rewrite fixing YAML parsing, permissions, checkout/buildx steps, and digest output; switched to manual `docker login` using `GITHUB_TOKEN` for reliable GHCR authentication
- **Docker documentation** — `Dockerfile` multi-stage build instructions, `docker-compose.yml` with healthcheck, deployment guide (Railway/Render/fly.io/Ubuntu), and Docker usage section added to README (EN/ZH)

## [1.0.2] — 2026-04-04

### Fixed
- **GHCR Docker workflow two critical bugs** — (1) invalid `github.repository.toLowerCase()` expression replaced with valid `github.event.repository.name`; (2) missing `package.json` COPY directive in Dockerfile build stage caused ENOENT on `npm run build`; workflow now verified working with multi-platform linux/amd64+arm64 GHCR image published successfully

## Unreleased

### Added
- See `## [1.0.0]` below for the v1.0 release contents

## [1.0.0] — 2026-04-04

### Added
- **`/table` schema-aware workflow** — draft-first Bitable record creation with full field-type coverage (18 types: text, number, date, checkbox, multi-select, single-select, user, location, phone, URL, attachment, cascade, department, contact, link, and more)
- **`create-table-record-with-schema.ts` adapter** — fetches live Bitable table schema on every create call and maps draft field names to actual field IDs; all 10 starter fields now resolve via live schema
- **`table-mapping-config-preflight` system** — CLI validator, config preflight docs (EN/ZH), advanced env example, and test suite for schema-handoff workflow
- Schema handoff assets: mapping worksheet, demo scripts, raw field-list normalizer, fixture-backed verification chain, select-option override samples
- Smoke test script for real Bitable end-to-end validation
- Multi-stage Dockerfile + `docker-compose.yml` with healthcheck and fail-fast config validation
- GitHub Actions CI matrix (Node 20 + 22) and dedicated lint workflow
- Full i18n system (EN/ZH) — all user-facing reply strings extracted and language-aware
- Error resilience: exponential-backoff retry (`withRetry`), Sentry integration, `/status` debug endpoint with request-id tracing
- **`/doc` richer inline formatting** — underline spans, bare-URL auto-linking, adjacent styled-span merging
- Repo description, topics, and GitHub Release automation ready for v1.0 tagging

### Fixed
- Historical env var name typos (`FEISHU_ESTIMATE_FIELD_MODE` → `FEISHU_BITABLE_ESTIMATE_FIELD_MODE`, etc.) that caused field-mode env overrides to be silently ignored since v0.1.0
- `FakeError` test stub code for non-retryable error assertion

### Changed
- Package version bumped to `1.0.0`
- `npm run build` added (compiles TypeScript to `dist/`)

### Planned
- More `/doc` workflow coverage (richer spans, more block types, better DX)

## 0.1.0 — 2026-03-29

### Added
- Local-first Feishu webhook/event handler skeleton (TypeScript, ESM)
- Slash-command style routing for workflow entry points
- `/doc` workflow example: create a doc and append starter blocks
- Docx block builder with a starter set of block types
  - headings (h1/h2/h3)
  - paragraphs
  - bullet lists
  - todo items (with checked state)
- Minimal inline markdown span support for doc text
  - `**bold**`, `*italic*`, `` `code` ``
  - `~~strikethrough~~`
  - `[text](url)`
- Local mock event runner + examples
- Docs: overview, release checklist, GitHub launch blurb
- Demo asset: `docs/demo-webhook-doc-flow.svg`

### Notes
- The inline markdown parser is deliberately minimal and non-nested for now.
