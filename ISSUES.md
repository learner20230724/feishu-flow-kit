# Issue backlog for feishu-flow-kit

## Foundation

### 1. Bootstrap a minimal TypeScript workspace
Set up the smallest maintainable project structure with `src/`, `examples/`, and basic scripts.

### 2. Add strict config loading
Load environment variables and config files with validation and actionable error messages.

### 3. Define core Feishu event types
Create small internal event shapes for message events, document actions, and future table triggers.

### 4. Add a logger utility
Provide plain structured logs for local development and debugging.

### 5. Add a retry helper
Implement a tiny retry wrapper with backoff for network-bound Feishu operations.

## Developer Experience

### 6. Build mock mode for local testing
Allow running example workflows without real Feishu credentials.

### 7. Add a sample env file and setup notes
Document required variables, optional settings, and common setup mistakes.

### 8. Add npm scripts for dev, build, and test
Keep the repo easy to run locally from day one.

## Example Workflows

### 9. Example: bot command to markdown output
Parse a simple command and write a markdown result locally.

### 10. Example: message event handler
Show how an inbound event is normalized and routed into workflow logic.

### 11. Example: docs or table automation stub
Add one realistic placeholder example for future Feishu document/table workflows.

## Documentation

### 12. Write an honest README
Explain what the kit helps with, what it does not do, and why it exists.

### 13. Write README.zh-CN.md
Keep Chinese docs aligned with the English README, not as an afterthought.

### 14. Add an architecture overview
Use one diagram or compact doc to show how config, adapters, workflows, and examples fit together.

### 15. Add a workflow gallery section
Collect a few practical Feishu workflow ideas users can understand at a glance.

## Packaging

### 16. Prepare release checklist
List the minimum bar before the repo is published or tagged.

### 17. Add contribution guidance
Keep contribution rules lightweight but explicit.

### 18. Add a screenshot / demo asset plan
Decide which screenshots, diagrams, or GIFs best explain the repo quickly.
