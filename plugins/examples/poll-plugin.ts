/**
 * Poll Plugin — `/poll "<question>" <opt1> <opt2> [opt3] [opt4] ...`
 *
 * Creates an interactive Feishu poll. Participants tap option buttons to vote.
 * Demonstrates: interactive rich card with button actions, in-memory vote tally,
 * multi-option interactive commands, Feishu card with multiple action groups,
 * vote counting with live update simulation.
 *
 * NOTE: Feishu's native poll bot feature is more robust for large groups.
 * This plugin is ideal for quick inline polls within a conversation where
 * you want a custom look-and-feel or want to trigger downstream actions
 * based on poll results.
 *
 * @example
 * /poll "Which flavor?" Vanilla Chocolate Strawberry
 * /poll "Deploy to prod?" Yes No
 */

import { McpTool, FeishuCard, FeishuCardAction } from '@feishu/rest-api';

// In-memory store: pollKey -> { question, options, votes, total, voters }
// In production, replace with Redis or a database.
const activePolls = new Map<
  string,
  { question: string; options: string[]; votes: number[]; total: number; voters: Set<string> }
>();

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

export const pollPlugin = {
  name: 'poll',
  description: 'Create an inline poll with button voting',
  usage: `/poll "<question>" <opt1> <opt2> [opt3] [opt4] ...`,
  shortcuts: ['vote'],

  register(tool: McpTool) {
    tool.onText(
      // Matches: /poll "Question here" Option1 Option2 ...
      // The question must be quoted; options are unquoted words
      /^\\/poll\s+"(?<question>[^"]+)"(?:\s+(?<options>.+))?$/i,
      async ({ question, options }: { question: string; options?: string }, event, api) => {
        const optionList = (options ?? '')
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 10); // Feishu cards cap at a reasonable number of options

        if (optionList.length < 2) {
          await api.createMessage({
            receive_id: event.sender.sender_id.open_id,
            msg_type: 'text',
            content: `📋 **Poll requires at least 2 options.**\n\nUsage:\n/poll "Your question?" Option1 Option2`,
          });
          return;
        }

        if (optionList.length > 10) {
          await api.createMessage({
            receive_id: event.sender.sender_id.open_id,
            msg_type: 'text',
            content: `📋 **Poll supports at most 10 options.** You provided ${optionList.length}.`,
          });
          return;
        }

        const pollKey = `${event.chat_id}_${Date.now()}`;
        activePolls.set(pollKey, {
          question,
          options: optionList,
          votes: optionList.map(() => 0),
          total: 0,
          voters: new Set(),
        });

        const card = buildPollCard(pollKey, question, optionList);

        await api.createMessage({
          receive_id: event.sender.sender_id.open_id,
          msg_type: 'interactive',
          content: JSON.stringify(card),
        });
      }
    );

    // Handle vote button callbacks (interactive callbacks from Feishu)
    tool.onCallback(
      /^poll_vote:(?<pollKey>[^:]+):(?<optionIndex>\d+)$/,
      async ({ pollKey, optionIndex }: { pollKey: string; optionIndex: string }, event, api) => {
        const poll = activePolls.get(pollKey);
        if (!poll) {
          await api.createMessage({
            receive_id: event.sender.sender_id.open_id,
            msg_type: 'text',
            content: '❗ This poll has expired or was already closed.',
          });
          return;
        }

        const idx = parseInt(optionIndex, 10);
        if (idx < 0 || idx >= poll.options.length) return;

        const userId = event.sender.sender_id.open_id;

        if (poll.voters.has(userId)) {
          await api.createMessage({
            receive_id: event.sender.sender_id.open_id,
            msg_type: 'text',
            content: `🗳️ You've already voted in this poll.`,
          });
          return;
        }

        poll.votes[idx]++;
        poll.total++;
        poll.voters.add(userId);

        // Update the original message with live results
        const updatedCard = buildPollResultsCard(pollKey, poll.question, poll.options, poll.votes, poll.total);

        try {
          await api.updateMessage({
            message_id: event.message_id,
            content: JSON.stringify(updatedCard),
          });
        } catch {
          // Fallback: send a new message if update fails (e.g., message too old)
          await api.createMessage({
            receive_id: event.sender.sender_id.open_id,
            msg_type: 'text',
            content: buildTextResults(poll.question, poll.options, poll.votes, poll.total),
          });
        }
      }
    );
  },
};

// ---------------------------------------------------------------------------
// Card builders
// ---------------------------------------------------------------------------

function buildPollCard(
  pollKey: string,
  question: string,
  options: string[]
): FeishuCard {
  const optionElements: FeishuCard['elements'] = options.map((opt, i) => ({
    tag: 'action',
    actions: [
      {
        tag: 'button',
        text: { tag: 'plain_text', content: `🔘  ${opt}` },
        type: 'primary',
        value: { key: `poll_vote:${pollKey}:${i}` },
      },
    ],
  }));

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: '📊  Poll' },
      subtitle: { tag: 'plain_text', content: truncate(question, 50) },
      template: 'indigo',
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `**${question}**` },
      },
      { tag: 'hr' },
      ...optionElements,
      { tag: 'hr' },
      {
        tag: 'note',
        elements: [
          { tag: 'plain_text', content: `🔒 Votes are private. Tap a button above to cast your vote.` },
        ],
      },
    ],
  };
}

function buildPollResultsCard(
  pollKey: string,
  question: string,
  options: string[],
  votes: number[],
  total: number
): FeishuCard {
  const maxVotes = Math.max(...votes, 1);

  const optionRows: FeishuCard['elements'] = options.map((opt, i) => {
    const count = votes[i];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const barLen = Math.round((count / maxVotes) * 10);
    const bar = '█'.repeat(barLen) + '░'.repeat(10 - barLen);
    const label = total > 0
      ? `${count} vote${count !== 1 ? 's' : ''} (${pct}%)`
      : '0 votes (0%)';

    return {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${opt}**\n\`${bar}\` ${label}`,
      },
    };
  });

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: '📊  Poll Results' },
      subtitle: { tag: 'plain_text', content: truncate(question, 50) },
      template: 'indigo',
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content: `**${question}**\n\n_total ${total} vote${total !== 1 ? 's' : ''}_` },
      },
      { tag: 'hr' },
      ...optionRows,
      { tag: 'hr' },
      {
        tag: 'note',
        elements: [
          { tag: 'plain_text', content: `Poll by feishu-flow-kit · ${options.length} options · ${total} total votes` },
        ],
      },
    ],
  };
}

function buildTextResults(
  question: string,
  options: string[],
  votes: number[],
  total: number
): string {
  const lines = [`📊 **Poll: ${question}**\n`, ...options.map((opt, i) => {
    const pct = total > 0 ? Math.round((votes[i] / total) * 100) : 0;
    return `  ${opt}: ${votes[i]} vote${votes[i] !== 1 ? 's' : ''} (${pct}%)`;
  }), `\n_total ${total} votes_`];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(s: string, maxLen: number): string {
  return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
}
