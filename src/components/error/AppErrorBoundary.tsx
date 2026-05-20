"use client";
import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import CrashScreen from "./CrashScreen";

/**
 * Root-level app boundary. Import this from app/layout.tsx (server component) —
 * the "use client" directive here marks it as a client boundary automatically.
 */
export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      label="root"
      fallback={(error, reset) => <CrashScreen error={error} reset={reset} />}
    >
      {children}
    </ErrorBoundary>
  );
}
