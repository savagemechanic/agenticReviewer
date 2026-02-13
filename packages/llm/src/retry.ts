export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const maxDelayMs = options?.maxDelayMs ?? 10000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt === maxAttempts) break;

      let delayMs: number;

      // Handle 429 rate limits with retry-after header
      if (error?.status === 429 || error?.statusCode === 429) {
        const retryAfter = error?.headers?.["retry-after"];
        delayMs = retryAfter
          ? Math.min(Number(retryAfter) * 1000, maxDelayMs)
          : Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      } else {
        // Exponential backoff: 1s, 2s, 4s...
        delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      }

      // Don't retry on 4xx errors (except 429)
      if (
        error?.status >= 400 &&
        error?.status < 500 &&
        error?.status !== 429
      ) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
