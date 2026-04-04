# Changelog

All notable changes to this project will be documented in this file.

This repo intentionally starts small: it aims to be a clean, local-first starter kit for practical Feishu automations (webhook/event handling + a few opinionated workflows).

## [1.0.3] — 2026-04-04

### Added

- **Plugin system** — fully extensible slash-command architecture with lifecycle hooks (`register`, `beforeProcess`, `handle`, `onCommandResult`, `afterProcess`), `PluginRegistry` for command-ownership collision prevention, and error isolation so plugin failures never crash webhooks; `loadPlugins()` reads `FEISHU_PLUGINS` env var
- **`@feishu/plugin-template` npm package** (`packages/plugin-template/`) — standalone `FeishuPlugin` type definitions, complete `/greeting` reference implementation, `createPlugin` factory, publishable as an npm package for custom plugin distribution
- **Plugin CLI scaffolder** (`scripts/create-plugin.mjs`) — `node scripts/create-plugin.mjs <name>` generates a full plugin from the template with automatic `FEISHU_PLUGINS` registration
- **Built-in plugins** — `/ping` (latency echo), `/poll` (interactive Feishu card with radio options), `/help` (dynamic command lister showing all registered commands)
- **Plugin documentation suite** — architecture guide, lifecycle hook reference, `/poll` card mockup, visual lifecycle diagram (`docs/assets/plugin-lifecycle-diagram.png`), CLI scaffolder walkthrough, complete `/remind` plugin step-by-step tutorial, and plugin command demo screenshot
- **Postman collection** (`docs/postman-collection.json`) — 10+ API call presets covering health, webhook endpoints, all message event types, and Feishu API auth; pre-request script auto-refreshes `tenant_access_token`
- **Sample webhook events** (`examples/webhook-events/`) — 10 realistic `im.message.receive_v1` JSON fixtures covering all built-in and plugin commands in P2P and group contexts, EN/ZH
- **Local webhook test script** (`scripts/test-webhook-local.sh`) — one-command or batch send to local server with `BASE_URL` override and server health-check
- **Setup verification script** (`scripts/verify-setup.mjs`) — checks env vars, config structure, plugin system, and optional server health; coloured output with masked secrets
- **Troubleshooting FAQ** (`docs/troubleshooting.md`) — 8 scenarios covering webhook, auth, docs, tables, Docker, plugins, ngrok, and debug tips; complements the existing API-error-pattern guide
- **Commands Reference Card** (`docs/commands-reference.md`) — complete reference for all built-in and plugin commands with format, parameters, response types, and full examples; env var quick-reference table
- **Production deploy stack** — `docker-compose.yml` with Traefik v3 + Let's Encrypt TLS, `deploy/README.md` with step-by-step setup, monitoring & observability guide, multi-tenant deployment docs (EN/ZH), and architecture SVG diagram
- **Release automation** (`.github/workflows/release-draft.yml`) — auto-generates draft GitHub Release on `v*.*.*` tags using CHANGELOG content, with prerelease detection and draft mode for maintainer review
- **Interactive ASCII demo** (`scripts/demo-interactive.mjs`) — self-running terminal animation showing server startup, webhook pipeline, command routing, and Feishu card response; three speed modes (`--speed=fast/slow`)
- **Features overview SVG** (`docs/assets/features-overview.svg`) — 2×4 card grid summarising all 8 major capabilities with colour-coded headers

### Changed

- **README** — added Plugin system section, "What you get" 16-item checklist table (EN/ZH), features overview SVG embed, Quick Start with architecture diagram, demo script links, and Docker port fix (→ 8787)
- **Developer guide** (`docs/developer-guide.md` + zh-CN) — full architecture overview, adding-slash-commands walkthrough, adapter three-layer pattern, retry/Sentry usage, monitoring commands
- **Package version** bumped to `1.0.3`

### Fixed

- `webhook-table-rich-response.json` fixture — added missing `loadedPlugins: []` and `tenantKey` fields
- `start-webhook-server.ts` — added defensive `?? []` guards for `config.tenants` in test scenarios
- Webhook handler tests — added `/fields` mock endpoint for schema-aware table tests

## [1.0.2] — 2026-04-04

### Fixed
- **GHCR Docker workflow two critical bugs** — (1) invalid `github.repository.toLowerCase()` expression replaced with valid `github.event.repository.name`; (2) missing `package.json` COPY directive in Dockerfile build stage caused ENOENT on `npm run build`; workflow now verified working with multi-platform linux/amd64+arm64 GHCR image published successfully

## [1.0.1] — 2026-04-04

### Fixed
- **GHCR Docker publish workflow** — full rewrite fixing YAML parsing, permissions, checkout/buildx steps, and digest output; switched to manual `docker login` using `GITHUB_TOKEN` for reliable GHCR authentication
- **Docker documentation** — `Dockerfile` multi-stage build instructions, `docker-compose.yml` with healthcheck, deployment guide (Railway/Render/fly.io/Ubuntu), and Docker usage section added to README (EN/ZH)

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
