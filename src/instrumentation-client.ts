// Error reports (Sentry, 2026-10-29): every crash in a visitor's browser —
// editor, public profile, phones — reaches the owner without anyone having to
// report it. Off until NEXT_PUBLIC_SENTRY_DSN is set (Vercel env). Errors
// only: no performance tracing, no session replay, no personal data.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  sendDefaultPii: false,
  tracesSampleRate: 0,
  // Noise that is never ours: browser extensions and aborted loads.
  ignoreErrors: ["ResizeObserver loop", "Non-Error promise rejection captured", "AbortError"],
  denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-(web-)?extension:\/\//],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
