import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
// Block 2: editor-only stylesheet, every rule scoped to [data-mnemo-editor]/[data-mnemo-ui] — see its header.
import "@/ui/editor.css";
import { uiCssVarsStylesheet } from "@/ui/tokens";
import { DEFAULT_EDITOR_THEME, editorThemeBootScript } from "@/lib/editorTheme";
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";

export const metadata: Metadata = {
  title: "myLand",
};

// MYLAND Editor v3 (Phase A): the EDITOR's typefaces, self-hosted by
// next/font (hashed family names). They only define CSS variables on
// <html>; nothing reads them but the editor's type roles (T.type / T.uiFont).
// The canvas keeps its own fonts (globals.css @import, CANVAS_FONTS) — none
// of these families is selectable for a profile (uiTokens.test.ts).
// r2: preload:false + latin only — the public page ([handle]) never uses
// them, so it must not pay for preloading them; a face downloads only when
// editor text actually renders with it (Instrument Serif: not used yet).
const fontDisplay = Bricolage_Grotesque({ subsets: ["latin"], preload: false, variable: "--font-display", display: "swap" });
const fontSans = Geist({ subsets: ["latin"], preload: false, variable: "--font-sans", display: "swap" });
const fontMono = Geist_Mono({ subsets: ["latin"], preload: false, variable: "--font-mono", display: "swap" });
const fontSerif = Instrument_Serif({ subsets: ["latin"], preload: false, weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable} ${fontSerif.variable}`}
      // Editor theme (Light/Dark/OG): dark for no-JS; the boot script below
      // swaps it to the stored preference before hydration (no flash).
      data-editor-theme={DEFAULT_EDITOR_THEME}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script id="mnemo-editor-theme" dangerouslySetInnerHTML={{ __html: editorThemeBootScript() }} />
        {/* Menu redesign Phase 1 / v3 Phase A: the editor's --ui-* custom
            properties (+ one --ui-theme-* set per editor theme), generated
            from src/ui/tokens.ts — the single source. editor.css only
            references them. */}
        <style id="mnemo-ui-tokens" dangerouslySetInnerHTML={{ __html: uiCssVarsStylesheet() }} />
      </head>
      <body>
        <AppErrorBoundary>{children}</AppErrorBoundary>
      </body>
    </html>
  );
}
