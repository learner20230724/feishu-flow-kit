# Production Deployment — Docker Compose + Traefik

This folder contains a production-ready stack for self-hosting feishu-flow-kit on a VPS with automatic HTTPS.

## What you get

| Component | Role |
|-----------|------|
| **Traefik v3** | Reverse proxy, automatic TLS (Let's Encrypt), HTTP→HTTPS redirect |
| **feishu-flow-kit** | Your bot, built from the GHCR image (or locally) |

Feishu calls `https://your-vps.example.com/webhook` — Traefik terminates TLS and forwards it to the bot container at port 8787.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  INTERNET                                                                          │
│                                                                                     │
│   Feishu Cloud ──HTTPS POST──► [VPS FQDN]            Let's Encrypt (ACME)         │
│         ◄──── HTTPS API response ────                 ◄── ACME challenge ───      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                              ┌─────────▼─────────────────────────────────┐
                              │  VPS — Docker Compose Stack               │
                              │                                          │
                              │  ┌──────────────┐    ┌────────────────┐  │
                              │  │  Traefik v3  │───►│ feishu-flow-kit│  │
                              │  │  :80 :443    │    │   :3000 (bot)  │  │
                              │  │  TLS ✓ AUTO  │    │   /status ✓    │  │
                              │  │  ACME provider│   │  /webhook ✓    │  │
                              │  └──────────────┘    └───────┬────────┘  │
                              │           ▲                  │             │
                              └───────────┼──────────────────┘             │
                                          │                                │
                              Feishu Open Platform API                     │
                              POST /im/v1/messages                        │
                              POST /docx/v1/documents                      │
                              GET/POST /bitable/v1/apps/...                 │
                              └──────────────────────────────────────────────┘
```

![Production deployment architecture](../docs/assets/deploy-production-traefik.svg)

## Prerequisites

- A VPS with Docker and Docker Compose installed
- A domain name (or just an IP with HTTP port 80/443 exposed) pointed at your VPS
- Fork of this repo on GitHub (for the GHCR image, or build locally)

## Setup

### 1. Copy and fill in environment variables

```bash
cd deploy
cp .env.production.example .env.production
nano .env.production   # fill in FEISHU_APP_ID, FEISHU_APP_SECRET, VPS_FQDN, ACME_EMAIL
```

### 2. Point Traefik at the bot container

The `docker-compose.yml` uses Docker label-based routing — the bot's labels are already set in the compose file. Just make sure `VPS_FQDN` in `.env.production` matches the DNS name you will use.

### 3. Start the stack

```bash
docker compose -f docker-compose.yml --env-file .env.production up -d
```

Traefik will automatically request a Let's Encrypt certificate on first request.

### 4. Register the webhook URL in Feishu

1. Open Feishu Open Platform → your app → Event Subscriptions.
2. Set **Request URL** to `https://your-vps.example.com/webhook` (must match `VPS_FQDN` + `/webhook`).
3. Save. Feishu will send a verification request — the bot handles this automatically.

## Updating the bot

```bash
# Pull the latest GHCR image and restart
docker compose -f docker-compose.yml --env-file .env.production pull bot
docker compose -f docker-compose.yml --env-file .env.production up -d --no-deps bot
```

Or to rebuild locally from source:

```bash
docker compose -f docker-compose.yml --env-file .env.production build bot
docker compose -f docker-compose.yml --env-file .env.production up -d --no-deps bot
```

## Checking status

```bash
# Traefik dashboard (insecure, localhost only)
open http://localhost:8080

# Bot /status endpoint
curl https://your-vps.example.com/status

# Container logs
docker compose -f docker-compose.yml logs bot
docker compose -f docker-compose.yml logs traefik
```

## Monitoring & Observability

### `/status` endpoint

`GET /status` returns a JSON snapshot of the bot's runtime state — useful for health checks and alerting:

```json
{
  "uptimeSeconds": 3847,
  "eventCount": 142,
  "lastEventAt": "2026-04-04T12:30:00.000Z",
  "flags": {
    "FEISHU_APP_ID": "cli_xxxxxxxx",
    "NODE_ENV": "production"
  },
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Cron monitoring example** — poll every 5 minutes and alert if `lastEventAt` is stale:

```bash
# Quick health check (exit 0 = healthy, non-zero = unhealthy)
STATUS=$(curl -sf https://your-vps.example.com/status)
echo "$STATUS" | python3 -c "
import sys, json, datetime
d = json.load(sys.stdin)
last = datetime.datetime.fromisoformat(d['lastEventAt'].replace('Z','+00:00'))
age = (datetime.datetime.now(datetime.timezone.utc) - last).total_seconds()
print(f'OK — last event {age:.0f}s ago' if age < 600 else f'ALERT — no events for {age:.0f}s')
sys.exit(0 if age < 600 else 1)
"
```

### Structured logs

All bot log lines include a `requestId` field (UUID) that ties a single Feishu event through the entire processing pipeline. Filter by `requestId` to get every log line for one event:

```bash
# Tail bot logs and filter by a specific requestId
docker compose -f docker-compose.yml logs -f bot | grep "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# Count events processed per minute (useful for traffic spike detection)
docker compose -f docker-compose.yml logs bot --since 1h 2>/dev/null \
  | grep "event processed" | wc -l
```

**Log level control** — set `LOG_LEVEL=debug|info|warn|error` in `.env.production` to adjust verbosity.

### Retries & resilience

The bot retries Feishu API errors (HTTP 429 and 5xx, plus Feishu codes `99991661`/`99991663`) with exponential back-off automatically. A `requestId` that appears only in bot logs with retrying messages — but never succeeds — indicates a permanent Feishu API failure for that event.

### Optional: Sentry error tracking

```bash
# In .env.production, add your Sentry DSN to enable error tracking:
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

Without `SENTRY_DSN` set, the Sentry integration is a no-op stub (zero overhead). With it, unhandled exceptions and failed retries are sent to Sentry automatically.

### Useful monitoring commands

```bash
# Resource usage
docker stats --no-stream

# Restart count (high number = crash looping)
docker inspect feishu-flow-kit_bot --format '{{.RestartCount}}'

# Traefik TLS certificates status
docker compose -f docker-compose.yml exec traefik traefik healthcheck

# Verify TLS is active
curl -sv https://your-vps.example.com/status 2>&1 | grep "SSL certificate verify\|TLS handshake"
```

## Multi-Tenant Deployment

For running multiple Feishu organizations (tenants) from a single bot deployment, add the `FEISHU_TENANTS` JSON array to `.env.production` instead of the single-app variables:

```bash
# .env.production — multi-tenant example
VPS_FQDN=your-vps.example.com
ACME_EMAIL=admin@example.com

FEISHU_TENANTS='[
  {
    "tenantKey": "tenant_alice",
    "appId": "cli_aaaaa",
    "appSecret": "secret_a",
    "botName": "Alice Workflow Bot",
    "enableOutboundReply": true,
    "enableTableCreate": true,
    "bitableAppToken": "xxx",
    "bitableTableId": "yyy"
  },
  {
    "tenantKey": "tenant_bob",
    "appId": "cli_bbbbb",
    "appSecret": "secret_b",
    "botName": "Bob Automation Bot",
    "enableOutboundReply": false,
    "enableDocCreate": true
  }
]'
```

Each Feishu app registered in `FEISHU_TENANTS` must have its webhook URL pointing to the same `https://your-vps.example.com/webhook`. The bot routes events to the correct tenant config automatically using the `tenant_key` in each webhook payload header.

See the [Developer Guide](../docs/developer-guide.md#multi-tenant-support) for full details on tenant routing, per-tenant feature overrides, and runtime tenant addition.

## Troubleshooting

**Feishu reports "Verification failed"**

- Make sure port 80 (HTTP) and 443 (HTTPS) are open on your VPS firewall
- Make sure `VPS_FQDN` in `.env.production` matches exactly what you entered in Feishu (including protocol `https://`)
- Check that DNS has propagated: `dig +short your-vps.example.com`
- Check bot logs: `docker compose -f docker-compose.yml logs bot`

**Let's Encrypt certificate errors**

- Traefik's ACME HTTP challenge requires port 80 to be reachable from the internet
- Check that the `traefik-certs` Docker volume persists certificates between restarts
- If you see "certificate for this site is not trusted" locally, that's expected for self-signed dev certs — production uses Let's Encrypt

**Bot returns 502**

- The bot's health check (`/status`) may not be ready yet — wait 10–15 seconds after starting
- Verify the bot container is running: `docker compose -f docker-compose.yml ps`
- Check that port 8787 in the bot container matches the `loadbalancer.server.port` label in `docker-compose.yml`

## Ports used

| Port | Service |
|------|---------|
| 80   | HTTP → redirected to HTTPS by Traefik |
| 443  | HTTPS (Traefik, Let's Encrypt) |
| 8080 | Traefik insecure API dashboard (localhost only) |
| 8787 | feishu-flow-kit bot (internal only, accessed via Traefik) |
