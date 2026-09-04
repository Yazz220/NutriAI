/** Settle the caller even when a native operation fails to honor cancellation. */
export function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(Object.assign(new Error('Operation cancelled'), { name: 'AbortError' }));
    if (signal.aborted) {
      void operation.catch(() => {});
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    operation.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
