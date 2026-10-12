"use client";
import { useRef } from "react";
import type { CardEffects } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { detectBgModeFromFile } from "@/lib/bgStyle";
import { T, SliderRow, ColorRow, MenuSection, MenuNote, ActionButton, EffectList, EffectRow, refocusFieldControl } from "@/ui";
import { CARD_BG_DEFAULT_COLOR } from "@/lib/effectEditorDefaults";
import { backgroundController } from "@/lib/objectControllers";

interface Props {
  /** getProfileCardEffects(card) — what the card renders. Display only. */
  effective: CardEffects;
  /** card.effects as stored — the base every patch is built on (Block 1:
   * read-effective / write-raw, see ProfileConfigMenu.tsx). */
  raw?: CardEffects;
  onChange: (patch: CardEffects) => void;
}

// Iteration 0: shared with Music (effectEditorDefaults.ts).

// Stage FASE 2 (Personalization UI/UX): the BACKGROUND tab — extracted
// verbatim from PersonalizePanel's old "fondo" tab (same fields, same
// defaults, same behavior), now its own top-level view instead of a tab
// nested two clicks deep behind "Estilo". Color and image coexist (see
// CardLayers.tsx/bgStyle.ts, FASE 1) — this menu never clears one when the
// other is set. Opacity here only ever reaches CardEffects.bg.opacity,
// which CardLayers.tsx applies to the background LAYER alone — content
// (text/icons/blocks) sits on a separate layer, unaffected by design (see
// CardLayers.tsx's Layer 0a vs Content Layer split).
// Block 1: every control DISPLAYS the effective value (legacy bgColor/
// opacity and the derived "glass when no color and no image" default
// included) but patches only the raw field the user touched. The gradient
// toggle pauses instead of deleting ("apagar no borra", effectPause.ts).
export default function ProfileBackgroundMenu({ effective, raw, onChange }: Props) {
  const bg   = effective.bg;
  const grad = effective.gradient;

  // Editor v3 Phase C: writes go through the background controller
  // (objectControllers.ts). patchBg: "clear" DELETES the key — legacy
  // bgColor underneath must look the same before and after reload.
  const bgCtl = backgroundController(raw, onChange);
  const patchBg = bgCtl.patchBg;
  const patchGradient = bgCtl.patchGradient;

  const bgImgRef = useRef<HTMLInputElement>(null);
  async function handleBgImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const [{ publicUrl: src }, bgMode] = await Promise.all([uploadToStorage(f), detectBgModeFromFile(f)]);
    // Color and image coexist — never clear the color when an image is set.
    bgCtl.setImage(src, bgMode);
    if (bgImgRef.current) bgImgRef.current.value = "";
  }

  // Editor v3 Phase F: numbered sections — 01 Color (with its opacity),
  // 02 Imagen, 03 Superficie (Gradiente / Vidrio / Desenfoque as effect
  // rows). "Esquinas" follows as 04 (ProfileConfigMenu numbers it).
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[6] }}>
      <MenuSection label="Color" num="01" tone={1} changed={[raw?.bg?.color, raw?.bg?.opacity].filter(v => v !== undefined).length} first>
        <ColorRow
          label="Color" value={bg?.color ?? CARD_BG_DEFAULT_COLOR} onChange={v => patchBg({ color: v })} keepAlpha
          clearable={!!raw?.bg?.color} onClear={() => patchBg({ color: undefined })}
          state={raw?.bg?.color ? "modified" : undefined} onReset={() => patchBg({ color: undefined })}
        />
        <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={bg?.opacity ?? 1}
          onChange={v => patchBg({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`}
          state={raw?.bg?.opacity !== undefined ? "modified" : undefined} onReset={() => patchBg({ opacity: undefined })} />
      </MenuSection>

      <MenuSection label="Imagen" num="02" tone={4} first>
        <div style={{ display: "flex", gap: 6 }}>
          <ActionButton variant={bg?.image ? "secondary" : "primary"} fullWidth onClick={() => bgImgRef.current?.click()}>{bg?.image ? "Reemplazar" : "Subir imagen o GIF"}</ActionButton>
          {/* Shown for the EFFECTIVE image (a legacy card.bgImage too). "" (not
              undefined) so the raw override actually masks a legacy image —
              getProfileCardEffects spreads effects.bg over the legacy field. */}
          {bg?.image && <ActionButton variant="ghost" onClick={e => { const el = e.currentTarget as HTMLElement; patchBg({ image: "" }); refocusFieldControl(el); }}>Quitar</ActionButton>}
        </div>
        <input ref={bgImgRef} type="file" accept="image/*,image/gif" style={{ display: "none" }} onChange={handleBgImgUpload} />
      </MenuSection>

      <MenuSection label="Superficie" num="03" tone={2} changed={[raw?.gradient, raw?.bg?.glass, raw?.bg?.blur].filter(v => v !== undefined).length} first>
        <EffectList label="Superficie del fondo">
          <EffectRow id="gradient" label="Gradiente" tone={1} on={!!grad} onToggle={v => bgCtl.setGradient(v)}
            state={grad ? `${grad.angle}°` : undefined}>
            {grad ? (
              <>
                <ColorRow label="Color A" value={grad.from} onChange={v => patchGradient({ from: v })} />
                <ColorRow label="Color B" value={grad.to} onChange={v => patchGradient({ to: v })} />
                <SliderRow label="Ángulo" min={0} max={360} step={5} value={grad.angle}
                  onChange={v => patchGradient({ angle: v })} fmt={v => `${v}°`} />
                <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={grad.opacity}
                  onChange={v => patchGradient({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
              </>
            ) : <MenuNote>Un degradé de dos colores sobre el fondo.</MenuNote>}
          </EffectRow>
          <EffectRow id="glass" label="Vidrio" tone={2} on={!!bg?.glass} onToggle={v => patchBg({ glass: v })}>
            <MenuNote>Fondo translúcido que deja ver la sala detrás.</MenuNote>
          </EffectRow>
          <EffectRow id="blur" label="Desenfoque" tone={4} active={!!bg?.blur} state={bg?.blur ? `${bg.blur} px` : undefined}>
            <SliderRow label="Blur" min={0} max={24} step={1} value={bg?.blur ?? 0}
              onChange={v => patchBg({ blur: v || undefined })} unit="px" />
          </EffectRow>
        </EffectList>
      </MenuSection>
    </div>
  );
}
