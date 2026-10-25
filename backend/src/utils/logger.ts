import pino, { Logger } from 'pino';

// One root logger for the whole app. Every other file imports from here.
// Output is raw JSON on stdout everywhere, so dev and production behave the same.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',

  // Backstop: keeps secrets out of logs even if a developer logs them by accident.
  redact: {
    paths: [
      'DATABASE_URL',
      '*.DATABASE_URL',//* for nested objects
      'password',
      '*.password',
      'authorization',
      '*.authorization',
      'cookie',
      '*.cookie',
    ],
    censor: '[Redacted]',
  },
});

// Child logger per area. Each one stamps its own `part` field on every line.
export function createComponentLogger(partName: string): Logger {
  return logger.child({ part: partName });
}

export const dbLogger = createComponentLogger('db');
export const submitLogger = createComponentLogger('submit');
export const workerLogger = createComponentLogger('worker');
export const judgeLogger = createComponentLogger('judge');
export const verdictLogger = createComponentLogger('verdict');