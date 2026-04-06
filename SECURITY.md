# Security Policy

## Supported Versions

| Version | Supported          | Notes                                  |
| ------- | ------------------ |----------------------------------------|
| 1.0.x   | ✅                 | Current stable release                 |
| 0.1.x   | ❌                 | Deprecated                             |

## Reporting a Vulnerability

If you discover a security vulnerability within feishu-flow-kit, please **do not** open a public GitHub issue.

Instead, please report it via one of:

1. **GitHub Private Vulnerability Reporting** (preferred)
   - Go to the [Security tab](https://github.com/learner20230724/feishu-flow-kit/security/advisories/new) on this repository
   - Click "Report a vulnerability"
   - Fill in the details and submit

2. **Email** (if GitHub reporting is unavailable)
   - Email the maintainer directly with subject: `[feishu-flow-kit Security]`
   - Expect a response within 48 hours

Please include as much of the following as possible:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

## What to Expect

| Timeline | What happens |
|----------|-------------|
| < 24h    | Acknowledgment of receipt |
| 48h      | Initial assessment (severity rating) |
| 7 days   | Fix developed and tested (for critical/high severity) |
| 14 days  | Patch released and CVE filed (if applicable) |
| 30 days  | Public disclosure (coordinated) |

## Severity Ratings

| Rating   | Description |
|----------|-------------|
| Critical | RCE, full server compromise, secret exfiltration |
| High     | Partial data exposure, DoS, privilege escalation |
| Medium   | Information disclosure, limited scope impact |
| Low      | Minor UX issues, non-sensitive information leaks |

## Security Best Practices for Deployments

When deploying feishu-flow-kit in production:

- **Never commit `.env`** — always use environment variables or a secrets manager
- **Rotate credentials regularly** — especially `APP_ID`, `APP_SECRET`, and `APP_VERIFICATION_TOKEN`
- **Use HTTPS** — enable TLS in your reverse proxy (Traefik, Nginx, etc.); the included `docker-compose.yml` includes Let's Encrypt support
- **Restrict ngrok/webhook exposure** — use authenticated tunnels or IP allowlisting in production
- **Plugin isolation** — plugin crashes are isolated by design, but avoid untrusted third-party plugins
- **Webhooks** — validate `X-Feishu-Signature` on every incoming request; the server does this by default
- **Rate limiting** — configure rate limiting at the reverse-proxy level for production deployments
- **Monitor** — enable structured logging and connect to your observability stack (Sentry stubs are included in `src/core/logger.ts`)

## Known Limitations

- The plugin system is **not a security boundary** — plugins run in the same Node.js process
- Feishu API tokens (`tenant_access_token`) are short-lived by design — the server auto-refreshes them; do not cache them long-term
- Demo mode (`npm run demo`) uses mock credentials — never use demo credentials in production
