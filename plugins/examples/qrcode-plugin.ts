/**
 * Example plugin: `/qr`
 * ====================
 *
 * Demonstrates: URL parameter construction, external image-generation API,
 * Feishu card with image element, and the `beforeProcess` lifecycle hook.
 *
 * Usage:
 *   /qr https://github.com          — QR code for a URL
 *   /qr hello world                 — QR code for text (UTF-8)
 *   /qr https://github.com small    — small QR (size=150, default=300)
 *   /qr https://github.com medium   — medium QR (size=300)
 *   /qr https://github.com large    — large QR (size=600)
 *
 * Environment variables (optional):
 *   QR_API_URL   — override the QR code API (default: api.qrserver.com)
 *   QR_MAX_chars — max text length (default: 2000)
 *
 * This plugin uses the free public QR Server API (no key required).
 * For production, replace with your own hosted endpoint or paid service.
 *
 * Add to FEISHU_PLUGINS:
 *   FEISHU_PLUGINS="./plugins/ping-plugin.js,./plugins/examples/qrcode-plugin.js"
 */

import type {
  FeishuPlugin,
  PluginCommandResult,
  PluginRegistry,
} from '../../core/plugin-system.js';
import type { FeishuMessageEvent } from '../../types/feishu-event.js';
import type { WorkflowOptions } from '../../workflows/run-message-workflow.js';

// ─── Configuration ─────────────────────────────────────────────────────────────

const QR_API_BASE = process.env.QR_API_URL ?? 'https://api.qrserver.com/v1/create-qr-code/';
const MAX_CHARS = Number(process.env.QR_MAX_BYTES ?? 2_000);

type SizeKey = 'small' | 'medium' | 'large';

const SIZE_MAP: Record<SizeKey, number> = {
  small: 150,
  medium: 300,
  large: 600,
};
const DEFAULT_SIZE = 300;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildQrUrl(data: string, size: number): string {
  const encoded = encodeURIComponent(data);
  return `${QR_API_BASE}?data=${encoded}&size=${size}x${size}&format=png&margin=10`;
}

function parseQrArgs(argsText: string): { data: string; size: number } | null {
  const trimmed = argsText.trim();
  if (!trimmed) return null;

  // Detect optional size suffix: "text small|medium|large"
  const sizeMatch = trimmed.match(/^(.+?)\s+(small|medium|large)$/i);
  if (sizeMatch) {
    const data = sizeMatch[1].trim();
    const sizeKey = sizeMatch[2].toLowerCase() as SizeKey;
    return { data, size: SIZE_MAP[sizeKey] ?? DEFAULT_SIZE };
  }

  return { data: trimmed, size: DEFAULT_SIZE };
}

function buildQrCard(qrUrl: string, data: string, size: number): object {
  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: '📱 QR Code' },
        template: 'purple',
      },
      elements: [
        {
          tag: 'img',
          img_key: qrUrl,
          alt: { tag: 'plain_text', content: `QR code for: ${data.slice(0, 50)}` },
        },
        { tag: 'hr' },
        {
          tag: 'markdown',
          content:
            `**Content:** \`${data.length > 80 ? data.slice(0, 80) + '…' : data}\`\n` +
            `**Size:** ${size}×${size}px\n` +
            `**API:** [qrserver.com](https://qrserver.org/)`,
        },
      ],
    },
  };
}

function buildErrorCard(reason: string): object {
  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: '😕 QR Code Error' },
        template: 'red',
      },
      elements: [
        {
          tag: 'markdown',
          content: `Could not generate QR code.\n\n*${reason}*\n\n` +
            '**Usage:**\n```\n/qr https://example.com\n/qr hello world small\n/qr your text here medium\n```',
        },
      ],
    },
  };
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const plugin: FeishuPlugin = {
  name: 'qr',

  register(registry: PluginRegistry) {
    registry.registerCommand('qr', this);
  },

  // ── beforeProcess() — skip non-text messages ─────────────────────────────
  //
  // QR codes only make sense for text. Skipping early saves resources.
  beforeProcess(event: FeishuMessageEvent): boolean | void {
    if (event.message?.message_type !== 'text') return false;
    return;
  },

  handle(
    command: { name: string; argsText: string },
    _event: FeishuMessageEvent,
    _options: WorkflowOptions,
  ): PluginCommandResult | null {
    if (command.name !== 'qr') return null;

    const parsed = parseQrArgs(command.argsText);
    if (!parsed) {
      const card = buildErrorCard('No text provided.');
      return { ok: true, replyText: JSON.stringify(card, null, 2), tags: ['qr', 'plugin', 'usage'] };
    }

    if (parsed.data.length > MAX_CHARS) {
      const card = buildErrorCard(`Text too long (${parsed.data.length} chars, max ${MAX_CHARS}).`);
      return { ok: true, replyText: JSON.stringify(card, null, 2), tags: ['qr', 'plugin', 'error'] };
    }

    const qrUrl = buildQrUrl(parsed.data, parsed.size);
    const card = buildQrCard(qrUrl, parsed.data, parsed.size);

    return {
      ok: true,
      replyText: JSON.stringify(card, null, 2),
      tags: ['qr', 'plugin', `size-${parsed.size}`],
    };
  },
};
