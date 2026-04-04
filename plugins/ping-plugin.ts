/**
 * Example plugin: `/ping`
 *
 * Demonstrates the minimum viable plugin: one slash command, zero dependencies.
 * Deploy it by adding the module path to `FEISHU_PLUGINS`:
 *
 *   FEISHU_PLUGINS="./plugins/ping-plugin.js"
 *
 * The plugin is registered via the `plugin` named export (the simplest option).
 * For plugins that need runtime config, use `createPlugin(config)` instead.
 */

import type { FeishuPlugin, PluginRegistry } from '../core/plugin-system.js';

function pingHandler(argsText: string): string {
  const payload = argsText.trim();
  if (!payload) return '🏓 PONG';
  return `🏓 PONG — you said: "${payload}"`;
}

export const plugin: FeishuPlugin = {
  name: 'ping',

  register(registry: PluginRegistry) {
    registry.registerCommand('ping', this);
  },

  handle(command) {
    if (command.name !== 'ping') return null;
    return {
      ok: true,
      replyText: pingHandler(command.argsText),
      tags: ['ping', 'plugin'],
    };
  },
};
