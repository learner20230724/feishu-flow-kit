# Contributing

Thanks for looking at this. Contributions are welcome, but this is a small starter repo — the bar for what gets merged is "keeps things readable and local-first".

## What fits here

- Bug fixes and edge case corrections
- New slash-command workflows that follow the existing pattern
- Improvements to the inline doc block / adapter layer
- Better mock event examples
- Documentation fixes

## What probably doesn't fit

- Large framework abstractions
- Swapping the HTTP layer for a heavier alternative
- Anything that requires a live Feishu bot just to run tests

## Getting started

```bash
git clone https://github.com/learner20230724/feishu-flow-kit.git
cd feishu-flow-kit
npm install
npm run check   # TypeScript
npm test        # all tests
```

Copy `.env.example` to `.env` and fill in what you need. Most things work without real credentials because the project runs in mock mode by default.

## Workflow

1. Fork the repo and create a branch off `main`
2. Make your change
3. Run `npm run check && npm test` — both must pass
4. Open a pull request with a short description of what and why

## Code style

- TypeScript, strict mode, ESM
- No external runtime dependencies (dev deps are fine)
- Keep files small and names obvious
- If a new workflow needs a new adapter, put it in `src/adapters/`
- If it needs a new type, put it in `src/types/`

## Tests

Every meaningful change should come with a test. The existing test files in `test/` show the pattern — they use Node's built-in test runner (`node --test`) with no additional framework.

## Issues

Use GitHub Issues for bug reports and feature ideas. Keep them specific: what you expected, what happened, and a minimal reproduction if possible.

## License

By contributing, you agree your changes will be released under the MIT license.
