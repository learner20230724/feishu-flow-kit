import { resolve } from 'node:path';

import { buildDocCreateDraft } from './adapters/build-doc-create-draft.js';
import { loadMockMessageEvent } from './adapters/load-mock-message-event.js';
import { loadConfig } from './config/load-config.js';
import { createLogger } from './core/logger.js';
import { startWebhookServer } from './server/start-webhook-server.js';
import { runMessageWorkflow } from './workflows/run-message-workflow.js';

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  logger.info('feishu-flow-kit bootstrap', {
    botName: config.botName,
    mockMode: config.mockMode,
    mockEventPath: config.mockEventPath,
    hasAppId: Boolean(config.appId),
    hasAppSecret: Boolean(config.appSecret),
    webhookPort: config.webhookPort,
    enableOutboundReply: config.enableOutboundReply,
    enableDocCreate: config.enableDocCreate,
    enableTableCreate: config.enableTableCreate,
    hasBitableAppToken: Boolean(config.bitableAppToken),
    hasBitableTableId: Boolean(config.bitableTableId),
    bitableListFieldMode: config.bitableListFieldMode,
    bitableOwnerFieldMode: config.bitableOwnerFieldMode,
    bitableEstimateFieldMode: config.bitableEstimateFieldMode,
    bitableDueFieldMode: config.bitableDueFieldMode,
    bitableDoneFieldMode: config.bitableDoneFieldMode,
    bitableAttachmentFieldMode: config.bitableAttachmentFieldMode,
    bitableLinkFieldMode: config.bitableLinkFieldMode,
  });

  if (config.mockMode) {
    const mockEventPath = resolve(process.cwd(), config.mockEventPath);
    const event = await loadMockMessageEvent(mockEventPath);
    const result = runMessageWorkflow(event, {
      bitableListFieldMode: config.bitableListFieldMode,
      bitableOwnerFieldMode: config.bitableOwnerFieldMode,
      bitableEstimateFieldMode: config.bitableEstimateFieldMode,
      bitableDueFieldMode: config.bitableDueFieldMode,
      bitableDoneFieldMode: config.bitableDoneFieldMode,
      bitableAttachmentFieldMode: config.bitableAttachmentFieldMode,
    bitableLinkFieldMode: config.bitableLinkFieldMode,
    });

    logger.info('mock event loaded', {
      type: event.type,
      chatType: event.message.chatType,
      text: event.message.text,
    });

    const docCreateDraft =
      config.enableDocCreate && result.hasDocCreateDraft && result.docTopic && result.docMarkdown
        ? buildDocCreateDraft(result.docTopic, result.docMarkdown)
        : undefined;
    const tableRecordDraft =
      config.enableTableCreate && result.hasTableRecordDraft ? result.tableRecordDraft : undefined;

    logger.info('workflow result', {
      ok: result.ok,
      tags: result.tags,
      replyText: result.replyText,
      hasDocCreateDraft: Boolean(docCreateDraft),
      hasTableRecordDraft: Boolean(tableRecordDraft),
    });

    console.log('\n--- mock workflow reply ---\n');
    console.log(result.replyText);

    if (docCreateDraft) {
      console.log('\n--- mock doc create draft ---\n');
      console.log(JSON.stringify(docCreateDraft, null, 2));
    }

    if (tableRecordDraft) {
      console.log('\n--- mock table record draft ---\n');
      console.log(JSON.stringify(tableRecordDraft, null, 2));
    }

    return;
  }

  logger.info('starting local webhook server');
  startWebhookServer(config);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
