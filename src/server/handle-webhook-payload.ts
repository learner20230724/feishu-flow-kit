import type { AppConfig, TenantConfig } from '../config/load-config.js';
import { resolveTenantConfig } from '../config/load-config.js';
import type { PluginContext } from '../core/plugin-system.js';
import { adaptWebhookMessageEvent } from '../adapters/adapt-webhook-message-event.js';
import { buildDocCreateDraft } from '../adapters/build-doc-create-draft.js';
import { buildReplyMessageDraft } from '../adapters/build-reply-message-draft.js';
import { maybeCreateDoc } from '../adapters/maybe-create-doc.js';
import { maybeCreateTableRecord } from '../adapters/maybe-create-table-record.js';
import { maybeSendReplyMessage } from '../adapters/maybe-send-reply-message.js';
import { runMessageWorkflow } from '../workflows/run-message-workflow.js';

interface UrlVerificationPayload {
  type?: string;
  challenge?: string;
}

interface FeishuWebhookEnvelope {
  header?: {
    tenant_key?: string;
    event_type?: string;
    create_time?: string;
  };
}

export interface WebhookHandlerResult {
  statusCode: number;
  body: Record<string, unknown>;
}

function isUrlVerificationPayload(payload: unknown): payload is UrlVerificationPayload {
  if (!payload || typeof payload !== 'object') return false;
  const input = payload as Record<string, unknown>;
  return input.type === 'url_verification' && typeof input.challenge === 'string';
}

function extractTenantKey(payload: unknown): string {
  const envelope = payload as FeishuWebhookEnvelope | undefined;
  return envelope?.header?.tenant_key ?? 'unknown';
}

function resolveTenantFromKey(
  config: AppConfig,
  tenantKey: string,
): TenantConfig | null {
  if (!config.tenants || config.tenants.length === 0) return null;
  const tenant = config.tenants.find(t => t.tenantKey === tenantKey);
  if (!tenant) {
    throw new Error(
      `No tenant registered for tenantKey "${tenantKey}". ` +
        `Registered tenantKeys: [${config.tenants.map(t => `"${t.tenantKey}"`).join(', ')}]. ` +
        `Check that the FEISHU_TENANTS env var includes an entry for this tenant.`,
    );
  }
  return tenant;
}

/**
 * Build the plugin hook object passed into `runMessageWorkflow`.
 * Returns undefined when no plugins are loaded (zero overhead).
 */
function buildPluginHooks(
  pluginContext: PluginContext | undefined,
): Parameters<typeof runMessageWorkflow>[2] | undefined {
  if (!pluginContext || pluginContext.plugins.length === 0) return undefined;

  const { plugins, registry } = pluginContext;

  return {
    beforeProcess(event) {
      for (const plugin of plugins) {
        if (plugin.beforeProcess) {
          try {
            const result = plugin.beforeProcess(event, {} as AppConfig);
            if (result === false) return false;
          } catch (err) {
            console.error(`[plugin] ${plugin.name}.beforeProcess() threw:`, err);
          }
        }
      }
    },

    handleViaPlugin(command, event, options) {
      // Check if a plugin has registered this command.
      const owner = registry.getCommand(command.name);
      if (owner?.handle) {
        try {
          const result = owner.handle(command, event, options);
          if (result) {
            return {
              ok: result.ok,
              replyText: result.replyText,
              tags: [...result.tags ?? [], `plugin:${owner.name}`],
              docTopic: result.docTopic,
              docMarkdown: result.docMarkdown,
              hasDocCreateDraft: result.hasDocCreateDraft,
              hasTableRecordDraft: result.hasTableRecordDraft,
              tableRecordTitle: result.tableRecordTitle,
            };
          }
        } catch (err) {
          console.error(`[plugin] ${owner.name}.handle() threw:`, err);
          return {
            ok: false,
            replyText: `⚠️ Plugin "${owner.name}" errored while handling /${command.name}.`,
            tags: ['plugin-error'],
          };
        }
      }
      return null;
    },

    onCommandResult(result) {
      for (const plugin of plugins) {
        if (plugin.onCommandResult) {
          try {
            plugin.onCommandResult(result, {} as never);
          } catch (err) {
            console.error(`[plugin] ${plugin.name}.onCommandResult() threw:`, err);
          }
        }
      }
    },

    afterProcess(event, result) {
      for (const plugin of plugins) {
        if (plugin.afterProcess) {
          try {
            plugin.afterProcess(event, result, {} as AppConfig);
          } catch (err) {
            console.error(`[plugin] ${plugin.name}.afterProcess() threw:`, err);
          }
        }
      }
    },
  };
}

export async function handleWebhookPayload(
  payload: unknown,
  config?: AppConfig,
  pluginContext?: PluginContext,
): Promise<WebhookHandlerResult> {
  if (isUrlVerificationPayload(payload)) {
    return {
      statusCode: 200,
      body: { challenge: payload.challenge },
    };
  }

  const tenantKey = extractTenantKey(payload);

  let effectiveConfig: AppConfig;
  if (!config) {
    effectiveConfig = {} as AppConfig;
  } else if (!config.tenants || config.tenants.length === 0) {
    effectiveConfig = config;
  } else {
    const tenant = resolveTenantFromKey(config, tenantKey);
    if (!tenant) {
      return {
        statusCode: 403,
        body: {
          ok: false,
          error: `Unknown tenant: "${tenantKey}". This bot is not configured for that tenant.`,
        },
      };
    }
    effectiveConfig = resolveTenantConfig(config, tenant) as AppConfig;
  }

  const event = adaptWebhookMessageEvent(payload);
  if (!event) {
    return {
      statusCode: 400,
      body: { ok: false, error: 'Unsupported or invalid webhook payload.' },
    };
  }

  const pluginHooks = buildPluginHooks(pluginContext);

  const workflow = runMessageWorkflow(
    event,
    {
      lang: event.language,
      bitableListFieldMode: effectiveConfig.bitableListFieldMode,
      bitableOwnerFieldMode: effectiveConfig.bitableOwnerFieldMode,
      bitableEstimateFieldMode: effectiveConfig.bitableEstimateFieldMode,
      bitableDueFieldMode: effectiveConfig.bitableDueFieldMode,
      bitableDoneFieldMode: effectiveConfig.bitableDoneFieldMode,
      bitableAttachmentFieldMode: effectiveConfig.bitableAttachmentFieldMode,
      bitableLinkFieldMode: effectiveConfig.bitableLinkFieldMode,
      bitableFieldNames: {
        title: effectiveConfig.bitableTitleFieldName,
        list: effectiveConfig.bitableListFieldName,
        details: effectiveConfig.bitableDetailsFieldName,
        owner: effectiveConfig.bitableOwnerFieldName,
        estimate: effectiveConfig.bitableEstimateFieldName,
        due: effectiveConfig.bitableDueFieldName,
        done: effectiveConfig.bitableDoneFieldName,
        attachment: effectiveConfig.bitableAttachmentFieldName,
        linkedRecords: effectiveConfig.bitableLinkedRecordsFieldName,
        sourceCommand: effectiveConfig.bitableSourceCommandFieldName,
      },
    },
    pluginHooks,
  );

  const replyDraft = buildReplyMessageDraft(event.message.messageId, workflow.replyText);
  const docCreateDraft =
    workflow.docTopic && workflow.docMarkdown
      ? buildDocCreateDraft(workflow.docTopic, workflow.docMarkdown)
      : null;
  const tableRecordDraft = workflow.hasTableRecordDraft ? workflow.tableRecordDraft ?? null : null;

  const outboundReply = await maybeSendReplyMessage(
    {
      appId: effectiveConfig.appId,
      appSecret: effectiveConfig.appSecret,
      enableOutboundReply: effectiveConfig.enableOutboundReply,
    },
    replyDraft,
  );

  const docCreate = docCreateDraft
    ? await maybeCreateDoc(
        {
          appId: effectiveConfig.appId,
          appSecret: effectiveConfig.appSecret,
          enableDocCreate: effectiveConfig.enableDocCreate,
        },
        docCreateDraft,
      )
    : docCreateDraft
      ? { attempted: false, skippedReason: 'No doc create config provided.' }
      : null;

  const tableCreate = tableRecordDraft
    ? await maybeCreateTableRecord(
        {
          appId: effectiveConfig.appId,
          appSecret: effectiveConfig.appSecret,
          enableTableCreate: effectiveConfig.enableTableCreate,
          bitableAppToken: effectiveConfig.bitableAppToken,
          bitableTableId: effectiveConfig.bitableTableId,
        },
        tableRecordDraft,
      )
    : tableRecordDraft
      ? { attempted: false, skippedReason: 'No table create config provided.' }
      : null;

  return {
    statusCode: 200,
    body: {
      ok: workflow.ok,
      eventType: event.type,
      tenantKey: event.tenantKey,
      messageId: event.message.messageId,
      tags: workflow.tags,
      replyText: workflow.replyText,
      replyDraft,
      docCreateDraft,
      tableRecordDraft,
      docCreate,
      tableCreate,
      outboundReply,
      loadedPlugins: pluginContext?.plugins.map(p => p.name) ?? [],
    },
  };
}
