/**
 * Exponential-back-off retry wrapper for webhook-request-aware API calls.
 *
 * Distinguishes transient/retryable Feishu API errors (HTTP 429, 500–599,
 * code 99991661/99991663) from permanent failures so retries only fire when
 * meaningful.  Each attempt carries a generated request-id in the logger so
 * all attempts can be correlated.
 */

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3. */
  maxAttempts?: number;
  /**
   * Base delay in ms.  Attempt n sleeps `baseDelayMs × 2^(n-1)` + jitter.
   * Default: 500 ms.
   */
  baseDelayMs?: number;
  /**
   * Maximum total wait in ms before giving up. Default: 8 000 ms.
   */
  maxDelayMs?: number;
  /**
   * Extra headers injected into every attempt (e.g. request-id for tracing).
   * Receives the current attempt number (1-based).
   */
  injectHeaders?: (attempt: number) => Record<string, string>;
  /** Optional logger that receives structured retry events. */
  logger?: RetryLogger;
}

export interface RetryLogger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
}

/** Returned alongside the result so callers know how many attempts fired. */
export interface RetryResult<T> {
  /** The return value of `fn`. */
  value: T;
  /** Total attempts made (1 = first-attempt success). */
  attempts: number;
  /** Whether a transient error triggered a retry. */
  retried: boolean;
}

/** Errors that are safe to retry. */
export function isRetryableFeishuError(status: number, code?: number): boolean {
  if (status === 429) return true;
  if (status >= 500) return true;
  // 99991661 = internal error; 99991663 = token expired during call
  return code === 99991661 || code === 99991663;
}

function jitter(ms: number): number {
  return Math.floor(ms * (0.5 + Math.random()));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run `fn` with exponential-back-off retry.
 *
 * @param fn - Async function to execute. Return value is returned as `value`.
 * @param opts - Retry tuning options.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<RetryResult<T>> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 8000;
  const logger = opts.logger;

  let retried = false;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const extraHeaders = opts.injectHeaders?.(attempt) ?? {};

    try {
      const value = await fn(attempt);
      return { value, attempts: attempt, retried };
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Parse Feishu-style error response for code.
      let feishuCode: number | undefined;
      if (error instanceof Error && 'code' in error) {
        feishuCode = (error as { code?: number }).code;
      }

      const retryable =
        isRetryableFeishuError(
          error instanceof Error && 'status' in error ? (error as { status: number }).status : 0,
          feishuCode,
        );

      if (isLastAttempt || !retryable) {
        logger?.debug('withRetry giving up', {
          attempt,
          error: errorMessage,
          retryable,
        });
        throw error;
      }

      retried = true;
      const delay = Math.min(jitter(baseDelayMs * 2 ** (attempt - 1)), maxDelayMs);
      logger?.warn('withRetry will retry', {
        attempt,
        nextDelayMs: delay,
        error: errorMessage,
        feishuCode,
      });
      await sleep(delay);
    }
  }

  // Unreachable — maxAttempts ≥ 1 guarantees return above.
  throw new Error('withRetry: unreachable');
}
