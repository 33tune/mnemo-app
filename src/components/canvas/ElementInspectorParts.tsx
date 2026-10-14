"use client";
import React from "react";
import { MenuSection, MenuNote, NumberField, Tabs, IconButton } from "@/ui";
import { LAYER_NAMES, type LayerIndex } from "@/lib/layerOrder";

/** The dock / sheet props every element inspector forwards to InspectorShell. */
export interface ElementShellProps {
  id?: string;
  onClose: () => void;
  returnFocusTo: () => HTMLElement | null;
  top: number;
  width: number;
  mode: "dock" | "sheet";
  height?: number;
  collapsed: boolean;
  onExpand: () => void;
}

export type Geometry = { x?: number; y?: number; w?: number; h?: number; rotation?: number };

/** Measures the Medidas fields can write (CanvasBoard.setElementGeometry —
 * the drag's own writers). Absent axis = no field. */
export interface MeasureSpec {
  x: number; y: number; w?: number; h?: number; rotation: number;
  /** Real ranges (the canvas the drag clamps to). */
  range: { maxX: number; minY: number; maxY: number; minW?: number; maxW?: number; minH?: number; maxH?: number };
  onGeometry: (g: Geometry) => void;
}

/** Display rotation in -180..180 (the rotate drag can accumulate any angle). */
export function normalizeRotation(deg: number): number {
  const r = ((deg % 360) + 360) % 360;
  return r > 180 ? r - 360 : r;
}

/** Short one-line excerpt for the header (aside / path). */
export function excerpt(text: string, max = 28): string {
  const s = text.replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Medidas (O1): numeric alternative to dragging (WCAG 2.5.7) — Liquid
 * glass: a closed card with the DS 2-column grid; disabled with the reason
 * while the element is locked. Writes through the drag's own writers. */
export function MeasuresRow({ m, locked }: { m: MeasureSpec; locked: boolean }) {
  const r = m.range;
  const parts = [`${Math.round(m.x)}, ${Math.round(m.y)}`, m.w !== undefined && m.h !== undefined ? `${Math.round(m.w)} × ${Math.round(m.h)}` : "", `${Math.round(normalizeRotation(m.rotation))}°`].filter(Boolean);
  return (
    <MenuSection label="Medidas" icon="move" summary={parts.join(" · ")} defaultOpen={false}>
      {locked && <MenuNote icon="lock">Bloqueado: desbloquealo para cambiar sus medidas</MenuNote>}
      <div className="mn-measures">
        <NumberField label="X" min={0} max={r.maxX} value={Math.round(m.x)} disabled={locked} onChange={v => m.onGeometry({ x: v })} />
        <NumberField label="Y" min={r.minY} max={r.maxY} value={Math.round(m.y)} disabled={locked} onChange={v => m.onGeometry({ y: v })} />
        {m.w !== undefined && r.minW !== undefined && r.maxW !== undefined && (
          <NumberField label="Ancho" min={r.minW} max={r.maxW} value={Math.round(m.w)} disabled={locked} onChange={v => m.onGeometry({ w: v })} />
        )}
        {m.h !== undefined && r.minH !== undefined && r.maxH !== undefined && (
          <NumberField label="Alto" min={r.minH} max={r.maxH} value={Math.round(m.h)} disabled={locked} onChange={v => m.onGeometry({ h: v })} />
        )}
        <NumberField label="Rotación" min={-180} max={180} value={Math.round(normalizeRotation(m.rotation))} disabled={locked}
          onChange={v => m.onGeometry({ rotation: v })} />
      </div>
    </MenuSection>
  );
}

const LAYER_TABS = ([0, 1, 2] as const).map(l => ({ id: String(l), label: LAYER_NAMES[l], withText: true }));

interface ElementFooterProps {
  /** The element's layer. */
  layer: LayerIndex;
  /** Liquid glass: Fondo / Medio / Frente in the footer — through the SAME
   * writer Capas uses (CanvasBoard.applyLayerChange + setElementLayer). */
  onSetLayer?: (layer: LayerIndex) => void;
  onOpenLayers: () => void;
  locked: boolean;
  onToggleLock: () => void;
  /** "texto", "imagen"… (accessible names). */
  noun: string;
  onDelete: () => void;
}

// Liquid glass (DS element footer, L2): pinned under the inspector body —
// the layer (Fondo / Medio / Frente), "Ordenar en Capas   L", Bloquear
// (pressed while locked) and Eliminar (danger). The order inside a layer
// still lives in Capas.
export function ElementFooter({ layer, onSetLayer, onOpenLayers, locked, onToggleLock, noun, onDelete }: ElementFooterProps) {
  return (
    <>
      <div style={{ flex: 1, minWidth: 0 }} title="Capa">
        {onSetLayer
          ? <Tabs tabs={LAYER_TABS} active={String(layer)} onChange={v => onSetLayer(Number(v) as LayerIndex)} label="Capa" />
          : <span className="mn-label" style={{ paddingLeft: 6 }}>{LAYER_NAMES[layer]}</span>}
      </div>
      <IconButton icon="layers" aria-label="Ordenar en Capas" title="Ordenar en Capas   L" size={38} onClick={() => onOpenLayers()} />
      <IconButton icon={locked ? "lock" : "unlock"} aria-label={`Bloquear ${noun}`} title={locked ? "Desbloquear" : "Bloquear"} size={38}
        pressed={locked} onClick={() => onToggleLock()} />
      <IconButton icon="trash" tone="danger" aria-label={`Eliminar ${noun}`} title={`Eliminar ${noun}   ⌫`} size={38} onClick={() => onDelete()} />
    </>
  );
}

interface ObjectSectionProps {
  /** The element's layer (shown; set from the footer / Capas). */
  layer: LayerIndex;
  locked: boolean;
  measures?: MeasureSpec;
}

/** Liquid glass: the element's last card — Medidas (the layer, lock and
 * delete moved to the pinned ElementFooter). "Ordenar en Capas" lives in the
 * footer's layers button. */
export function ObjectSection({ locked, measures }: ObjectSectionProps) {
  return measures ? <MeasuresRow m={measures} locked={locked} /> : null;
}
