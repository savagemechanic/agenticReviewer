export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

interface HttpLikeError {
  status?: number;
  statusCode?: number;
  headers?: Record<string, string>;
}

function isHttpLikeError(error: unknown): error is HttpLikeError {
  return (
    typeof error === "object" &&
    error !== null &&
    ("status" in error || "statusCode" in error)
  );
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
    } catch (error: unknown) {
      lastError = error;

      if (attempt === maxAttempts) break;

      let delayMs: number;

      if (isHttpLikeError(error)) {
        const status = error.status ?? error.statusCode ?? 0;

        // Handle 429 rate limits with retry-after header
        if (status === 429) {
          const retryAfter = error.headers?.["retry-after"];
          delayMs = retryAfter
            ? Math.min(Number(retryAfter) * 1000, maxDelayMs)
            : Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        } else if (status >= 400 && status < 500) {
          // Don't retry on 4xx errors (except 429)
          break;
        } else {
          delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        }
      } else {
        // Exponential backoff: 1s, 2s, 4s...
        delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
