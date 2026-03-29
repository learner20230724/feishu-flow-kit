# Architecture overview

`feishu-flow-kit` is meant to stay small, local-first, and easy to extend.

## Design goals
- keep setup friction low
- make example workflows easy to read
- separate Feishu-specific concerns from workflow logic
- support local mock runs before real integration

## Suggested structure

```text
src/
  config/       # load and validate runtime config
  core/         # logger, retry, shared utilities
  adapters/     # normalize Feishu events / API calls
  workflows/    # task-focused workflow logic
  server/       # local HTTP entrypoints and webhook-specific guards
  types/        # internal event and config types
examples/       # runnable local examples and mock events
docs/           # setup notes and architecture docs
```

## Flow

1. Config is loaded from env or local files.
2. Adapters normalize inbound Feishu events into small internal shapes.
3. Workflows consume those normalized events.
4. Server helpers handle HTTP transport and webhook checks.
5. Shared helpers handle logging, retries, and common utilities.
6. Examples provide a low-risk way to run flows locally.

## Current runnable slice

The current demo already covers a minimal but real pipeline:

1. `src/config/load-config.ts` reads runtime config
2. `src/adapters/load-mock-message-event.ts` loads a typed mock event
3. `src/core/parse-slash-command.ts` extracts the command surface
4. `src/workflows/run-message-workflow.ts` generates a workflow result
5. for `/doc`, a starter doc create draft can also be produced alongside the markdown outline
6. if doc creation is enabled, a block-append step follows to populate the new doc with a minimal plain-paragraph body
7. `src/index.ts` logs the result and prints a local draft reply

That makes the repo more than a skeleton: it now has one end-to-end flow that can be inspected and extended.

## Why not hide everything behind one abstraction
Feishu integrations usually get messy when SDK calls, event shapes, and business logic are tightly coupled.

This repo should avoid that by keeping boundaries simple:
- adapters talk to Feishu payloads and outbound API shapes
- workflows decide what to do
- server code deals with HTTP and verification concerns
- core utilities stay generic

## Near-term extension points

- upgrade token caching beyond the current tiny in-memory starter cache
- append richer block content after the initial doc create request, instead of stopping at document creation
- add retry helpers once a real outbound API path exists
- widen payload support beyond the current narrow message event slice

## Current webhook path

The repo now has a minimal real webhook slice:

1. local HTTP server exposes `GET /healthz` for local liveness checks
2. `POST /webhook` handles Feishu `url_verification`
3. optional signature checks run when `FEISHU_WEBHOOK_SECRET` is configured
4. `im.message.receive_v1` payloads are adapted into `FeishuMessageEvent`
5. the existing message workflow runs on that normalized event
6. a draft reply plus a reply API request draft are returned as JSON for local inspection
7. when outbound reply is enabled, the same slice can fetch a tenant token and call the simplest text reply endpoint
8. when doc creation is enabled and the workflow is `/doc`, the same slice can call the Feishu doc create endpoint, append a minimal set of paragraph blocks, and return the created document metadata

This keeps the current implementation honest: it is useful enough to test the repo structure with real callback shapes, but still small enough to read in one sitting.

## Current test surface

The current automated checks cover:
- slash command parsing
- demo workflow behavior for `/todo` and `/doc`
- webhook payload adaptation
- webhook signature generation and verification
- outbound reply draft generation
- minimal tenant token fetch and text reply sending helpers
- minimal Feishu doc create request and starter block-append path for webhook `/doc` flow
- local server behavior for `/healthz` and `/webhook`

That gives the repo a meaningful starter-level safety net without turning it into a heavy framework.

## First runnable target
A minimal message event demo:
- read mock event JSON
- normalize it
- route it into a workflow
- write markdown-style output locally

That is enough to prove the repo structure without pretending to be a complete framework.
