"use client";
/**
 * Card stickers' edit mode (Tarjeta › Stickers › Editar / Aplicar): which
 * card is being edited and which stickers are selected. A tiny store read by
 * the card (it draws the edit handles) and by the Stickers section (the
 * buttons and the list) — no prop chain through the inspector host.
 * Outside this mode stickers are "ghosts": never clickable.
 */
import { useSyncExternalStore } from "react";

export interface StickerEditState {
  cardId: string | null;
  selected: ReadonlySet<string>;
}

const EMPTY: ReadonlySet<string> = new Set();
let state: StickerEditState = { cardId: null, selected: EMPTY };
const listeners = new Set<() => void>();

function set(next: StickerEditState) {
  state = next;
  listeners.forEach(l => l());
}

export const stickerEditing = {
  get: (): StickerEditState => state,
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
  /** "Editar": stickers of this card become editable (optionally with some selected). */
  start(cardId: string, selected: readonly string[] = []) {
    set({ cardId, selected: new Set(selected) });
  },
  /** "Aplicar": back to ghosts. */
  apply() {
    if (state.cardId !== null) set({ cardId: null, selected: EMPTY });
  },
  select(ids: readonly string[]) {
    if (state.cardId === null) return;
    set({ ...state, selected: new Set(ids) });
  },
};

export function useStickerEditing(): StickerEditState {
  return useSyncExternalStore(stickerEditing.subscribe, stickerEditing.get, stickerEditing.get);
}
