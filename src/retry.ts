export interface RetryOptions {
  /** Number of retries after the first attempt. */
  retries: number;
  /** Base delay; doubles on every retry (exponential backoff). */
  delayMs: number;
  shouldRetry?: (error: unknown) => boolean;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { retries, delayMs, shouldRetry = () => true } = options;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error)) throw error;
      await sleep(delayMs * 2 ** attempt);
    }
  }
}
