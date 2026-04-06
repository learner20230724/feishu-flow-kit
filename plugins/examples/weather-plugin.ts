/**
 * Weather Plugin — `/weather <city> [c|f]`
 *
 * Demonstrates the plugin system using wttr.in (free, no API key).
 *
 * NOTE: The plugin `handle` function is synchronous — external HTTP calls
 * cannot be made directly inside it. This plugin returns a curated wttr.in
 * URL so users can check weather themselves. For a full live implementation,
 * either (a) pre-fetch weather in `beforeProcess` and cache results, or
 * (b) call the Feishu API directly from the main webhook handler with a bot
 * token rather than through the plugin interface.
 *
 * @example
 * /weather Beijing
 * /weather Tokyo f    ← Fahrenheit; default is Celsius
 */

import type { FeishuPlugin, PluginRegistry } from '../../core/plugin-system.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(argsText: string): { city: string; unit: string } {
  const parts = argsText.trim().split(/\s+/);
  const city = parts[0] ?? '';
  const last = parts[parts.length - 1]?.toLowerCase();
  const unit = last === 'f' || last === 'c' ? last : 'c';
  return { city, unit };
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

export const weatherPlugin: FeishuPlugin = {
  name: 'weather',
  description: 'Get current weather for any city (wttr.in, no API key needed)',

  register(registry: PluginRegistry) {
    registry.registerCommand('weather', this);
    registry.registerCommand('w', this);
  },

  handle(command) {
    if (command.name !== 'weather' && command.name !== 'w') return null;

    const { city, unit } = parseArgs(command.argsText);

    if (!city) {
      return {
        ok: false,
        replyText:
          '🌤️ **Usage:** /weather <city> [c|f]\n' +
          'Examples:\n' +
          '  `/weather Beijing`     ← Celsius (default)\n' +
          '  `/weather Tokyo f`     ← Fahrenheit',
        tags: ['weather', 'error', 'usage'],
      };
    }

    // wttr.in supports ASCII art directly: https://wttr.in/:city
    const encodedCity = encodeURIComponent(city);
    const wttrUrl = `https://wttr.in/${encodedCity}?format=3`;
    const wttrJson = `https://wttr.in/${encodedCity}?format=j1`;
    const unitLabel = unit === 'f' ? '°F' : '°C';
    const toggleUnit = unit === 'f' ? 'c' : 'f';

    return {
      ok: true,
      replyText:
        `🌤️ **Weather for ${city}**\n` +
        `\n` +
        `Live view: ${wttrUrl}\n` +
        `JSON API:  ${wttrJson}\n` +
        `\n` +
        `_Feishu plugin interface does not support live HTTP fetches inside ` +
        `the synchronous \`handle\` function. For full automation, consider ` +
        `pre-fetching via \`beforeProcess\` or calling the Feishu API directly ` +
        `with a bot token from the main webhook handler._\n` +
        `\n` +
        `Toggle unit: /weather ${city} ${toggleUnit}  (currently ${unitLabel})`,
      tags: ['weather', 'example', 'wttr.in'],
    };
  },
};
