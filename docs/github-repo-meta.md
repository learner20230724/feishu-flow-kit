# GitHub repo metadata

Use this when creating or updating the repo on GitHub.

## Repository name
`feishu-flow-kit`

## Short description (≤ 350 chars)
> Local-first starter kit for Feishu automations and AI workflows — webhook handler, slash-command router, `/doc` workflow with rich block support, mock event runner. TypeScript, zero runtime deps.

## Topics / tags
```
feishu lark automation typescript workflow webhook ai-workflow starter-kit
```

## Homepage
https://github.com/learner20230724/feishu-flow-kit#readme

## Social preview suggestion
Use `docs/demo-webhook-doc-flow.svg` as the repo's Open Graph image or pin it to the README hero.

## Launch copy (for first GitHub post / README tagline)
> feishu-flow-kit v0.1 — a local-first starter kit for building Feishu automations with TypeScript. Handles webhook events, routes slash commands, and creates Feishu docs with rich block content out of the box. Mock runner included so you can develop without a live bot.

## Suggested first release tag
`v0.1.0`

## Push checklist (one-time)
1. Create repo `learner20230724/feishu-flow-kit` on GitHub (public, no template, no auto README)
2. In `publish/feishu-flow-kit/`:
   ```
   # one-time
   git branch -M main
   git remote add origin https://github.com/learner20230724/feishu-flow-kit.git

   # push
   git push -u origin main
   ```
   Or use:
   ```
   ./scripts/publish-to-github.sh
   ```
3. On GitHub: set description + topics from above
4. Tag `v0.1.0` from the GitHub UI or:
   ```
   git tag v0.1.0
   git push origin v0.1.0
   ```
