#!/usr/bin/env node
/**
 * feishu-flow-kit Interactive Demo
 * Run: node scripts/demo-interactive.mjs [--speed fast|normal|slow]
 * 
 * Shows the complete feishu-flow-kit experience:
 *   1. Server startup sequence
 *   2. Incoming webhook event
 *   3. Command processing
 *   4. Feishu card responses
 */

import { setTimeout as sleep } from 'timers/promises';

const SPEED = process.argv.includes('--speed=fast') ? 80
  : process.argv.includes('--speed=slow') ? 500
  : 280; // normal default

// ── Helpers ──────────────────────────────────────────────────────────────────

const ESC = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  italic:  '\x1b[3m',
  red:     '\x1b[38;5;203m',
  green:   '\x1b[38;5;120m',
  yellow:  '\x1b[38;5;228m',
  blue:    '\x1b[38;5;75m',
  magenta: '\x1b[38;5;207m',
  cyan:    '\x1b[38;5;87m',
  white:   '\x1b[38;5;15m',
  gray:    '\x1b[38;5;246m',
  dark:    '\x1b[38;5;59m',
  bg: {
    dark:   '\x1b[48;5;17m',
    header: '\x1b[48;5;31m',
    ok:     '\x1b[48;5;22m',
    warn:   '\x1b[48;5;58m',
    info:   '\x1b[48;5;55m',
  },
  line:    '\x1b[2K\r',   // clear line, CR
};

const delay = (ms = SPEED) => sleep(ms);

const print = (text = '', { flush = false } = {}) => {
  process.stdout.write(text + (flush ? '' : '\n'));
};

const printLine = (text = '') => process.stdout.write(ESC.line + text);

const typewrite = async (text, { prefix = '', suffix = '' } = {}) => {
  for (const char of text) {
    process.stdout.write(prefix + char + suffix + ESC.reset + ESC.line);
    await delay();
  }
};

const clearScreen = () => {
  process.stdout.write('\x1b[2J\x1b[H');
};

// ── Sections ─────────────────────────────────────────────────────────────────

async function header() {
  clearScreen();
  print();
  print(`  ${ESC.bg.header}                                                                        ${ESC.reset}`);
  print(`  ${ESC.bg.header}   ██████╗ ██╗      ██████╗  ██████╗███████╗███████╗███████╗       ${ESC.reset}`);
  print(`  ${ESC.bg.header}   ██╔══██╗██║     ██╔═══██╗██╔════╝██╔════╝██╔════╝██╔════╝       ${ESC.reset}`);
  print(`  ${ESC.bg.header}   ██████╔╝██║     ██║   ██║██║     █████╗  ███████╗███████╗       ${ESC.reset}`);
  print(`  ${ESC.bg.header}   ██╔═══╝ ██║     ██║   ██║██║     ██╔══╝  ╚════██║╚════██║       ${ESC.reset}`);
  print(`  ${ESC.bg.header}   ██║     ███████╗╚██████╔╝╚██████╗███████╗███████║███████║       ${ESC.reset}`);
  print(`  ${ESC.bg.header}   ╚═╝     ╚══════╝ ╚═════╝  ╚═════╝╚══════╝╚══════╝╚══════╝       ${ESC.reset}`);
  print(`  ${ESC.bg.header}                    ${ESC.white}${ESC.bold}Webhook Automation Starter Kit${ESC.reset} ${ESC.bg.header}                   ${ESC.reset}`);
  print(`  ${ESC.bg.header}                              ${ESC.dim}for Feishu / Lark${ESC.reset} ${ESC.bg.header}                           ${ESC.reset}`);
  print(`  ${ESC.bg.header}                                                                        ${ESC.reset}`);
  print();
  await delay(SPEED * 2);
}

async function showPrerequisites() {
  print(`${ESC.bold}${ESC.cyan}▶  PREREQUISITES${ESC.reset}`);
  print(`${ESC.gray}${'─'.repeat(72)}${ESC.reset}`);
  
  const checks = [
    { label: 'Node.js',      value: 'v22.22.0',     status: 'ok' },
    { label: 'npm',          value: '10.9.0',       status: 'ok' },
    { label: '.env file',    value: 'configured',    status: 'ok' },
    { label: 'Feishu App',   value: 'webhook + msg permissions', status: 'ok' },
    { label: 'ngrok (opt)',  value: 'recommended for local dev', status: 'warn' },
  ];

  for (const c of checks) {
    const icon = c.status === 'ok' ? `${ESC.green}✓` : `${ESC.yellow}⚠`;
    printLine(`  ${icon} ${ESC.white}${c.label.padEnd(16)}${ESC.gray}→${ESC.reset} ${ESC.dim}${c.value}${ESC.reset}`);
    await delay();
  }
  print();
  await delay(SPEED);
}

async function showQuickStart() {
  print(`${ESC.bold}${ESC.cyan}▶  QUICK START (3 steps)${ESC.reset}`);
  print(`${ESC.gray}${'─'.repeat(72)}${ESC.reset}`);

  const steps = [
    { cmd: 'npm install',             note: 'Install dependencies' },
    { cmd: 'cp .env.example .env',   note: 'Configure credentials' },
    { cmd: 'npm start',              note: 'Launch webhook server' },
  ];

  for (const [i, s] of steps.entries()) {
    printLine(`${ESC.dark}  ${i + 1}.${ESC.reset} `);
    await delay(SPEED / 2);
    process.stdout.write(`${ESC.dark}  ${i + 1}.${ESC.reset} `);
    printLine(`${ESC.bold}${ESC.yellow}${s.cmd}${ESC.reset}  ${ESC.dim}${s.note}${ESC.reset}`);
    await delay();
  }
  print();
  await delay(SPEED);
}

async function showServerStartup() {
  print(`${ESC.bold}${ESC.cyan}▶  STEP 1 — SERVER STARTUP${ESC.reset}`);
  print(`${ESC.gray}${'─'.repeat(72)}${ESC.reset}`);
  
  const lines = [
    { text: '$ npm start',           color: ESC.yellow },
    { text: '',                      color: ESC.reset },
    { text: '> feishu-flow-kit@1.0.2 start', color: ESC.dim },
    { text: '> node --watch src/index.js',   color: ESC.dim },
    { text: '',                      color: ESC.reset },
  ];

  for (const l of lines) {
    printLine(`  ${l.color}${l.text}${ESC.reset}`);
    await delay(SPEED / 2);
  }

  // Animated loader
  const frames = ['◐', '◓', '◑', '◒'];
  for (let i = 0; i < 6; i++) {
    printLine(`  ${ESC.magenta}${frames[i % 4]}${ESC.reset}  ${ESC.dim}Starting webhook server…${ESC.reset}`);
    await delay(SPEED);
  }

  // Success lines
  const okLines = [
    { label: 'Environment',    value: 'loaded (production)' },
    { label: 'Port',           value: '8787' },
    { label: 'ngrok',          value: 'https://abc123.ngrok.io → localhost:8787' },
    { label: 'Plugins',        value: 'help, ping, poll  (3 loaded)' },
    { label: 'Commands',       value: '/doc, /table, /todo, /help, /ping, /poll' },
    { label: 'i18n',           value: 'en, zh (auto-detect)' },
    { label: 'Ready',          value: '✓', color: ESC.green },
  ];

  print();
  for (const l of okLines) {
    const col = l.color || ESC.cyan;
    printLine(`  ${ESC.green}✓${ESC.reset}  ${ESC.bold}${col}${l.label.padEnd(16)}${ESC.reset} ${ESC.gray}→${ESC.reset} ${ESC.white}${l.value}${ESC.reset}`);
    await delay(SPEED * 0.6);
  }

  print();
  await delay(SPEED * 1.5);
}

async function showWebhookEvent() {
  print(`${ESC.bold}${ESC.cyan}▶  STEP 2 — WEBHOOK EVENT RECEIVED${ESC.reset}`);
  print(`${ESC.gray}${'─'.repeat(72)}${ESC.reset}`);
  
  print(`  ${ESC.dim}POST /webhook  body excerpt:${ESC.reset}`);
  print();

  const eventLines = [
    { indent: '  ', text: '{', color: ESC.dark },
    { indent: '  ', text: '  "event": {', color: ESC.dark },
    { indent: '  ', text: '    "type": "im.message.receive_v1",', color: ESC.dark },
    { indent: '  ', text: '    "message": {', color: ESC.dark },
    { indent: '  ', text: '      "message_type": "text",', color: ESC.dark },
    { indent: '  ', text: '      "content": "{\\"text\\":\\"/doc Project Q3 plan\\"}"', color: ESC.cyan },
    { indent: '  ', text: '    },', color: ESC.dark },
    { indent: '  ', text: '    "sender": { "sender_id": { "open_id": "ou_xxx" }, "sender_type": "user" },', color: ESC.dark },
    { indent: '  ', text: '    "schema": "2.0",', color: ESC.dark },
    { indent: '  ', text: '    "create_time": "1743795820000"', color: ESC.dark },
    { indent: '  ', text: '  },', color: ESC.dark },
    { indent: '  ', text: '  "header": { "tenant_key": "company_a" }', color: ESC.dark },
    { indent: '  ', text: '}', color: ESC.dark },
  ];

  for (const l of eventLines) {
    printLine(`  ${l.color}${l.text}${ESC.reset}`);
    await delay(SPEED * 0.3);
  }

  print();
  printLine(`  ${ESC.green}◀ 200 OK${ESC.reset}  ${ESC.dim}(18ms)${ESC.reset}`);
  await delay(SPEED);
}

async function showProcessing() {
  print();
  print(`${ESC.bold}${ESC.cyan}▶  STEP 3 — COMMAND PROCESSING${ESC.reset}`);
  print(`${ESC.gray}${'─'.repeat(72)}${ESC.reset}`);

  const pipeline = [
    { step: 'webhook',        icon: '📥', label: 'Parse webhook payload',     detail: 'extract tenant key + message content' },
    { step: 'router',         icon: '🔀', label: 'Route to /doc handler',     detail: 'schema-aware command dispatch' },
    { step: 'schema-fetch',   icon: '📋', label: 'Fetch target doc schema',   detail: 'GET /docx/v1/documents/{doc_token}' },
    { step: 'content-parse',  icon: '✂',  label: 'Parse command args',        detail: '"Project Q3 plan" → doc title' },
    { step: 'draft-build',    icon: '📝', label: 'Build Feishu Doc draft',    detail: 'title + H1 heading + TOC placeholder' },
    { step: 'reply',          icon: '📤', label: 'Send card reply',          detail: 'Preview card with [Open Doc] button' },
  ];

  for (const p of pipeline) {
    printLine(`  ${ESC.magenta}${p.icon}${ESC.reset}  ${ESC.bold}${ESC.white}${p.step.padEnd(16)}${ESC.reset} ${ESC.gray}→${ESC.reset}  ${p.label}`);
    await delay(SPEED * 0.5);
    printLine(`  ${ESC.dark}${' '.repeat(32)}  ${ESC.dim}${p.detail}${ESC.reset}`);
    await delay(SPEED * 0.5);
  }

  print();
  await delay(SPEED);
}

async function showFeishuCard() {
  print(`${ESC.bold}${ESC.cyan}▶  STEP 4 — FEISHU CARD RESPONSE${ESC.reset}`);
  print(`${ESC.gray}${'─'.repeat(72)}${ESC.reset}`);
  print(`  ${ESC.dim}Posted to Feishu as im.message.create_v1:${ESC.reset}`);
  print();

  // Feishu card frame
  const borderColor = '6366F1';
  printLine(`  ${ESC.dark}╔${'═'.repeat(48)}╗${ESC.reset}`);
  printLine(`  ${ESC.dark}║${ESC.reset} ${ESC.bold}${ESC.white}📄 Doc Draft${ESC.reset}${' '.repeat(36)}${ESC.dark}║${ESC.reset}`);
  printLine(`  ${ESC.dark}╠${'═'.repeat(48)}╣${ESC.reset}`);
  
  const cardBody = [
    { icon: '📌', label: 'Title',    value: 'Project Q3 Plan' },
    { icon: '👤', label: 'Author',   value: 'Claw Bot' },
    { icon: '📅', label: 'Created',  value: 'Apr 4, 2026' },
  ];

  for (const row of cardBody) {
    const padding = 48 - row.label.length - row.value.length - 4;
    printLine(`  ${ESC.dark}║${ESC.reset}   ${ESC.magenta}${row.icon}${ESC.reset} ${ESC.gray}${row.label}:${ESC.reset} ${ESC.white}${row.value}${' '.repeat(Math.max(1, padding))}${ESC.dark}║${ESC.reset}`);
    await delay(SPEED * 0.4);
  }

  printLine(`  ${ESC.dark}╠${'═'.repeat(48)}╣${ESC.reset}`);
  
  // Action buttons
  const actions = [
    { label: '[ Open Doc Draft ]', color: ESC.blue },
    { label: '[ View Stats ]',      color: ESC.cyan },
  ];
  
  for (const a of actions) {
    printLine(`  ${ESC.dark}║${ESC.reset}   ${a.color}${a.label}${ESC.reset}${' '.repeat(48 - a.label.length - 4)}${ESC.dark}║${ESC.reset}`);
    await delay(SPEED * 0.4);
  }

  printLine(`  ${ESC.dark}╚${'═'.repeat(48)}╝${ESC.reset}`);
  print();

  await delay(SPEED);
}

async function showAllCommands() {
  print(`${ESC.bold}${ESC.cyan}▶  AVAILABLE COMMANDS${ESC.reset}`);
  print(`${ESC.gray}${'─'.repeat(72)}${ESC.reset}`);
  print();

  const commands = [
    { cmd: '/doc <title>',       desc: 'Create a Feishu Doc draft with title + H1 + TOC',     tag: 'Built-in' },
    { cmd: '/table <name>',      desc: 'Create a Bitable table record (schema-aware)',        tag: 'Built-in' },
    { cmd: '/todo <item>',      desc: 'Add a todo item to the shared todo list',             tag: 'Built-in' },
    { cmd: '/help',             desc: 'List all available commands',                         tag: 'Built-in' },
    { cmd: '/greeting [name]',  desc: 'Greet a user with a card (doc or table mode)',        tag: 'Plugin'  },
    { cmd: '/ping',             desc: 'Health check ping — replies with latency',            tag: 'Plugin'  },
    { cmd: '/poll "<question>"','desc': 'Create an interactive Feishu poll card',            tag: 'Plugin'  },
  ];

  // Header
  printLine(`  ${ESC.bold}${ESC.gray}${'Command'.padEnd(22)} Description${' '.repeat(28)} Tag${ESC.reset}`);
  printLine(`  ${ESC.dark}${'─'.repeat(72)}${ESC.reset}`);

  for (const c of commands) {
    const tagColor = c.tag === 'Built-in' ? ESC.green : ESC.yellow;
    const line = `  ${ESC.cyan}${ESC.bold}${c.cmd.padEnd(22)}${ESC.reset} ${ESC.gray}${c.desc}${' '.repeat(Math.max(1, 50 - c.desc.length))}${ESC.reset}${tagColor}[${c.tag}]${ESC.reset}`;
    printLine(line);
    await delay(SPEED * 0.5);
  }

  print();
  await delay(SPEED);
}

async function showArchitecture() {
  print(`${ESC.bold}${ESC.cyan}▶  ARCHITECTURE OVERVIEW${ESC.reset}`);
  print(`${ESC.gray}${'─'.repeat(72)}${ESC.reset}`);
  print();

  const arch = [
    { row: `  ${ESC.dark}        ┌──────────────────────┐${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}        │    Feishu Cloud      │${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}        │  (events / messages) │${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}        └─────────┬────────────┘${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}                  │ POST /webhook${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}                  ▼${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}        ┌──────────────────────┐${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}        │  Webhook Server      │${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}        │  (Express / +TLS)   │${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}        │  • URL verification  │${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}        │  • Signature verify  │${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}        │  • i18n (en / zh)    │${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}        │  • Plugin registry   │${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}        └─────────┬────────────┘${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}                  │${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}     ┌────────────┼────────────┐${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}     ▼            ▼            ▼${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.blue}  /doc${ESC.reset}      ${ESC.magenta}/table${ESC.reset}     ${ESC.cyan}/todo${ESC.reset}    ${ESC.yellow}/help${ESC.reset}`, delay: SPEED * 0.5 },
    { row: `  ${ESC.dark}     │            │            │${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.dark}     ▼            ▼            ▼${ESC.reset}`, delay: SPEED / 2 },
    { row: `  ${ESC.green} Feishu API${ESC.reset}  ${ESC.green}Bitable API${ESC.reset}  ${ESC.green} Reply Card${ESC.reset}`, delay: SPEED * 0.5 },
  ];

  for (const { row, delay: d } of arch) {
    printLine(row);
    await delay(d);
  }

  print();
  await delay(SPEED);
}

async function footer() {
  print(`${ESC.gray}${'─'.repeat(72)}${ESC.reset}`);
  print();
  print(`  ${ESC.bg.ok}${ESC.white}  ✓  Live demo complete!${ESC.reset}   ${ESC.dim}Next: ${ESC.reset}${ESC.yellow}npm start${ESC.reset}${ESC.dim} to run for real.${ESC.reset}`);
  print();
  print(`  ${ESC.gray}Docs:  https://github.com/learner20230724/feishu-flow-kit${ESC.reset}`);
  print(`  ${ESC.gray}Live:  https://learner20230724.github.io/feishu-flow-kit/${ESC.reset}`);
  print();
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.stdout.isTTY) {
    // Non-interactive: just print the demo static
    await staticDemo();
    return;
  }

  await header();
  await showPrerequisites();
  await showQuickStart();
  await showServerStartup();
  await showWebhookEvent();
  await showProcessing();
  await showFeishuCard();
  await showAllCommands();
  await showArchitecture();
  await footer();
}

async function staticDemo() {
  print(`
${ESC.bold}feishu-flow-kit interactive demo${ESC.reset}

${ESC.green}✓${ESC.reset} Prerequisites check
${ESC.green}✓${ESC.reset} Quick start (3 steps)
${ESC.green}✓${ESC.reset} Server startup (ngrok + plugin loading)
${ESC.green}✓${ESC.reset} Webhook event received (im.message.receive_v1)
${ESC.green}✓${ESC.reset} Command processing pipeline
${ESC.green}✓${ESC.reset} Feishu card response (Doc Draft preview)
${ESC.green}✓${ESC.reset} Available commands (/doc, /table, /todo, /help, /greeting, /ping, /poll)
${ESC.green}✓${ESC.reset} Architecture overview

Run ${ESC.yellow}node scripts/demo-interactive.mjs${ESC.reset} in a TTY to see the animated version.
Options: ${ESC.cyan}--speed=fast${ESC.reset} or ${ESC.cyan}--speed=slow${ESC.reset}
`);
}

main().catch(console.error);
