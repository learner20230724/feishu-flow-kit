# Production Deployment — Docker Compose + Traefik

This folder contains a production-ready stack for self-hosting feishu-flow-kit on a VPS with automatic HTTPS.

## What you get

| Component | Role |
|-----------|------|
| **Traefik v3** | Reverse proxy, automatic TLS (Let's Encrypt), HTTP→HTTPS redirect |
| **feishu-flow-kit** | Your bot, built from the GHCR image (or locally) |

Feishu calls `https://your-vps.example.com/webhook` — Traefik terminates TLS and forwards it to the bot container at port 8787.

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
