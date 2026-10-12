"use client";
import { EFFECT_INTENSITY_MIN } from "@/lib/uiNumeric";
import { isIntensityEffectVisible } from "@/lib/effectEditorDefaults";
import { useRef, useState } from "react";
import type { ProfileCardData } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { T, uv, MenuSection, MenuRow, MenuNote, SliderRow, ActionButton, ColorRow, Toggle, EffectList, EffectRow, refocusFieldControl } from "@/ui";
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
  const [editingName, setEditingName] = useState(false);
  // Review round (A11Y-2): Enter commits / Esc cancels (restores the name
  // the field opened with); both hand focus back to the name button.
  const nameAtEdit = useRef<string>("");
  const nameBtnRef = useRef<HTMLDivElement>(null);
  function openNameEdit() {
    nameAtEdit.current = name ?? "";
    setEditingName(true);
  }
  function closeNameEdit(cancel: boolean) {
    if (cancel && (name ?? "") !== nameAtEdit.current) id.setName(nameAtEdit.current);
    setEditingName(false);
    requestAnimationFrame(() => nameBtnRef.current?.focus({ preventScroll: true }));
  }
  const photoRef = useRef<HTMLInputElement>(null);
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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const { publicUrl } = await uploadToStorage(f);
    id.setPhoto(publicUrl);
    if (photoRef.current) photoRef.current.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[4] }}>
      {/* Editor v3 Phase F: Foto in numbered sections — 01 Imagen, 02 Forma,
          03 Efectos de la foto as effect rows (Borde has no switch: no real
          pause exists for it; Sombra / Brillo do). Same writes as before. */}
      {only === "photo" && <>
      <MenuSection label="Imagen" num="01" tone={1} first>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div onClick={() => photoRef.current?.click()} style={{
            width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
            overflow: "hidden", cursor: "pointer", background: uv("surface-control"),
          }}>
            {photo
              ? <img src={photo} alt="Foto de perfil actual" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ color: uv("text-tertiary"), width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
            <ActionButton variant="primary" fullWidth onClick={() => photoRef.current?.click()}>{photo ? "Reemplazar" : "Subir foto"}</ActionButton>
            {photo && <ActionButton variant="ghost" fullWidth onClick={e => { const el = e.currentTarget as HTMLElement; id.removePhoto(); refocusFieldControl(el); }}>Quitar</ActionButton>}
          </div>
        </div>
        <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
      </MenuSection>

      <MenuSection label="Forma" num="02" tone={2} first>
        <SliderRow label="Tamaño" min={sizeMin} max={sizeMax} step={1} value={currentSize} unit="px"
          onChange={v => id.setPfpSize(v)} />

        <SliderRow label="Forma" min={0} max={100} step={1} value={pfpRadius ?? 100} unit="%"
          fmt={v => pfpRadiusToPercent(v) === 50 ? "círculo" : pfpRadiusToPercent(v) === 0 ? "cuadrado" : `${Math.round(v)}%`}
          onChange={v => id.setPfpRadius(v)} />
      </MenuSection>

      <MenuSection label="Efectos de la foto" num="03" tone={4} active={[pfpBorder.width > 0, shadowOn, isIntensityEffectVisible(pfpFx?.glow)].filter(Boolean).length} first>
        <EffectList label="Efectos de la foto">
          <EffectRow id="border" label="Borde" tone={1} active={pfpBorder.width > 0}
            state={pfpBorder.width > 0 ? `${String(pfpBorder.width).replace(".", ",")} px` : "Sin borde"}>
            <ColorRow
              label="Color" value={pfpBorder.color} onChange={v => patchPfpBorder({ color: v })}
              clearable={!!pfpFx?.border?.color} onClear={() => patchPfpBorder({ color: undefined })}
            />
            <SliderRow label="Grosor" min={0} max={6} step={0.5} value={pfpBorder.width}
              onChange={v => patchPfpBorder({ width: v })} unit="px" />
            <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={pfpBorder.opacity}
              onChange={v => patchPfpBorder({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
          </EffectRow>

          <EffectRow id="shadow" label="Sombra" tone={2} on={shadowOn} onToggle={setPfpShadowOn}>
            {shadowOn ? (
              <>
                {/* With no pfp.shadow stored (guns/poster variant default),
                    these show the closest equivalent; editing one stores an
                    explicit shadow from then on. */}
                <ColorRow label="Color" value={pfpShadowColor(baseColor, pfpFx?.shadow)} onChange={v => patchPfpShadow({ color: v })}
                  clearable={!!pfpFx?.shadow?.color} onClear={() => patchPfpShadow({ color: undefined })} />
                <SliderRow label="Intensidad" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={pfpFx?.shadow?.intensity ?? 0.5}
                  onChange={v => patchPfpShadow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
              </>
            ) : <MenuNote>Una sombra debajo de la foto.</MenuNote>}
          </EffectRow>

          {/* Iteration 0: "on" = visible (intensity > 0, what the avatar
              renders), not mere presence. */}
          <EffectRow id="glow" label="Brillo" tone={3} on={isIntensityEffectVisible(pfpFx?.glow)} onToggle={v => id.setPfpEffect("pfp.glow", v)}
            state={pfpFx?.glow?.animation?.enabled && isIntensityEffectVisible(pfpFx?.glow) ? "pulso" : undefined}>
            {pfpFx?.glow && isIntensityEffectVisible(pfpFx.glow) ? (
              <>
                <ColorRow label="Color" value={pfpFx.glow.color ?? PFP_GLOW_DEFAULT_COLOR} onChange={v => patchPfpGlow({ color: v })} />
                <SliderRow label="Intensidad" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={pfpFx.glow.intensity ?? 0}
                  onChange={v => patchPfpGlow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                <SliderRow label="Radio" min={0} max={40} step={1} value={pfpGlowRadius(pfpFx.glow)}
                  onChange={v => patchPfpGlow({ radius: v })} unit="px" />
                {/* Stage FASE 3: same shared glow-pulse system as the card's
                    own Pulso — cardMotion.ts's one keyframe, independent instance. */}
                <MenuRow label="Pulso">
                  <Toggle
                    value={!!pfpFx.glow.animation?.enabled}
                    onChange={v => patchPfpGlow({ animation: { enabled: v, speed: pfpFx.glow?.animation?.speed } })}
                  />
                </MenuRow>
                {pfpFx.glow.animation?.enabled && (
                  <SliderRow label="Velocidad del pulso" min={0.3} max={3} step={0.1} value={pfpFx.glow.animation?.speed ?? 1}
                    onChange={v => patchPfpGlow({ animation: { enabled: true, speed: v } })} fmt={v => `${v.toFixed(1)}x`} />
                )}
              </>
            ) : <MenuNote>Un halo de luz alrededor de la foto.</MenuNote>}
          </EffectRow>
        </EffectList>
      </MenuSection>
      </>}

      {only === "name" && <MenuSection label="Contenido" first>
        {editingName ? (
          <input autoFocus
            value={name}
            onChange={e => id.setName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); closeNameEdit(false); }
              else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeNameEdit(true); }
            }}
            onMouseDown={e => e.stopPropagation()}
            placeholder="nombre"
            aria-label="Nombre"
            className="mn-focusable"
            // Phase F: the filled field of design screen 02.
            style={{ width: "100%", background: uv("surface-control"), color: uv("text-primary"), fontSize: 15, fontWeight: 500, fontFamily: T.uiFont.sans, padding: "11px 12px", border: "none", borderRadius: T.ui.radius.field, boxSizing: "border-box", outline: "none" }}
          />
        ) : (
          // Block 2: keyboard-operable (Tab + Enter/Space opens the field).
          <div ref={nameBtnRef} onClick={openNameEdit}
            role="button" tabIndex={0} aria-label={name ? `Nombre: ${name}. Editar` : "Editar nombre"} className="mn-focusable"
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openNameEdit(); } }}
            style={{ fontSize: 15, fontWeight: 500, fontFamily: T.uiFont.sans, color: name ? uv("text-primary") : uv("text-tertiary"), cursor: "text", padding: "11px 12px", borderRadius: T.ui.radius.field, background: uv("surface-control") }}>
            {name || "nombre"}
          </div>
        )}
      </MenuSection>}

      {only === "handle" && <MenuSection label="Contenido" first>
        <MenuRow>
          <span style={{ ...T.type.help, color: uv("text-secondary") }}>@{handle}</span>
        </MenuRow>
        <MenuNote>Es el @ de tu cuenta: no se edita acá.</MenuNote>
      </MenuSection>}

      {/* Identity block = name+handle+descriptor+bio grouped as one draggable
          block (see cardComposition.ts's IDENTITY_ROLES) — its blockStyle
          override lives here since Name is its primary content control. No
          textColor/iconColor: those already exist per-role in TEXT (see
          blockStyle.ts's header for why). */}
      {only === "identityBlock" && (
        <BlockStyleFields card={card} blockKey="identity" onChange={onChange}
          scope="afecta Nombre, @usuario, Frase y Bio" />
      )}
    </div>
  );
}
