import type { LogLevel } from '../config/load-config.js';

type LogMethod = 'debug' | 'info' | 'warn' | 'error';

export type Logger = ReturnType<typeof createLogger>;

const priority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function createLogger(level: LogLevel = 'info') {
  const threshold = priority[level];

  const log = (method: LogMethod, message: string, meta?: Record<string, unknown>) => {
    if (priority[method] < threshold) return;

    const payload = {
      level: method,
      message,
      ...(meta ? { meta } : {}),
      time: new Date().toISOString(),
    };

    const line = JSON.stringify(payload);

    if (method === 'error') console.error(line);
    else if (method === 'warn') console.warn(line);
    else console.log(line);
  };

  return {
    debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
    info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
    error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
  };
}
