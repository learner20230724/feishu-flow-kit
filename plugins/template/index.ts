/**
 * Plugin template — your-new-plugin
 * ==================================
 * Copy this directory to `plugins/your-new-plugin/` and customise it.
 *
 * This template demonstrates every FeishuPlugin lifecycle hook:
 *   • register()       — claim slash command names
 *   • beforeProcess()   — pre-filter or tag events
 *   • handle()         — respond to a slash command
 *   • onCommandResult()— intercept / transform built-in results
 *   • afterProcess()   — fire-and-forget side-effects
 *
 * Two export patterns are supported:
 *   1. Named `plugin` export (simple, stateless) — used when your plugin
 *      has no runtime config and can be a singleton.
 *   2. `createPlugin(config)` factory (recommended) — use when your plugin
 *      needs per-tenant config, API credentials, or lazy initialisation.
 *
 * To activate, add the path to FEISHU_PLUGINS in your .env:
 *   FEISHU_PLUGINS="./plugins/ping-plugin.js,./plugins/template/index.js"
 *
 * Run the CLI scaffolder to generate a tailored plugin in one command:
 *   node scripts/create-plugin.mjs my-awesome-plugin
 */

export { plugin } from './plugin.js';
