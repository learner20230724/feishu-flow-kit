import { en, type Strings } from './en.js';
import { zh } from './zh.js';

export type { Strings };

const bundles: Record<string, Strings> = {
  en,
  zh,
};

/**
 * Resolve the best-matching i18n bundle for a given language code.
 * Falls back to English if the language is not supported.
 *
 * Feishu sends language codes like:
 *   "en", "zh", "zh-Hans", "zh-TW", "ja", "ko", ...
 * We match on the base prefix (first segment before '-').
 */
export function getStrings(lang: string | undefined | null): Strings {
  if (!lang) return en;

  const base = lang.split('-')[0]!.toLowerCase();
  return bundles[base] ?? en;
}

/**
 * Supported language codes (for documentation / explicit opt-in).
 */
export const SUPPORTED_LANGS = Object.keys(bundles);
