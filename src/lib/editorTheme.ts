/**
 * MYLAND Editor v3 — Phase A: the editor theme preference (Light/Dark/OG).
 *
 * PURE module (no React, no "use client"): layout.tsx — a server component —
 * imports `editorThemeBootScript()` from here. The React hook lives in
 * `useEditorTheme.ts` (a hook module cannot sit in the server graph).
 *
 * Contract (plan §5 "Temas", decision A1/A8):
 * - stored locally under `myland.editorTheme`; values light|dark|og;
 *   DARK when the value is missing, invalid, or storage is absent/throwing
 *   (private mode, blocked site data, SSR);
 * - applied as `<html data-editor-theme="…">`. The generated stylesheet
 *   (tokens.ts, uiCssVarsStylesheet) only themes EDITOR roots
 *   (`[data-mnemo-editor]`, `[data-mnemo-ui]`) under that attribute — the
 *   canvas, the ProfileCard and the public page never read it.
 */

export const EDITOR_THEMES = ["light", "dark", "og"] as const;
export type EditorTheme = (typeof EDITOR_THEMES)[number];

export const EDITOR_THEME_KEY = "myland.editorTheme";
export const EDITOR_THEME_ATTR = "data-editor-theme";
export const DEFAULT_EDITOR_THEME: EditorTheme = "dark";
/** Same-tab change notification (the `storage` event only fires in OTHER tabs). */
export const EDITOR_THEME_EVENT = "myland:editortheme";

export function isEditorTheme(v: unknown): v is EditorTheme {
  return typeof v === "string" && (EDITOR_THEMES as readonly string[]).includes(v);
}

/** Anything that is not a known theme -> the default (dark). */
export function parseEditorTheme(v: unknown): EditorTheme {
  return isEditorTheme(v) ? v : DEFAULT_EDITOR_THEME;
}

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

function defaultStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // accessing localStorage itself can throw (blocked site data)
  }
}

/** Reads the stored theme. Never throws; dark on any failure. */
export function readEditorTheme(storage: ReadableStorage | null | undefined = defaultStorage()): EditorTheme {
  if (!storage) return DEFAULT_EDITOR_THEME;
  try {
    return parseEditorTheme(storage.getItem(EDITOR_THEME_KEY));
  } catch {
    return DEFAULT_EDITOR_THEME;
  }
}

/** Stores the theme. Never throws; false when it could not be saved (the
 * theme still applies for the session via the html attribute). */
export function writeEditorTheme(theme: EditorTheme, storage: WritableStorage | null | undefined = defaultStorage()): boolean {
  if (!storage || !isEditorTheme(theme)) return false;
  try {
    storage.setItem(EDITOR_THEME_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

/** Sets `<html data-editor-theme>`. */
export function applyEditorTheme(theme: EditorTheme, root: Pick<Element, "setAttribute"> | null | undefined =
  typeof document !== "undefined" ? document.documentElement : null): void {
  root?.setAttribute(EDITOR_THEME_ATTR, parseEditorTheme(theme));
}

/**
 * The inline <head> script (layout.tsx): sets the attribute from storage
 * BEFORE hydration, so a Light/OG editor never flashes dark. Self-contained
 * ES5, built from the constants above (one source). The server also renders
 * `data-editor-theme="dark"` on <html> (no-JS fallback), hence
 * suppressHydrationWarning there.
 */
export function editorThemeBootScript(): string {
  const key = JSON.stringify(EDITOR_THEME_KEY);
  const attr = JSON.stringify(EDITOR_THEME_ATTR);
  const valid = JSON.stringify(EDITOR_THEMES);
  const dflt = JSON.stringify(DEFAULT_EDITOR_THEME);
  return `(function(){var t=${dflt};try{var v=window.localStorage.getItem(${key});if(${valid}.indexOf(v)>=0)t=v;}catch(e){}document.documentElement.setAttribute(${attr},t);})();`;
}
