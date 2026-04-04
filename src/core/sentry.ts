/**
 * Sentry error-tracking stub.
 *
 * All functions are no-ops until `init()` is called with a valid DSN.
 * Drop-in replaceable: once Sentry is installed (`npm install @sentry/node`)
 * and the DSN is provided, replace the no-op implementations with the real
 * Sentry equivalents — no other file in the codebase needs to change.
 *
 * Usage:
 *   import { init, captureException, captureMessage } from './core/sentry.js';
 *   // In your startup code (only once):
 *   init({ dsn: process.env.SENTRY_DSN });
 *   // In catch blocks:
 *   captureException(error, { extra: { userId: '...' } });
 */

/** Populated by calling `init()`. */
let _dsn: string | undefined;
let _environment: string | undefined;

/**
 * Initialise Sentry.  Call once at application startup.
 *
 * To enable real Sentry:
 *   1. `npm install @sentry/node`
 *   2. Replace the no-op body below with:
 *      `import * as Sentry from '@sentry/node'; Sentry.init({ dsn, environment, ... });`
 *   3. Ensure SENTRY_DSN is set in your environment.
 */
export function init(opts: { dsn?: string; environment?: string }): void {
  _dsn = opts.dsn;
  _environment = opts.environment;
  // TODO: replace with Sentry.init({ dsn, environment, ... }) when enabled
  if (_dsn) {
    console.warn(
      JSON.stringify({
        level: 'info',
        message: 'Sentry init called with DSN — Sentry integration not yet wired. See src/core/sentry.ts.',
        meta: { dsn: _dsn, environment: _environment },
        time: new Date().toISOString(),
      }),
    );
  }
}

/**
 * Report an exception to Sentry.
 *
 * @param error - The caught error.
 * @param extras - Optional extra fields attached to the event.
 */
export function captureException(
  error: unknown,
  extras?: Record<string, unknown>,
): void {
  if (!_dsn) return;
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: 'error',
      message: '[Sentry stub] captureException',
      meta: {
        errorMessage: err.message,
        errorStack: err.stack,
        ...extras,
      },
      time: new Date().toISOString(),
    }),
  );
  // TODO: replace with Sentry.captureException(error, { extra: extras });
}

/**
 * Report a plain message to Sentry (INFO / WARNING level).
 */
export function captureMessage(
  message: string,
  extras?: Record<string, unknown>,
): void {
  if (!_dsn) return;
  console.warn(
    JSON.stringify({
      level: 'warn',
      message: '[Sentry stub] captureMessage',
      meta: { message, ...extras },
      time: new Date().toISOString(),
    }),
  );
  // TODO: replace with Sentry.captureMessage(message, { extra: extras });
}

export function isEnabled(): boolean {
  return Boolean(_dsn);
}
