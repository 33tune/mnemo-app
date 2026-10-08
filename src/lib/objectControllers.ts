/**
 * MYLAND Editor v3 — Phase C (D3): one write path per object type.
 *
 * Before this phase each menu built its own patches inline (and the canvas
 * built add / update / delete ops in long per-type if-chains). Uniform
 * controls, "modified" dots, reset and the global history need every write
 * to go through ONE controller per object type:
 *
 * - `elementOps`: the only place that knows which op adds / updates /
 *   deletes each element type (CanvasBoard: delete, paste, undo / redo,
 *   the update functions it hands to the cards).
 * - profile part controllers (identity, metadata, background, logo, links):
 *   the patches their menus write — moved here VERBATIM from the menus, so
 *   the stored data is byte-identical to before. Typography and effects
 *   already had theirs (useTypographyActions, useCardEffectActions,
 *   effectBinding.ts).
 *
 * Controllers only BUILD writes and hand them to `write`; recording them
 * as undo steps happens once, downstream (enqueueOp → editorHistory.ts),
 * so no menu can forget it.
 */
import type { CanvasElement, CardEffects, ContactLink, ProfileCardData } from "@/types";
import { mergePatch } from "./effectPause";
import { patchEffectGroup, setEffectEnabled } from "./effectBinding";
import { GRADIENT_DEFAULT } from "./effectEditorDefaults";
import { changedKeys, restorePatch, ownHistoryStep, type HistoryEntry } from "./editorHistory";

// ── Element ops ────────────────────────────────────────────────────────────

export type ElementKind = CanvasElement["elementType"];

/** The payload key of each add_* op (add_image → `image`, …). */
const ADD_KEY: Record<ElementKind, string> = {
  card: "card", image: "image", text: "text", gallery: "gallery", profile: "profile", media: "media",
  guestbook: "guestbook", social: "social", music: "music", links: "links", stats: "stats",
};

export const ELEMENT_KINDS = Object.keys(ADD_KEY) as ElementKind[];

/** Structural op shape (CanvasBoard's CanvasOp union is local to it). */
export interface ElementOp { type: string; id?: string; patch?: Record<string, unknown>; [payload: string]: unknown }

export const elementOps = {
  add: (el: CanvasElement): ElementOp => ({ type: `add_${el.elementType}`, [ADD_KEY[el.elementType]]: el }),
  update: (kind: ElementKind, id: string, patch: Record<string, unknown>): ElementOp => ({ type: `update_${kind}`, id, patch }),
  remove: (kind: ElementKind, id: string): ElementOp => ({ type: `delete_${kind}`, id }),
};

/** Element id an op adds / updates / deletes (null for room ops and moves). */
export function opElementId(op: ElementOp): string | null {
  if (op.type.startsWith("update_") || op.type.startsWith("delete_")) return op.id ?? null;
  if (op.type.startsWith("add_")) {
    const kind = op.type.slice(4) as ElementKind;
    const el = op[ADD_KEY[kind]] as { id?: string } | undefined;
    return el?.id ?? null;
  }
  return null;
}

/** Human name of an element kind, for "Deshecho: …" (role=status). */
const KIND_LABEL: Record<ElementKind, string> = {
  profile: "Card de presentación", image: "Imagen", text: "Texto libre", music: "Music", card: "Card",
  gallery: "Galería", media: "Media", guestbook: "Libro de visitas", social: "Social", links: "Links", stats: "Visitas",
};

/** What an entry changed, in words: one object → its name; several → "N elementos";
 * room settings → "Ajustes de MyLand". */
export function entryLabel(entry: HistoryEntry): string {
  const keys = [...entry.changes.keys()];
  const els = keys.filter(k => k.startsWith("el:"));
  if (!els.length) return "Ajustes de MyLand";
  if (els.length > 1) return `${els.length} elementos`;
  const c = entry.changes.get(els[0])!;
  const v = (c.after.present ? c.after.value : c.before.value) as { elementType?: ElementKind } | undefined;
  return (v?.elementType && KIND_LABEL[v.elementType]) || "Elemento";
}

/** The ops that write an undone / redone history entry back (Phase C):
 * - a room setting → its set_* op with the restored value;
 * - an element that must not exist → delete; that must exist but doesn't →
 *   add (the whole stored object); otherwise → update with ONLY the keys
 *   the entry changed (missing ones as `undefined` = cleared), so an
 *   unrelated concurrent write is never clobbered.
 * `addedIds` / `removedIds`: elements the step brings back or removes —
 * the only cases that touch the selection (review C-1: a plain property
 * change never moves the selection, so the inspector stays where it is). */
export function historyOps(
  entry: HistoryEntry, dir: "undo" | "redo", live: (id: string) => CanvasElement | undefined,
): { ops: ElementOp[]; addedIds: string[]; removedIds: string[] } {
  const ops: ElementOp[] = [];
  const addedIds: string[] = [];
  const removedIds: string[] = [];
  for (const [key, c] of entry.changes) {
    const to = dir === "undo" ? c.before : c.after;
    const from = dir === "undo" ? c.after : c.before;
    if (key.startsWith("room:")) { ops.push({ type: key.slice(5), value: to.value }); continue; }
    const id = key.slice(3);
    const cur = live(id);
    if (!to.present) { if (cur) { ops.push(elementOps.remove(cur.elementType, id)); removedIds.push(id); } continue; }
    const el = to.value as CanvasElement;
    if (!cur) { ops.push(elementOps.add(el)); addedIds.push(id); continue; }
    const keys = changedKeys(from.value, to.value).filter(k => k !== "id" && k !== "elementType");
    if (keys.length) ops.push(elementOps.update(el.elementType, id, restorePatch(to.value, keys)));
  }
  return { ops, addedIds, removedIds };
}

export type Write<P> = (patch: P) => void;
type Pfp = NonNullable<NonNullable<ProfileCardData["effects"]>["pfp"]>;

// ── Identity (Nombre / @usuario / Foto) ─────────────────────────────────────

export function identityController(card: ProfileCardData, write: Write<Partial<ProfileCardData>>) {
  const pfpFx = card.effects?.pfp;
  const pfp = (patch: Partial<Pfp>) => write({ effects: { ...card.effects, pfp: { ...card.effects?.pfp, ...patch } } });
  return {
    setName: (name: string) => write({ name }),
    /** An upload lands asynchronously: its own undo step (review C-2). */
    setPhoto: (url: string) => ownHistoryStep(() => write({ photo: url })),
    removePhoto: () => write({ photo: "" }),
    setPfpSize: (v: number) => write({ pfpSizePx: v }),
    setPfpRadius: (v: number) => write({ pfpRadius: v }),
    /** Creating pfp.border switches render to `border.width ?? 2` — seed the
     * width currently shown (0 on minimal) so editing only the color
     * doesn't also make a border appear. */
    pfpBorder: (patch: Partial<NonNullable<Pfp["border"]>>, shownWidth: number) =>
      pfp({ border: mergePatch(pfpFx?.border ?? { width: shownWidth }, patch) }),
    /** No stored shadow = the guns/poster default is what's visible — seed
     * the intensity the slider displays, otherwise an explicit shadow
     * without intensity would render as 0. */
    pfpShadow: (patch: Partial<NonNullable<Pfp["shadow"]>>) =>
      pfp({ shadow: mergePatch(pfpFx?.shadow ?? { intensity: 0.5 }, patch) }),
    pfpGlow: (patch: Partial<NonNullable<Pfp["glow"]>>) => pfp({ glow: mergePatch(pfpFx?.glow, patch) }),
    /** Switches pause instead of deleting (effectBinding.ts / effectPause.ts). */
    setPfpEffect: (path: "pfp.shadow" | "pfp.glow", on: boolean) =>
      write({ effects: setEffectEnabled(card.effects, path, on, card.variant) }),
  };
}

// ── Metadata (Frase / Ubicación / Bio / Visitas) ───────────────────────────

type MetadataKey = "status" | "location" | "bio";

export function metadataController(write: Write<Partial<ProfileCardData>>) {
  return {
    setText: (key: MetadataKey, v: string) => write({ [key]: v }),
    setShowViews: (v: boolean) => write({ showViews: v }),
  };
}

// ── Card background ────────────────────────────────────────────────────────

export function backgroundController(raw: CardEffects | undefined, write: Write<CardEffects>) {
  return {
    /** mergePatch: "clear" DELETES the key (effectPause.ts). Color and image
     * coexist — setting one never clears the other. */
    patchBg: (patch: Partial<NonNullable<CardEffects["bg"]>>) => write(patchEffectGroup(raw, "bg", patch)),
    /** An uploaded image (async): its own undo step. Color and image coexist. */
    setImage: (image: string, imageMode: NonNullable<CardEffects["bg"]>["imageMode"]) =>
      ownHistoryStep(() => write(patchEffectGroup(raw, "bg", { image, imageMode }))),
    patchGradient: (patch: Partial<NonNullable<CardEffects["gradient"]>>) =>
      write({ ...raw, gradient: { ...(raw?.gradient ?? GRADIENT_DEFAULT), ...patch } }),
    /** The gradient switch pauses instead of deleting. */
    setGradient: (on: boolean) => write(setEffectEnabled(raw, "gradient", on)),
  };
}

// ── Logo ───────────────────────────────────────────────────────────────────

export const DEFAULT_LOGO_SIZE = 48;
type Logo = NonNullable<ProfileCardData["logo"]>;

export function logoController(logo: Logo | undefined, write: Write<Partial<Pick<ProfileCardData, "logo">>>) {
  return {
    patch: (p: Partial<Logo>) => { if (logo) write({ logo: { ...logo, ...p } }); },
    /** First upload: a sensible default (top-right corner, modest size) —
     * never a structural placement (no computeBlockLayout involved). */
    setImage: (url: string) => ownHistoryStep(() => write({
      logo: logo
        ? { ...logo, url }
        : { url, anchorX: 0.85, anchorY: 0.15, w: DEFAULT_LOGO_SIZE, h: DEFAULT_LOGO_SIZE, opacity: 1, rotation: 0, zIndex: 1 },
    })),
    remove: () => write({ logo: undefined }),
  };
}

// ── Contact links ──────────────────────────────────────────────────────────

export function linksController(links: ContactLink[], write: Write<Partial<ProfileCardData>>, newId: () => string = () => crypto.randomUUID()) {
  return {
    add: (url: string) => write({ contactLinks: [...links, { id: newId(), url }] }),
    update: (id: string, url: string) => write({ contactLinks: links.map(l => l.id === id ? { ...l, url } : l) }),
    remove: (id: string) => write({ contactLinks: links.filter(l => l.id !== id) }),
    setIconSize: (v: number) => write({ linksIconSize: v }),
  };
}
