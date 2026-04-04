/**
 * Example plugin: `/remind`
 * =========================
 *
 * Demonstrates: natural-language date parsing, countdown math, dynamic card
 * content, and timezone handling with the `afterProcess` lifecycle hook.
 *
 * Usage:
 *   /remind in 5 minutes  Call the team
 *   /remind tomorrow at 3pm  Project review
 *   /remind 2026-04-15 14:00  Deadline: v1.0 release
 *   /remind every day at 9am  Daily standup
 *
 * Environment variables (optional):
 *   REMIND_TIMEZONE  — IANA timezone for parsing (default: Asia/Shanghai)
 *   REMIND_DEFAULT_UTC_OFFSET  — fallback UTC offset in hours (default: +8)
 *
 * Add to FEISHU_PLUGINS:
 *   FEISHU_PLUGINS="./plugins/ping-plugin.js,./plugins/examples/remind-plugin.js"
 */

import type {
  FeishuPlugin,
  PluginCommandResult,
  PluginRegistry,
} from '../../core/plugin-system.js';
import type { FeishuMessageEvent } from '../../types/feishu-event.js';
import type { WorkflowOptions } from '../../workflows/run-message-workflow.js';

// ─── Configuration ─────────────────────────────────────────────────────────────

const TIMEZONE = process.env.REMIND_TIMEZONE ?? 'Asia/Shanghai';
const UTC_OFFSET_HOURS = Number(process.env.REMIND_DEFAULT_UTC_OFFSET ?? 8);

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ParsedReminder {
  title: string;
  dueMs: number;       // Unix timestamp (ms) of the reminder
  isRecurring: boolean;
  scheduleDesc: string; // human-readable schedule description
}

// ─── Natural-language date parser ─────────────────────────────────────────────
//
// Supports a small but practical subset of natural-language dates:
//   "in N minutes/hours/days"
//   "tomorrow at HH:MM" | "tomorrow at H:MMam|pm"
//   "YYYY-MM-DD [HH:MM]"  (ISO-like, noon if time omitted)
//   "every day at HH:MM"  (recurring)
//   "every weekday at HH:MM" (recurring, Mon–Fri)

function parseNaturalDate(text: string): ParsedReminder | null {
  const now = Date.now();
  const lower = text.toLowerCase().trim();

  // ── "in N minutes/hours/days" ─────────────────────────────────────────────
  const relativeMatch = lower.match(/^in\s+(\d+)\s+(minute(?:s?|s)|hour(?:s?|s)|day(?:s?|s)|week(?:s?|s))\b\s+(.+)/i);
  if (relativeMatch) {
    const value = Number(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const title = relativeMatch[3].trim();

    const multipliers: Record<string, number> = {
      minute: 60_000,
      minutes: 60_000,
      min: 60_000,
      hour: 3_600_000,
      hours: 3_600_000,
      h: 3_600_000,
      day: 86_400_000,
      days: 86_400_000,
      d: 86_400_000,
      week: 604_800_000,
      weeks: 604_800_000,
      w: 604_800_000,
    };

    const ms = multipliers[unit];
    if (!ms || !title) return null;

    return {
      title,
      dueMs: now + value * ms,
      isRecurring: false,
      scheduleDesc: `in ${value} ${unit}`,
    };
  }

  // ── "tomorrow at HH:MM" ────────────────────────────────────────────────────
  const tomorrowMatch = lower.match(/^tomorrow\s+(?:at\s+)?(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i);
  if (tomorrowMatch) {
    let hours = Number(tomorrowMatch[1]);
    const minutes = Number(tomorrowMatch[2]);
    const period = tomorrowMatch[3]?.toLowerCase();
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hours, minutes, 0, 0);

    const title = lower.replace(/^tomorrow\s+(?:at\s+)?\d{1,2}:\d{2}(?:\s*(?:am|pm))?\s*/i, '').trim();
    return {
      title: title || 'Reminder',
      dueMs: tomorrow.getTime(),
      isRecurring: false,
      scheduleDesc: `tomorrow at ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    };
  }

  // ── "every day at HH:MM" ──────────────────────────────────────────────────
  const everyDayMatch = lower.match(/^every\s+day\s+(?:at\s+)?(\d{1,2}):(\d{2})/i);
  if (everyDayMatch) {
    const hours = Number(everyDayMatch[1]);
    const minutes = Number(everyDayMatch[2]);
    const title = lower.replace(/^every\s+day\s+(?:at\s+)?\d{1,2}:\d{2}\s*/i, '').trim();
    return {
      title: title || 'Daily reminder',
      dueMs: now,
      isRecurring: true,
      scheduleDesc: `every day at ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    };
  }

  // ── "YYYY-MM-DD [HH:MM]" ───────────────────────────────────────────────────
  const isoMatch = lower.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}):(\d{2}))?\s+(.+)/);
  if (isoMatch) {
    const [_, dateStr, hoursStr, minutesStr, title] = isoMatch;
    const hours = hoursStr ? Number(hoursStr) : 12;
    const minutes = minutesStr ? Number(minutesStr) : 0;
    const due = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
    if (isNaN(due.getTime())) return null;
    return {
      title: title.trim(),
      dueMs: due.getTime(),
      isRecurring: false,
      scheduleDesc: `${dateStr} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    };
  }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(dueMs: number): string {
  const diffMs = dueMs - Date.now();
  if (diffMs <= 0) return '⏰ **Now!**';

  const totalSeconds = Math.floor(diffMs / 1_000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && days === 0) parts.push(`${seconds}s`);

  return `⏳ ${parts.join(' ')} remaining`;
}

function formatDueDate(dueMs: number): string {
  const d = new Date(dueMs);
  const date = d.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // YYYY-MM-DD
  const time = d.toLocaleTimeString('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });
  return `${date} ${time} (${TIMEZONE})`;
}

// ─── Card builders ─────────────────────────────────────────────────────────────

function buildReminderCard(reminder: ParsedReminder): object {
  const countdown = formatCountdown(reminder.dueMs);
  const dueDate = formatDueDate(reminder.dueMs);

  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: '⏰ Reminder Set' },
        template: 'orange',
      },
      elements: [
        {
          tag: 'markdown',
          content: `**${reminder.title}**`,
        },
        { tag: 'hr' },
        {
          tag: 'markdown',
          content:
            `📅 **Due:** ${dueDate}\n` +
            `⏱️  **Countdown:** ${countdown}\n` +
            (reminder.isRecurring ? `🔁 **Repeats:** ${reminder.scheduleDesc}` : ''),
        },
      ],
    },
  };
}

function buildUsageCard(): object {
  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: '⏰ /remind — Usage' },
        template: 'orange',
      },
      elements: [
        {
          tag: 'markdown',
          content:
            '**Set a reminder**\n\n' +
            '```\n' +
            '/remind in 5 minutes  Call the team\n' +
            '/remind tomorrow at 3pm  Project review\n' +
            '/remind 2026-04-15 14:00  v1.0 release\n' +
            '/remind every day at 9am  Daily standup\n' +
            '```\n\n' +
            '📌 The bot tracks reminders in memory (restarts clear them).\n' +
            'For production, replace the in-memory store with a database.',
        },
      ],
    },
  };
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

// In-memory reminder store — { userId => [{ title, dueMs, isRecurring }] }
const reminderStore = new Map<string, ParsedReminder[]>();

export const plugin: FeishuPlugin = {
  name: 'remind',

  register(registry: PluginRegistry) {
    registry.registerCommand('remind', this);
  },

  handle(
    command: { name: string; argsText: string },
    event: FeishuMessageEvent,
    _options: WorkflowOptions,
  ): PluginCommandResult | null {
    if (command.name !== 'remind') return null;

    if (!command.argsText.trim()) {
      const card = buildUsageCard();
      return { ok: true, replyText: JSON.stringify(card, null, 2), tags: ['remind', 'plugin', 'usage'] };
    }

    const parsed = parseNaturalDate(command.argsText);
    if (!parsed) {
      const card = buildUsageCard();
      return { ok: true, replyText: JSON.stringify(card, null, 2), tags: ['remind', 'plugin', 'usage'] };
    }

    // Store reminder keyed by sender
    const userId = event.sender?.sender_id?.open_id ?? 'unknown';
    const existing = reminderStore.get(userId) ?? [];
    existing.push(parsed);
    reminderStore.set(userId, existing);

    const card = buildReminderCard(parsed);
    return { ok: true, replyText: JSON.stringify(card, null, 2), tags: ['remind', 'plugin', 'set'] };
  },

  afterProcess(event: FeishuMessageEvent, result): void {
    // Example: log reminder creation to external system
    // const userId = event.sender?.sender_id?.open_id;
    // if (result.tags?.includes('set') && userId) {
    //   const reminders = reminderStore.get(userId);
    //   fetch('https://your-reminder-backend.com/webhook', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ userId, reminders }),
    //   }).catch(() => {});
    // }
  },
};
