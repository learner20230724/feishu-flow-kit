#!/usr/bin/env node
/**
 * scripts/verify-setup.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Quick setup verification for feishu-flow-kit.
 *
 * Run:  node scripts/verify-setup.mjs [--server <url>]
 *
 * What it checks (in order):
 *   1. Required environment variables are present (values NOT shown)
 *   2. Config loads successfully (valid structure, env var references)
 *   3. Plugin system loads (FEISHU_PLUGINS env — warnings only)
 *   4. Optional: live server health check (--server <url>)
 *   5. Optional: mock webhook smoke test (--server <url>)
 *
 * Exit code: 0 = all checks passed, 1 = one or more failures.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ANSI colours
const GREEN   = '\x1b[32m';
const RED     = '\x1b[31m';
const YELLOW  = '\x1b[33m';
const CYAN    = '\x1b[36m';
const DIM     = '\x1b[2m';
const RESET   = '\x1b[0m';

let exitCode = 0;

function log(label, message, status) {
  const stamp = `[${new Date().toISOString().slice(11, 19)}]`;
  const tag = status === 'ok'    ? `${GREEN}✓${RESET}`
            : status === 'fail'  ? `${RED}✗${RESET}`
            : status === 'warn'  ? `${YELLOW}⚠${RESET}`
            : status === 'info'  ? `${CYAN}ℹ${RESET}`
            :                       DIM;
  console.log(`${stamp} ${tag} ${label ? `${label} — ` : ''}${message}`);
}

function section(name) {
  console.log(`\n${CYAN}━━━ ${name} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
}

// ── 1. Env var checks ──────────────────────────────────────────────────────

section('Environment variables');

const REQUIRED_ENV_VARS = ['FEISHU_APP_ID', 'FEISHU_APP_SECRET'];

const IMPORTANT_OPTIONAL_VARS = [
  'FEISHU_VERIFICATION_TOKEN',
  'FEISHU_ENCRYPT_KEY',
  'FEISHU_TENANTS',
  'FEISHU_PLUGINS',
  'LOG_LEVEL',
  'PORT',
  'NODE_ENV',
];

function checkEnv() {
  // Try to load .env file for convenience (values not shown)
  try {
    const dotenvPath = join(ROOT, '.env');
    const lines = readFileSync(dotenvPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    }
    log('.env file', 'loaded (values hidden)', 'ok');
  } catch {
    // no .env — that's fine, env vars must come from the shell
    log('.env file', 'not found — using shell environment', 'info');
  }

  let ok = true;
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      log('MISSING (required)', key, 'fail');
      ok = false;
    } else {
      log('found (required)', `${key}=${'*'.repeat(process.env[key].length)}`, 'ok');
    }
  }

  for (const key of IMPORTANT_OPTIONAL_VARS) {
    if (!process.env[key]) {
      log('not set (optional)', key, 'warn');
    } else {
      let display;
      if (key === 'FEISHU_TENANTS') display = `${key}=JSON(${process.env[key].length} chars)`;
      else if (key === 'FEISHU_PLUGINS') display = `${key}=${process.env[key].split(',').length} plugin(s)`;
      else display = `${key}=${'*'.repeat(process.env[key].length)}`;
      log('found (optional)', display, 'ok');
    }
  }

  return ok;
}

const envOk = checkEnv();
if (!envOk) {
  log('result', 'Required env vars missing — see above', 'fail');
  exitCode = 1;
} else {
  log('result', 'All required env vars present', 'ok');
}

// ── 2. Config loading ─────────────────────────────────────────────────────

section('Config loading');

function checkConfig() {
  try {
    const configPath = join(ROOT, 'src/config/load-config.ts');
    const raw = readFileSync(configPath, 'utf8');

    // Verify key function exports exist
    const requiredExports = ['loadConfig', 'resolveTenantConfig'];
    for (const fn of requiredExports) {
      if (raw.includes(`export function ${fn}`)) {
        log(`export function ${fn}`, 'found', 'ok');
      } else {
        log(`export function ${fn}`, 'NOT FOUND', 'fail');
        return false;
      }
    }

    // Count env reads (loadConfig receives `env` param, accesses env.FEISHU_*)
    const localEnvReads = (raw.match(/env\.FEISHU_[A-Z0-9_]*/g) || []);
    const uniqueEnvReads = [...new Set(localEnvReads)];
    log('env var reads', `${uniqueEnvReads.length} unique FEISHU_* variables referenced`, 'info');

    // Check required env vars are referenced in config
    const missing = REQUIRED_ENV_VARS.filter(v => !raw.includes(`.${v}`));
    if (missing.length) {
      log('env var references', `WARNING: ${missing.join(', ')} not referenced in load-config.ts`, 'warn');
    } else {
      log('env var references', 'all required env vars referenced ✓', 'ok');
    }

    // Check for helper functions (indicates good structure)
    const helpers = ['parseBoolean', 'parseLogLevel', 'parsePort']
      .filter(h => raw.includes(`function ${h}`));
    log('helper functions', helpers.length > 0 ? helpers.join(', ') : 'none found', 'info');

    // Check for TenantConfig / AppConfig interfaces
    if (raw.includes('interface TenantConfig')) log('interface TenantConfig', 'found', 'ok');
    if (raw.includes('interface AppConfig'))    log('interface AppConfig',    'found', 'ok');

    return true;
  } catch (err) {
    log('config file', `Cannot read src/config/load-config.ts: ${err.message}`, 'fail');
    return false;
  }
}

const configOk = checkConfig();
if (!configOk) exitCode = 1;

// ── 3. Plugin system ──────────────────────────────────────────────────────

section('Plugin system');

function checkPlugins() {
  const pluginsDir      = join(ROOT, 'plugins');
  const pluginTemplate  = join(ROOT, 'plugins', 'template');
  const pluginSystem   = join(ROOT, 'src', 'core', 'plugin-system.ts');

  const pluginSystemExists = (() => {
    try { readFileSync(pluginSystem, 'utf8'); return true; } catch { return false; }
  })();

  if (!pluginSystemExists) {
    log('plugin-system', 'src/core/plugin-system.ts not found (optional)', 'warn');
  } else {
    log('plugin-system', 'src/core/plugin-system.ts found', 'ok');

    // Check FeishuPlugin interface
    const raw = readFileSync(pluginSystem, 'utf8');
    if (raw.includes('interface FeishuPlugin')) log('interface FeishuPlugin', 'found', 'ok');
    if (raw.includes('loadPlugins'))           log('loadPlugins()',          'found', 'ok');
    if (raw.includes('buildPluginContext'))    log('buildPluginContext()',   'found', 'ok');
  }

  const pluginFiles = (() => {
    try { return readdirSync(pluginsDir).filter(f => f.endsWith('.ts')); }
    catch { return []; }
  })();

  if (pluginFiles.length === 0) {
    log('plugins/', 'no .ts plugin files in plugins/ — FEISHU_PLUGINS will load nothing', 'warn');
  } else {
    log('plugins/', pluginFiles.join(', '), 'ok');
    log('plugin count', `${pluginFiles.length} plugin(s) available`, 'info');
  }

  const templateExists = (() => {
    try { readFileSync(join(pluginTemplate, 'plugin.ts'), 'utf8'); return true; } catch { return false; }
  })();
  if (templateExists) {
    log('plugin template', 'plugins/template/ found — use: node scripts/create-plugin.mjs <name>', 'ok');
  }

  if (process.env.FEISHU_PLUGINS) {
    const plugins = process.env.FEISHU_PLUGINS.split(',').map(p => p.trim()).filter(Boolean);
    log('FEISHU_PLUGINS', `${plugins.length} plugin(s) configured`, 'ok');
    for (const p of plugins) log('  plugin spec', p, 'info');
  } else {
    log('FEISHU_PLUGINS', 'not set — no plugins will be loaded at runtime', 'warn');
  }

  return true;
}

checkPlugins();

// ── 4. Server health check ────────────────────────────────────────────────

section('Live server health check');

async function checkServerHealth(baseUrl) {
  if (!baseUrl) {
    log('skip', 'no --server URL provided', 'info');
    log('hint', 'Run with --server http://localhost:8787 to test a live server', 'info');
    return true;
  }

  const url = baseUrl.replace(/\/$/, '') + '/status';
  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
    let body;
    try { body = await res.json(); } catch { body = null; }

    if (!res.ok) {
      log('GET /status', `HTTP ${res.status} — server responded but returned an error`, 'fail');
      exitCode = 1;
      return false;
    }

    log('GET /status', `HTTP ${res.status} — server is up ✓`, 'ok');
    if (body) {
      const fields = [
        ['uptimeSeconds', 'uptime'],
        ['eventCount',   'events processed'],
        ['lastEventAt',  'last event'],
        ['flags',        'flags'],
        ['requestId',    'request ID'],
      ];
      for (const [key, label] of fields) {
        if (body[key] !== undefined) log(`  ${label}`, String(body[key]), 'ok');
      }
    }
    return true;
  } catch (err) {
    if (err.cause?.name === 'TimeoutError') {
      log('GET /status', `timed out — is the server running at ${baseUrl}?`, 'fail');
    } else {
      log('GET /status', `connection failed: ${err.message}`, 'fail');
    }
    exitCode = 1;
    return false;
  }
}

// ── 5. Mock webhook smoke test ────────────────────────────────────────────

section('Mock webhook smoke test');

async function sendMockWebhook(baseUrl) {
  if (!baseUrl) {
    log('skip', 'no --server URL provided', 'info');
    return true;
  }

  const url = baseUrl.replace(/\/$/, '') + '/webhook';
  const mockEvent = {
    schema: 'im.message.receive_v1',
    header: {
      app_id:   process.env.FEISHU_APP_ID || 'cli-test',
      event_id: `verify-${Date.now()}`,
    },
    event: {
      sender: {
        sender_id: { open_id: 'verify-user-001' },
        sender_type: 'user',
        tenant_key: 'test-tenant',
      },
      message: {
        message_type: 'text',
        content:      JSON.stringify({ text: '/help' }),
        message_id:   `msg-verify-${Date.now()}`,
      },
      chat: { chat_id: 'verify-chat-001' },
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify(mockEvent),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      log('POST /webhook', `HTTP ${res.status} — server rejected the event`, 'fail');
      if (text) log('  response', text.slice(0, 200), 'info');
      exitCode = 1;
      return false;
    }

    log('POST /webhook', `HTTP ${res.status} — webhook accepted ✓`, 'ok');
    return true;
  } catch (err) {
    if (err.cause?.name === 'TimeoutError') {
      log('POST /webhook', `timed out — server not reachable at ${url}`, 'fail');
    } else {
      log('POST /webhook', `connection failed: ${err.message}`, 'fail');
    }
    exitCode = 1;
    return false;
  }
}

// ── CLI argument parsing ───────────────────────────────────────────────────

const args = process.argv.slice(2);
let serverUrl = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--server' && i + 1 < args.length) {
    serverUrl = args[i + 1];
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`Usage: node scripts/verify-setup.mjs [--server <url>]

Examples:
  node scripts/verify-setup.mjs                                           # env var + config checks
  node scripts/verify-setup.mjs --server http://localhost:8787           # + live health check + webhook test
  FEISHU_APP_ID=... FEISHU_APP_SECRET=... node scripts/verify-setup.mjs   # with inline env vars`);
    process.exit(0);
  }
}

// Run async checks
if (serverUrl) {
  const healthOk = await checkServerHealth(serverUrl);
  if (healthOk) await sendMockWebhook(serverUrl);
}

// ── Summary ───────────────────────────────────────────────────────────────

section('Summary');

if (exitCode === 0) {
  log('result', 'All checks passed ✓', 'ok');
} else {
  log('result', 'One or more checks failed — see above ✗', 'fail');
  console.log(`\n${YELLOW}Tip:${RESET} Review ${DIM}docs/troubleshooting.md${RESET} for common issues,\nor run ${DIM}bash scripts/test-webhook-local.sh all${RESET} to test webhook handling locally.`);
}

process.exit(exitCode);
