"use client";
/**
 * MYLAND Editor v3 — Phase A: React access to the editor theme preference.
 * Split from editorTheme.ts (pure) because layout.tsx, a server component,
 * imports that one — a module importing React hooks cannot be in the server
 * graph. No UI uses it yet: the selector arrives in Phase D ("Tu sala" →
 * Apariencia).
 *
 * Source of truth at runtime = the `<html data-editor-theme>` attribute (set
 * before hydration by the boot script). Writing updates storage + attribute
 * and notifies this tab; the `storage` event syncs other tabs.
 */
import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_EDITOR_THEME, EDITOR_THEME_ATTR, EDITOR_THEME_EVENT, EDITOR_THEME_KEY,
  applyEditorTheme, parseEditorTheme, writeEditorTheme, type EditorTheme,
} from "./editorTheme";

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== EDITOR_THEME_KEY) return;
    applyEditorTheme(parseEditorTheme(e.newValue));
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EDITOR_THEME_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EDITOR_THEME_EVENT, onChange);
  };
}

const getSnapshot = (): EditorTheme => parseEditorTheme(document.documentElement.getAttribute(EDITOR_THEME_ATTR));
const getServerSnapshot = (): EditorTheme => DEFAULT_EDITOR_THEME;

export function useEditorTheme(): [EditorTheme, (theme: EditorTheme) => void] {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setTheme = useCallback((next: EditorTheme) => {
    const t = parseEditorTheme(next);
    writeEditorTheme(t);
    applyEditorTheme(t);
    window.dispatchEvent(new Event(EDITOR_THEME_EVENT));
  }, []);
  return [theme, setTheme];
}
