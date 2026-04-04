# Commands Reference

> **Quick lookup** for all built-in slash commands and their usage. For plugin authoring, see [Plugin System](./plugin-system.md) and [Plugin Walkthrough](./plugin-example-walkthrough.md).

---

## Built-in Commands

### `/doc [outline]`
Creates a Feishu Doc draft from a text outline.

| Option | Description |
|--------|-------------|
| `[outline]` | Document content as plain text (blank = help text) |

**Response type:** Feishu card with "Open Draft" button linking to the created doc.

**Examples:**
```
/doc Project Roadmap: Phase 1 research, Phase 2 build, Phase 3 launch
```

---

### `/table [content]`
Creates a Feishu Bitable record with fields parsed from natural language.

| Option | Description |
|--------|-------------|
| `[content]` | Structured field data (blank = help card) |

**Supported field types:** Single-text, Number, Single-select, Multi-select, Date, User, Phone, URL, Email, Attachment, Lookup, Formula, Currency, Progress, Rating, Created-time, Modified-time, Creator, Last Modified, Auto-number

**Response type:** Feishu card with record preview and direct Bitable link.

**Examples:**
```
/table Task: Deploy v2, Owner: @Zhang Wei, Due: 2026-04-15, Status: In Progress
```
```
/table Name: Q1 Budget | Amount: 50000 | Category: Marketing | Status: Approved
```

**Tip:** Use `/table fields` to see the full list of supported field types and their syntax.

---

### `/todo [content]`
Creates a todo item in the default Bitable with owner, due date, estimate, and status.

| Option | Description |
|--------|-------------|
| `[content]` | Task description (blank = help card) |

**Response type:** Feishu card with checkbox, task title, owner mention, and due date.

**Examples:**
```
/todo Review pull request #42 by tomorrow
```
```
/todo Send invoice to Acme Corp due Friday
```

---

### `/help`
Lists all available commands (built-in + plugin commands) with descriptions.

**Response type:** Feishu card listing every registered command.

**Examples:**
```
/help
```

---

## Plugin Commands

Plugin commands are registered via the `FEISHU_PLUGINS` environment variable. Run `/help` to see the full list including plugin commands.

### `/greeting [name]`
Sends a friendly greeting card. With the `doc` sub-command, also creates a doc draft.

| Option | Description |
|--------|-------------|
| `[name]` | Name to greet (default: sender's name) |
| `doc [name]` | Additionally creates a welcome doc draft |

**Response type:** Feishu interactive card with "Create Doc Draft" and "View Stats" buttons.

**Examples:**
```
/greeting Alice
```
```
/greeting doc Bob
```

---

### `/poll "[question]" "[option1]" "[option2]" ...`
Creates an interactive Feishu poll card.

| Option | Description |
|--------|-------------|
| `"[question]"` | Poll question (quoted) |
| `"[optionN]"` | Poll choices, 2–9 options (quoted) |

**Response type:** Feishu interactive card with radio-button options and a Submit button.

**Examples:**
```
/poll "Which day works for the meeting?" "Monday" "Tuesday" "Wednesday"
```
```
/poll "What should we name the project?" "Apollo" "Helios" "Artemis"
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `FEISHU_APP_ID` | ✅ | Feishu app ID from developer console |
| `FEISHU_APP_SECRET` | ✅ | Feishu app secret |
| `FEISHU_VERIFICATION_TOKEN` | ✅ | Token set in webhook subscription (for URL verification) |
| `FEISHU_ENCRYPT_KEY` | ❌ | AES encryption key (only if encryption enabled) |
| `FEISHU_BOT_NAME` | ❌ | Bot display name in cards (default: "Bot") |
| `DEFAULT_BITABLE_ID` | ❌ | Bitable app token for `/table` and `/todo` |
| `FEISHU_PLUGINS` | ❌ | Comma-separated plugin module specifiers |
| `FEISHU_TENANTS` | ❌ | JSON array for multi-tenant deployments |

---

## Response Format

All responses are **Feishu interactive cards** (not plain text), containing:

- 📝 One or more **text sections** with formatted content
- 🔘 Optional **action buttons** (Open Draft, View Stats, etc.)
- 🔗 Optional **links** (to Feishu Docs, Bitable records, etc.)
- 👤 **User mentions** rendered as `@name` Feishu identity cards

Cards are sent via `POST /im/v1/messages` and support rich content via the [Feishu Card API](https://open.feishu.cn/document/ukTMukTMukTM/uADOwUjLwgDM14CM4ATN).

---

## Adding New Commands

See [Plugin System](./plugin-system.md) for the full guide. The short version:

1. **Write a plugin** — implement `handle()` to return a `FeishuPlugin` with your command name
2. **Export it** — named export `export const plugin: FeishuPlugin = {...}` or factory `export const createPlugin = (...) => ...`
3. **Register it** — add to `FEISHU_PLUGINS` env var (e.g. `FEISHU_PLUGINS=./plugins/my-plugin`)
4. **Test it** — run `/help` to confirm your command appears

Use the scaffolder for a template:
```bash
node scripts/create-plugin.mjs my-plugin
```
