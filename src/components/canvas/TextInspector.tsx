"use client";
import { elementSearch } from "@/ui/SettingsSearch";
import React, { useState } from "react";
import type { CanvasText, TextFont } from "@/types";
import { Accordion, InspectorShell, MenuSection, MenuRow, SliderRow, ColorRow, TextArea, FontField, Tabs } from "@/ui";
import { wellHex } from "@/ui/ColorPopover";
import { CANVAS_FONTS, getFontStyle } from "@/lib/fontList";
import { CANVAS_TEXT_DEFAULTS as TEXT_DEFAULTS, CANVAS_TEXT_SIZE_RANGE as TEXT_SIZE_RANGE } from "@/lib/canvasText";
import type { LayerIndex } from "@/lib/layerOrder";
import { ObjectSection, ElementFooter, type ElementShellProps, type MeasureSpec } from "./ElementInspectorParts";

interface TextInspectorProps extends ElementShellProps {
  text: CanvasText;
  updateText: (id: string, patch: Partial<CanvasText>) => void;
  onOpenLayers: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  /** Liquid glass footer: Fondo / Medio / Frente (Capas' own writer). */
  onSetLayer?: (layer: LayerIndex) => void;
  measures?: MeasureSpec;
}

const CASE_TABS = [{ id: "aa", label: "Aa", withText: true }, { id: "AA", label: "AA", withText: true }];

// Liquid glass (design menu-schema.js "text"): Contenido (pinned, written in
// the text's own font) · Tipografía · Color · Medidas; the pinned footer
// holds the layer, Capas, Bloquear and Eliminar. ONLY the fields CanvasText
// has, written through CanvasBoard.updateText (update_text).
export default function TextInspector(p: TextInspectorProps) {
  const [openCard, setOpenCard] = useState<string | null>(null);
  const { text: t, updateText } = p;
  const set = (patch: Partial<CanvasText>) => updateText(t.id, patch);
  const fontLabel = CANVAS_FONTS.find(f => f.key === t.font)?.label ?? t.font;
  const px = (v: number) => `${String(Math.round(v * 10) / 10).replace(".", ",")} px`;
  const typeChanged = [t.font !== TEXT_DEFAULTS.font, t.size !== TEXT_DEFAULTS.size, (t.letterSpacing ?? 0) !== TEXT_DEFAULTS.letterSpacing, !!t.uppercase !== TEXT_DEFAULTS.uppercase].filter(Boolean).length;
  const colorChanged = [t.color.toLowerCase() !== TEXT_DEFAULTS.color, (t.opacity ?? 1) !== TEXT_DEFAULTS.opacity].filter(Boolean).length;
  return (
    <InspectorShell
      id={p.id}
      search={elementSearch("text", "Texto")}
      title="Texto"
      icon="text"
      path="texto / suelto en la sala"
      onClose={p.onClose}
      returnFocusTo={p.returnFocusTo}
      top={p.top}
      width={p.width}
      mode={p.mode}
      height={p.height}
      collapsed={p.collapsed}
      onExpand={p.onExpand}
      footer={<ElementFooter layer={t.layer as LayerIndex} onSetLayer={p.onSetLayer} onOpenLayers={p.onOpenLayers}
        locked={!!t.locked} onToggleLock={p.onToggleLock} noun="texto" onDelete={p.onDelete} />}
    >
      {/* DS accordion: every card starts closed; one open at a time. */}
      <Accordion open={openCard} onOpenChange={setOpenCard}>
      <div className="mn-swap" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <MenuSection label="Contenido" pinned>
          {/* DS: the in-place edit lives in the field's tooltip. */}
          <div title="Doble click en la sala para editarlo ahí">
          <TextArea value={t.content} onChange={v => set({ content: v })} rows={3} placeholder="Escribí el texto"
            fontFamily={getFontStyle(t.font)} style={{ fontSize: 19, textTransform: t.uppercase ? "uppercase" : "none" }} />
          </div>
        </MenuSection>

        <MenuSection label="Tipografía" icon="case" summary={`${fontLabel} · ${Math.round(t.size)} px`} changed={typeChanged}
          onReset={() => set({ font: TEXT_DEFAULTS.font, size: TEXT_DEFAULTS.size, letterSpacing: TEXT_DEFAULTS.letterSpacing, uppercase: TEXT_DEFAULTS.uppercase })}>
          <FontField value={t.font} fonts={CANVAS_FONTS} label={`Fuente: ${fontLabel}`}
            onChange={v => set({ font: v as TextFont })}
            modified={t.font !== TEXT_DEFAULTS.font} onReset={() => set({ font: TEXT_DEFAULTS.font })} />
          <SliderRow label="Tamaño" icon="maximize" min={TEXT_SIZE_RANGE.min} max={TEXT_SIZE_RANGE.max} step={1} unit="px" value={t.size} fmt={px}
            onChange={v => set({ size: v })} defaultValue={TEXT_DEFAULTS.size}
            state={t.size !== TEXT_DEFAULTS.size ? "modified" : undefined} onReset={() => set({ size: TEXT_DEFAULTS.size })} />
          <SliderRow label="Interletrado" icon="spacing" min={-10} max={60} step={0.5} unit="px" value={t.letterSpacing ?? 0} fmt={px}
            onChange={v => set({ letterSpacing: v })} defaultValue={TEXT_DEFAULTS.letterSpacing}
            state={(t.letterSpacing ?? 0) !== TEXT_DEFAULTS.letterSpacing ? "modified" : undefined}
            onReset={() => set({ letterSpacing: TEXT_DEFAULTS.letterSpacing })} />
          <MenuRow label="Mayúsculas" state={!!t.uppercase !== TEXT_DEFAULTS.uppercase ? "modified" : undefined}
            onReset={() => set({ uppercase: TEXT_DEFAULTS.uppercase })}>
            <div style={{ width: 196 }}>
              <Tabs tabs={CASE_TABS} active={t.uppercase ? "AA" : "aa"} onChange={v => set({ uppercase: v === "AA" })} label="Mayúsculas" />
            </div>
          </MenuRow>
        </MenuSection>

        <MenuSection label="Color" icon="palette" summary={`${wellHex(t.color)}${(t.opacity ?? 1) < 1 ? ` · ${Math.round((t.opacity ?? 1) * 100)}%` : ""}`} swatch={t.color}
          changed={colorChanged} onReset={() => set({ color: TEXT_DEFAULTS.color, opacity: TEXT_DEFAULTS.opacity })}>
          <ColorRow label="Color" value={t.color} onChange={v => set({ color: v })}
            state={t.color.toLowerCase() !== TEXT_DEFAULTS.color ? "modified" : undefined} onReset={() => set({ color: TEXT_DEFAULTS.color })} />
          <SliderRow label="Opacidad" icon="eye" min={0.05} max={1} step={0.01} value={t.opacity ?? 1} fmt={v => `${Math.round(v * 100)}%`}
            onChange={v => set({ opacity: v })} defaultValue={TEXT_DEFAULTS.opacity}
            state={(t.opacity ?? 1) !== TEXT_DEFAULTS.opacity ? "modified" : undefined} onReset={() => set({ opacity: TEXT_DEFAULTS.opacity })} />
        </MenuSection>

        <ObjectSection layer={t.layer as LayerIndex} locked={!!t.locked} measures={p.measures} />
      </div>
      </Accordion>
    </InspectorShell>
  );
}
