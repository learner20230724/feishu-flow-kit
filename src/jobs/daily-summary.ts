/**
 * src/jobs/daily-summary.ts
 *
 * Daily scheduled summary bot — run via cron or as a standalone script.
 * Usage: node --import tsx src/jobs/daily-summary.ts <FEISHU_CHAT_ID>
 *
 * This file is the reference implementation for Recipe 3
 * ("Daily Scheduled Summary Bot") in docs/recipes.md.
 *
 * The cron entry point is:
 *   0 9 * * 1-5 cd /opt/feishu-flow-kit && node --import tsx src/jobs/daily-summary.ts <FEISHU_CHAT_ID>
 */

import { getTenantAccessToken } from '../adapters/get-tenant-access-token.js';
import { loadConfig } from '../config/load-config.js';

/**
 * Sends a daily summary message to the specified Feishu chat.
 */
export async function sendDailySummary(channelId: string): Promise<void> {
  const config = loadConfig();
  const token = await getTenantAccessToken({
    appId: config.appId,
    appSecret: config.appSecret,
  });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lines = [
    `📅 **Daily Summary — ${today}**`,
    '',
    '• Tasks due today: 3',
    '• Docs created: 1',
    '• Open issues: 7',
    '',
    'Have a great day!',
  ];

  const payload = {
    receive_id_type: 'chat_id',
    msg_type: 'text',
    content: JSON.stringify({ text: lines.join('\n') }),
  };

  const resp = await fetch(
    'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `Failed to send summary (${resp.status}): ${body}`
    );
  }

  console.log(`[daily-summary] Sent summary to chat ${channelId}`);
}

// CLI entry point — run directly:
//   node --import tsx src/jobs/daily-summary.ts <FEISHU_CHAT_ID>
const channelId = process.argv[2];
if (!channelId) {
  console.error(
    'Usage: node --import tsx src/jobs/daily-summary.ts <FEISHU_CHAT_ID>\n' +
    'Example: node --import tsx src/jobs/daily-summary.ts oc_xxxxx'
  );
  process.exit(1);
}

sendDailySummary(channelId).catch((err) => {
  console.error('[daily-summary] Error:', err);
  process.exit(1);
});
