"use client";
import React from "react";
import { T, uv, MenuSection, MenuRow, MenuNote, Toggle, ActionButton, Collapsible, NumberField } from "@/ui";
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

/** Medidas (O1): numeric alternative to dragging (WCAG 2.5.7), closed by
 * default, disabled with the reason while the element is locked. */
export function MeasuresRow({ m, locked }: { m: MeasureSpec; locked: boolean }) {
  const r = m.range;
  return (
    <Collapsible label="Medidas">
      {locked && <MenuNote>Bloqueado: desbloquealo para cambiar sus medidas.</MenuNote>}
      <NumberField label="X (px)" min={0} max={r.maxX} value={Math.round(m.x)} disabled={locked} onChange={v => m.onGeometry({ x: v })} />
      <NumberField label="Y (px)" min={r.minY} max={r.maxY} value={Math.round(m.y)} disabled={locked} onChange={v => m.onGeometry({ y: v })} />
      {m.w !== undefined && r.minW !== undefined && r.maxW !== undefined && (
        <NumberField label="Ancho (px)" min={r.minW} max={r.maxW} value={Math.round(m.w)} disabled={locked} onChange={v => m.onGeometry({ w: v })} />
      )}
      {m.h !== undefined && r.minH !== undefined && r.maxH !== undefined && (
        <NumberField label="Alto (px)" min={r.minH} max={r.maxH} value={Math.round(m.h)} disabled={locked} onChange={v => m.onGeometry({ h: v })} />
      )}
      <NumberField label="Rotación (°)" min={-180} max={180} value={Math.round(normalizeRotation(m.rotation))} disabled={locked}
        onChange={v => m.onGeometry({ rotation: v })} />
    </Collapsible>
  );
}

interface ObjectSectionProps {
  num: string;
  tone: 1 | 2 | 3 | 4;
  /** The element's layer (the order itself lives in Capas). */
  layer: LayerIndex;
  onOpenLayers: () => void;
  locked: boolean;
  onToggleLock: () => void;
  /** "texto", "imagen"… (Bloquear's accessible name). */
  noun: string;
  measures?: MeasureSpec;
  /** Absent when the inspector already offers its own remove action. */
  deleteLabel?: string;
  onDelete?: () => void;
}

// Editor v3 Phase G: the last section of the text / image inspectors —
// where the element sits (its layer; ordering and the layer selector live in
// Capas, the only place that changes `layer`), its lock, Medidas and delete.
export function ObjectSection({ num, tone, layer, onOpenLayers, locked, onToggleLock, noun, measures, deleteLabel, onDelete }: ObjectSectionProps) {
  return (
    <MenuSection label="Objeto" num={num} tone={tone}>
      <MenuRow label="Capa">
        <span style={{ ...T.type.value, color: uv("text-secondary") }}>{LAYER_NAMES[layer]}</span>
      </MenuRow>
      <ActionButton variant="secondary" fullWidth onClick={() => onOpenLayers()}>Ordenar en Capas</ActionButton>
      <MenuRow label="Bloquear">
        <Toggle value={locked} onChange={() => onToggleLock()} label={`Bloquear ${noun}`} />
      </MenuRow>
      {measures && <MeasuresRow m={measures} locked={locked} />}
      {deleteLabel && onDelete && (
        <div style={{ marginTop: T.space[4] }}>
          <ActionButton variant="danger" fullWidth onClick={() => onDelete()}>{deleteLabel}</ActionButton>
        </div>
      )}
    </MenuSection>
  );
}
