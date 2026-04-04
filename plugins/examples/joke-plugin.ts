/**
 * Example plugin: `/joke`
 * =======================
 *
 * Demonstrates: async external API calls, JSON parsing, error handling,
 * and conditional response formatting in a Feishu card.
 *
 * Usage:
 *   /joke         — fetch a random safe-mode joke
 *   /joke Programming — fetch a programming joke
 *   /joke Dark     — fetch a dark-mode joke
 *
 * Environment variables (optional):
 *   JOKE_API_URL  — override the JokeAPI endpoint (default: JokeAPI v2)
 *   JOKE_TIMEOUT_MS — HTTP fetch timeout in ms (default: 5000)
 *
 * Add to FEISHU_PLUGINS:
 *   FEISHU_PLUGINS="./plugins/ping-plugin.js,./plugins/examples/joke-plugin.js"
 */

import type {
  FeishuPlugin,
  PluginCommandResult,
  PluginRegistry,
} from '../../core/plugin-system.js';
import type { FeishuMessageEvent } from '../../types/feishu-event.js';
import type { WorkflowOptions } from '../../workflows/run-message-workflow.js';

// ─── Configuration ─────────────────────────────────────────────────────────────

const API_BASE = process.env.JOKE_API_URL ?? 'https://v2.jokeapi.net/joke';
const TIMEOUT_MS = Number(process.env.JOKE_TIMEOUT_MS ?? 5_000);

const CATEGORIES: Record<string, string> = {
  programming: 'Programming',
  misc: 'Miscellaneous',
  dark: 'Dark',
  pun: 'Pun',
  spooky: 'Spooky',
  christmas: 'Christmas',
};

type JokeType = 'single' | 'twopart';

// ─── API types ────────────────────────────────────────────────────────────────

interface JokeApiResponse {
  error: boolean;
  category?: string;
  type?: JokeType;
  joke?: string;       // single
  setup?: string;     // twopart
  delivery?: string;  // twopart
  message?: string;   // error
}

// ─── Helper: fetch with timeout ───────────────────────────────────────────────

async function fetchJoke(category: string): Promise<JokeApiResponse> {
  const url = `${API_BASE}/${category}?safe-mode`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as JokeApiResponse;
  } catch (err) {
    clearTimeout(timer);
    return { error: true, message: String(err) };
  }
}

// ─── Helper: build Feishu card ────────────────────────────────────────────────

function buildJokeCard(joke: JokeApiResponse): object {
  const category = joke.category ?? 'General';
  const tagColor: Record<string, string> = {
    Programming: 'blue',
    Miscellaneous: 'green',
    Dark: 'red',
    Pun: 'yellow',
    Spooky: 'purple',
    Christmas: 'default',
  };

  if (joke.type === 'single') {
    return {
      msg_type: 'interactive',
      card: {
        header: {
          title: { tag: 'plain_text', content: `😂 ${category} Joke` },
          template: tagColor[category] ?? 'blue',
        },
        elements: [
          { tag: 'markdown', content: joke.joke ?? '' },
          { tag: 'hr' },
          {
            tag: 'note',
            elements: [{ tag: 'plain_text', content: 'Source: jokeapi.dev — safe mode' }],
          },
        ],
      },
    };
  }

  // twopart: setup + delivery
  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: `😂 ${category} Joke` },
        template: tagColor[category] ?? 'blue',
      },
      elements: [
        { tag: 'markdown', content: `**${joke.setup}**\n\n_Tap to reveal the punchline…_` },
        {
          tag: 'markdown',
          content: `||${joke.delivery}||`,
        },
        { tag: 'hr' },
        {
          tag: 'note',
          elements: [{ tag: 'plain_text', content: 'Source: jokeapi.dev — safe mode' }],
        },
      ],
    },
  };
}

function buildErrorCard(msg: string): object {
  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: '😕 Joke unavailable' },
        template: 'red',
      },
      elements: [
        {
          tag: 'markdown',
          content: `Could not fetch a joke right now.\n\n*${msg}*\n\nTry again in a moment!`,
        },
      ],
    },
  };
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

async function handleJoke(argsText: string): Promise<PluginCommandResult> {
  const categoryKey = argsText.trim().toLowerCase() || 'any';
  const category = CATEGORIES[categoryKey] ?? 'Any';

  const joke = await fetchJoke(categoryKey === 'any' ? 'Any' : categoryKey);

  if (joke.error || !joke.type) {
    const card = buildErrorCard(joke.message ?? 'Unknown error');
    return { ok: true, replyText: JSON.stringify(card, null, 2), tags: ['joke', 'plugin', 'error'] };
  }

  const card = buildJokeCard(joke);
  return { ok: true, replyText: JSON.stringify(card, null, 2), tags: ['joke', 'plugin', category] };
}

export const plugin: FeishuPlugin = {
  name: 'joke',

  register(registry: PluginRegistry) {
    registry.registerCommand('joke', this);
  },

  async handle(
    command: { name: string; argsText: string },
    _event: FeishuMessageEvent,
    _options: WorkflowOptions,
  ): Promise<PluginCommandResult | null> {
    if (command.name !== 'joke') return null;
    return handleJoke(command.argsText);
  },

  afterProcess(_event: FeishuMessageEvent, result): void {
    // Fire-and-forget: log joke delivery for analytics
    // Replace with your analytics endpoint
    // fetch('https://analytics.example.com/joke', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ tags: result.tags, ok: result.ok }),
    // }).catch(() => {});
  },
};
