# Release checklist

Use this before publishing `feishu-flow-kit` as a public repo or cutting a visible snapshot tag.

Last verified locally: 2026-03-29 22:06 UTC.

## 1. Repo hygiene

- [x] `git status` is clean inside the standalone repo
- [x] no workspace-only files leaked into the repo snapshot
- [x] `node_modules/`, local `.env`, and temporary outputs are ignored
- [x] license file is present
- [x] package name and description still match the current scope

## 2. README surface

- [x] `README.md` matches the current code paths and limitations
- [x] `README.zh-CN.md` is aligned with the English README for current features
- [x] quickstart commands were re-run recently
- [x] roadmap items reflect what is actually done
- [x] at least one demo asset is ready if screenshots / diagrams are promised (`docs/demo-webhook-doc-flow.svg`)

## 3. Setup and examples

- [x] `.env.example` matches the real config loader
- [x] mock event examples still run
- [x] setup guide covers the current webhook and `/doc` paths
- [x] setup guide still explains current token-cache and signature-check limits honestly

## 4. Quality bar

- [x] `npm install` works from a clean clone
- [x] `npm run check`
- [x] `npm test`
- [x] no knowingly broken demo path remains in docs

## 5. Public-facing sanity check

- [x] repo title and short description are readable to someone outside the current context
- [x] no fake maturity signals, inflated claims, or internal-only wording remain
- [x] open issues / roadmap still point to believable next steps
- [x] first screen of the README tells people what the repo does in under 30 seconds

## 6. Optional but recommended before posting

- [x] add a screenshot, terminal capture, or small diagram for the webhook / workflow path
- [x] prepare one short GitHub post / changelog sentence explaining what is already runnable
- [ ] decide whether the next visible milestone is richer inline doc formatting, table automation, or DX polish

## Current release blockers to watch

There are no known local release blockers inside the standalone repo right now.

The remaining decision is product-facing rather than technical:

- pick the next visible milestone after first publish: richer inline doc formatting, table / bitable automation, or DX polish
- choose when to push the standalone repo to GitHub and what short launch copy to use
