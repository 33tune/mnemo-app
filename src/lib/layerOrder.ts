/**
 * MYLAND Editor v3 — Phase E (Layers): the pure stacking logic.
 *
 * The canvas paints every element at `zIndex + layer × 100` (CanvasBoard and
 * every widget, PublicCanvas, MobilePublicCanvas, hitStack) — equal values
 * fall back to DOM order (CanvasBoard renders images, texts, galleries,
 * profiles, guestbooks, social, music, links, stats, cards, media). This file
 * reproduces that order and BUILDS the patches a reorder needs; CanvasBoard
 * writes them through the existing `update_*` ops (elementOps), as ONE history
 * step. Nothing here touches geometry, drag or hit-testing.
 *
 * Bands: `layer` is Fondo (0) / Medio (1) / Frente (2). New elements take an
 * ever-growing `zIndex` (zCounter), so old data may have zIndex >= 100 and
 * cross its band (a Medio element above a Frente one). A reorder never
 * rewrites a layer wholesale: it moves values only inside the span it
 * changes (Al frente = highest + 1, Al fondo = lowest − 1, otherwise the
 * span's own values rotate), so no other element crosses into another
 * band as a side effect. The layer only changes through `setLayer`
 * (the explicit Fondo / Medio / Frente selector), which keeps layer ↔
 * parallax (getParallaxStyle(layer, depth)) intact.
 */
import type { CanvasElement } from "@/types";

export type ElementKind = CanvasElement["elementType"];
export type LayerIndex = 0 | 1 | 2;
export const LAYER_NAMES: Record<LayerIndex, string> = { 0: "Fondo", 1: "Medio", 2: "Frente" };

export interface LayerItem {
  id: string;
  kind: ElementKind;
  zIndex: number;
  layer: LayerIndex;
  /** Paint order among equal z (CanvasBoard's render order). */
  dom: number;
}

export interface LayerPatch {
  id: string;
  kind: ElementKind;
  patch: { zIndex?: number; layer?: LayerIndex };
}

export type ReorderAction = "front" | "forward" | "backward" | "back";

/** CanvasBoard's render order of the element groups (DOM tie-break). */
export const RENDER_ORDER: readonly ElementKind[] = [
  "image", "text", "gallery", "profile", "guestbook", "social", "music", "links", "stats", "card", "media",
];

const asLayer = (l: unknown): LayerIndex => (l === 0 || l === 1 || l === 2 ? l : 0);

/** Elements → layer items, `dom` = their render order. */
export function toLayerItems(elements: readonly CanvasElement[]): LayerItem[] {
  const rank = (k: ElementKind) => RENDER_ORDER.indexOf(k);
  return elements
    .map((el, i) => ({ el, i }))
    .sort((a, b) => rank(a.el.elementType) - rank(b.el.elementType) || a.i - b.i)
    .map(({ el }, dom) => {
      const e = el as unknown as { zIndex?: number; layer?: number };
      return { id: el.id, kind: el.elementType, zIndex: e.zIndex ?? 0, layer: asLayer(e.layer), dom };
    });
}

export const visualZ = (i: LayerItem): number => i.zIndex + i.layer * 100;

/** Back → front, exactly as painted. */
export function visualOrder(items: readonly LayerItem[]): LayerItem[] {
  return [...items].sort((a, b) => visualZ(a) - visualZ(b) || a.dom - b.dom);
}

/** One layer's items, back → front. */
export function layerRun(items: readonly LayerItem[], layer: LayerIndex): LayerItem[] {
  return visualOrder(items).filter(i => i.layer === layer);
}

/** Lowest zIndex a reorder writes: above the canvas's own layers inside the
 * wrapper (background click layer at 0, the editor grid at 1 — ties with the
 * grid paint the element above it, it renders later). */
const MIN_Z = 1;

/** Review E-B1 — moves `id` to slot `to` of `run` (back → front) WITHOUT
 * changing the set of zIndex values that span holds: the span's own values,
 * sorted and made strictly increasing, are handed out in the new order. So
 * only the elements between the old and the new slot change, and none of
 * them jumps to another layer's band as a side effect (rewriting to 1…n
 * sent band-crossing elements — old data, zCounter >= 100 — behind the
 * ProfileCard). */
function rotate(run: readonly LayerItem[], from: number, to: number): LayerPatch[] {
  // Review E closure: with repeated zIndex values in the layer (ties paint in
  // DOM order) a span's new values could tie with a neighbour outside it and
  // land the element in the wrong slot — then the whole layer is the span.
  const dupes = new Set(run.map(i => i.zIndex)).size !== run.length;
  const lo = dupes ? 0 : Math.min(from, to), hi = dupes ? run.length - 1 : Math.max(from, to);
  const span = run.slice(lo, hi + 1);
  const values = span.map(i => i.zIndex).sort((a, b) => a - b);
  for (let i = 0; i < values.length; i++) values[i] = Math.max(values[i], i === 0 ? MIN_Z : values[i - 1] + 1);
  const order = [...span];
  const [moved] = order.splice(from - lo, 1);
  order.splice(to - lo, 0, moved);
  const out: LayerPatch[] = [];
  order.forEach((it, i) => { if (it.zIndex !== values[i]) out.push({ id: it.id, kind: it.kind, patch: { zIndex: values[i] } }); });
  return out;
}

/** Moves `id` to position `to` (back → front index) inside its layer. */
export function moveWithinLayer(items: readonly LayerItem[], id: string, to: number): LayerPatch[] {
  const it = items.find(i => i.id === id);
  if (!it) return [];
  const run = layerRun(items, it.layer);
  const from = run.findIndex(i => i.id === id);
  const target = Math.max(0, Math.min(run.length - 1, to));
  if (from === target) return [];
  // Al frente / al fondo touch ONE element when they can: just above the
  // layer's highest value / just below its lowest (never under MIN_Z).
  if (target === run.length - 1) {
    const top = Math.max(...run.filter(i => i.id !== id).map(i => i.zIndex));
    return [{ id: it.id, kind: it.kind, patch: { zIndex: top + 1 } }];
  }
  if (target === 0) {
    const bottom = Math.min(...run.filter(i => i.id !== id).map(i => i.zIndex));
    if (bottom - 1 >= MIN_Z) return [{ id: it.id, kind: it.kind, patch: { zIndex: bottom - 1 } }];
  }
  return rotate(run, from, target);
}

/** Al frente / Subir / Bajar / Al fondo — always inside the element's layer. */
export function reorder(items: readonly LayerItem[], id: string, action: ReorderAction): LayerPatch[] {
  const it = items.find(i => i.id === id);
  if (!it) return [];
  const run = layerRun(items, it.layer);
  const from = run.findIndex(i => i.id === id);
  const to = action === "front" ? run.length - 1 : action === "back" ? 0 : action === "forward" ? from + 1 : from - 1;
  return moveWithinLayer(items, id, to);
}

/** Which moves make a difference for `id` (buttons' disabled state). */
export function reorderAvailability(items: readonly LayerItem[], id: string): Record<ReorderAction, boolean> {
  const it = items.find(i => i.id === id);
  if (!it) return { front: false, forward: false, backward: false, back: false };
  const run = layerRun(items, it.layer);
  const at = run.findIndex(i => i.id === id);
  const top = at === run.length - 1, bottom = at === 0;
  return { front: !top, forward: !top, backward: !bottom, back: !bottom };
}

/** The explicit Fondo / Medio / Frente selector: `id` moves to `layer`, on
 * top of that layer (where a newly placed thing is expected). */
export function setLayer(items: readonly LayerItem[], id: string, layer: LayerIndex): LayerPatch[] {
  const it = items.find(i => i.id === id);
  if (!it || it.layer === layer) return [];
  // One patch: on top of the target layer (its highest value + 1); into an
  // empty layer it keeps its value, clamped into that layer's band.
  const run = layerRun(items, layer).filter(i => i.id !== id);
  const zIndex = run.length ? Math.max(...run.map(i => i.zIndex)) + 1 : Math.max(MIN_Z, Math.min(it.zIndex, 99));
  return [{ id: it.id, kind: it.kind, patch: { layer, zIndex } }];
}

/** Where `id` sits after `patches`: 1-based position counted FROM THE FRONT
 * of its layer, the layer's size and the layer (the role=status line:
 * "Texto: 1 de 3 en Frente"). */
export function positionAfter(items: readonly LayerItem[], patches: readonly LayerPatch[], id: string): { position: number; count: number; layer: LayerIndex } | null {
  const next = items.map(i => {
    const p = patches.find(x => x.id === i.id);
    return p ? { ...i, ...p.patch } : i;
  });
  const it = next.find(i => i.id === id);
  if (!it) return null;
  const run = layerRun(next, it.layer);
  return { position: run.length - run.findIndex(i => i.id === id), count: run.length, layer: it.layer };
}

/** Double click "traer al frente" (Phase E bug fix): the same reorder. */
export const bringToFront = (items: readonly LayerItem[], id: string): LayerPatch[] => reorder(items, id, "front");

// ── Row labels (Layers panel) ───────────────────────────────────────────────

const KIND_NAME: Record<ElementKind, string> = {
  profile: "Tarjeta", image: "Imagen", text: "Texto", music: "Música", gallery: "Galería", card: "Card",
  media: "Media", guestbook: "Libro de visitas", social: "Social", links: "Links", stats: "Visitas",
};

const clip = (s: string, n = 28) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

/** Labels of every rendered element as the Layers list shows them (front →
 * back): identical names without a detail ("Imagen", "Imagen") get "n.º N"
 * (1 = the front-most), so rows AND role=status announcements tell them apart. */
export function layerLabels(elements: readonly CanvasElement[]): Map<string, { name: string; detail?: string }> {
  const front = visualOrder(toLayerItems(elements)).reverse();
  const byId = new Map(elements.map(e => [e.id, e] as const));
  const out = new Map<string, { name: string; detail?: string }>();
  for (const it of front) out.set(it.id, { ...layerItemLabel(byId.get(it.id)!) });
  const plain = [...out.entries()].filter(([, l]) => !l.detail);
  for (const [, l] of plain) {
    const same = plain.filter(([, x]) => x.name === l.name);
    if (same.length > 1) l.detail = `n.º ${same.findIndex(([, x]) => x === l) + 1}`;
  }
  return out;
}

/** "Texto · notas de verano", "Imagen · GIF", "Tarjeta · Mara"… */
export function layerItemLabel(el: CanvasElement): { name: string; detail?: string } {
  switch (el.elementType) {
    case "text": return { name: KIND_NAME.text, detail: el.content ? clip(el.content) : undefined };
    case "image": return { name: /\.gif(\?|$)/i.test(el.src ?? "") ? "GIF" : KIND_NAME.image };
    case "profile": return { name: KIND_NAME.profile, detail: el.name ? clip(el.name) : undefined };
    case "music": return { name: KIND_NAME.music, detail: el.title ? clip(el.title) : undefined };
    case "gallery": return { name: KIND_NAME.gallery, detail: `${el.images?.length ?? 0} imágenes` };
    default: return { name: KIND_NAME[el.elementType] };
  }
}
