#!/usr/bin/env node
/**
 * scripts/create-plugin.mjs
 * ==========================
 * Scaffold a new feishu-flow-kit plugin from the built-in template.
 *
 * Usage:
 *   node scripts/create-plugin.mjs my-plugin-name
 *   node scripts/create-plugin.mjs my-plugin-name --path ./plugins
 *
 * The scaffolder copies `plugins/template/` to `plugins/<name>/` and
 * performs the following substitutions:
 *
 *   - Directory name  : template → <name>
 *   - index.ts        : 'template' → '<name>' (in import path)
 *   - plugin.ts       : 'template' → '<name>'
 *   - plugin.ts       : 'your-new-plugin' → '<name>'
 *   - README.md       : all references updated
 *
 * It also updates FEISHU_PLUGINS in .env (appends the new plugin path) if
 * a .env file exists at --path level.
 *
 * The scaffolder never overwrites an existing plugin directory.
 */

import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { argv } from 'node:process';

// ── CLI parsing ──────────────────────────────────────────────────────────────

const args = argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
create-plugin.mjs — scaffold a new feishu-flow-kit plugin
=========================================================

Usage:
  node scripts/create-plugin.mjs <plugin-name> [options]

Arguments:
  plugin-name    The snake-case name of your plugin (e.g. "github-notify")

Options:
  --path <dir>   Base directory containing plugins/ (default: repo root)
  --dry-run      Show what would be done without writing files
  --help, -h     Show this help message

Examples:
  node scripts/create-plugin.mjs github-notify
  node scripts/create-plugin.mjs slack-alert --path ./plugins
  node scripts/create-plugin.mjs my-plugin --dry-run
`);
  process.exit(0);
}

const dryRun = args.includes('--dry-run');
const pathIdx = args.indexOf('--path');
const baseDir = pathIdx !== -1 && args[pathIdx + 1]
  ? resolve(args[pathIdx + 1])
  : resolve(import.meta.dirname, '..');

const pluginName = args.find((a) => !a.startsWith('--'));
if (!pluginName) {
  console.error('Error: plugin name is required (use --help for usage).');
  process.exit(1);
}

// Validate plugin name (alphanumeric + hyphens/underscores)
if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(pluginName)) {
  console.error(`Error: "${pluginName}" is not a valid plugin name.`);
  console.error('Use letters, numbers, hyphens and underscores (must start with a letter).');
  process.exit(1);
}

const templateDir = join(baseDir, 'plugins', 'template');
const targetDir = join(baseDir, 'plugins', pluginName);
const envFile = join(baseDir, '.env');

if (!existsSync(templateDir)) {
  console.error(`Error: template directory not found at ${templateDir}`);
  console.error('Run this script from the feishu-flow-kit repo root.');
  process.exit(1);
}

if (existsSync(targetDir)) {
  console.error(`Error: plugin "${pluginName}" already exists at ${targetDir}`);
  console.error('Remove it first with: rm -rf plugins/${pluginName}');
  process.exit(1);
}

// ── Substitution helpers ──────────────────────────────────────────────────────

function substitute(text, name) {
  return text
    .replaceAll('template', name)
    .replaceAll('your-new-plugin', name)
    .replaceAll('your_new_plugin', name.replace(/-/g, '_'));
}

function processFile(srcPath, dstPath, name) {
  const content = readFileSync(srcPath, 'utf8');
  const processed = substitute(content, name);
  if (dryRun) {
    console.log(`  [dry-run] would write: ${dstPath}`);
  } else {
    mkdirSync(join(dstPath, '..'), { recursive: true });
    writeFileSync(dstPath, processed);
  }
}

// ── Scaffold ──────────────────────────────────────────────────────────────────

console.log(`\n🧩  Scaffolding plugin: ${pluginName}`);
console.log(`    base:  ${baseDir}`);
if (dryRun) console.log('    mode:  DRY RUN (no files written)\n');

// 1. Copy template recursively
const copyOps = [];

function walkDir(src, dst) {
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const dstName = substitute(entry.name, pluginName);
    const dstPath = join(dst, dstName);
    if (entry.isDirectory()) {
      mkdirSync(dstPath, { recursive: true });
      walkDir(srcPath, dstPath);
    } else {
      // Text files: substitute; binary files: copy raw
      const textExtensions = ['.ts', '.js', '.mjs', '.md', '.json', '.yml', '.yaml', '.sh'];
      const isText = textExtensions.some((ext) => dstName.endsWith(ext));
      if (isText) {
        processFile(srcPath, dstPath, pluginName);
      } else {
        if (dryRun) {
          console.log(`  [dry-run] would copy: ${dstPath}`);
        } else {
          cpSync(srcPath, dstPath);
        }
      }
    }
  }
}

walkDir(templateDir, targetDir);

// 2. Append FEISHU_PLUGINS entry to .env if it exists
const envEntry = `\n# Plugin: ${pluginName}\nFEISHU_PLUGINS="${pluginName}/index.js"\n`;

if (existsSync(envFile)) {
  const envContent = readFileSync(envFile, 'utf8');
  if (!envContent.includes(`FEISHU_PLUGINS="${pluginName}/index.js"`)) {
    if (dryRun) {
      console.log(`  [dry-run] would append FEISHU_PLUGINS entry to .env`);
    } else {
      appendFileSync(envFile, envEntry);
      console.log('  ✓ Updated .env with FEISHU_PLUGINS entry');
    }
  }
} else {
  console.log('  ⚠  No .env file found — skipping FEISHU_PLUGINS update');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`
✅  Plugin "${pluginName}" scaffolded at:
    ${targetDir}

Next steps:
  1. Edit plugins/${pluginName}/plugin.ts — implement your slash command
  2. Edit plugins/${pluginName}/.env.example — document your env vars
  3. If you didn't use --dry-run, FEISHU_PLUGINS in .env has been updated
  4. Run: npm test
  5. Restart the server — /${pluginName} is live!
`);

import { readdirSync } from 'node:fs';
