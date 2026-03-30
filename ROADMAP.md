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
- [x] retry helper
- [x] event type definitions
- [x] example handler

### M3 — Demo workflows
- [x] message event demo
- [x] docs automation demo (`/doc` → create doc + starter block append)
- [x] inline markdown span support (bold, italic, code, strikethrough, link)
- [ ] table automation demo
- [x] local mock event runner

### M4 — Packaging
- [x] demo SVG diagram
- [x] CHANGELOG.md
- [x] issue list
- [x] release checklist
- [x] GitHub repo metadata (description, keywords, repository URL)

### M5 — Next increment (pick one)
- [ ] table / bitable slash-command workflow
- [ ] richer inline doc formatting (nested styles, auto-link)
- [ ] DX polish (CLI dry-run flag, better error messages)

## Current next step
Push standalone repo to GitHub (`learner20230724/feishu-flow-kit`) and open M5 milestone.
