"use client";
import React from "react";
import type { CanvasImage } from "@/types";
import { InspectorShell, MenuSection, MenuNote, TextInput, UploadField } from "@/ui";
import type { LayerIndex } from "@/lib/layerOrder";
import { ObjectSection, ElementFooter, type ElementShellProps, type MeasureSpec } from "./ElementInspectorParts";

/** The corner shapes the old canvas toolbar offered — same stored values
 * (borderRadius 0 / 8 / 20 / 999; 999 reads as "círculo" from 50 up). */
export const IMAGE_CORNERS = [
  { value: 0, label: "Rectas", shape: "2px" },
  { value: 8, label: "Suaves", shape: "4px" },
  { value: 20, label: "Redondas", shape: "7px" },
  { value: 999, label: "Círculo", shape: "50%" },
] as const;

/** The radius the canvas renders when none is stored (CanvasBoard: transparent
 * images square, the rest 8). */
export function imageCornerValue(img: Pick<CanvasImage, "borderRadius" | "isTransparent">): number {
  return img.borderRadius ?? (img.isTransparent ? 0 : 8);
}
export function isCornerActive(current: number, value: number): boolean {
  return value === 999 ? current >= 50 : current === value;
}

interface ImageInspectorProps extends ElementShellProps {
  image: CanvasImage;
  updateImage: (id: string, patch: Partial<CanvasImage>) => void;
  /** Reemplazar: CanvasBoard uploads the file and swaps src (one undo step). */
  onReplace: (file: File) => void;
  onOpenLayers: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  /** Liquid glass footer: Fondo / Medio / Frente (Capas' own writer). */
  onSetLayer?: (layer: LayerIndex) => void;
  measures?: MeasureSpec;
}

// Liquid glass (design menu-schema.js "image"): Imagen (pinned — the cover
// with Reemplazar, or drop a file on it) · Esquinas (four visual options) ·
// Link · Medidas; the pinned footer holds the layer, Capas, Bloquear and
// Eliminar. Same update_image writes as the old canvas toolbar / Link chip.
// No opacity: CanvasImage has no such field (it would be a new data field and
// a change to the protected public render — plan § 8).
export default function ImageInspector(p: ImageInspectorProps) {
  const { image: img, updateImage } = p;
  const current = imageCornerValue(img);
  const isGif = /\.gif($|\?)/i.test(img.src);
  const corner = IMAGE_CORNERS.find(c => isCornerActive(current, c.value))?.label ?? `${current} px`;
  return (
    <InspectorShell
      id={p.id}
      title={isGif ? "GIF" : "Imagen"}
      icon="image"
      path="imagen / suelta en la sala"
      onClose={p.onClose}
      returnFocusTo={p.returnFocusTo}
      top={p.top}
      width={p.width}
      mode={p.mode}
      height={p.height}
      collapsed={p.collapsed}
      onExpand={p.onExpand}
      footer={<ElementFooter layer={img.layer as LayerIndex} onSetLayer={p.onSetLayer} onOpenLayers={p.onOpenLayers}
        locked={!!img.locked} onToggleLock={p.onToggleLock} noun="imagen" onDelete={p.onDelete} />}
    >
      <div className="mn-swap" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <MenuSection label="Imagen" pinned>
          <UploadField kind="cover" value={img.src || null} label="Reemplazar" caption={isGif ? "GIF" : "Imagen"} accept="image/*"
            onFile={f => p.onReplace(f)} />
        </MenuSection>

        <MenuSection label="Esquinas" icon="corner" summary={corner}>
          <div role="group" aria-label="Esquinas" className="mn-corners">
            {IMAGE_CORNERS.map(c => (
              <div key={c.value} className="mn-corners__opt">
                <button type="button" className="mn-iconbtn mn-iconbtn--filled" aria-pressed={isCornerActive(current, c.value)}
                  aria-label={`Esquinas: ${c.label.toLowerCase()}`} title={c.label} style={{ width: 56, height: 56 }}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); if (!isCornerActive(current, c.value)) updateImage(img.id, { borderRadius: c.value }); }}>
                  <span aria-hidden="true" className="mn-corners__shape" style={{ borderRadius: c.shape }} />
                </button>
                <span aria-hidden="true" className="mn-corners__label">{c.label}</span>
              </div>
            ))}
          </div>
        </MenuSection>

        <MenuSection label="Link" icon="link" summary={img.linkUrl ? img.linkUrl.replace(/^https?:\/\//, "").slice(0, 28) : "Sin link"}>
          <TextInput type="url" mono value={img.linkUrl ?? ""} placeholder="https://"
            onChange={v => updateImage(img.id, { linkUrl: v || undefined })} />
          <MenuNote icon="link">Con un link, se puede tocar en tu perfil</MenuNote>
        </MenuSection>

        <ObjectSection layer={img.layer as LayerIndex} locked={!!img.locked} measures={p.measures} />
      </div>
    </InspectorShell>
  );
}
