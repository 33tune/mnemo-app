"use client";
import { useRef } from "react";
import type { CardEffects } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { detectBgModeFromFile } from "@/lib/bgStyle";
import { T, SliderRow, Toggle, ColorRow, MenuSection, MenuRow, ActionButton, Divider, Collapsible } from "@/ui";

interface Props {
  effects?: CardEffects;
  onChange: (patch: CardEffects) => void;
}

// Stage FASE 2 (Personalization UI/UX): the BACKGROUND tab — extracted
// verbatim from PersonalizePanel's old "fondo" tab (same fields, same
// defaults, same behavior), now its own top-level view instead of a tab
// nested two clicks deep behind "Estilo". Color and image coexist (see
// CardLayers.tsx/bgStyle.ts, FASE 1) — this menu never clears one when the
// other is set. Opacity here only ever reaches CardEffects.bg.opacity,
// which CardLayers.tsx applies to the background LAYER alone — content
// (text/icons/blocks) sits on a separate layer, unaffected by design (see
// CardLayers.tsx's Layer 0a vs Content Layer split).
export default function ProfileBackgroundMenu({ effects, onChange }: Props) {
  const bg   = effects?.bg;
  const grad = effects?.gradient;

  function patchBg(patch: Partial<NonNullable<CardEffects["bg"]>>) {
    onChange({ ...effects, bg: { ...effects?.bg, ...patch } });
  }
  function patchGradient(patch: Partial<NonNullable<CardEffects["gradient"]>>) {
    const base = effects?.gradient ?? { from: "#0f0f0f", to: "#1a1a2e", angle: 135, opacity: 0.6 };
    onChange({ ...effects, gradient: { ...base, ...patch } });
  }

  const bgImgRef = useRef<HTMLInputElement>(null);
  async function handleBgImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const [{ publicUrl: src }, bgMode] = await Promise.all([uploadToStorage(f), detectBgModeFromFile(f)]);
    // Color and image coexist — never clear the color when an image is set.
    patchBg({ image: src, imageMode: bgMode });
    if (bgImgRef.current) bgImgRef.current.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[4] }}>
      <MenuSection label="Color de fondo" first>
        <ColorRow
          label="Color" value={bg?.color ?? "#141416"} onChange={v => patchBg({ color: v })}
          clearable={!!bg?.color} onClear={() => patchBg({ color: undefined })}
        />
      </MenuSection>

      <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={bg?.opacity ?? 1}
        onChange={v => patchBg({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />

      <MenuSection label="Imagen / GIF">
        <div style={{ display: "flex", gap: 6 }}>
          <ActionButton fullWidth onClick={() => bgImgRef.current?.click()}>subir</ActionButton>
          {bg?.image && <ActionButton variant="danger" onClick={() => patchBg({ image: undefined })}>quitar</ActionButton>}
        </div>
        <input ref={bgImgRef} type="file" accept="image/*,image/gif" style={{ display: "none" }} onChange={handleBgImgUpload} />
      </MenuSection>

      <Collapsible label="Avanzado">
        <SliderRow label="Blur" min={0} max={24} step={1} value={bg?.blur ?? 0}
          onChange={v => patchBg({ blur: v || undefined })} unit="px" />

        <MenuRow label="Glass">
          <Toggle value={!!bg?.glass} onChange={v => patchBg({ glass: v })} />
        </MenuRow>

        <Divider />

        <MenuSection label="Gradiente" first>
          <MenuRow label="Activar">
            <Toggle value={!!grad} onChange={v => {
              if (v) onChange({ ...effects, gradient: { from: "#0f0f0f", to: "#1a1a2e", angle: 135, opacity: 0.6 } });
              else onChange({ ...effects, gradient: undefined });
            }} />
          </MenuRow>
          {grad && (
            <>
              <ColorRow label="Color A" value={grad.from} onChange={v => patchGradient({ from: v })} />
              <ColorRow label="Color B" value={grad.to} onChange={v => patchGradient({ to: v })} />
              <SliderRow label="Angulo" min={0} max={360} step={5} value={grad.angle}
                onChange={v => patchGradient({ angle: v })} fmt={v => `${v}°`} />
              <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={grad.opacity}
                onChange={v => patchGradient({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
            </>
          )}
        </MenuSection>
      </Collapsible>
    </div>
  );
}
