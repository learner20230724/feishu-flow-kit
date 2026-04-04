import type { FeishuMessageEvent } from '../types/feishu-event.js';

interface FeishuWebhookEnvelope {
  header?: {
    event_type?: string;
    create_time?: string;
    tenant_key?: string;
  };
  event?: {
    message?: {
      message_id?: string;
      chat_id?: string;
      chat_type?: string;
      content?: string;
      create_time?: string;
    };
    sender?: {
      sender_id?: {
        open_id?: string;
      };
      /** ISO 639-1 language code, e.g. "en", "zh", "ja". */
      language?: string;
    };
  };
}

function parseMessageText(content: string | undefined): string {
  if (!content) return '';

  try {
    const parsed = JSON.parse(content) as { text?: string };
    return typeof parsed.text === 'string' ? parsed.text : content;
  } catch {
    return content;
  }
}

export function adaptWebhookMessageEvent(payload: unknown): FeishuMessageEvent | null {
  if (!payload || typeof payload !== 'object') return null;

  const input = payload as FeishuWebhookEnvelope;
  if (input.header?.event_type !== 'im.message.receive_v1') return null;

  const message = input.event?.message;
  const senderOpenId = input.event?.sender?.sender_id?.open_id;
  if (!message?.message_id || !message.chat_id || !senderOpenId) return null;

  return {
    type: 'message.received',
    timestamp: message.create_time || input.header?.create_time || new Date().toISOString(),
    tenantKey: input.header?.tenant_key || 'unknown_tenant',
    language: input.event?.sender?.language,
    message: {
      messageId: message.message_id,
      chatId: message.chat_id,
      chatType: message.chat_type || 'group',
      senderId: senderOpenId,
      text: parseMessageText(message.content),
    },
    context: {
      source: 'feishu-webhook',
      notes: 'Adapted from im.message.receive_v1 payload',
    },
  };
}
