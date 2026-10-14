"use client";
import type { CardEffects } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { detectBgModeFromFile } from "@/lib/bgStyle";
import { SliderRow, ColorRow, MenuSection, EffectList, EffectRow, UploadField } from "@/ui";
import { wellHex } from "@/ui/ColorPopover";
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

  async function handleBgFile(f: File) {
    const [{ publicUrl: src }, bgMode] = await Promise.all([uploadToStorage(f), detectBgModeFromFile(f)]);
    // Color and image coexist — never clear the color when an image is set.
    bgCtl.setImage(src, bgMode);
  }
  const color = bg?.color ?? CARD_BG_DEFAULT_COLOR;
  const surfaceOn = [grad && "Gradiente", bg?.glass && "Vidrio", bg?.blur && "Desenfoque"].filter(Boolean) as string[];
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  // Liquid glass (design menu-schema.js "cardBg"): Color · Imagen o GIF ·
  // Superficie (Gradiente / Vidrio / Desenfoque as tiles). "Forma y medidas"
  // follows (ProfileConfigMenu mounts it). Same writes as before.
  return (
    <>
      <MenuSection label="Color" icon="palette" summary={`${wellHex(color)}${(bg?.opacity ?? 1) < 1 ? ` · ${pct(bg?.opacity ?? 1)}` : ""}`} swatch={color}
        changed={[raw?.bg?.color, raw?.bg?.opacity].filter(v => v !== undefined).length}
        onReset={() => patchBg({ color: undefined, opacity: undefined })}>
        <ColorRow
          label="Color" value={color} onChange={v => patchBg({ color: v })} keepAlpha
          clearable={!!raw?.bg?.color} onClear={() => patchBg({ color: undefined })}
          state={raw?.bg?.color ? "modified" : undefined} onReset={() => patchBg({ color: undefined })}
        />
        <SliderRow label="Opacidad" icon="eye" min={0} max={1} step={0.01} value={bg?.opacity ?? 1}
          onChange={v => patchBg({ opacity: v })} fmt={pct}
          state={raw?.bg?.opacity !== undefined ? "modified" : undefined} onReset={() => patchBg({ opacity: undefined })} />
      </MenuSection>

      <MenuSection label="Imagen o GIF" icon="image" summary={bg?.image ? (/\.gif/i.test(bg.image) ? "GIF" : "Cargada") : "Vacía"}>
        {/* Shown for the EFFECTIVE image (a legacy card.bgImage too). Remove
            writes "" (not undefined) so the raw override actually masks a
            legacy image — getProfileCardEffects spreads effects.bg over it. */}
        <UploadField kind="cover" value={bg?.image || null} label="Subir imagen o GIF" accept="image/*,image/gif"
          caption={bg?.image && /\.gif/i.test(bg.image) ? "GIF" : "Imagen"}
          onFile={handleBgFile} onRemove={() => patchBg({ image: "" })} />
      </MenuSection>

      <MenuSection label="Superficie" icon="blend" active={surfaceOn.length} summary={surfaceOn.length ? surfaceOn.join(", ") : "Ninguno activo"}
        changed={[raw?.gradient, raw?.bg?.glass, raw?.bg?.blur].filter(v => v !== undefined).length}>
        <EffectList label="Superficie del fondo">
          <EffectRow id="gradient" label="Gradiente" icon="palette" preview="c-grad" on={!!grad} onToggle={v => bgCtl.setGradient(v)}
            state={grad ? `${grad.angle}°` : undefined}>
            {grad ? (
              <>
                <ColorRow label="Color A" value={grad.from} onChange={v => patchGradient({ from: v })} />
                <ColorRow label="Color B" value={grad.to} onChange={v => patchGradient({ to: v })} />
                <SliderRow label="Ángulo" icon="rotate" min={0} max={360} step={5} value={grad.angle}
                  onChange={v => patchGradient({ angle: v })} fmt={v => `${Math.round(v)}°`} />
                <SliderRow label="Opacidad" icon="eye" min={0} max={1} step={0.01} value={grad.opacity}
                  onChange={v => patchGradient({ opacity: v })} fmt={pct} />
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="glass" label="Vidrio" icon="blend" preview="c-glass" on={!!bg?.glass} onToggle={v => patchBg({ glass: v })}
            state="Translúcido" />
          <EffectRow id="blur" label="Desenfoque" icon="blend" preview="c-blur" active={!!bg?.blur} state={bg?.blur ? `${bg.blur} px` : "Sin desenfoque"}>
            <SliderRow label="Blur" icon="blend" min={0} max={24} step={1} value={bg?.blur ?? 0}
              onChange={v => patchBg({ blur: v || undefined })} unit="px" fmt={v => `${Math.round(v)} px`} />
          </EffectRow>
        </EffectList>
      </MenuSection>
    </>
  );
}
