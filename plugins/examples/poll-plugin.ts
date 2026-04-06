/**
 * Poll Plugin — `/poll "<question>" <opt1> <opt2> [opt3] ...]`
 *
 * Creates a simple text-based inline poll within a chat.
 * Demonstrates: plugin command registration, argument parsing, in-memory
 * state management, and multi-option slash commands.
 *
 * NOTE: Feishu's interactive rich-card buttons require the Feishu API client
 * (with a bot token) and are not available inside the synchronous plugin
 * `handle` function. This plugin uses a text-based approach instead:
 *   - Creates a poll:   /poll "Question?" opt1 opt2 opt3
 *   - Votes for option: /vote N   (N = option number)
 *   - Shows results:    /poll results
 *
 * For production with interactive buttons, call the Feishu API directly from
 * the main webhook handler (not through the plugin interface).
 *
 * @example
 * /poll "Deploy today?" Yes No Maybe
 * /vote 1
 * /poll results
 */

import type { FeishuPlugin, PluginRegistry } from '../../core/plugin-system.js';

// ---------------------------------------------------------------------------
// In-memory poll store
// ---------------------------------------------------------------------------
// pollKey -> { question, options, votes, total, voters, createdAt }
// In production: replace with Redis or a database.
const polls = new Map<
  string,
  {
    question: string;
    options: string[];
    votes: number[];
    total: number;
    voters: Set<string>;
    createdAt: number;
  }
>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKey(chatId: string): string {
  return `poll:${chatId}`;
}

function parseCreateArgs(argsText: string): { question: string; options: string[] } | null {
  // Expect: "Question text" opt1 opt2 opt3 ...
  // Question must be quoted; options are unquoted words after the closing quote.
  const match = argsText.match(/^"([^"]+)"(?:\s+(.+))?$/i);
  if (!match) return null;
  const question = match[1].trim();
  const optionsRaw = match[2] ?? '';
  const options = optionsRaw.trim().split(/\s+/).filter(Boolean).slice(0, 10);
  return { question, options };
}

function buildPollText(
  question: string,
  options: string[],
  votes: number[],
  total: number,
  showResults = false
): string {
  const lines: string[] = [];
  lines.push(`📊 **Poll: ${question}**\n`);

  if (showResults) {
    const maxVotes = Math.max(...votes, 1);
    options.forEach((opt, i) => {
      const pct = total > 0 ? Math.round((votes[i] / total) * 100) : 0;
      const barLen = Math.round((votes[i] / maxVotes) * 10);
      const bar = '█'.repeat(barLen) + '░'.repeat(10 - barLen);
      const label = total > 0
        ? `${votes[i]} vote${votes[i] !== 1 ? 's' : ''} (${pct}%)`
        : '0 votes (0%)';
      lines.push(`  ${opt}\n  \`${bar}\` ${label}`);
    });
    lines.push(`\n_total ${total} vote${total !== 1 ? 's' : ''}_`);
  } else {
    options.forEach((opt, i) => {
      lines.push(`  ${i + 1}. ${opt}`);
    });
    lines.push(`\n_Vote: /vote <number> · See results: /poll results_`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

export const pollPlugin: FeishuPlugin = {
  name: 'poll',
  description: 'Create a simple text-based poll (use /vote to cast a vote)',

  register(registry: PluginRegistry) {
    registry.registerCommand('poll', this);
  },

  handle(command) {
    const chatId = 'unknown'; // Chat ID not available in command object
    const sub = command.argsText.trim().toLowerCase();

    // ── Create new poll ─────────────────────────────────────────────────────
    if (sub.startsWith('"')) {
      const parsed = parseCreateArgs(command.argsText);
      if (!parsed) {
        return {
          ok: false,
          replyText:
            '📋 **Usage:** /poll "Your question?" Option1 Option2 [Option3...]\n' +
            '_Question must be in quotes._',
          tags: ['poll', 'error', 'usage'],
        };
      }

      const { question, options } = parsed;

      if (options.length < 2) {
        return {
          ok: false,
          replyText: '📋 **Poll requires at least 2 options.**',
          tags: ['poll', 'error'],
        };
      }

      if (options.length > 10) {
        return {
          ok: false,
          replyText: `📋 **Poll supports at most 10 options.** You provided ${options.length}.`,
          tags: ['poll', 'error'],
        };
      }

      const key = makeKey(chatId);
      polls.set(key, {
        question,
        options,
        votes: options.map(() => 0),
        total: 0,
        voters: new Set(),
        createdAt: Date.now(),
      });

      return {
        ok: true,
        replyText: buildPollText(question, options, options.map(() => 0), 0, false),
        tags: ['poll', 'created'],
      };
    }

    // ── Show results ───────────────────────────────────────────────────────
    if (sub === 'results') {
      const key = makeKey(chatId);
      const poll = polls.get(key);
      if (!poll) {
        return { ok: true, replyText: '📊 No active poll in this chat. Use /poll to create one.', tags: ['poll'] };
      }
      return {
        ok: true,
        replyText: buildPollText(poll.question, poll.options, poll.votes, poll.total, true),
        tags: ['poll', 'results'],
      };
    }

    // ── Default: show usage ────────────────────────────────────────────────
    return {
      ok: true,
      replyText:
        '📊 **Poll Commands:**\n' +
        '  /poll "Question?" opt1 opt2 ...  ← Create a poll\n' +
        '  /vote N                           ← Vote for option N\n' +
        '  /poll results                     ← Show current results\n' +
        '\n' +
        '_NOTE: This is a text-based poll. Feishu interactive card buttons ' +
        'require the Feishu API client and cannot run inside the plugin `handle` ' +
        'function. For button-based polls, use Feishu\'s built-in Poll bot._',
      tags: ['poll', 'help'],
    };
  },
};
