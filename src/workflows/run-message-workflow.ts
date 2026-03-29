import type { FeishuMessageEvent } from '../types/feishu-event.js';
import { parseSlashCommand } from '../core/parse-slash-command.js';

export interface WorkflowResult {
  ok: boolean;
  replyText: string;
  tags: string[];
  docTopic?: string;
  docMarkdown?: string;
  hasDocCreateDraft?: boolean;
}

function summarizeTodoRequest(argsText: string) {
  const clean = argsText.replace(/[.。]+$/g, '').trim();
  const task = clean || 'No task details provided';

  return [
    'Todo workflow draft',
    `- request: ${task}`,
    '- next: extract concrete action items',
    '- next: assign owner and due time',
    '- next: push result into a Feishu doc or task system',
  ].join('\n');
}

function buildDocOutline(argsText: string) {
  const clean = argsText.replace(/[.。]+$/g, '').trim();
  const topic = clean || 'Untitled note';

  return [
    `Doc outline draft: ${topic}`,
    '',
    '# Summary',
    `- Topic: ${topic}`,
    '- Goal: capture the request in a format that is easy to paste into a Feishu doc',
    '',
    '# Key points',
    '- Context',
    '- Decisions',
    '- Risks',
    '',
    '# Next actions',
    '- [ ] Fill the missing details',
    '- [ ] Assign an owner',
    '- [ ] Add timeline or due date',
  ].join('\n');
}

export function runMessageWorkflow(event: FeishuMessageEvent): WorkflowResult {
  const command = parseSlashCommand(event.message.text);

  if (!command) {
    return {
      ok: true,
      replyText: 'No slash command found. Event accepted for logging only.',
      tags: ['noop'],
    };
  }

  if (command.name === 'todo') {
    return {
      ok: true,
      replyText: summarizeTodoRequest(command.argsText),
      tags: ['todo', 'demo'],
    };
  }

  if (command.name === 'doc') {
    const docMarkdown = buildDocOutline(command.argsText);
    const cleanTopic = command.argsText.replace(/[.。]+$/g, '').trim() || 'Untitled note';

    return {
      ok: true,
      replyText: docMarkdown,
      tags: ['doc', 'demo'],
      docTopic: cleanTopic,
      docMarkdown,
      hasDocCreateDraft: true,
    };
  }

  return {
    ok: true,
    replyText: `Command /${command.name} is not implemented yet.`,
    tags: ['unimplemented'],
  };
}
