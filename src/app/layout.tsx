import type { Metadata } from "next";
import "./globals.css";
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";

export const metadata: Metadata = {
  title: "mnemo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AppErrorBoundary>{children}</AppErrorBoundary>
      </body>
    </html>
  );
}
