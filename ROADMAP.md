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
M5 is now complete (all items checked). The `/table` schema handoff system covers draft-first workflow, config-backed field mapping, CLI validation, and select-option override assets. The next step is to define M6 or shift to a polish/maintenance posture before a v1.0 release.
