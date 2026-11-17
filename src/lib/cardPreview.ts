/**
 * "Probar antes de elegir" (menu redesign, 2026-11-17): while the pointer is
 * over an option in the editor (a shape, a font, an effect tile), the card
 * shows it live; when the pointer leaves, it goes back. Nothing is saved and
 * no undo step is made — the preview is only a transform applied at render
 * (ProfileCard › useCardPreview). Clicking the option applies it for real
 * through the usual writer, and clears the preview.
 *
 * One editor = one card, so one preview at a time.
 */
import { createContext, useContext, useSyncExternalStore } from "react";
import type { ProfileCardData } from "@/types";

export type CardPreviewFn = (card: ProfileCardData) => ProfileCardData;

let current: CardPreviewFn | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

/** Show `fn(card)` instead of the card until cleared (null). */
export function setCardPreview(fn: CardPreviewFn | null): void {
  if (fn === current) return;
  current = fn;
  emit();
}
export function clearCardPreview(): void { setCardPreview(null); }
export function cardPreviewActive(): boolean { return current !== null; }

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
const get = () => current;

/** The card as the editor should draw it right now (`enabled` = this is the
 * owner's editor; the public profile never previews). A preview that throws
 * is ignored, so a bad transform can never break the card. */
export function useCardPreview(card: ProfileCardData, enabled: boolean): ProfileCardData {
  const fn = useSyncExternalStore(subscribe, get, () => null);
  if (!enabled || !fn) return card;
  try { return fn(card); } catch { return card; }
}

/** Shallow-merge helper for previews of one card field group. */
export function previewPatch(patch: Partial<ProfileCardData>): CardPreviewFn {
  return card => ({ ...card, ...patch });
}

// ── Preview by rehearsal ─────────────────────────────────────────────────────
// Every inspector control already knows how to change the card (its onChange
// ends in ONE writer, EditorHost › updateProfile). To preview an option, the
// control runs that same onChange inside `previewByRunning`: the writer sees
// `captureWrite` return true, keeps the patch here instead of saving it, and
// the card shows it. So any control can offer "probar al pasar el mouse"
// without knowing how its value is stored.
let capturing: Partial<ProfileCardData> | null = null;

/** The writer calls this first: true = a rehearsal, do NOT save the patch. */
export function captureWrite(patch: Partial<ProfileCardData>): boolean {
  if (!capturing) return false;
  Object.assign(capturing, patch);
  return true;
}

/** Runs `run` (a control's own onChange) as a rehearsal and shows its result
 * on the card until `clearCardPreview()` (pointer leaves) or a real write. */
export function previewByRunning(run: () => void): void {
  capturing = {};
  try { run(); } catch { /* a rehearsal never breaks the editor */ }
  const patch = capturing;
  capturing = null;
  setCardPreview(Object.keys(patch).length ? card => ({ ...card, ...patch }) : null);
}

/** True only inside the card's inspector (ProfileInspector), whose writer
 * captures rehearsals. Elsewhere (Nota, Music, a free text) a control's
 * onChange would SAVE, so no try-on there. */
export const CardTryOnContext = createContext(false);

/** Pointer helpers for an option: hover = rehearse, leave = back. Empty
 * outside the card's inspector. */
export function useTryOn() {
  const enabled = useContext(CardTryOnContext);
  return (run: () => void) => enabled
    ? { onMouseEnter: () => previewByRunning(run), onMouseLeave: () => clearCardPreview() }
    : {};
}
