# M5 plan — table / bitable slash-command workflow

This document fixes the next visible milestone after first publish: add a small but real table / bitable automation path.

## Why this one

`/doc` is already good enough for a first public version.

The next increment should expand the repo into another Feishu-native workflow surface instead of only polishing markdown edge cases. A table / bitable path does that better because it:

- shows the repo can grow beyond documents
- matches common Feishu internal-tool use cases
- gives a clearer story for automation + workflow demos
- is easier to explain publicly than deeper formatting work

## Scope for M5

Target: one minimal slash-command workflow that can draft and optionally send a table / bitable write operation.

Recommended first cut:

- add a new command such as `/table add backlog item`
- parse a compact payload into a typed internal action
- generate a draft request body for a Feishu table / bitable row create call
- keep the default path local-first and mockable
- make the real outbound write opt-in, like the current reply / doc paths
- add one example payload and tests around the adapter + workflow

## Non-goals for M5

Keep this milestone narrow.

Do not try to ship all of the following at once:

- full table schema management
- complex field-type coverage
- bidirectional sync
- production-grade retry / queueing / dedupe
- broad CRUD support
- UI layer or hosted dashboard

## Suggested command shape

A starter command should stay readable in chat.

Examples:

```text
/table add backlog item: improve webhook errors
/table add lead: ACME / warm intro / owner=alex
```

The parser can stay intentionally small in v0.2:

- command family: `/table`
- action: `add`
- remaining text: plain title or compact structured text

If the command shape proves awkward, a follow-up can add a stricter `key=value` format.

## Suggested implementation slices

1. add slash-command parsing coverage for `/table`
2. define a minimal internal workflow input type
3. add a request-draft adapter for one create-record path
4. add a mock example event for `/table`
5. add tests for parser, workflow, and request draft
6. document setup constraints and supported field assumptions

## Public-facing outcome

After M5, the repo story becomes simpler:

- inbound Feishu event
- slash command routing
- `/todo` for tiny action drafts
- `/doc` for document creation
- `/table` for structured record creation

That is a stronger public starter-kit shape than only improving `/doc` formatting details.

## Deferred after M5

Good follow-ups once the minimal table path exists:

- support explicit field mapping
- support bitable-specific examples
- add retry helper for network-bound writes
- improve error messages for common permission / field mismatch failures
- revisit richer inline doc formatting later if it still matters
