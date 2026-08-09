export function isStaleCachedData(error: unknown, data: unknown): boolean {
  return Boolean(error && data !== undefined);
}
