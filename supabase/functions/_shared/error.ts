/**
 * Structured error handling for Edge Functions.
 *
 * Usage:
 *   throw new AppError('NOT_FOUND', 'Cookbook not found', 404);
 *   // at the top level:
 *   return errorResponse(err, req);
 */

import { jsonError } from './cors.ts';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Convert any thrown value into a structured JSON error response.
 * AppError instances preserve their code and status; everything else
 * is logged and returned as a generic 500.
 */
export function errorResponse(error: unknown, req?: Request): Response {
  if (error instanceof AppError) {
    return jsonError(error.message, error.status, req);
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  console.error('[errorResponse] unexpected error', error);
  return jsonError(message, 500, req);
}
