export interface ParsedCommand {
  name: string;
  argsText: string;
}

export function parseSlashCommand(text: string): ParsedCommand | null {
  const trimmed = text.trim();

  if (!trimmed.startsWith('/')) return null;

  const firstSpace = trimmed.indexOf(' ');
  if (firstSpace === -1) {
    return {
      name: trimmed.slice(1).toLowerCase(),
      argsText: '',
    };
  }

  return {
    name: trimmed.slice(1, firstSpace).toLowerCase(),
    argsText: trimmed.slice(firstSpace + 1).trim(),
  };
}
