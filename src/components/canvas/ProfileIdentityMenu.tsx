"use client";
import { EFFECT_INTENSITY_MIN } from "@/lib/uiNumeric";
import { isIntensityEffectVisible } from "@/lib/effectEditorDefaults";
import type { ProfileCardData } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { MenuSection, MenuNote, SliderRow, ColorRow, EffectList, EffectRow, UploadField, TextInput, SwitchRow, Icon } from "@/ui";
import { getFontStyle } from "@/lib/fontList";
import { getPfpSizeBounds, resolvePfpSize, pfpRadiusToPercent } from "@/lib/cardGeometry";
import BlockStyleFields from "./BlockStyleFields";
import { identityController } from "@/lib/objectControllers";
import {
  pfpBorderDisplay, pfpShadowOn, pfpShadowColor, PFP_GLOW_DEFAULT_COLOR, pfpGlowRadius,
} from "@/lib/effectEditorDefaults";

type IdentityPatch = Partial<ProfileCardData>;

interface ProfileIdentityMenuProps {
  card:     ProfileCardData;
  cardW:    number;
  cardH:    number;
  pad:      number;
  /** Resolved base text color (ProfileCard.tsx) — the PFP's default border/
   * shadow colors derive from it, so the menu can show the real ones. */
  baseColor: string;
  onChange: (patch: IdentityPatch) => void;
  /** Menu redesign Phase 2: which object's part to render — the inspector
   * mounts each one under its own object (ProfileConfigMenu.tsx's
   * OBJECT_SECTIONS): "photo" (Foto), "name" (Nombre's text field),
   * "handle" (@usuario, read-only) and "identityBlock" (the identity
   * block's style, shared by Nombre/@usuario/Frase/Bio). */
  only: IdentityPart;
}

export type IdentityPart = "photo" | "name" | "handle" | "identityBlock";

// CONTENT: quién sos. Foto, nombre y handle (de cuenta, solo lectura) —
// tamaño/color/tipografía globales viven en TEXT (ver [[ProfileTypographyMenu]]).
// Ver [[ProfileMetadataMenu]] para descriptor/ubicación/bio/views.
// Tamaño/forma del PFP viven acá (no en TEXT) porque son propiedades de la
// foto misma, igual que subirla/quitarla — ver resolvePfpSize/pfpRadiusToPercent
// en cardGeometry.ts, la misma fuente de verdad que usa ProfileCard.tsx al renderizar.
// Border/sombra/glow del PFP (Stage FASE 2) y el override de estilo del
// bloque Identity vivven acá también — mismo principio que Contact
// Links/Music: el estilo de "esta cosa" vive junto al resto de sus
// controles, no en una pestaña aparte.
export default function ProfileIdentityMenu({ card, cardW, cardH, pad, baseColor, onChange, only }: ProfileIdentityMenuProps) {
  const { photo, name, handle, photoSize, pfpSizePx, pfpRadius } = card;
  const { min: sizeMin, max: sizeMax } = getPfpSizeBounds(cardW, cardH, pad);
  const currentSize = resolvePfpSize(photoSize, pfpSizePx, cardW, cardH, pad);

  const pfpFx = card.effects?.pfp;
  // Editor v3 Phase C: every write goes through the identity controller
  // (objectControllers.ts — the same patches, moved verbatim: border seeds
  // the width shown, shadow seeds the intensity shown, switches pause).
  const id = identityController(card, onChange);
  const patchPfpBorder = (p: Parameters<typeof id.pfpBorder>[0]) => id.pfpBorder(p, pfpBorder.width);
  const patchPfpShadow = id.pfpShadow;
  const patchPfpGlow = id.pfpGlow;

  // Block 1 (estado efectivo): the photo style shows what ProfileCard.tsx
  // actually draws — absent pfp.border/pfp.shadow fall back to variant-
  // derived values there (minimal = no border; guns/poster = a default
  // shadow), so the controls read those same formulas
  // (effectEditorDefaults.ts) instead of fixed placeholders.
  const variant = card.variant;
  const pfpBorder = pfpBorderDisplay(variant, baseColor, pfpFx?.border);
  const shadowOn = pfpShadowOn(variant, pfpFx?.shadow);
  // "Apagar no borra" (effectPause.ts). The PFP shadow's extra rule (on
  // guns/poster ABSENCE renders the variant default, so off leaves an
  // explicit {intensity: 0} sentinel and on with nothing paused just drops
  // it) lives in effectBinding.ts with the rest of the switch semantics —
  // menu redesign Phase 1.
  function setPfpShadowOn(on: boolean) {
    id.setPfpEffect("pfp.shadow", on);
  }

  async function handlePhotoFile(f: File) {
    const { publicUrl } = await uploadToStorage(f);
    id.setPhoto(publicUrl);
  }
  const glowOn = isIntensityEffectVisible(pfpFx?.glow);
  const fxOn = [pfpBorder.width > 0 && "Borde", shadowOn && "Sombra", glowOn && "Brillo"].filter(Boolean) as string[];
  const shapeLabel = (v: number) => pfpRadiusToPercent(v) === 50 ? "Círculo" : pfpRadiusToPercent(v) === 0 ? "Cuadrado" : `${Math.round(v)}%`;
  const shapeChanged = [pfpSizePx != null, pfpRadius != null].filter(Boolean).length;
  const fxChanged = [pfpFx?.border, pfpFx?.shadow, pfpFx?.glow].filter(Boolean).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Liquid glass (design menu-schema.js "photo"): Imagen (pinned upload),
          Forma, Efectos de la foto as tiles (Borde has no switch: no real
          pause exists for it; Sombra / Brillo do). Same writes as before. */}
      {only === "photo" && <>
      <MenuSection label="Imagen" pinned>
        <UploadField kind="avatar" value={photo || null} label="Subir foto" caption="Foto de perfil" accept="image/*"
          onFile={handlePhotoFile} onRemove={() => id.removePhoto()} />
      </MenuSection>

      <MenuSection label="Forma" icon="corner" summary={`${Math.round(currentSize)} px · ${shapeLabel(pfpRadius ?? 100)}`}
        changed={shapeChanged} onReset={() => id.resetPfpShape()}>
        <SliderRow label="Tamaño" icon="maximize" min={sizeMin} max={sizeMax} step={1} value={currentSize} unit="px"
          fmt={v => `${Math.round(v)} px`} onChange={v => id.setPfpSize(v)} />

        <SliderRow label="Forma" icon="corner" min={0} max={100} step={1} value={pfpRadius ?? 100} unit="%"
          fmt={shapeLabel}
          onChange={v => id.setPfpRadius(v)} />
      </MenuSection>

      <MenuSection label="Efectos de la foto" icon="sparkles" active={fxOn.length} summary={fxOn.length ? fxOn.join(", ") : "Ninguno activo"}
        changed={fxChanged} onReset={() => id.resetPfpEffects()}>
        <EffectList label="Efectos de la foto">
          <EffectRow id="border" label="Borde" icon="frame" preview="c-border" active={pfpBorder.width > 0}
            state={pfpBorder.width > 0 ? `${String(pfpBorder.width).replace(".", ",")} px` : "Sin borde"}>
            <ColorRow
              label="Color" value={pfpBorder.color} onChange={v => patchPfpBorder({ color: v })}
              clearable={!!pfpFx?.border?.color} onClear={() => patchPfpBorder({ color: undefined })}
            />
            <SliderRow label="Grosor" icon="frame" min={0} max={6} step={0.5} value={pfpBorder.width}
              onChange={v => patchPfpBorder({ width: v })} fmt={v => `${String(v).replace(".", ",")} px`} unit="px" />
            <SliderRow label="Opacidad" icon="eye" min={0} max={1} step={0.01} value={pfpBorder.opacity}
              onChange={v => patchPfpBorder({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
          </EffectRow>

          <EffectRow id="shadow" label="Sombra" icon="moon" preview="c-shadow" on={shadowOn} onToggle={setPfpShadowOn}
            state={`${Math.round((pfpFx?.shadow?.intensity ?? 0.5) * 100)}%`} paused={!shadowOn && !!pfpFx?.shadow}>
            {shadowOn ? (
              <>
                {/* With no pfp.shadow stored (guns/poster variant default),
                    these show the closest equivalent; editing one stores an
                    explicit shadow from then on. */}
                <ColorRow label="Color" value={pfpShadowColor(baseColor, pfpFx?.shadow)} onChange={v => patchPfpShadow({ color: v })}
                  clearable={!!pfpFx?.shadow?.color} onClear={() => patchPfpShadow({ color: undefined })} />
                <SliderRow label="Intensidad" icon="moon" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={pfpFx?.shadow?.intensity ?? 0.5}
                  onChange={v => patchPfpShadow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
              </>
            ) : null}
          </EffectRow>

          {/* Iteration 0: "on" = visible (intensity > 0, what the avatar
              renders), not mere presence. */}
          <EffectRow id="glow" label="Brillo" icon="sun" preview="c-glow" on={glowOn} onToggle={v => id.setPfpEffect("pfp.glow", v)}
            paused={!glowOn && !!pfpFx?.glow}
            state={pfpFx?.glow?.animation?.enabled && glowOn ? "Con pulso" : `${Math.round((pfpFx?.glow?.intensity ?? 0) * 100)}%`}>
            {pfpFx?.glow && glowOn ? (
              <>
                <ColorRow label="Color" value={pfpFx.glow.color ?? PFP_GLOW_DEFAULT_COLOR} onChange={v => patchPfpGlow({ color: v })} />
                <SliderRow label="Intensidad" icon="sun" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={pfpFx.glow.intensity ?? 0}
                  onChange={v => patchPfpGlow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                <SliderRow label="Radio" icon="maximize" min={0} max={40} step={1} value={pfpGlowRadius(pfpFx.glow)}
                  onChange={v => patchPfpGlow({ radius: v })} fmt={v => `${Math.round(v)} px`} unit="px" />
                {/* Stage FASE 3: same shared glow-pulse system as the card's
                    own Pulso — cardMotion.ts's one keyframe, independent instance. */}
                <SwitchRow label="Pulso" icon="sparkles"
                  value={!!pfpFx.glow.animation?.enabled}
                  onChange={v => patchPfpGlow({ animation: { enabled: v, speed: pfpFx.glow?.animation?.speed } })} />
                {pfpFx.glow.animation?.enabled && (
                  <SliderRow label="Velocidad del pulso" icon="play" min={0.3} max={3} step={0.1} value={pfpFx.glow.animation?.speed ?? 1}
                    onChange={v => patchPfpGlow({ animation: { enabled: true, speed: v } })} fmt={v => `${v.toFixed(1).replace(".", ",")}x`} />
                )}
              </>
            ) : null}
          </EffectRow>
        </EffectList>
      </MenuSection>
      </>}

      {only === "name" && <MenuSection label="Contenido" pinned>
        {/* DS: the content field writes in the name's own font, 19px. */}
        <TextInput value={name ?? ""} onChange={v => id.setName(v)} placeholder="nombre" big
          fontFamily={getFontStyle(card.nameFont ?? card.font)} />
      </MenuSection>}

      {only === "handle" && <MenuSection label="Contenido" pinned>
        <div className="mn-input mn-readonly" title="Se cambia desde tu cuenta">
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", fontFamily: getFontStyle(card.handleFont ?? "Space Mono") }}>@{handle}</span>
          <Icon name="lock" size={14} />
        </div>
        <MenuNote>Se cambia desde tu cuenta</MenuNote>
      </MenuSection>}

      {/* Identity block = name+handle+descriptor+bio grouped as one draggable
          block (see cardComposition.ts's IDENTITY_ROLES) — its blockStyle
          override lives here since Name is its primary content control. No
          textColor/iconColor: those already exist per-role in TEXT (see
          blockStyle.ts's header for why). */}
      {only === "identityBlock" && (
        <BlockStyleFields card={card} blockKey="identity" onChange={onChange}
          scope="Nombre, @usuario, Frase y Bio" />
      )}
    </div>
  );
}
