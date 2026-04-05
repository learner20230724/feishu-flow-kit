# Security Policy

> ⚠️ **feishu-flow-kit handles sensitive credentials and processes external webhook events.** Please read this policy before deploying.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| v1.0.x  | ✅ Current stable |

Upgrade to the latest stable release to receive security patches.

---

## Reporting a Vulnerability

**Do not open a public GitHub Issue for security vulnerabilities.**

If you discover a security issue, please report it responsibly:

1. **Email:** Open a [private vulnerability report](https://github.com/learner20230724/feishu-flow-kit/security/advisories/new) via GitHub Security Advisories.
2. **Disclosure timeline:** I aim to acknowledge within 48 hours and publish a fix within 14 days for critical issues.
3. **Severity labels:** CVEs are assigned for confirmed vulnerabilities in releases.

---

## Security Features Built Into feishu-flow-kit

### 🔐 Webhook Signature Verification

feishu-flow-kit **verifies the HMAC-SHA256 signature** on every incoming Feishu webhook request when `FEISHU_WEBHOOK_SECRET` is set.

- Requests with invalid or missing signatures are rejected with `401 Unauthorized` before any workflow logic runs.
- **Never disable signature verification in production.** Only disable it (`FEISHU_WEBHOOK_SECRET=`) for local development with mock mode.

```
Feishu Open Platform → Event Subscription → Encryption Key
```

### 🔑 Credential Management

| Secret | Risk | Recommendation |
|--------|------|----------------|
| `FEISHU_APP_SECRET` | 🔴 Critical | Never commit to git. Use a secrets manager (GitHub Actions secrets, Railway/Vercel env vars). Rotate if exposed. |
| `FEISHU_WEBHOOK_SECRET` | 🔴 Critical | Same as above. Used for request signing — expose = full webhook impersonation. |
| `FEISHU_BITABLE_APP_TOKEN` | 🟡 High | Bitable table access token. Limit to the specific Bitable scope needed. |
| `FEISHU_TENANT_KEY` / `FEISHU_TENANTS` | 🟡 High | In multi-tenant mode, each tenant has its own credentials — ensure tenant isolation. |

### 🚫 Multi-Tenant Isolation

When using multi-tenant mode (`FEISHU_TENANTS`), each tenant's credentials are isolated. Workflows that forward data between tenants are not supported by design — treat each tenant's context as fully isolated.

### 📥 Input Validation

- All inbound webhook event fields are validated against Feishu's documented payload shapes before processing.
- Workflow command arguments (e.g., `/table add ...`) are parsed with strict type coercion; malformed inputs return `400 Bad Request` with an error message.
- User-provided field names (e.g., `FEISHU_BITABLE_TITLE_FIELD_NAME`) are used as-is for API calls — **do not set these from untrusted input**.

### 🔒 Production Deployment Checklist

- [ ] `FEISHU_WEBHOOK_SECRET` is set (not empty in production)
- [ ] `FEISHU_MOCK_MODE=false`
- [ ] App credentials (`FEISHU_APP_ID` / `FEISHU_APP_SECRET`) are set via secrets manager, not hardcoded
- [ ] `FEISHU_ENABLE_OUTBOUND_REPLY=false` unless you explicitly need outbound messaging
- [ ] `FEISHU_ENABLE_DOC_CREATE=false` unless you need doc creation
- [ ] `FEISHU_ENABLE_TABLE_CREATE=false` unless you need bitable write access
- [ ] `LOG_LEVEL=warn` or `LOG_LEVEL=error` in production (reduces log verbosity of sensitive payloads)
- [ ] TLS termination at the load balancer/reverse proxy (feishu-flow-kit expects HTTPS upstream)
- [ ] Deploy behind a firewall — only port 443 (or `FEISHU_WEBHOOK_PORT`) exposed to Feishu's IP ranges
- [ ] Feishu Webhook URL is set to your public HTTPS endpoint

### 📦 Dependency Security

Run `npm audit` regularly:

```bash
npm audit         # check for known vulnerabilities
npm audit fix     # apply minor patches automatically
```

Subscribe to [GitHub Advisories](https://github.com/advisories) for this repository to receive alerts for upstream vulnerabilities.

### 🌐 Network Security

- feishu-flow-kit only makes **outbound HTTPS calls** to:
  - `open.feishu.cn` — Feishu Open Platform APIs
  - `qwen bytedance` — optional LLM provider endpoints
  - Your configured `CUSTOM_BASE_URL` (if using the Custom provider)
- No inbound ports should be exposed to the public internet except the webhook endpoint.
- The webhook server listens on `FEISHU_WEBHOOK_PORT` (default `8787`) — bind to `127.0.0.1` behind a reverse proxy.

### 🐳 Container Security

- The Dockerfile runs as a non-root user (`node`) by default.
- The image is based on `node:22-alpine` — a minimal, frequently updated base image.
- Do not run the container as root. If you need a specific UID/GID, pass `--user` to `docker run`:

```bash
docker run --user 1001:1001 -p 443:8787 ...
```

- Use read-only filesystem where possible (add `--read-only` flag) for added isolation.
- Scan images with [Trivy](https://aquasecurity.github.io/trivy/):

```bash
trivy image ghcr.io/learner20230724/feishu-flow-kit:latest
```

---

## Security Best Practices for Your Feishu App

- **Rotate Feishu app credentials periodically** — especially after staff changes.
- **Use the principle of least privilege** — only enable the Feishu Open Platform permissions your workflows actually need (bot / doc / bitable / calendar etc.).
- **Register only the webhook events you handle** — remove unused event subscriptions in Feishu Open Platform.
- **Set a webhook URL that is not behind a VPN** — Feishu needs to reach it directly, but put it behind a WAF (Web Application Firewall) for additional protection.
- **Audit Feishu's "application access log"** regularly to catch unexpected API calls.

---

## Incident Response

If you suspect a credential leak or unauthorized access:

1. **Rotate all Feishu credentials immediately** (`FEISHU_APP_SECRET`, `FEISHU_WEBHOOK_SECRET`, per-tenant secrets).
2. Review Feishu's application access log for unauthorized API calls.
3. Check container/service logs for anomalies.
4. File a security advisory on GitHub even if you've already remediated.
