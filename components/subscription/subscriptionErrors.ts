export const DESIGNED_PAGE_LIMIT_REACHED_CODE = 'designed_page_limit_reached';

/** Recognize the stable function code even when the HTTP client wraps its JSON body. */
export function isDesignedPageLimitReachedError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'string') return error.includes(DESIGNED_PAGE_LIMIT_REACHED_CODE);
  if (typeof error !== 'object') return false;

  const record = error as { code?: unknown; message?: unknown; responseText?: unknown };
  return record.code === DESIGNED_PAGE_LIMIT_REACHED_CODE
    || [record.message, record.responseText].some((value) => (
      typeof value === 'string' && value.includes(DESIGNED_PAGE_LIMIT_REACHED_CODE)
    ));
}
