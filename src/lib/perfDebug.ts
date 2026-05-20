/**
 * Canvas performance debug utilities.
 *
 * Enable  : window.__MNEMO_DEBUG_PERF = true   (browser console)
 * Inspect : window.__MNEMO_DEBUG_PERF_DATA      (browser console)
 *
 * Reports render counts, active component rerenders, and subscription activity.
 */

declare global {
  interface Window {
    /** Set true to enable verbose perf logging. */
    __MNEMO_DEBUG_PERF: boolean;
    /** Live data object — read at any time from console. */
    __MNEMO_DEBUG_PERF_DATA: {
      renderCounts:      Record<string, number>;
      lastRenderAt:      Record<string, number>;
    };
  }
}

const renderCounts: Record<string, number>  = {};
const lastRenderAt: Record<string, number>  = {};

function isEnabled(): boolean {
  return typeof window !== "undefined" && window.__MNEMO_DEBUG_PERF === true;
}

function sync(): void {
  if (typeof window === "undefined") return;
  if (!window.__MNEMO_DEBUG_PERF_DATA) {
    window.__MNEMO_DEBUG_PERF_DATA = { renderCounts: {}, lastRenderAt: {} };
  }
  window.__MNEMO_DEBUG_PERF_DATA.renderCounts = renderCounts;
  window.__MNEMO_DEBUG_PERF_DATA.lastRenderAt = lastRenderAt;
}

/**
 * Call at the top of a component's render body.
 * Increments a counter and logs when __MNEMO_DEBUG_PERF is true.
 */
export function trackRender(component: string, extra?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  renderCounts[component] = (renderCounts[component] ?? 0) + 1;
  lastRenderAt[component] = Date.now();
  sync();
  if (isEnabled()) {
    console.debug(
      `[mnemo-perf] ${component} render #${renderCounts[component]}`,
      extra ?? "",
    );
  }
}

/**
 * Log a general perf event (subscription created, channel opened, etc.)
 */
export function perfLog(event: string, detail?: unknown): void {
  if (!isEnabled()) return;
  console.debug(`[mnemo-perf] ${event}`, detail ?? "");
}
