# Changelog

All notable changes to this project will be documented in this file.

This repo intentionally starts small: it aims to be a clean, local-first starter kit for practical Feishu automations (webhook/event handling + a few opinionated workflows).

## Unreleased

### Planned
- More `/doc` workflow coverage (richer spans, more block types, better DX)
- A second workflow example (table / bitable automation)

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
