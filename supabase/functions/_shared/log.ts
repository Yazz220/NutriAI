/**
 * Structured logging for Edge Functions.
 *
 * Emits JSON lines that are searchable in the Supabase Dashboard logs.
 * Always includes level, message, and timestamp. Optional metadata is
 * spread into the log object.
 */

import { captureEdgeError } from './sentry.ts';

type LogLevel = 'info' | 'warn' | 'error';

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  const output = JSON.stringify(entry);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
  log('info', message, meta);
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
  log('warn', message, meta);
}

export function logError(message: string, meta?: Record<string, unknown>): void {
  log('error', message, meta);
  captureEdgeError(message, meta);
}
