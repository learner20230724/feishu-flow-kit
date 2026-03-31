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
- [x] logger
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
- [ ] richer inline doc formatting (nested styles, auto-link)
- [x] DX polish (mapping draft CLI now supports env output, file output, structured JSON review artifacts, documented input/sample variants, a raw Feishu field-list normalizer for schema handoff, and a fixture-backed handoff demo that shows raw response → normalized schema → mapping draft)

Notes:
- M5 plan doc: `docs/m5-table-workflow-plan.md`

## Current next step
Push standalone repo to GitHub (`learner20230724/feishu-flow-kit`) when credentials are available, then continue M5 by widening `/table` field mapping beyond text / single-select / user starter coverage.
