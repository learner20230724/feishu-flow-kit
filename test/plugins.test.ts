/**
 * test/plugins.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the built-in plugin system: /help, /ping, /poll.
 *
 * These tests call plugin.handle() directly, so no server or Feishu API
 * is needed — they run fast and in isolation.
 *
 * Run:  node --test test/plugins.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { initPluginRegistry } from '../src/core/plugin-system.ts';
import { plugin as helpPlugin } from '../plugins/help-plugin.ts';
import { plugin as pingPlugin } from '../plugins/ping-plugin.ts';
import { plugin as pollPlugin } from '../plugins/poll-plugin.ts';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCommand(name: string, argsText = ''): { name: string; argsText: string } {
  return { name, argsText };
}

// ── /ping ─────────────────────────────────────────────────────────────────────

test('/ping returns PONG with no args', () => {
  const result = pingPlugin.handle!(makeCommand('ping', ''), {} as never, {} as never);
  assert.equal(result?.ok, true);
  assert.equal(result?.replyText, '🏓 PONG');
  assert.deepEqual(result?.tags, ['ping', 'plugin']);
});

test('/ping with args returns PONG plus the payload', () => {
  const result = pingPlugin.handle!(makeCommand('ping', 'hello world'), {} as never, {} as never);
  assert.equal(result?.ok, true);
  assert.equal(result?.replyText, '🏓 PONG — you said: "hello world"');
});

test('/ping returns null for unknown command (passthrough)', () => {
  const result = pingPlugin.handle!(makeCommand('pong', ''), {} as never, {} as never);
  assert.equal(result, null);
});

// ── /poll ─────────────────────────────────────────────────────────────────────

test('/poll with 3+ space-separated args returns an interactive card', () => {
  // parsePollCommand splits on whitespace; first word = question, rest = options.
  const result = pollPlugin.handle!(
    makeCommand('poll', 'Which Alpha Beta Gamma'),
    {} as never,
    {} as never,
  );
  assert.equal(result?.ok, true);
  assert.ok(result?.replyText.includes('"msg_type": "interactive"'));
  assert.ok(result?.replyText.includes('**Which**'));   // question in bold
  assert.ok(result?.replyText.includes('Alpha'));
  assert.ok(result?.replyText.includes('Beta'));
  assert.ok(result?.replyText.includes('Gamma'));
  assert.ok(result?.replyText.includes('📊 Poll'));
});

test('/poll with single-quoted multi-word question parses correctly', () => {
  // Quoted parts: '"Which' → 'Which', 'project?"' → 'project?"' (end quote stripped).
  // So "Which" is question, "project?" + Alpha + Beta + Gamma = 4 options.
  const result = pollPlugin.handle!(
    makeCommand('poll', '"Which project?" "Alpha" "Beta" "Gamma"'),
    {} as never,
    {} as never,
  );
  assert.equal(result?.ok, true);
  assert.ok(result?.replyText.includes('"msg_type": "interactive"'));
  assert.ok(result?.replyText.includes('**Which**'));
  // project?" appears because end-quote is stripped but trailing ? remains.
  assert.ok(result?.replyText.includes('project?'));
});

test('/poll with < 3 args returns usage instructions', () => {
  const result = pollPlugin.handle!(makeCommand('poll', 'Question OnlyOne'), {} as never, {} as never);
  assert.equal(result?.ok, true);
  assert.ok(result?.replyText.includes('Usage:'));
  assert.ok(result?.replyText.includes('/poll'));
});

test('/poll with no args returns usage instructions', () => {
  const result = pollPlugin.handle!(makeCommand('poll', ''), {} as never, {} as never);
  assert.equal(result?.ok, true);
  assert.ok(result?.replyText.includes('Usage:'));
});

test('/poll returns null for unknown command (passthrough)', () => {
  const result = pollPlugin.handle!(makeCommand('vote', 'test'), {} as never, {} as never);
  assert.equal(result, null);
});

// ── /help ─────────────────────────────────────────────────────────────────────

test('/help returns a list of all registered commands', () => {
  // Register ping and poll alongside help so we can verify they appear in output.
  const registry = initPluginRegistry([helpPlugin, pingPlugin, pollPlugin]);

  const result = helpPlugin.handle!(makeCommand('help'), {} as never, {} as never, registry as never);

  assert.equal(result?.ok, true);
  assert.ok(result?.replyText.includes('📖 Available Commands'));
  // Built-in commands should appear.
  assert.ok(result?.replyText.includes('/doc'));
  assert.ok(result?.replyText.includes('/table'));
  assert.ok(result?.replyText.includes('/todo'));
  // Plugin-registered commands should appear (ping, poll — not help itself).
  assert.ok(result?.replyText.includes('/ping'));
  assert.ok(result?.replyText.includes('/poll'));
  // /help should NOT list itself under Plugins.
  assert.ok(!result?.replyText.includes('/help\n'));
});

test('/help includes the FEISHU_PLUGINS tip', () => {
  const registry = initPluginRegistry([helpPlugin]);
  const result = helpPlugin.handle!(makeCommand('help'), {} as never, {} as never, registry as never);
  assert.ok(result?.replyText.includes('FEISHU_PLUGINS'));
  assert.ok(result?.replyText.includes('plugin-system.md'));
});

test('/help returns null for unknown command (passthrough)', () => {
  const result = helpPlugin.handle!(makeCommand('halp'), {} as never, {} as never, {} as never);
  assert.equal(result, null);
});

// ── Plugin registry ───────────────────────────────────────────────────────────

test('initPluginRegistry registers commands and getCommand returns the owning plugin', () => {
  const registry = initPluginRegistry([pingPlugin, pollPlugin]);
  assert.equal(registry.getCommand('ping'), pingPlugin);
  assert.equal(registry.getCommand('poll'), pollPlugin);
  assert.equal(registry.getCommand('help'), undefined); // not registered
});

test('initPluginRegistry.getCommandNames returns all registered names', () => {
  const registry = initPluginRegistry([helpPlugin, pingPlugin, pollPlugin]);
  const names = registry.getCommandNames();
  assert.ok(names.includes('help'));
  assert.ok(names.includes('ping'));
  assert.ok(names.includes('poll'));
  assert.equal(names.filter((n) => n === 'help').length, 1); // only registered once
});
