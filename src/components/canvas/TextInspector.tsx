"use client";
import React from "react";
import type { CanvasText, TextFont } from "@/types";
import { InspectorShell, MenuSection, MenuRow, MenuNote, SliderRow, Toggle, ColorRow, TextArea, FontField } from "@/ui";
import { CANVAS_FONTS } from "@/lib/fontList";
import { CANVAS_TEXT_DEFAULTS as TEXT_DEFAULTS, CANVAS_TEXT_SIZE_RANGE as TEXT_SIZE_RANGE } from "@/lib/canvasText";
import type { LayerIndex } from "@/lib/layerOrder";
import { ObjectSection, excerpt, type ElementShellProps, type MeasureSpec } from "./ElementInspectorParts";

interface TextInspectorProps extends ElementShellProps {
  text: CanvasText;
  updateText: (id: string, patch: Partial<CanvasText>) => void;
  onOpenLayers: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  measures?: MeasureSpec;
}

// Editor v3 Phase G (design screen 04): the free text inspector. ONLY the
// fields CanvasText has — content, font, size, letter spacing, uppercase,
// color, opacity — written through CanvasBoard.updateText (update_text, the
// same op the old floating format toolbar sent). The layer and its order
// live in Capas; double-click on the canvas still edits the text in place.
export default function TextInspector(p: TextInspectorProps) {
  const { text: t, updateText } = p;
  const set = (patch: Partial<CanvasText>) => updateText(t.id, patch);
  const name = excerpt(t.content || "", 28) || "Texto vacío";
  return (
    <InspectorShell
      id={p.id}
      title="Texto"
      path={`texto / ${excerpt(t.content || "", 22).toLowerCase() || "vacío"}`}
      aside={name}
      meta={`X ${Math.round(t.x)}   Y ${Math.round(t.y)}   R ${Math.round(t.rotation ?? 0)}°`}
      onClose={p.onClose}
      returnFocusTo={p.returnFocusTo}
      top={p.top}
      width={p.width}
      mode={p.mode}
      height={p.height}
      collapsed={p.collapsed}
      onExpand={p.onExpand}
    >
      <MenuSection label="Contenido" num="01" tone={1} first>
        <TextArea value={t.content} onChange={v => set({ content: v })} rows={3} placeholder="Escribí el texto" />
        <MenuNote>También podés editarlo con doble click en la sala.</MenuNote>
      </MenuSection>

      <MenuSection label="Tipografía" num="02" tone={2}>
        <FontField value={t.font} fonts={CANVAS_FONTS} label={`Fuente: ${CANVAS_FONTS.find(f => f.key === t.font)?.label ?? t.font}`}
          onChange={v => set({ font: v as TextFont })}
          modified={t.font !== TEXT_DEFAULTS.font} onReset={() => set({ font: TEXT_DEFAULTS.font })} />
        <SliderRow label="Tamaño" min={TEXT_SIZE_RANGE.min} max={TEXT_SIZE_RANGE.max} step={1} unit="px" value={t.size}
          onChange={v => set({ size: v })} defaultValue={TEXT_DEFAULTS.size}
          state={t.size !== TEXT_DEFAULTS.size ? "modified" : undefined} onReset={() => set({ size: TEXT_DEFAULTS.size })} />
        <SliderRow label="Interletrado" min={-10} max={60} step={0.5} unit="px" value={t.letterSpacing ?? 0}
          onChange={v => set({ letterSpacing: v })} defaultValue={TEXT_DEFAULTS.letterSpacing}
          state={(t.letterSpacing ?? 0) !== TEXT_DEFAULTS.letterSpacing ? "modified" : undefined}
          onReset={() => set({ letterSpacing: TEXT_DEFAULTS.letterSpacing })} />
        <MenuRow label="Mayúsculas" state={!!t.uppercase !== TEXT_DEFAULTS.uppercase ? "modified" : undefined}
          onReset={() => set({ uppercase: TEXT_DEFAULTS.uppercase })}>
          <Toggle value={!!t.uppercase} onChange={v => set({ uppercase: v })} />
        </MenuRow>
      </MenuSection>

      <MenuSection label="Color" num="03" tone={3}>
        <ColorRow label="Texto" value={t.color} onChange={v => set({ color: v })}
          state={t.color.toLowerCase() !== TEXT_DEFAULTS.color ? "modified" : undefined} onReset={() => set({ color: TEXT_DEFAULTS.color })} />
        <SliderRow label="Opacidad" min={0.05} max={1} step={0.01} value={t.opacity ?? 1} fmt={v => `${Math.round(v * 100)}%`}
          onChange={v => set({ opacity: v })} defaultValue={TEXT_DEFAULTS.opacity}
          state={(t.opacity ?? 1) !== TEXT_DEFAULTS.opacity ? "modified" : undefined} onReset={() => set({ opacity: TEXT_DEFAULTS.opacity })} />
      </MenuSection>

      <ObjectSection num="04" tone={4} layer={t.layer as LayerIndex} onOpenLayers={p.onOpenLayers}
        locked={!!t.locked} onToggleLock={p.onToggleLock} noun="texto" measures={p.measures}
        deleteLabel="Eliminar texto" onDelete={p.onDelete} />
    </InspectorShell>
  );
}
