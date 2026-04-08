# Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.

## Rotating Standing Tasks (execute one per heartbeat, cycle through)

1. **CHANGELOG.md accuracy** — verify latest version entry matches git log since last tag; check for missing or duplicate entries.
2. **API reference docs check** — verify docs/api-reference.md exports match actual src/ public API (run tsc and check exports).
3. **Test coverage review** — run coverage report; flag any files <80% coverage.
4. **TODO/FIXME review** — grep src/ for TODO/FIXME/XXX; assess if any are quick wins or bugs.
5. **Plugin example completeness** — verify plugins/examples/ has all required files; check plugin-template dist completeness.
6. **Dependency health** — npm outdated, npm audit (feishu-flow-kit + llm-chat-lab).
7. **room-measure-kit clone** — attempt clone of room-measure-kit (0edff83) and run health check.
8. **Postman collection accuracy** — verify all entries in docs/postman-collection.json match actual server routes (GET/POST methods, URL paths, request body formats). At 13:12 UTC found GET /webhook was wrong (server returns 405 for GET) — actual is POST with JSON body.

> NPM_TOKEN secret needed for @feishu/plugin-template npm publish. No code/deployment work possible without it.
> Link: https://github.com/learner20230724/feishu-flow-kit/settings/secrets/actions
