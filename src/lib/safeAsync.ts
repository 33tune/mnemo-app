/**
 * Safe async utilities — all errors log to [mnemo-error].
 * Use these to protect fire-and-forget operations, realtime handlers,
 * and event listeners from surfacing as unhandled rejections or uncaught throws.
 */

/**
 * Wrap an async operation. Catches and logs errors without rethrowing.
 * Returns undefined on failure.
 *
 * @example
 * const data = await safeAsync(() => sb.from("canvases").select("*"), "load-canvas");
 */
export async function safeAsync<T>(
  fn:    () => Promise<T>,
  label: string,
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[mnemo-error] async="${label}"`, err);
    return undefined;
  }
}

/**
 * Wrap a sync or async callback — suitable for useEffect bodies, event listeners,
 * and onClick handlers that should never propagate to React's error boundary.
 *
 * @example
 * useEffect(() => {
 *   const cleanup = safeCallback(async () => {
 *     const data = await fetchSomething();
 *     setState(data);
 *   }, "load-notifications");
 *   cleanup();
 * }, []);
 */
export function safeCallback<T extends unknown[]>(
  fn:    (...args: T) => void | Promise<void>,
  label: string,
): (...args: T) => void {
  return (...args: T) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        result.catch(err => console.error(`[mnemo-error] callback="${label}"`, err));
      }
    } catch (err) {
      console.error(`[mnemo-error] callback="${label}"`, err);
    }
  };
}

/**
 * Wrap a Supabase realtime payload handler.
 * Prevents a malformed payload or a bug in the handler from crashing the channel.
 *
 * @example
 * channel.on("postgres_changes", filter, safeRealtimeHandler(payload => {
 *   setMessages(prev => [...prev, payload.new]);
 * }, "messages-insert"));
 */
export function safeRealtimeHandler<T>(
  fn:    (payload: T) => void,
  label: string,
): (payload: T) => void {
  return (payload: T) => {
    try {
      fn(payload);
    } catch (err) {
      console.error(`[mnemo-error] realtime="${label}"`, err);
    }
  };
}
