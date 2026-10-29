// Server side of the error reports (see instrumentation-client.ts): errors in
// pages, API routes and the auth callback. Off until NEXT_PUBLIC_SENTRY_DSN is set.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  Sentry.init({
    dsn,
    enabled: !!dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

export const onRequestError = Sentry.captureRequestError;
