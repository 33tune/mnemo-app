import Translator from "@/components/i18n/Translator";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono, Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";
// Block 2: editor-only stylesheet, every rule scoped to [data-mnemo-editor]/[data-mnemo-ui] — see its header.
import "@/ui/editor.css";
// "Grafito" (2026-11-28): the social panels' look (Feed, Explorar, viewer, phone tabs) — gf-* classes only.
import "@/styles/grafito.css";
import { uiCssVarsStylesheet } from "@/ui/tokens";
import { DEFAULT_EDITOR_THEME, editorThemeBootScript } from "@/lib/editorTheme";
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";
import PresencePing from "@/components/PresencePing";
import { VerifyGate } from "@/components/verify/Verify";

export const metadata: Metadata = {
  title: "myLand",
  // Absolute URLs for the link previews (og:image of /[handle]).
  metadataBase: new URL("https://www.myland.lol"),
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
// Grafito panels (Feed, Explorar…): Inter, loaded only when that text renders.
const fontGf = Inter({ subsets: ["latin"], preload: false, variable: "--font-gf", display: "swap" });
const fontSerif = Instrument_Serif({ subsets: ["latin"], preload: false, weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable} ${fontSerif.variable} ${fontGf.variable}`}
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
        {/* Grafito (2026-11-28): Feed / Explorar claro u oscuro (lib/gfTheme.ts), before paint. */}
        <script id="myland-gf-theme" dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("myland.gfTheme")==="dark")document.documentElement.setAttribute("data-gf-theme","dark")}catch(e){}` }} />
      </head>
      <body>
        <AppErrorBoundary>{children}</AppErrorBoundary>
        <PresencePing />
        <VerifyGate />
        <Translator />
      </body>
    </html>
  );
}
