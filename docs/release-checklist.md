# Release checklist

Use this before publishing `feishu-flow-kit` as a public repo or cutting a visible snapshot tag.

## 1. Repo hygiene

- [ ] `git status` is clean inside the standalone repo
- [ ] no workspace-only files leaked into the repo snapshot
- [ ] `node_modules/`, local `.env`, and temporary outputs are ignored
- [ ] license file is present
- [ ] package name and description still match the current scope

## 2. README surface

- [ ] `README.md` matches the current code paths and limitations
- [ ] `README.zh-CN.md` is aligned with the English README for current features
- [ ] quickstart commands were re-run recently
- [ ] roadmap items reflect what is actually done
- [x] at least one demo asset is ready if screenshots / diagrams are promised (docs/demo-webhook-doc-flow.svg)

## 3. Setup and examples

- [ ] `.env.example` matches the real config loader
- [ ] mock event examples still run
- [ ] setup guide covers the current webhook and `/doc` paths
- [ ] setup guide still explains current token-cache and signature-check limits honestly

## 4. Quality bar

- [ ] `npm install` works from a clean clone
- [ ] `npm run check`
- [ ] `npm test`
- [ ] no knowingly broken demo path remains in docs

## 5. Public-facing sanity check

- [ ] repo title and short description are readable to someone outside the current context
- [ ] no fake maturity signals, inflated claims, or internal-only wording remain
- [ ] open issues / roadmap still point to believable next steps
- [ ] first screen of the README tells people what the repo does in under 30 seconds

## 6. Optional but recommended before posting

- [ ] add a screenshot, terminal capture, or small diagram for the webhook / workflow path
- [ ] prepare one short GitHub post / changelog sentence explaining what is already runnable
- [ ] decide whether the next visible milestone is richer doc blocks, table automation, or DX polish

## Current release blockers to watch

At the moment, the main known publish gaps are:

- screenshots / demo diagrams are still missing
- release checklist was missing before this file was added
- the next milestone after publish is still a choice between richer `/doc` formatting and table / bitable automation
