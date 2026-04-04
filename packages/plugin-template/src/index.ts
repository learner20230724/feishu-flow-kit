/**
 * @feishu/plugin-template
 * =======================
 *
 * Official starter template for building a feishu-flow-kit plugin.
 *
 * Quick start:
 *   npx @feishu/plugin-template my-github-notify
 *
 * Or copy this package into your feishu-flow-kit/plugins/ directory and edit.
 *
 * Two export patterns are supported:
 *   1. Named `plugin` export (simple, stateless)
 *   2. `createPlugin(config)` factory (recommended when you need config at startup)
 *
 * To activate a plugin in feishu-flow-kit, add its path to FEISHU_PLUGINS in .env:
 *   FEISHU_PLUGINS="./plugins/ping-plugin.js,./plugins/my-plugin/dist/index.js"
 */

// Re-export all plugin types for convenience
export type {
  FeishuPlugin,
  PluginCommandResult,
  PluginRegistry,
  WorkflowResult,
  WorkflowOptions,
  FeishuMessageEvent,
  AppConfig,
  PluginContext,
} from './types.js';

// Re-export the singleton plugin instance (named export pattern)
export { plugin } from './plugin.js';

// Re-export the factory (factory pattern)
export { createPlugin } from './plugin.js';
