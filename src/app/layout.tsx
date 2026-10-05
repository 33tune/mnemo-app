import type { Metadata } from "next";
import "./globals.css";
// Block 2: editor-only stylesheet, every rule scoped to [data-mnemo-editor]/[data-mnemo-ui] — see its header.
import "@/ui/editor.css";
import { uiCssVarsStylesheet } from "@/ui/tokens";
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";

export const metadata: Metadata = {
  title: "myLand",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Menu redesign Phase 1: the editor's --ui-* custom properties,
            generated from T.ui (src/ui/tokens.ts — the single source).
            editor.css only references them. */}
        <style id="mnemo-ui-tokens" dangerouslySetInnerHTML={{ __html: uiCssVarsStylesheet() }} />
      </head>
      <body>
        <AppErrorBoundary>{children}</AppErrorBoundary>
      </body>
    </html>
  );
}
