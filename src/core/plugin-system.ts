/**
 * Plugin System — feishu-flow-kit
 * =================================
 *
 * Allows extending the bot with custom slash commands and event processors
 * without modifying core source code. Plugins are loaded from module paths
 * specified via the `FEISHU_PLUGINS` environment variable (comma-separated list
 * of importable module specifiers, e.g. `"/plugins/my-command.js\"` or
 * `"@my-org/feishu-poll-plugin"`).
 *
 * Each plugin is a plain object that conforms to the `FeishuPlugin` interface.
 * Plugins can:
 *
 *  1. **Register new slash commands** — add handlers for any `/name` command
 *     that integrates into the existing draft → adapter pipeline.
 *
 *  2. **Intercept existing commands** — transform or replace the result of a
 *     built-in command (todo, doc, table) via `onCommandResult`.
 *
 *  3. **Post-process the reply text** — mutate `replyText` after the workflow
 *     has resolved, useful for translations, profanity filters, formatting.
 *
 *  4. **React to events** — run side-effects after a message is handled
 *     (e.g. post to an external webhook, update a third-party system).
 *
 * Lifecycle order for a single message event:
 *
 *   loadPlugins()
 *     ↓ (once, on server start)
 *   plugin.register(registry)
 *     ↓ (per event)
 *   plugin.beforeProcess(event, config)
 *     ↓ (per command match)
 *   plugin.handle(command, event, options)   ← new command registration
 *     ↓ (after built-in workflow runs)
 *   plugin.onCommandResult(result, event)     ← intercept existing commands
 *     ↓ (after all handlers)
 *   plugin.afterProcess(event, result)        ← side-effects / post-processing
 *
 * If a plugin throws, the error is caught by the server and recorded via
 * Sentry (if configured) without crashing the webhook handler.
 */

import type { FeishuMessageEvent } from '../types/feishu-event.js';
import type { WorkflowOptions, WorkflowResult } from '../workflows/run-message-workflow.js';
import type { AppConfig } from '../config/load-config.js';

// ─── Plugin interface ─────────────────────────────────────────────────────────

/**
 * Return value from a plugin's command handler. Returning `null` means the
 * plugin did not handle this command, allowing subsequent plugins or the
 * built-in handler to run.
 */
export interface PluginCommandResult {
  ok: boolean;
  replyText: string;
  /** Tags are merged into the result's tags array. */
  tags?: string[];
  docTopic?: string;
  docMarkdown?: string;
  hasDocCreateDraft?: boolean;
  hasTableRecordDraft?: boolean;
  tableRecordTitle?: string;
}

export interface FeishuPlugin {
  /**
   * Human-readable plugin name. Shown in logs and /status output.
   * Must be unique across all loaded plugins.
   */
  name: string;

  /**
   * Called once when the plugin is first loaded, before any events are
   * processed. Use this to validate plugin configuration, set up connections,
   * or register dynamic command handlers that depend on runtime config.
   *
   * @param registry — use `registry.registerCommand(name, handler)` to
   *                  claim a slash command name for this plugin.
   */
  register(registry: PluginRegistry): void;

  /**
   * Called before the core workflow runs for each incoming event.
   * Use for pre-processing, filtering, or rejecting events early.
   * Return `false` to skip the entire workflow for this event.
   */
  beforeProcess?(event: FeishuMessageEvent, config: AppConfig): boolean | void;

  /**
   * Handle a slash command dispatched by the workflow.
   * Return `null` to defer to the next handler (built-in or later plugin).
   * Return a `PluginCommandResult` to produce a reply.
   */
  handle?(
    command: { name: string; argsText: string },
    event: FeishuMessageEvent,
    options: WorkflowOptions,
  ): PluginCommandResult | null;

  /**
   * Called after the core workflow (or a plugin `handle`) has produced a
   * `WorkflowResult`. Allows plugins to transform or annotate the result.
   *
   * Mutate `result.replyText` or `result.tags` in place. Throw to abort
   * and return an error reply instead.
   */
  onCommandResult?(
    result: WorkflowResult,
    event: FeishuMessageEvent,
  ): void;

  /**
   * Called after all handlers have finished, whether they succeeded or threw.
   * Ideal for side-effects: external webhooks, analytics, follow-up API calls.
   * Throw to record an error without crashing the webhook response.
   */
  afterProcess?(
    event: FeishuMessageEvent,
    result: WorkflowResult,
    config: AppConfig,
  ): void;
}

// ─── Plugin registry ──────────────────────────────────────────────────────────

export class PluginRegistry {
  private commands = new Map<string, FeishuPlugin>();

  /**
   * Register a slash command handler for `name` (e.g. `"poll"` for `/poll`).
   * If multiple plugins register the same name, the first wins — no override.
   */
  registerCommand(name: string, plugin: FeishuPlugin): void {
    if (this.commands.has(name)) {
      throw new Error(
        `Plugin "${plugin.name}" tried to register command "/${name}" ` +
          `but it is already registered by "${this.commands.get(name)!.name}".`,
      );
    }
    this.commands.set(name, plugin);
  }

  /** Returns the plugin that owns command `name`, or undefined. */
  getCommand(name: string): FeishuPlugin | undefined {
    return this.commands.get(name);
  }

  /** All registered command names. */
  getCommandNames(): string[] {
    return [...this.commands.keys()];
  }

  /** Number of registered plugins. */
  get size(): number {
    return this.commands.size;
  }
}

// ─── Plugin loader ───────────────────────────────────────────────────────────

/**
 * Load and instantiate all plugins listed in `FEISHU_PLUGINS` (comma-separated
 * module specifiers). Each module is imported via a dynamic `import()` call.
 * The module must export a `createPlugin` factory or a default `FeishuPlugin`
 * instance named `plugin`.
 *
 * Factory signature:
 *   `createPlugin(config: AppConfig): FeishuPlugin | Promise<FeishuPlugin>`
 *
 * If the module exports only a default instance, it is used directly.
 *
 * @returns Plugins in the order they appear in FEISHU_PLUGINS.
 */
export async function loadPlugins(
  env: NodeJS.ProcessEnv = process.env,
): Promise<FeishuPlugin[]> {
  const spec = env.FEISHU_PLUGINS?.trim();
  if (!spec) return [];

  const specs = spec.split(',').map((s) => s.trim()).filter(Boolean);
  const plugins: FeishuPlugin[] = [];

  for (const moduleSpec of specs) {
    try {
      const mod = await import(/* @vite-ignore */ moduleSpec) as {
        createPlugin?: (config: AppConfig) => FeishuPlugin | Promise<FeishuPlugin>;
        default?: FeishuPlugin;
        plugin?: FeishuPlugin;
      };

      let plugin: FeishuPlugin | undefined;

      if (typeof mod.createPlugin === 'function') {
        plugin = await mod.createPlugin({} as AppConfig);
      } else if (mod.default) {
        plugin = mod.default as FeishuPlugin;
      } else if (mod.plugin) {
        plugin = mod.plugin as FeishuPlugin;
      } else {
        console.warn(
          `[plugin-system] Module "${moduleSpec}" exports nothing recognised. ` +
            `Expected a \`createPlugin\` factory, a \`default\`, or a \`plugin\` export.`,
        );
        continue;
      }

      if (!plugin || typeof plugin.name !== 'string' || typeof plugin.register !== 'function') {
        throw new Error(
          `Plugin exported from "${moduleSpec}" does not conform to FeishuPlugin ` +
            `(missing \`name\` string or \`register\` function).`,
        );
      }

      plugins.push(plugin);
    } catch (err) {
      // Log but don't crash — a bad plugin shouldn't kill the whole server.
      console.error(`[plugin-system] Failed to load plugin "${moduleSpec}":`, err);
    }
  }

  return plugins;
}

/**
 * Initialise the plugin registry by calling `register()` on every plugin
 * in the order they were loaded. Plugins register their slash commands by
 * calling `registry.registerCommand()`.
 */
export function initPluginRegistry(plugins: FeishuPlugin[]): PluginRegistry {
  const registry = new PluginRegistry();
  for (const plugin of plugins) {
    try {
      plugin.register(registry);
    } catch (err) {
      console.error(`[plugin-system] Plugin "${plugin.name}" register() threw:`, err);
    }
  }
  return registry;
}

// ─── Plugin context (carried through the lifecycle) ─────────────────────────

export interface PluginContext {
  plugins: FeishuPlugin[];
  registry: PluginRegistry;
}

/** Build a PluginContext for a given set of loaded plugins. */
export function buildPluginContext(plugins: FeishuPlugin[]): PluginContext {
  return {
    plugins,
    registry: initPluginRegistry(plugins),
  };
}
