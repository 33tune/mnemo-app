"use client";
import { EFFECT_INTENSITY_MIN } from "@/lib/uiNumeric";
import { isIntensityEffectVisible } from "@/lib/effectEditorDefaults";
import { useRef, useState } from "react";
import type { ProfileCardData } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { T, uv, MenuSection, MenuRow, MenuNote, SliderRow, ActionButton, ColorRow, Toggle, Collapsible, refocusFieldControl } from "@/ui";
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
      {only === "photo" && <MenuSection label="Imagen" first>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div onClick={() => photoRef.current?.click()} style={{
            width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
            overflow: "hidden", cursor: "pointer",
            border: `1px solid ${uv("line-strong")}`, background: uv("surface-control"),
          }}>
            {photo
              ? <img src={photo} alt="Foto de perfil actual" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ color: uv("text-tertiary"), width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <ActionButton onClick={() => photoRef.current?.click()}>subir</ActionButton>
            {photo && <ActionButton variant="danger" onClick={e => { const el = e.currentTarget as HTMLElement; id.removePhoto(); refocusFieldControl(el); }}>quitar</ActionButton>}
          </div>
        </div>
        <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />

        <SliderRow label="Tamaño" min={sizeMin} max={sizeMax} step={1} value={currentSize} unit="px"
          onChange={v => id.setPfpSize(v)} />

        <SliderRow label="Forma" min={0} max={100} step={1} value={pfpRadius ?? 100} unit="%"
          fmt={v => pfpRadiusToPercent(v) === 50 ? "círculo" : pfpRadiusToPercent(v) === 0 ? "cuadrado" : `${Math.round(v)}%`}
          onChange={v => id.setPfpRadius(v)} />

        {/* UX audit finding: this used to be called "Avanzado", same label
            BlockStyleFields' own Identity collapsible below uses for a
            completely different thing (the identity TEXT block's style,
            not the photo's) — renamed to make the scope explicit. */}
        <Collapsible label="Estilo de foto">
          <MenuSection label="Borde" first>
            <ColorRow
              label="Color" value={pfpBorder.color} onChange={v => patchPfpBorder({ color: v })}
              clearable={!!pfpFx?.border?.color} onClear={() => patchPfpBorder({ color: undefined })}
            />
            <SliderRow label="Grosor" min={0} max={6} step={0.5} value={pfpBorder.width}
              onChange={v => patchPfpBorder({ width: v })} unit="px" />
            <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={pfpBorder.opacity}
              onChange={v => patchPfpBorder({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
          </MenuSection>

          <MenuSection label="Sombra">
            <MenuRow label="Activar">
              <Toggle value={shadowOn} onChange={setPfpShadowOn} />
            </MenuRow>
            {shadowOn && (
              <>
                {/* With no pfp.shadow stored (guns/poster variant default),
                    these show the closest equivalent; editing one stores an
                    explicit shadow from then on. */}
                <ColorRow label="Color" value={pfpShadowColor(baseColor, pfpFx?.shadow)} onChange={v => patchPfpShadow({ color: v })}
                  clearable={!!pfpFx?.shadow?.color} onClear={() => patchPfpShadow({ color: undefined })} />
                <SliderRow label="Intensidad" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={pfpFx?.shadow?.intensity ?? 0.5}
                  onChange={v => patchPfpShadow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
              </>
            )}
          </MenuSection>

          <MenuSection label="Glow">
            <MenuRow label="Activar">
              {/* Iteration 0: "on" = visible (intensity > 0, what the avatar
                  renders), not mere presence — a stored glow at intensity 0
                  used to read "on" while drawing nothing. */}
              <Toggle value={isIntensityEffectVisible(pfpFx?.glow)} onChange={v => id.setPfpEffect("pfp.glow", v)} />
            </MenuRow>
            {pfpFx?.glow && isIntensityEffectVisible(pfpFx.glow) && (
              <>
                <ColorRow label="Color" value={pfpFx.glow.color ?? PFP_GLOW_DEFAULT_COLOR} onChange={v => patchPfpGlow({ color: v })} />
                <SliderRow label="Intensidad" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={pfpFx.glow.intensity ?? 0}
                  onChange={v => patchPfpGlow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                <SliderRow label="Radio" min={0} max={40} step={1} value={pfpGlowRadius(pfpFx.glow)}
                  onChange={v => patchPfpGlow({ radius: v })} unit="px" />
                {/* Stage FASE 3: same shared glow-pulse system as the card's
                    own "Animación" in ProfileEffectsMenu's Borde section —
                    cardMotion.ts's one keyframe, independent instance. */}
                <MenuRow label="Animación (pulso)">
                  <Toggle
                    value={!!pfpFx.glow.animation?.enabled}
                    onChange={v => patchPfpGlow({ animation: { enabled: v, speed: pfpFx.glow?.animation?.speed } })}
                  />
                </MenuRow>
                {pfpFx.glow.animation?.enabled && (
                  <SliderRow label="Velocidad" min={0.3} max={3} step={0.1} value={pfpFx.glow.animation?.speed ?? 1}
                    onChange={v => patchPfpGlow({ animation: { enabled: true, speed: v } })} fmt={v => `${v.toFixed(1)}x`} />
                )}
              </>
            )}
          </MenuSection>
        </Collapsible>
      </MenuSection>}

      {only === "name" && <MenuSection label="Texto" first>
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
            style={{ width: "100%", background: "transparent", color: uv("text-primary"), fontSize: 18, fontWeight: 600, fontFamily: T.uiFont.sans, padding: "6px 0", borderBottom: `1px solid ${uv("line-strong")}`, boxSizing: "border-box", outline: "none" }}
          />
        ) : (
          // Block 2: keyboard-operable (Tab + Enter/Space opens the field).
          <div ref={nameBtnRef} onClick={openNameEdit}
            role="button" tabIndex={0} aria-label={name ? `Nombre: ${name}. Editar` : "Editar nombre"} className="mn-focusable"
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openNameEdit(); } }}
            style={{ fontSize: 18, fontWeight: 600, fontFamily: T.uiFont.sans, color: name ? uv("text-primary") : uv("text-tertiary"), cursor: "text", padding: "6px 0", borderBottom: `1px solid ${uv("line-group")}` }}>
            {name || "nombre"}
          </div>
        )}
      </MenuSection>}

      {only === "handle" && <MenuSection label="Usuario de la cuenta" first>
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
