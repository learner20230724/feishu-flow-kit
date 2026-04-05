# Plugin Examples Gallery
<!-- omit from main docs nav (not a user-facing doc) -->
<!-- This file lives at plugins/examples/README.md and is not referenced from README.md nav -->

> **Ready-to-copy reference plugins.** Each one demonstrates a distinct
> real-world pattern. Copy any file to `plugins/`, add its path to `FEISHU_PLUGINS`,
> and restart the server.

---

## Quick activation

```bash
# Add to .env:
FEISHU_PLUGINS="./plugins/ping-plugin.js,./plugins/examples/joke-plugin.js,./plugins/examples/qrcode-plugin.js"
```

Or use the CLI scaffolder (auto-appends to `.env`):

```bash
node scripts/create-plugin.mjs my-qr-plugin --template examples/qrcode-plugin
```

---

## `/qr` — QR Code Generator
**File:** [`qrcode-plugin.ts`](./qrcode-plugin.ts) ·.commit: `joke-plugin`

Generates a QR code image for any URL or text using the free [QRServer API](https://qrserver.org/).
No API key required.

**Patterns demonstrated:**
- `beforeProcess()` — skip non-text messages early
- External image-generation API (URL construction, URL encoding)
- Feishu card with `<img>` element
- Optional size suffix (`small` / `medium` / `large`)
- Input validation (length check)

**Usage:**
```
/qr https://github.com
/qr hello world medium
/qr any text small
```

---

## `/joke` — Random Joke Fetcher
**File:** [`joke-plugin.ts`](./joke-plugin.ts)

Calls the public [JokeAPI](https://v2.jokeapi.dev/) (safe-mode, no key) and returns
a Feishu interactive card. Handles both single-line and two-part (setup/delivery) jokes.

**Patterns demonstrated:**
- Async `handle()` — `async/await` for HTTP calls
- External REST API with JSON response parsing
- `AbortController` + timeout for fetch reliability
- Conditional card content based on API response shape (`type === 'single'` vs `'twopart'`)
- `afterProcess()` — fire-and-forget analytics hook
- Structured error handling (graceful degradation on API failure)

**Usage:**
```
/joke
/joke Programming
/joke Dark
```

**Environment variables:**
```env
JOKE_API_URL=https://v2.jokeapi.net/joke  # optional override
JOKE_TIMEOUT_MS=5000                         # fetch timeout
```

---

## `/remind` — Natural-Language Reminder
**File:** [`remind-plugin.ts`](./remind-plugin.ts)

Parses natural-language dates (`in 5 minutes`, `tomorrow at 3pm`, `2026-04-15 14:00`)
and stores reminders in an in-memory map. Returns a countdown card.

**Patterns demonstrated:**
- Natural-language date parsing (regex-based, no external library)
- Unix timestamp math (`Date.now()` / `getTime()`)
- In-memory state (`Map<userId, Reminder[]>`)
- `afterProcess()` — example integration point for an external reminder service
- Recurring schedule detection (`every day at HH:MM`)
- Timezone handling (`process.env.TIMEZONE`)
- Usage card fallback when args are missing or unparseable

**Usage:**
```
/remind in 5 minutes Call the team
/remind tomorrow at 3pm Project review
/remind 2026-04-15 14:00 v1.0 release
/remind every day at 9am Daily standup
```

**Environment variables:**
```env
REMIND_TIMEZONE=Asia/Shanghai           # IANA timezone
REMIND_DEFAULT_UTC_OFFSET=8             # fallback UTC offset (hours)
```

> ⚠️ In-memory storage is cleared on server restart. For production,
> replace `reminderStore` with a database write in `afterProcess()`.

---

## `/weather` — Current Weather
**File:** [`weather-plugin.ts`](./weather-plugin.ts)

Fetches current weather for any city using the free [wttr.in](https://wttr.in/) API.
No API key required. Returns a Feishu rich card with temperature, humidity, wind,
feels-like, UV index, and visibility.

**Patterns demonstrated:**
- HTTP GET with query parameters (`axios.get`)
- JSON response parsing (nested `current_condition[0]`)
- Environment-variable-driven configuration (`unit` toggle °C/°F)
- `AbortController` + timeout for reliability
- Dynamic emoji mapping based on weather condition string
- Graceful degradation on API error (timeout → friendly text fallback)
- Feishu rich card with `note` elements (key-value grid)

**Usage:**
```
/weather Beijing
/weather Tokyo c        ← c=Celsius, f=Fahrenheit
/weather "New York" f
```

**Environment variables:**
```env
WEATHER_DEFAULT_UNIT=c   # c=Celsius, f=Fahrenheit
```

---

## `/poll` — Inline Interactive Poll
**File:** [`poll-plugin.ts`](./poll-plugin.ts)

Creates an inline Feishu poll with button-voting interaction. Tapping an option
casts a vote and the card updates to show live results with an ASCII bar chart.

**Patterns demonstrated:**
- `onCallback()` — interactive button callback handling
- In-memory vote tally (`Map<pollKey, Poll>`)
- Live card update (`api.updateMessage()`)
- Feishu rich card with multiple `action` elements
- User deduplication (one vote per person, tracked by `open_id`)
- Dynamic bar chart rendering in markdown (`█` / `░`)
- Poll expiration (in-memory store, cleared on restart)
- Fallback to text results when card update fails

**Usage:**
```
/poll "Which flavor?" Vanilla Chocolate Strawberry
/poll "Deploy to prod?" Yes No
/poll "Q4 priorities?" "Ship faster" "Better docs" "Fix bugs" "More tests"
```

> ⚠️ In-memory storage means votes are lost on server restart. For persistent
> polls, replace `activePolls` with a Redis or database backend.

---

## Comparing plugin patterns

| Plugin | Lifecycle hooks | External call | State | Async |
|--------|---------------|---------------|-------|-------|
| `/qr` | `beforeProcess`, `handle` | QRServer image API | — | Sync |
| `/joke` | `handle`, `afterProcess` | JokeAPI REST | — | `async` |
| `/remind` | `handle`, `afterProcess` | — | `Map<>` | Sync |
| `/weather` | `handle` | wttr.in REST/JSON | — | `async` |
| `/poll` | `handle`, `onCallback` | — | `Map<>` + `updateMessage` | Sync |

---

## Extending the gallery

To create your own plugin from scratch:

```bash
# Interactive CLI (prompts for name + generates files):
node scripts/create-plugin.mjs

# Or generate from a specific example template:
node scripts/create-plugin.mjs my-awesome-plugin --template examples/qrcode-plugin
```

See also:
- [`plugins/template/`](./template/) — annotated skeleton with all lifecycle hooks
- [`docs/plugin-system.md`](../../docs/plugin-system.md) — architecture guide
- [`docs/plugin-example-walkthrough.md`](../../docs/plugin-example-walkthrough.md) — step-by-step `/remind` walkthrough
