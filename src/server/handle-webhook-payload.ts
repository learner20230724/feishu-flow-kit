import type { AppConfig } from '../config/load-config.js';
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

export interface WebhookHandlerResult {
  statusCode: number;
  body: Record<string, unknown>;
}

function isUrlVerificationPayload(payload: unknown): payload is UrlVerificationPayload {
  if (!payload || typeof payload !== 'object') return false;

  const input = payload as Record<string, unknown>;
  return input.type === 'url_verification' && typeof input.challenge === 'string';
}

export async function handleWebhookPayload(
  payload: unknown,
  config?: Pick<
    AppConfig,
    | 'appId'
    | 'appSecret'
    | 'enableOutboundReply'
    | 'enableDocCreate'
    | 'enableTableCreate'
    | 'bitableAppToken'
    | 'bitableTableId'
  >,
): Promise<WebhookHandlerResult> {
  if (isUrlVerificationPayload(payload)) {
    return {
      statusCode: 200,
      body: {
        challenge: payload.challenge,
      },
    };
  }

  const event = adaptWebhookMessageEvent(payload);
  if (!event) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        error: 'Unsupported or invalid webhook payload.',
      },
    };
  }

  const workflow = runMessageWorkflow(event);
  const replyDraft = buildReplyMessageDraft(event.message.messageId, workflow.replyText);
  const docCreateDraft =
    workflow.docTopic && workflow.docMarkdown
      ? buildDocCreateDraft(workflow.docTopic, workflow.docMarkdown)
      : null;
  const tableRecordDraft = workflow.hasTableRecordDraft ? workflow.tableRecordDraft ?? null : null;

  const outboundReply = config
    ? await maybeSendReplyMessage(
        {
          appId: config.appId,
          appSecret: config.appSecret,
          enableOutboundReply: config.enableOutboundReply,
        },
        replyDraft,
      )
    : {
        attempted: false,
        skippedReason: 'No outbound reply config provided.',
      };

  const docCreate =
    config && docCreateDraft
      ? await maybeCreateDoc(
          {
            appId: config.appId,
            appSecret: config.appSecret,
            enableDocCreate: config.enableDocCreate ?? false,
          },
          docCreateDraft,
        )
      : docCreateDraft
        ? { attempted: false, skippedReason: 'No doc create config provided.' }
        : null;

  const tableCreate =
    config && tableRecordDraft
      ? await maybeCreateTableRecord(
          {
            appId: config.appId,
            appSecret: config.appSecret,
            enableTableCreate: config.enableTableCreate ?? false,
            bitableAppToken: config.bitableAppToken ?? '',
            bitableTableId: config.bitableTableId ?? '',
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
      messageId: event.message.messageId,
      tags: workflow.tags,
      replyText: workflow.replyText,
      replyDraft,
      docCreateDraft,
      tableRecordDraft,
      docCreate,
      tableCreate,
      outboundReply,
    },
  };
}
