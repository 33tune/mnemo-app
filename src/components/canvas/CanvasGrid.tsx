"use client";
import React, { useCallback, useSyncExternalStore } from "react";

/** Grid step in canvas px. Snapping to it is Phase I (not here). */
export const GRID_STEP = 24;
export const GRID_PREF_KEY = "myland.editorGrid";
const GRID_EVENT = "myland:editor-grid";

function read(): boolean {
  try { return window.localStorage.getItem(GRID_PREF_KEY) === "1"; } catch { return false; }
}
function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === GRID_PREF_KEY) onChange(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(GRID_EVENT, onChange);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(GRID_EVENT, onChange); };
}

/** "Mostrar cuadrícula" — a LOCAL editor preference (per browser, off by
 * default; storage failures just mean "off"). Never persisted with the room. */
export function useGridPreference(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => false);
  const set = useCallback((next: boolean) => {
    try { window.localStorage.setItem(GRID_PREF_KEY, next ? "1" : "0"); } catch { /* storage blocked: session-only */ }
    window.dispatchEvent(new Event(GRID_EVENT));
  }, []);
  return [on, set];
}

// Editor v3 Phase D: the visual grid. Drawn INSIDE the canvas wrapper (it
// follows the inspector's view offset), only in the editor (CanvasBoard
// mounts it only with canEdit — never PublicCanvas / [handle] / mobile; a
// test guards it), with NO pointer events (it never takes a click, a drag
// or a drop). Theme-independent two-tone lines (dark + light), legible on
// any wallpaper; the editor theme never reaches the canvas.
export function CanvasGrid({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const line = (c: string, offset: number) =>
    `linear-gradient(to right, ${c} 1px, transparent 1px) ${offset}px ${offset}px / ${GRID_STEP}px ${GRID_STEP}px, ` +
    `linear-gradient(to bottom, ${c} 1px, transparent 1px) ${offset}px ${offset}px / ${GRID_STEP}px ${GRID_STEP}px`;
  return (
    <div
      aria-hidden="true"
      data-mnemo-grid=""
      style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        background: `${line("rgba(255,255,255,0.07)", 0)}, ${line("rgba(0,0,0,0.07)", 1)}`,
      }}
    />
  );
}
