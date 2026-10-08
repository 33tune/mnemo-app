/**
 * MYLAND Editor v3 — Phase B (D1): the editor's single source of truth for
 * SELECTION and for WHAT THE INSPECTOR EDITS.
 *
 * Before this phase the same question lived in three places: CanvasBoard's
 * `selectedIds`, CanvasBoard's `inspectorCardId` (closed by an effect one
 * render after the selection changed) and ProfileInspector's local "active
 * object" state (+ inspectorSession). Now:
 *
 *   { selectedIds, target }
 *
 * - `selectedIds`: the canvas selection (unchanged semantics — every writer
 *   keeps calling `setSelectedIds(set | prev => set)`).
 * - `target`: what the inspector is showing, or `null` when it is closed.
 *   A target whose element leaves the selection closes IN THE SAME UPDATE
 *   (no extra render with a stale inspector).
 *
 * Phase B only opens the inspector for the ProfileCard; the other kinds are
 * part of the model so the host (EditorHost) can grow into them (Tu sala in
 * D, Texto/Imagen/Music in G) without another selection system.
 *
 * Session memory (absorbs the old inspectorSession.ts): per card, the last
 * active object and each object's body scroll — in memory only, gone on
 * reload. It is a plain mutable store, NOT React state: scroll positions
 * must not re-render the board on every scroll event.
 */
import { useCallback, useMemo, useReducer, type SetStateAction } from "react";
import { DEFAULT_OBJECT, OBJECT_IDS, type ObjectId } from "./inspectorObjects";

export type EditorTargetKind = "room" | "profile" | "text" | "image" | "music";

export type EditorTarget =
  | { kind: "room" }
  | { kind: "profile"; id: string; objectId: ObjectId }
  | { kind: "text" | "image" | "music"; id: string };

export interface EditorSelectionState {
  selectedIds: Set<string>;
  /** What the inspector edits; null = inspector closed. */
  target: EditorTarget | null;
}

export type EditorSelectionAction =
  | { type: "select"; ids: SetStateAction<Set<string>> }
  | { type: "open"; target: EditorTarget }
  | { type: "close" }
  | { type: "setObject"; objectId: ObjectId };

export const INITIAL_EDITOR_SELECTION: EditorSelectionState = { selectedIds: new Set(), target: null };

export function targetId(target: EditorTarget | null): string | null {
  return target && target.kind !== "room" ? target.id : null;
}

/** The ProfileCard inspector's id ("Editar"'s aria-controls) and the
 * "Editar" button's id (where focus returns when the inspector closes). */
export const profileInspectorId = (cardId: string) => `mnemo-profile-editor-${cardId}`;
export const profileEditButtonId = (cardId: string) => `mnemo-profile-edit-${cardId}`;

/** The ProfileCard whose inspector is open, if any. */
export function profileTargetId(target: EditorTarget | null): string | null {
  return target?.kind === "profile" ? target.id : null;
}

/** A target stays valid only while it matches the selection: an element
 * target needs its element selected; "room" (Tu sala) needs an empty one. */
function targetSurvives(target: EditorTarget, selectedIds: Set<string>): boolean {
  return target.kind === "room" ? selectedIds.size === 0 : selectedIds.has(target.id);
}

export function editorSelectionReducer(state: EditorSelectionState, action: EditorSelectionAction): EditorSelectionState {
  switch (action.type) {
    case "select": {
      const next = typeof action.ids === "function" ? action.ids(state.selectedIds) : action.ids;
      if (next === state.selectedIds) return state;
      const target = state.target && targetSurvives(state.target, next) ? state.target : null;
      return { selectedIds: next, target };
    }
    case "open":
      if (!targetSurvives(action.target, state.selectedIds)) return state;
      return { ...state, target: action.target };
    case "close":
      return state.target ? { ...state, target: null } : state;
    case "setObject":
      if (state.target?.kind !== "profile" || !OBJECT_IDS.includes(action.objectId)) return state;
      if (state.target.objectId === action.objectId) return state;
      return { ...state, target: { ...state.target, objectId: action.objectId } };
  }
}

// ── Session memory ────────────────────────────────────────────────────────

interface CardMemory {
  object: ObjectId;
  scroll: Partial<Record<ObjectId, number>>;
}

export interface SelectionMemory {
  activeObject(cardId: string): ObjectId;
  setActiveObject(cardId: string, id: ObjectId): void;
  scrollOf(cardId: string, id: ObjectId): number;
  setScroll(cardId: string, id: ObjectId, top: number): void;
}

export function createSelectionMemory(): SelectionMemory {
  const mem = new Map<string, CardMemory>();
  const get = (cardId: string): CardMemory => {
    let m = mem.get(cardId);
    if (!m) { m = { object: DEFAULT_OBJECT, scroll: {} }; mem.set(cardId, m); }
    return m;
  };
  return {
    activeObject: cardId => get(cardId).object,
    setActiveObject: (cardId, id) => { if (OBJECT_IDS.includes(id)) get(cardId).object = id; },
    scrollOf: (cardId, id) => get(cardId).scroll[id] ?? 0,
    setScroll: (cardId, id, top) => { get(cardId).scroll[id] = Math.max(0, Math.round(top)); },
  };
}

/** The editor's session memory (module scope = this page load). */
export const selectionMemory: SelectionMemory = createSelectionMemory();

// ── React binding ─────────────────────────────────────────────────────────

export interface EditorSelection {
  selectedIds: Set<string>;
  target: EditorTarget | null;
  /** Same contract as the old `useState` setter (value or updater). */
  setSelectedIds: (ids: SetStateAction<Set<string>>) => void;
  /** Opens the ProfileCard inspector on the card's remembered object. */
  openProfile: (cardId: string) => void;
  closeInspector: () => void;
  /** Switches the open ProfileCard inspector to another object (and
   * remembers it for the card). */
  setObject: (objectId: ObjectId) => void;
  memory: SelectionMemory;
}

export function useEditorSelection(memory: SelectionMemory = selectionMemory): EditorSelection {
  const [state, dispatch] = useReducer(editorSelectionReducer, INITIAL_EDITOR_SELECTION);
  const setSelectedIds = useCallback((ids: SetStateAction<Set<string>>) => dispatch({ type: "select", ids }), []);
  const openProfile = useCallback((cardId: string) => {
    dispatch({ type: "open", target: { kind: "profile", id: cardId, objectId: memory.activeObject(cardId) } });
  }, [memory]);
  const closeInspector = useCallback(() => dispatch({ type: "close" }), []);
  const profileId = profileTargetId(state.target);
  const setObject = useCallback((objectId: ObjectId) => {
    if (profileId) memory.setActiveObject(profileId, objectId);
    dispatch({ type: "setObject", objectId });
  }, [memory, profileId]);
  return useMemo(() => ({
    selectedIds: state.selectedIds, target: state.target,
    setSelectedIds, openProfile, closeInspector, setObject, memory,
  }), [state, setSelectedIds, openProfile, closeInspector, setObject, memory]);
}
