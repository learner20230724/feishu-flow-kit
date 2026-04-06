# feishu-flow-kit — Demo Guide

This guide shows how to run and understand the feishu-flow-kit demo.

## Quick demo (no credentials needed)

```bash
cd feishu-flow-kit
npm install
npm run demo        # animated TTY walkthrough (recommended)
npm run demo:plugins # same, faster
```

No Feishu app, no credentials, no network — the demo runs entirely in your terminal.

---

## What the demo shows

The demo walks through the complete message lifecycle in 8 steps:

### Step 1 — Prerequisites
Checks Node.js version, npm, `.env` presence, and ngrok availability.

### Step 2 — Quick Start (3 commands)
```
1. npm install              Install dependencies
2. cp .env.example .env     Configure credentials
3. npm start                 Launch webhook server
```

### Step 3 — Server startup
```
✓  Environment      → loaded (production)
✓  Port             → 8787
✓  ngrok            → https://abc123.ngrok.io → localhost:8787
✓  Plugins          → help, ping, poll  (3 loaded)
✓  Commands         → /doc, /table, /todo, /help, /ping, /poll
✓  i18n             → en, zh (auto-detect)
✓  Ready            ✓
```

### Step 4 — Webhook event received
Shows a real `im.message.receive_v1` payload being received at `POST /webhook`, including the slash command embedded in the message content:
```json
{ "event": { "type": "im.message.receive_v1",
  "message": { "content": "{\"text\":\"/doc Project Q3 plan\"}" } } }
```

### Step 5 — Command processing pipeline
Routes the command through 6 steps:
```
📥 webhook       → Parse webhook payload
🔀 router        → Route to /doc handler
📋 schema-fetch  → Fetch target doc schema
✂  content-parse → "Project Q3 plan" → doc title
📝 draft-build   → Build Feishu Doc draft
📤 reply         → Send card reply
```

### Step 6 — Feishu card response
Shows the interactive card that gets posted back to Feishu:
```
╔══════════════════════════════════════════════╗
║  📄 Doc Draft                                ║
╠══════════════════════════════════════════════╣
║   📌 Title:    Project Q3 Plan               ║
║   👤 Author:   Claw Bot                      ║
║   📅 Created:  Apr 4, 2026                   ║
╠══════════════════════════════════════════════╣
║   [ Open Doc Draft ]  [ View Stats ]         ║
╚══════════════════════════════════════════════╝
```

### Step 7 — Available commands
| Command              | Description                              | Tag      |
|----------------------|------------------------------------------|----------|
| `/doc <title>`       | Create a Feishu Doc draft with title + H1 + TOC | Built-in |
| `/table <name>`      | Create a Bitable table record (schema-aware) | Built-in |
| `/todo <item>`       | Add a todo item to the shared todo list | Built-in |
| `/help`              | List all available commands              | Built-in |
| `/greeting [name]`  | Greet a user with a card (doc or table mode) | Plugin |
| `/ping`              | Health check ping — replies with latency | Plugin  |
| `/poll "<question>"` | Create an interactive Feishu poll card  | Plugin  |

### Step 8 — Architecture overview
ASCII diagram showing the complete flow:
```
        ┌──────────────────────┐
        │    Feishu Cloud      │
        │  (events / messages) │
        └─────────┬────────────┘
                  │ POST /webhook
                  ▼
        ┌──────────────────────┐
        │  Webhook Server      │
        │  (Express / +TLS)    │
        │  • URL verification  │
        │  • Signature verify  │
        │  • i18n (en / zh)    │
        │  • Plugin registry   │
        └─────────┬────────────┘
                  │
     ┌────────────┼────────────┐
     ▼            ▼            ▼
   /doc         /table       /todo
     │            │            │
     ▼            ▼            ▼
 Feishu API   Bitable API   Reply Card
```

---

## Static demo (CI / non-TTY)

In CI or non-interactive environments, the script runs in "static mode" which prints the step summary without animation:

```
feishu-flow-kit interactive demo

✓ Prerequisites check
✓ Quick start (3 steps)
✓ Server startup (ngrok + plugin loading)
✓ Webhook event received (im.message.receive_v1)
✓ Command processing pipeline
✓ Feishu card response (Doc Draft preview)
✓ Available commands (/doc, /table, /todo, /help, /greeting, /ping, /poll)
✓ Architecture overview
```

Use `npm run demo` in a real terminal for the full animated experience.

---

## Running without Feishu credentials

All demo paths work without any credentials:
- Mock event files in `examples/`
- `FEISHU_MOCK_MODE=true` skips real API calls
- `npm run demo` uses mock data throughout

See [examples/README.md](examples/README.md) for all available mock event samples.

## Next steps

- [Quick Start](../README.md#quick-start) — run for real with a Feishu app
- [Setup Guide](./setup-guide.md) — full credential setup
- [Developer Guide](./developer-guide.md) — how to extend with plugins
