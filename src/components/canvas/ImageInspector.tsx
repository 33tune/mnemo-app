"use client";
import React, { useRef } from "react";
import type { CanvasImage } from "@/types";
import { InspectorShell, MenuSection, MenuNote, TextInput, ActionButton, Icon } from "@/ui";
import type { LayerIndex } from "@/lib/layerOrder";
import { ObjectSection, type ElementShellProps, type MeasureSpec } from "./ElementInspectorParts";

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
  measures?: MeasureSpec;
}

// Editor v3 Phase G (design screen 05): the image inspector. Replace /
// remove, the corner shape and the link that used to live in the canvas
// toolbar and the "Link" chip (same update_image writes); size and rotation
// stay on the canvas handles (+ Medidas); the layer lives in Capas.
// No opacity: CanvasImage has no such field (it would be a new data field and
// a change to the protected public render — plan § 8).
export default function ImageInspector(p: ImageInspectorProps) {
  const { image: img, updateImage } = p;
  const fileRef = useRef<HTMLInputElement>(null);
  const current = imageCornerValue(img);
  const isGif = /\.gif($|\?)/i.test(img.src);
  // Header route: the file's kind (the design uses a slug; an image has no name).
  const ext = (img.src.match(/\.(png|jpe?g|gif|webp|avif|svg)($|\?)/i)?.[1] ?? "imagen").toLowerCase().replace("jpeg", "jpg");
  return (
    <InspectorShell
      id={p.id}
      title={isGif ? "GIF" : "Imagen"}
      path={`imagen / ${ext}`}
      aside="suelta en la sala"
      meta={`X ${Math.round(img.x)}   Y ${Math.round(img.y)}   W ${Math.round(img.w)}   H ${Math.round(img.h)}   R ${Math.round(img.rotation ?? 0)}°`}
      onClose={p.onClose}
      returnFocusTo={p.returnFocusTo}
      top={p.top}
      width={p.width}
      mode={p.mode}
      height={p.height}
      collapsed={p.collapsed}
      onExpand={p.onExpand}
    >
      <div className="mn-imgsource">
        <div className="mn-imgsource__thumb" aria-hidden="true">
          {img.src && <img src={img.src} alt="" draggable={false} />}
        </div>
        <div className="mn-imgsource__actions">
          <ActionButton variant="primary" fullWidth onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={14} /> Reemplazar
          </ActionButton>
          <ActionButton variant="danger" fullWidth onClick={() => p.onDelete()}>Eliminar imagen</ActionButton>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true"
          onChange={e => { const f = e.target.files?.[0]; if (f) p.onReplace(f); e.target.value = ""; }} />
      </div>

      <MenuSection label="Forma" num="01" tone={1}>
        <div role="group" aria-label="Esquinas" className="mn-shapeseg" data-sheet={p.mode === "sheet" || undefined}>
          {IMAGE_CORNERS.map(c => (
            <button key={c.value} type="button" className="mn-shapeseg__btn" aria-pressed={isCornerActive(current, c.value)}
              title={`Esquinas: ${c.label.toLowerCase()}`}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); if (!isCornerActive(current, c.value)) updateImage(img.id, { borderRadius: c.value }); }}>
              <span aria-hidden="true" className="mn-shapeseg__shape" style={{ borderRadius: c.shape }} />
              {c.label}
            </button>
          ))}
        </div>
      </MenuSection>

      <MenuSection label="Link" num="02" tone={2}>
        <TextInput type="url" mono value={img.linkUrl ?? ""} placeholder="https://"
          onChange={v => updateImage(img.id, { linkUrl: v || undefined })} />
        <MenuNote>Con un link, la imagen se puede tocar en tu perfil público.</MenuNote>
      </MenuSection>

      <ObjectSection num="03" tone={3} layer={img.layer as LayerIndex} onOpenLayers={p.onOpenLayers}
        locked={!!img.locked} onToggleLock={p.onToggleLock} noun="imagen" measures={p.measures} />
    </InspectorShell>
  );
}
