# Deployment Guide

This guide covers deploying feishu-flow-kit to production. All four options result in a publicly reachable webhook endpoint that you register with Feishu Open Platform.

---

## TL;DR — Railway (recommended)

Railway is the fastest path to a live bot:

1. Fork this repo on GitHub.
2. Connect the fork to Railway → **New Project → Deploy from GitHub repo**.
3. Add environment variables in Railway's Variables panel (see [.env.example](./.env.example)):
   - `FEISHU_APP_ID`, `FEISHU_APP_SECRET`
   - `FEISHU_WEBHOOK_SECRET`
   - `FEISHU_WEBHOOK_URL` = `https://your-railway-app.up Railway.app/webhook` (add this in Settings → Networking → Domain first)
   - `FEISHU_MOCK_MODE=false`
4. Set `FEISHU_ENABLE_OUTBOUND_REPLY=true` (or `..._DOC_CREATE=true`, `..._TABLE_CREATE=true`) when ready.
5. Railway auto-detects the Dockerfile and deploys it.
6. Register `https://your-railway-app.up Railway.app/webhook` as the Request URL in Feishu Open Platform → your app → Event Subscriptions.

> **Important:** Set the domain in Railway Settings → Networking first, then copy the full URL (including `/webhook`) into Feishu and into `FEISHU_WEBHOOK_URL`.

---

## Option 2 — Render

[Render](https://render.com) offers free tier with a Docker Web Service.

### Steps

1. Fork this repo to GitHub.
2. Create a **Web Service** on Render:
   - Connect your GitHub repo.
   - Set **Region**: closest to your Feishu tenant.
   - **Root Directory**: leave empty (repo root).
   - **Runtime**: **Docker**.
   - **Instance Type**: Free (auto-sleeps after 15 min of inactivity — Feishu may retry webhooks; consider a paid instance for production).
3. Add environment variables (from [.env.example](./.env.example)):
   - `FEISHU_APP_ID`, `FEISHU_APP_SECRET`
   - `FEISHU_WEBHOOK_SECRET`
   - `FEISHU_WEBHOOK_URL` = `https://your-app.onrender.com/webhook`
   - `FEISHU_MOCK_MODE=false`
4. Create the service — Render builds from the `Dockerfile` automatically.
5. Register `https://your-app.onrender.com/webhook` in Feishu Open Platform.

---

## Option 3 — fly.io

[fly.io](https://fly.io) runs Docker containers close to your users with a modest free tier.

### Prerequisites

```bash
npm install -g flyctl
flyctl auth login
```

### Steps

1. Fork the repo and push to GitHub.
2. `flyctl launch` — answer the prompts:
   - **App name**: choose a unique name (used in `https://your-app.fly.dev`).
   - **Region**: closest to your Feishu tenant.
   - **Would you like to allocate a dedicated IPv4 address?** → `No` (IPv6 is fine for Feishu webhooks).
3. Add secrets:

   ```bash
   flyctl secrets set FEISHU_APP_ID=your_app_id
   flyctl secrets set FEISHU_APP_SECRET=your_app_secret
   flyctl secrets set FEISHU_WEBHOOK_SECRET=your_webhook_secret
   flyctl secrets set FEISHU_WEBHOOK_URL=https://your-app.fly.dev/webhook
   flyctl secrets set FEISHU_MOCK_MODE=false
   flyctl secrets set FEISHU_ENABLE_OUTBOUND_REPLY=false
   ```

4. Deploy:

   ```bash
   flyctl deploy
   ```

5. Check the public URL:

   ```bash
   flyctl info
   ```

6. Register `https://your-app.fly.dev/webhook` in Feishu Open Platform.

### Scale to zero recovery

fly.io automatically pauses apps after ~5 days of inactivity. The first request after a pause causes fly.io to restart the VM (cold start ~10–20 s). Feishu webhook delivery retries with exponential back-off, so this is usually transparent.

---

## Option 4 — Manual Ubuntu VPS

Tested on Ubuntu 22.04 LTS. Any Debian-like host with Docker works the same way.

### 1. Clone the repo on the server

```bash
git clone https://github.com/learner20230724/feishu-flow-kit.git
cd feishu-flow-kit
```

### 2. Configure environment

```bash
cp .env.example .env
nano .env   # fill in FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_WEBHOOK_SECRET
```

Set `FEISHU_WEBHOOK_URL=https://your-server-ip-or-domain/webhook`.

### 3. Point a domain at your server (optional but recommended)

Create an `A` record pointing at your server's public IP, then use nginx or Caddy as a reverse proxy:

```nginx
# /etc/nginx/sites-available/feishu-flow-kit
server {
    listen 80;
    server_name your-domain.example.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/feishu-flow-kit /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

For HTTPS, use [Certbot](https://certbot.eff.org):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example.com
```

> If you skip the domain and HTTPS, Feishu may reject your webhook URL in some configurations. HTTPS is strongly recommended.

### 4. Run with Docker Compose

```bash
# Ensure FEISHU_WEBHOOK_URL points to your public URL in .env
docker compose up -d --build
```

### 5. Verify the health endpoint

```bash
curl https://your-domain.example.com/healthz
# Expected: {"ok":true,"ts":1712224000}
```

### 6. Register the webhook URL in Feishu

URL: `https://your-domain.example.com/webhook`

Go to **Feishu Open Platform → your app → Event Subscriptions → Request URL** and enter the above.

---

## Registering the webhook (Feishu side)

Regardless of which host you choose, the Feishu side setup is the same:

1. Go to [open.feishu.cn/app](https://open.feishu.cn/app) → your app.
2. **Credentials & Basic Info** → copy **App ID** and **App Secret**.
3. **Event Subscriptions**:
   - Enable `im.message.receive_v1`.
   - Set Request URL to your bot's public `/webhook` endpoint.
   - If using encryption (`FEISHU_WEBHOOK_SECRET`), Feishu shows the Encrypt Key field — copy it to `FEISHU_WEBHOOK_SECRET`.
   - For URL verification, Feishu sends a GET with `challenge` param — the bot handles this automatically (returns `{"challenge":"..."}`).
4. **Permissions** → ensure these are added:
   - `im:message` — read and send messages
   - `docx:document` — create docs
   - `bitable:app` — read and write Bitable records
5. **Publish** the app version.

> Feishu only supports HTTPS webhook URLs in production. `http://` URLs work only in sandbox/test tenants.

---

## Production checklist

- [ ] `FEISHU_MOCK_MODE=false`
- [ ] `FEISHU_APP_ID` and `FEISHU_APP_SECRET` set
- [ ] `FEISHU_WEBHOOK_SECRET` set (enables `x-lark-signature` verification)
- [ ] `FEISHU_WEBHOOK_URL` set to the **public** URL (not `localhost`)
- [ ] Feature toggles (`FEISHU_ENABLE_OUTBOUND_REPLY`, etc.) set as needed
- [ ] Bitable credentials (`FEISHU_BITABLE_APP_TOKEN`, `FEISHU_BITABLE_TABLE_ID`) set if using `/table`
- [ ] Health check `GET /healthz` returns `{"ok":true,...}`
- [ ] Feishu app published (not just saved)
- [ ] App has the required permissions in Feishu Open Platform
