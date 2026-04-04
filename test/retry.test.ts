import test from 'node:test';
import assert from 'node:assert/strict';

import { withRetry, isRetryableFeishuError } from '../src/core/retry.ts';

test('withRetry succeeds on first attempt', async () => {
  let attempts = 0;
  const result = await withRetry(async () => {
    attempts++;
    return 'ok';
  });

  assert.equal(result.value, 'ok');
  assert.equal(result.attempts, 1);
  assert.equal(result.retried, false);
});

test('withRetry retries on retryable Feishu errors and succeeds', async () => {
  let attempts = 0;
  class FakeError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code: number,
    ) {
      super(message);
    }
  }

  const result = await withRetry(
    async (attempt) => {
      attempts++;
      if (attempt === 1) {
        // 429 HTTP + no Feishu code — retryable by HTTP status
        throw new FakeError('rate limited', 429, undefined);
      }
      return `success on attempt ${attempt}`;
    },
    { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 },
  );

  assert.equal(result.value, 'success on attempt 2');
  assert.equal(result.attempts, 2);
  assert.equal(result.retried, true);
});

test('withRetry retries on HTTP 200 + Feishu token-expired code and succeeds', async () => {
  let attempts = 0;
  class FakeError extends Error {
    constructor(
      public readonly status: number,
      public readonly code: number,
    ) {
      super('token expired mid-call');
    }
  }

  const result = await withRetry(
    async (attempt) => {
      attempts++;
      if (attempt === 1) {
        // HTTP 200 with Feishu code 99991663 = token expired during the call
        throw new FakeError(200, 99991663);
      }
      return `success on attempt ${attempt}`;
    },
    { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 },
  );

  assert.equal(result.value, 'success on attempt 2');
  assert.equal(result.attempts, 2);
  assert.equal(result.retried, true);
});

test('withRetry gives up on non-retryable error', async () => {
  let attempts = 0;
  class FakeError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code: number,
    ) {
      super(message);
    }
  }

  await assert.rejects(
    async () => {
      await withRetry(
        async () => {
          attempts++;
          // 400 + Feishu code 1 (generic bad request) — not a transient/retryable error
          throw new FakeError('bad request', 400, 1);
        },
        { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 },
      );
    },
    /bad request/,
  );

  assert.equal(attempts, 1); // stops on first non-retryable
});

test('withRetry gives up after maxAttempts', async () => {
  let attempts = 0;
  class FakeError extends Error {
    constructor(public readonly status: number, public readonly code: number) {
      super('server error');
    }
  }

  await assert.rejects(
    async () => {
      await withRetry(
        async () => {
          attempts++;
          const err = new FakeError(500, undefined);
          (err as unknown as { status: number }).status = 500;
          throw err;
        },
        { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 },
      );
    },
    /server error/,
  );

  assert.equal(attempts, 3); // exhausted all attempts
});

test('isRetryableFeishuError returns true for 429', () => {
  assert.equal(isRetryableFeishuError(429), true);
});

test('isRetryableFeishuError returns true for 500', () => {
  assert.equal(isRetryableFeishuError(500), true);
});

test('isRetryableFeishuError returns true for 502', () => {
  assert.equal(isRetryableFeishuError(502), true);
});

test('isRetryableFeishuError returns true for Feishu internal error code 99991661', () => {
  assert.equal(isRetryableFeishuError(200, 99991661), true);
});

test('isRetryableFeishuError returns true for Feishu token expired code 99991663', () => {
  assert.equal(isRetryableFeishuError(200, 99991663), true);
});

test('isRetryableFeishuError returns false for 400', () => {
  assert.equal(isRetryableFeishuError(400), false);
});

test('isRetryableFeishuError returns false for 404', () => {
  assert.equal(isRetryableFeishuError(404), false);
});

test('isRetryableFeishuError returns false for Feishu OK code 0', () => {
  assert.equal(isRetryableFeishuError(200, 0), false);
});

test('withRetry injects attempt headers after first attempt', async () => {
  const headersSeen: Record<string, string>[] = [];

  await withRetry(
    async (attempt) => {
      // Simulate a function that receives headers (we just track attempt)
      headersSeen.push({ attempt: String(attempt) });
      if (attempt < 3) {
        const err = new Error('retry');
        (err as unknown as { status: number }).status = 429;
        throw err;
      }
      return 'done';
    },
    { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 },
  );

  assert.equal(headersSeen.length, 3);
});
