# feishu-flow-kit

A local-first starter kit for building practical Feishu automations and AI workflows.

> English | [简体中文](./README.zh-CN.md)

## Why this exists

Most Feishu automation examples are either too narrow, too tied to one internal setup, or too heavy for people who just want to test a workflow quickly.

This project is a cleaner starting point:
- local-first
- easy to read
- useful without a lot of infrastructure
- ready to grow into real workflows

## What it is

`feishu-flow-kit` is a starter repository for building Feishu-centered tools such as:
- message-driven automations
- bot-triggered workflows
- Feishu document / table helpers
- lightweight AI-assisted internal tools
- local demos that can later be deployed properly

## MVP goals

- a small, understandable project structure
- typed config loading
- reusable Feishu event / message adapters
- basic structured logging
- one or two real example workflows
- no unnecessary platform ceremony

## Non-goals

- pretending to be a full platform SDK replacement
- hiding Feishu complexity behind too much abstraction
- forcing a server-heavy architecture for simple tasks

## Project structure

```text
.
  README.md
  README.zh-CN.md
  src/
    core/
    adapters/
    workflows/
    config/
    server/
    types/
  examples/
  docs/
```

## How it works

```
Feishu message event
        │
        ▼
┌───────────────────┐
│   POST /webhook   │  ← url_verification / im.message.receive_v1
│   (local server)  │
└────────┬──────────┘
         │ adapt raw payload
         ▼
┌───────────────────┐
│  slash-command    │  ← /todo ...  /doc ...
│     parser        │
└────────┬──────────┘
         │ route to workflow
    ┌────┴────┐
    ▼         ▼
 /todo      /doc
  flow       flow
    │         │
    │    create Feishu doc
    │    + append body blocks
    ▼         ▼
 draft reply JSON
  (+ optional outbound Feishu reply)
```

Everything above runs locally with mock events. Flip `FEISHU_ENABLE_OUTBOUND_REPLY=true` or `FEISHU_ENABLE_DOC_CREATE=true` to switch from draft mode to real Feishu API calls.

## Local demo

```bash
npm install
npm run dev
```

By default the project runs in mock mode and loads `examples/mock-message-event.json`. You can switch demo inputs with `FEISHU_MOCK_EVENT_PATH`, for example:

```bash
FEISHU_MOCK_EVENT_PATH=examples/mock-doc-message-event.json npm run dev
```

The current demo path is:

1. load typed config
2. read a mock Feishu message event
3. parse a slash command like `/todo ...` or `/doc ...`
4. run a minimal workflow
5. print a draft reply

Starter commands available right now:
- `/todo ship webhook adapter`
- `/doc weekly launch review`

Example mock inputs:
- `examples/mock-message-event.json` → `/todo` flow
- `examples/mock-doc-message-event.json` → `/doc` flow

This is intentionally small, but it proves the repo can move real input through a readable local pipeline.

## Current webhook slice

There is now a minimal local webhook path for Feishu message events.

Current scope:
- `GET /healthz` for quick local liveness checks
- `POST /webhook`
- handles `url_verification`
- accepts a minimal `im.message.receive_v1` payload
- adapts the raw callback into the repo's internal `message.received` event
- runs the existing demo workflow and returns draft reply data as JSON
- can optionally send a real Feishu text reply when `FEISHU_ENABLE_OUTBOUND_REPLY=true` and app credentials are present
- can optionally create a real Feishu doc from the `/doc` workflow when `FEISHU_ENABLE_DOC_CREATE=true` and app credentials are present
- after doc creation, can also append a small starter body as plain paragraph blocks so the new doc is not left empty
- rejects non-POST requests on `/webhook` with a clear `405` response
- optionally verifies `x-lark-request-timestamp` + `x-lark-signature` when `FEISHU_WEBHOOK_SECRET` is configured
- rejects signed requests outside a configurable replay window

Current limits:
- signature verification is still intentionally small and not meant to replace a production-grade security review
- outbound reply sending is intentionally opt-in and only covers the simplest text reply path right now
- doc creation is also intentionally small; after the initial `docx/v1/documents` create call it appends a starter body as plain paragraph blocks, but does not yet convert markdown into richer formatting (bold, headings, lists as native block types)
- token caching is currently only a tiny in-memory starter cache; there is still no refresh daemon, persistence layer, or concurrency dedupe
- only a narrow message payload is covered right now

That is enough for local debugging and repo-level structure validation, but it is still a starter implementation.

## Tests

```bash
npm run check
npm test
```

The current test set covers:
- slash command parsing
- demo message workflow behavior for `/todo` and `/doc`
- webhook payload adaptation
- webhook signature generation and validation
- outbound reply request draft generation
- minimal tenant token fetch + text reply sender flow
- minimal Feishu doc create request and starter block-append path for webhook `/doc` flow
- local HTTP behavior for `GET /healthz` and `POST /webhook`

## Example workflow ideas

Already runnable in the repo:
- `/todo ...` → turns a request into a small action-list draft
- `/doc ...` → turns a topic into a markdown-style outline, then can create a Feishu doc and append a minimal plain-paragraph body

Still good next candidates:
- sync selected Feishu content into a local markdown workspace
- trigger a small approval helper from structured chat commands

## Why local-first

For early-stage tools, local-first keeps iteration fast:
- less setup
- fewer moving parts
- easier debugging
- better fit for public examples

You can always add deployment pieces later.

## Roadmap

- [x] create minimal TypeScript project skeleton
- [x] define config schema
- [x] add a basic mock event runner
- [x] add a slash-command parsing example
- [x] add Feishu adapter interfaces for real webhook / bot payloads
- [x] add one more runnable workflow example
- [x] write setup guide with real constraints
- [x] add screenshots or demo diagrams

## Notes on writing and scope

This repo should stay practical. No inflated AI language, no fake product claims, no vague “agent” magic.

The goal is to make Feishu workflow experiments easier to start and easier to share.

## License

MIT. See [LICENSE](./LICENSE).
