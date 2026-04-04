export interface FeishuMessageEvent {
  type: 'message.received';
  timestamp: string;
  tenantKey: string;
  /** ISO 639-1 language code of the sender, e.g. "en", "zh", "ja". */
  language?: string;
  message: {
    messageId: string;
    chatId: string;
    chatType: 'p2p' | 'group' | string;
    senderId: string;
    text: string;
  };
  context?: {
    source?: string;
    notes?: string;
  };
}

export function isFeishuMessageEvent(value: unknown): value is FeishuMessageEvent {
  if (!value || typeof value !== 'object') return false;

  const event = value as Record<string, unknown>;
  const message = event.message as Record<string, unknown> | undefined;

  return (
    event.type === 'message.received' &&
    typeof event.timestamp === 'string' &&
    typeof event.tenantKey === 'string' &&
    !!message &&
    typeof message.messageId === 'string' &&
    typeof message.chatId === 'string' &&
    typeof message.senderId === 'string' &&
    typeof message.text === 'string'
  );
}
