/**
 * Type definitions for feishu-flow-kit plugins.
 *
 * These types are also available as named exports from `feishu-flow-kit`
 * (peer dependency). This file ships a standalone copy so plugin authors
 * can get IDE completion without installing feishu-flow-kit directly.
 *
 * @module plugin-template/types
 */

/**
 * Return value of a plugin's `handle()` method.
 * - Return `null` to defer to the next handler (built-in or later plugin).
 * - Return `{ ok: true, replyText: string }` to send a text or card reply.
 * - Return `{ ok: true, hasDocCreateDraft: true, docTopic, docMarkdown }`
 *   to queue a Feishu Doc creation draft.
 * - Return `{ ok: true, hasTableRecordDraft: true, tableRecordTitle }`
 *   to queue a Bitable record creation draft.
 */
export interface PluginCommandResult {
  ok: boolean;
  replyText?: string;
  tags?: string[];
  hasDocCreateDraft?: boolean;
  docTopic?: string;
  docMarkdown?: string;
  hasTableRecordDraft?: boolean;
  tableRecordTitle?: string;
  tableRecordFields?: Record<string, unknown>;
}

/**
 * Result of the built-in workflow after all plugins have run.
 * Plugins can read or mutate `replyText` and `tags` in `onCommandResult`.
 */
export interface WorkflowResult {
  replyText?: string;
  tags?: string[];
  hasDocCreateDraft?: boolean;
  docTopic?: string;
  docMarkdown?: string;
  hasTableRecordDraft?: boolean;
  tableRecordTitle?: string;
  tableRecordFields?: Record<string, unknown>;
}

/** A raw Feishu message event (same shape as the webhook payload). */
export interface FeishuMessageEvent {
  schema: string;
  header: { event_id: string; event_type: string; create_time: string; token: string; app_id: string };
  event: {
    sender?: { sender_id: { open_id: string; user_id: string; union_id: string }; sender_type: string };
    message?: { message_id: string; root_id?: string; parent_id?: string; create_time: string; chat_id: string; chat_type: string; body: { content: string }; message_type: string };
    mention?: { key: string; id: { open_id: string; user_id: string; union_id: string; name: string } }[];
  };
  language?: string;
  tenant_key?: string;
}

/** Application configuration — same shape as feishu-flow-kit's AppConfig. */
export interface AppConfig {
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
  port?: number;
  logLevel?: string;
  /** Comma-separated plugin module specifiers, e.g. "./plugins/ping-plugin.js" */
  plugins?: string;
  /** Multi-tenant: map of tenant key → per-tenant config overrides */
  tenants?: Record<string, AppConfig>;
  [key: string]: unknown;
}

/** Workflow options passed through to plugin lifecycle hooks. */
export interface WorkflowOptions {
  lang?: string;
  tenantKey?: string;
  pluginContext?: PluginContext;
}

/** Internal context built at startup from all loaded plugins. */
export interface PluginContext {
  registry: PluginRegistry;
  plugins: FeishuPlugin[];
}

/**
 * The plugin registry — used in `register()` to claim command names.
 * Throws if a command is already registered by another plugin.
 */
export interface PluginRegistry {
  registerCommand(name: string, plugin: FeishuPlugin): void;
  getCommand(name: string): FeishuPlugin | undefined;
  allCommands(): string[];
}

/**
 * Main plugin interface. Implement some or all of the lifecycle hooks.
 *
 * @example
 * ```typescript
 * export function createPlugin(_config: AppConfig): FeishuPlugin {
 *   return {
 *     name: 'my-plugin',
 *     register(registry) {
 *       registry.registerCommand('hello', pluginInstance);
 *     },
 *     handle({ name, argsText }, event, _options) {
 *       if (name !== 'hello') return null;
 *       return { ok: true, replyText: `Hello, ${argsText || 'world'}!` };
 *     },
 *   };
 * }
 * const pluginInstance: FeishuPlugin = createPlugin({});
 * export { pluginInstance };
 * ```
 */
export interface FeishuPlugin {
  /** Unique name across all loaded plugins. */
  name: string;

  /**
   * Called once on server startup.
   * Register every `/command` you handle here.
   */
  register?(registry: PluginRegistry): void;

  /**
   * Called for every incoming Feishu event, before command dispatch.
   * Return `false` to skip the entire workflow for this event.
   */
  beforeProcess?(event: FeishuMessageEvent): boolean | void;

  /**
   * Called when a registered slash command is matched.
   * Return `null` to defer to the next handler.
   * Return a `PluginCommandResult` to produce a reply or draft.
   */
  handle?(
    command: { name: string; argsText: string },
    event: FeishuMessageEvent,
    options: WorkflowOptions,
  ): PluginCommandResult | null | Promise<PluginCommandResult | null>;

  /**
   * Called after the built-in workflow produces a result, before sending.
   * Mutate `result` in place, or throw to replace the reply with an error.
   */
  onCommandResult?(result: WorkflowResult, event: FeishuMessageEvent): void | Promise<void>;

  /**
   * Called after the reply has been sent (fire-and-forget side-effects).
   * Errors are caught and logged but will not crash the webhook response.
   */
  afterProcess?(event: FeishuMessageEvent, result: WorkflowResult): void | Promise<void>;
}
