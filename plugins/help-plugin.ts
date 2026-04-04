/**
 * Built-in plugin: `/help`
 *
 * Dynamically lists all registered slash commands and the plugin that owns each.
 * This makes the plugin system self-documenting — adding a new plugin automatically
 * extends the `/help` output.
 *
 * Add to FEISHU_PLUGINS (it's always available when the plugin system is enabled):
 *   FEISHU_PLUGINS="./plugins/help-plugin.js,./plugins/ping-plugin.js,./plugins/poll-plugin.js"
 */

import type { FeishuPlugin, PluginCommandResult, PluginRegistry } from '../core/plugin-system.js';

// Built-in commands bundled with the core (not loaded via FEISHU_PLUGINS).
const BUILT_IN_COMMANDS: Array<{ name: string; description: string }> = [
  { name: 'doc', description: 'Create a Feishu Doc with markdown content' },
  { name: 'table', description: 'Draft a Feishu Bitable table record' },
  { name: 'todo', description: 'Create a Feishu task' },
];

export const plugin: FeishuPlugin = {
  name: 'help',

  register(registry: PluginRegistry) {
    registry.registerCommand('help', this);
    // Store the registry so handle() can query it at runtime.
    (this as any).__registry = registry;
  },

  handle(command): PluginCommandResult | null {
    if (command.name !== 'help') return null;

    const registry = (this as any).__registry as PluginRegistry;
    const registeredCommands = registry.getCommandNames();

    // Map registered commands to their owning plugin name.
    const pluginCommands = registeredCommands.map((name) => {
      const owner = registry.getCommand(name)!;
      return { name, ownerName: owner.name };
    });

    // Build the help text.
    const lines: string[] = [
      '**📖 Available Commands**',
      '',
    ];

    // Built-in commands.
    if (BUILT_IN_COMMANDS.length > 0) {
      lines.push('**Built-in**');
      for (const { name, description } of BUILT_IN_COMMANDS) {
        lines.push(`  /${name} — ${description}`);
      }
      lines.push('');
    }

    // Plugin-registered commands.
    if (pluginCommands.length > 0) {
      lines.push('**Plugins**');
      for (const { name, ownerName } of pluginCommands) {
        if (name === 'help') continue; // Don't list /help under plugins.
        lines.push(`  /${name} — (from plugin: *${ownerName}*)`);
      }
    }

    lines.push('');
    lines.push(
      `Tip: Add plugins via the \`FEISHU_PLUGINS\` environment variable. ` +
        `See docs/plugin-system.md for details.`,
    );

    return {
      ok: true,
      replyText: lines.join('\n'),
      tags: ['help', 'plugin', 'builtin'],
    };
  },
};
