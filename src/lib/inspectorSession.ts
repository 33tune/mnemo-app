/**
 * Menu redesign Phase 2 — what the inspector remembers per card for the
 * session (design-direction.md §H: "Al cambiar de objeto se reemplaza el
 * cuerpo y se recuerdan el scroll y la sección abierta"): the active object
 * and the body's scroll position per object. In memory only — never
 * persisted, gone on reload.
 */
import { DEFAULT_OBJECT, OBJECT_IDS, type ObjectId } from "./inspectorObjects";

interface CardMemory {
  object: ObjectId;
  scroll: Partial<Record<ObjectId, number>>;
}

export interface InspectorSession {
  activeObject(cardId: string): ObjectId;
  setActiveObject(cardId: string, id: ObjectId): void;
  scrollOf(cardId: string, id: ObjectId): number;
  setScroll(cardId: string, id: ObjectId, top: number): void;
}

export function createInspectorSession(): InspectorSession {
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

/** The editor's single session store (module scope = this page load). */
export const inspectorSession: InspectorSession = createInspectorSession();
