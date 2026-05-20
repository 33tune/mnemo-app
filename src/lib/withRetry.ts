/**
 * Exponential-backoff retry for transient network/server failures.
 * Only retries on network errors and 5xx responses — never on auth or
 * validation failures (4xx), which require user action to resolve.
 */

function isTransient(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;

  // Network-level failure (fetch threw)
  if (err instanceof TypeError) return true;

  // HTTP status codes worth retrying
  const status = typeof e.status === "number" ? e.status : 0;
  if (status === 408 || status === 429 || status >= 500) return true;

  // Supabase PostgREST server-side errors (PGRST5xx range)
  if (typeof e.code === "string" && e.code.startsWith("PGRST")) {
    const n = parseInt(e.code.slice(4), 10);
    if (n >= 500) return true;
  }

  return false;
}

export async function withRetry<T>(
  fn:   () => Promise<T>,
  opts: { maxAttempts?: number; label?: string; retryable?: (e: unknown) => boolean } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    label       = "request",
    retryable   = isTransient,
  } = opts;

  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt === maxAttempts;
      if (isLast || !retryable(err)) break;
      const delay = Math.min(300 * 2 ** (attempt - 1), 5000); // 300ms → 600ms → 1200ms…
      console.warn(`[mnemo-retry] "${label}" attempt ${attempt}/${maxAttempts} failed — retry in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastErr;
}
