const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

export class FetchHttpError extends Error {
  public readonly status: number;
  public readonly retryable: boolean;

  constructor(url: string, status: number, statusText: string, retryable: boolean) {
    super(`GET ${url} responded with ${status} ${statusText}`);
    this.name = "FetchHttpError";
    this.status = status;
    this.retryable = retryable;
  }
}

const isRetryableStatus = (status: number): boolean =>
  status === 429 || status >= 500;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOnce(url: string, timeoutMs: number): Promise<Response> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });

  if (!res.ok) {
    throw new FetchHttpError(
      url,
      res.status,
      res.statusText,
      isRetryableStatus(res.status),
    );
  }

  return res;
}

export async function fetchWithRetry(
  url: string,
  options?: { timeoutMs?: number; maxRetries?: number },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchOnce(url, timeoutMs);
    } catch (error) {
      if (error instanceof FetchHttpError && !error.retryable) {
        throw error;
      }

      lastError = error;

      if (attempt < maxRetries) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }

  throw new Error(`Failed to fetch ${url} after ${maxRetries + 1} attempts`, {
    cause: lastError,
  });
}
