import { readFile } from 'node:fs/promises';

import { adaptWebhookMessageEvent } from './adapt-webhook-message-event.js';
import { type FeishuMessageEvent } from '../types/feishu-event.js';

export async function loadMockMessageEvent(filePath: string): Promise<FeishuMessageEvent> {
  const raw = await readFile(filePath, 'utf8');
  const parsed: unknown = JSON.parse(raw);

  const event = adaptWebhookMessageEvent(parsed);
  if (!event) {
    throw new Error(
      `Invalid mock message event payload: ${filePath}. ` +
        `Expected raw Feishu im.message.receive_v1 envelope format with ` +
        `header.event_type, event.message.message_id, event.message.chat_id, ` +
        `event.sender.sender_id.open_id, etc.`,
    );
  }

  return event;
}
