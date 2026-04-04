/**
 * Example plugin: `/poll`
 *
 * Creates a simple Feishu multi-choice poll using the Feishu Im/v1 Messages API
 * with msg_type=interactive to send a card with poll actions.
 *
 * Usage:
 *   /poll "Which project?" "Option A" "Option B" "Option C"
 *
 * The first argument is the question; remaining arguments are the options.
 * Requires `FEISHU_ENABLE_OUTBOUND_REPLY=true` and valid Feishu credentials.
 *
 * Add to FEISHU_PLUGINS:
 *   FEISHU_PLUGINS="./plugins/ping-plugin.js,./plugins/poll-plugin.js"
 */

import type { FeishuPlugin, PluginCommandResult, PluginRegistry } from '../core/plugin-system.js';
import type { FeishuMessageEvent } from '../types/feishu-event.js';
import type { WorkflowOptions } from '../workflows/run-message-workflow.js';

function buildPollCard(question: string, options: string[]): object {
  const elements = [
    {
      tag: 'markdown',
      content: `**${question}**`,
    },
    { tag: 'hr' },
    ...options.map((opt, i) => ({
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: opt,
          type: 'primary',
          value: `poll_option_${i}`,
        },
      ],
    })),
  ];

  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: '📊 Poll' },
        template: 'blue',
      },
      elements,
    },
  };
}

function parsePollCommand(argsText: string): { question: string; options: string[] } | null {
  // Supports two formats:
  //   /poll "Question" "Opt1" "Opt2"
  //   /poll Question Opt1 Opt2
  const parts = argsText
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/^["']|["']$/g, ''))
    .filter(Boolean);

  if (parts.length < 3) return null;
  const question = parts[0];
  const options = parts.slice(1);
  return { question, options };
}

export const plugin: FeishuPlugin = {
  name: 'poll',

  register(registry: PluginRegistry) {
    registry.registerCommand('poll', this);
  },

  handle(
    command: { name: string; argsText: string },
    _event: FeishuMessageEvent,
    _options: WorkflowOptions,
  ): PluginCommandResult | null {
    if (command.name !== 'poll') return null;

    const parsed = parsePollCommand(command.argsText);
    if (!parsed) {
      return {
        ok: true,
        replyText:
          '📊 **Poll**\n\n' +
          'Usage: `/poll "Question" "Option 1" "Option 2" ...`\n\n' +
          'Example: `/poll "Which project?" "Alpha" "Beta" "Gamma"`',
        tags: ['poll', 'plugin', 'usage'],
      };
    }

    const card = buildPollCard(parsed.question, parsed.options);

    return {
      ok: true,
      replyText: JSON.stringify(card, null, 2),
      tags: ['poll', 'plugin'],
    };
  },
};
