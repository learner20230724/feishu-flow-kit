import { readFile } from 'node:fs/promises';

import { isFeishuMessageEvent, type FeishuMessageEvent } from '../types/feishu-event.js';

export async function loadMockMessageEvent(filePath: string): Promise<FeishuMessageEvent> {
  const raw = await readFile(filePath, 'utf8');
  const parsed: unknown = JSON.parse(raw);

  if (!isFeishuMessageEvent(parsed)) {
    throw new Error(`Invalid mock message event payload: ${filePath}`);
  }

  return parsed;
}
