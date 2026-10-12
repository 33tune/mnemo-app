"use client";
import React, { useId, useRef, useState } from "react";
import { InspectorShell, MenuSection, MenuRow, MenuNote, Toggle, Icon } from "@/ui";
import {
  LAYER_NAMES, layerRun, reorderAvailability, type LayerIndex, type LayerItem, type ReorderAction,
} from "@/lib/layerOrder";

/** One row of the list (CanvasBoard builds it from the rendered elements). */
export interface LayerRow {
  id: string;
  layer: LayerIndex;
  name: string;
  detail?: string;
  /** Image thumbnail (decorative). */
  thumb?: string;
  /** undefined = this element has no lock (the ProfileCard is always fixed). */
  locked?: boolean;
}

export interface LayersPanelProps {
  id?: string;
  /** Every rendered element, for the stacking math (layerOrder.ts). */
  items: LayerItem[];
  /** Front → back (the order the list shows). */
  rows: LayerRow[];
  selectedIds: Set<string>;
  onSelect: (id: string, additive: boolean) => void;
  onReorder: (id: string, action: ReorderAction) => void;
  /** Drag in the list: `to` = back → front index inside the element's layer. */
  onMove: (id: string, to: number) => void;
  onSetLayer: (id: string, layer: LayerIndex) => void;
  onToggleLock: (id: string) => void;
  // Shell
  onClose: () => void;
  returnFocusTo: () => HTMLElement | null;
  top: number;
  width: number;
  mode: "dock" | "sheet";
  height?: number;
  collapsed: boolean;
  onExpand: () => void;
}

const LAYER_TABS = ([0, 1, 2] as const).map(l => ({ id: String(l), label: LAYER_NAMES[l] }));
const ORDER_BUTTONS: { action: ReorderAction; label: string }[] = [
  { action: "front", label: "Al frente" }, { action: "forward", label: "Subir" },
  { action: "backward", label: "Bajar" }, { action: "back", label: "Al fondo" },
];

// Editor v3 Phase E: Layers (rail › Capas), in the dock. The list is the REAL
// paint order (zIndex + layer × 100, top = front) with a Frente / Medio /
// Fondo heading wherever the layer changes; clicking a row selects that
// element on the canvas (Shift / Ctrl / ⌘ add to the selection). Ordering
// stays inside a layer — by dragging a row (pointer) or with Al frente /
// Subir / Bajar / Al fondo (keyboard and pointer); the layer only changes
// through the explicit Fondo / Medio / Frente selector. Every change is ONE
// undo step, written with the existing update_* ops (CanvasBoard).
// No hiding, no new data: zIndex, layer and locked only.
export default function LayersPanel(p: LayersPanelProps) {
  const { rows, items, selectedIds } = p;
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const headingBase = useId();
  const [drag, setDrag] = useState<{ id: string; layer: LayerIndex; over: number } | null>(null);

  const selected = rows.filter(r => selectedIds.has(r.id));
  const single = selected.length === 1 ? selected[0] : null;
  const avail = single ? reorderAvailability(items, single.id) : null;

  // ── Drag to reorder (pointer only; the buttons are the keyboard path) ──
  // Rows of the dragged element's layer, front → back, and the slot (index
  // in that list) the pointer is over.
  function slotAt(layer: LayerIndex, clientY: number): number {
    const same = rows.filter(r => r.layer === layer);
    let slot = same.length - 1;
    for (let i = 0; i < same.length; i++) {
      const el = rowRefs.current.get(same[i].id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientY < r.top + r.height / 2) { slot = i; break; }
    }
    return slot;
  }
  function onGripDown(e: React.PointerEvent, row: LayerRow) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const same = rows.filter(r => r.layer === row.layer);
    setDrag({ id: row.id, layer: row.layer, over: same.findIndex(r => r.id === row.id) });
  }
  function onGripMove(e: React.PointerEvent) {
    if (!drag) return;
    const over = slotAt(drag.layer, e.clientY);
    if (over !== drag.over) setDrag({ ...drag, over });
  }
  function onGripUp(e: React.PointerEvent) {
    if (!drag) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    const runLength = layerRun(items, drag.layer).length;
    const same = rows.filter(r => r.layer === drag.layer);
    const from = same.findIndex(r => r.id === drag.id);
    if (drag.over !== from) p.onMove(drag.id, runLength - 1 - drag.over);
    setDrag(null);
  }

  // Consecutive same-layer rows (normally Frente → Medio → Fondo; old data
  // whose zIndex crosses its band can interleave — the list stays faithful).
  const runs: { layer: LayerIndex; rows: LayerRow[] }[] = [];
  for (const row of rows) {
    const last = runs[runs.length - 1];
    if (last && last.layer === row.layer) last.rows.push(row); else runs.push({ layer: row.layer, rows: [row] });
  }
  return (
    <InspectorShell
      id={p.id}
      title="Capas"
      path="sala / capas"
      aside="orden de la sala"
      meta={`${rows.length} ${rows.length === 1 ? "objeto" : "objetos"} · arriba = frente`}
      onClose={p.onClose}
      returnFocusTo={p.returnFocusTo}
      top={p.top}
      width={p.width}
      mode={p.mode}
      height={p.height}
      collapsed={p.collapsed}
      onExpand={p.onExpand}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <MenuSection label="Objetos" num="01" tone={1} first>
          {rows.length === 0 ? (
            <MenuNote>La sala está vacía: sumá algo desde Agregar.</MenuNote>
          ) : (
            // Consecutive rows of one layer = one list named by its visible
            // heading (headings are not list items).
            <div className="mn-layers" aria-label="Objetos de la sala, del frente al fondo" role="group" data-sheet={p.mode === "sheet" || undefined}>
              {runs.map((run, ri) => (
                <React.Fragment key={`${run.layer}-${ri}`}>
                  <div className="mn-layers__heading" id={`${headingBase}-${ri}`}>{LAYER_NAMES[run.layer]}</div>
                  <div role="list" aria-labelledby={`${headingBase}-${ri}`} className="mn-layers__list">
                    {run.rows.map(row => {
                      const isSel = selectedIds.has(row.id);
                      const sameLayer = rows.filter(r => r.layer === row.layer);
                      const slot = sameLayer.findIndex(r => r.id === row.id);
                      const dropHere = !!drag && drag.layer === row.layer && drag.over === slot && drag.id !== row.id;
                      const dropAfter = dropHere && slot > sameLayer.findIndex(r => r.id === drag!.id);
                      return (
                        <div key={row.id} role="listitem" ref={el => { if (el) rowRefs.current.set(row.id, el); else rowRefs.current.delete(row.id); }}
                          className="mn-layer" data-selected={isSel || undefined} data-dragging={drag?.id === row.id || undefined}
                          data-drop={dropHere ? (dropAfter ? "after" : "before") : undefined}>
                          <span className="mn-layer__grip" aria-hidden="true" title="Arrastrá para reordenar dentro de la capa"
                            onPointerDown={e => onGripDown(e, row)} onPointerMove={onGripMove} onPointerUp={onGripUp}
                            onPointerCancel={() => setDrag(null)}>
                            <Icon name="grip" size={14} />
                          </span>
                          <button type="button" className="mn-layer__btn" aria-pressed={isSel}
                            aria-label={`${row.name}${row.detail ? `: ${row.detail}` : ""}${row.locked ? ", bloqueado" : ""}`}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); p.onSelect(row.id, e.shiftKey || e.metaKey || e.ctrlKey); }}>
                            {row.thumb
                              ? <img className="mn-layer__thumb" src={row.thumb} alt="" draggable={false} />
                              : <span className="mn-layer__thumb mn-layer__thumb--none" aria-hidden="true" />}
                            <span className="mn-layer__name">{row.name}</span>
                            {row.detail && <span className="mn-layer__detail">{row.detail}</span>}
                            {row.locked && <span className="mn-layer__lock" aria-hidden="true"><Icon name="lock" size={12} /></span>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </MenuSection>

        <MenuSection label="Seleccionado" num="02" tone={2} first>
          {!single ? (
            <MenuNote>{selected.length > 1 ? "Elegí un solo objeto para cambiar su capa u orden." : "Tocá un objeto de la lista (o del lienzo) para ordenarlo. Shift suma objetos a la selección."}</MenuNote>
          ) : (
            <>
              <div className="mn-layers__picked">
                <span className="mn-layer__name">{single.name}</span>
                {single.detail && <span className="mn-layer__detail">{single.detail}</span>}
              </div>
              {/* Review E-M1: three toggle buttons, not an arrow-activated
                  radiogroup — moving between them must not write (and leave
                  an undo step) per key, nor wrap from Frente to Fondo. */}
              <MenuRow label="Capa">
                <div role="group" aria-label="Capa" className="mn-layerseg" data-sheet={p.mode === "sheet" || undefined}>
                  {LAYER_TABS.map(t => (
                    <button key={t.id} type="button" className="mn-layerseg__btn" aria-pressed={String(single.layer) === t.id}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); if (String(single.layer) !== t.id) p.onSetLayer(single.id, Number(t.id) as LayerIndex); }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </MenuRow>
              <div role="group" aria-label={`Orden dentro de ${LAYER_NAMES[single.layer]}`} className="mn-layers__order">
                {/* aria-disabled (not `disabled`): "Al frente" turns unavailable
                    right after it is pressed and must keep focus (never <body>). */}
                {ORDER_BUTTONS.map(b => (
                  <button key={b.action} type="button" className="mn-btn mn-btn--secondary" aria-disabled={!avail?.[b.action] || undefined}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); if (avail?.[b.action]) p.onReorder(single.id, b.action); }}>{b.label}</button>
                ))}
              </div>
              {single.locked !== undefined && (
                <MenuRow label="Bloquear">
                  <Toggle value={!!single.locked} onChange={() => p.onToggleLock(single.id)} />
                </MenuRow>
              )}
              {/* SELECTION_Z_BOOST (canvasZIndex.ts) keeps the selected element
                  and its handles above everything while selected — say so, or
                  "Al fondo" would look broken until it is deselected. */}
              <MenuNote>El orden cambia dentro de su capa; para pasar a otra, usá Capa. Mientras está seleccionado se dibuja encima; al deseleccionarlo vuelve a su lugar.</MenuNote>
            </>
          )}
        </MenuSection>
      </div>
    </InspectorShell>
  );
}
