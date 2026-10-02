"use client";
import { useRef, useState } from "react";
import type { ProfileCardData } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { T, MenuSection, MenuRow, SliderRow, ActionButton, ColorRow, Toggle, Collapsible } from "@/ui";
import { getPfpSizeBounds, resolvePfpSize, pfpRadiusToPercent } from "@/lib/cardGeometry";
import BlockStyleFields from "./BlockStyleFields";
import { getPaused, pauseEffect, removeEffect, resumeWithIntensity, mergePatch } from "@/lib/effectPause";
import {
  pfpBorderDisplay, pfpShadowOn, pfpVariantShadowOn, pfpShadowColor, PFP_GLOW_DEFAULT_COLOR, pfpGlowRadius,
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
}

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
export default function ProfileIdentityMenu({ card, cardW, cardH, pad, baseColor, onChange }: ProfileIdentityMenuProps) {
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
    if (cancel && (name ?? "") !== nameAtEdit.current) onChange({ name: nameAtEdit.current });
    setEditingName(false);
    requestAnimationFrame(() => nameBtnRef.current?.focus({ preventScroll: true }));
  }
  const photoRef = useRef<HTMLInputElement>(null);
  const { min: sizeMin, max: sizeMax } = getPfpSizeBounds(cardW, cardH, pad);
  const currentSize = resolvePfpSize(photoSize, pfpSizePx, cardW, cardH, pad);

  const pfpFx = card.effects?.pfp;
  function patchPfpFx(patch: Partial<NonNullable<ProfileCardData["effects"]>["pfp"]>) {
    onChange({ effects: { ...card.effects, pfp: { ...card.effects?.pfp, ...patch } } });
  }
  function patchPfpBorder(patch: Partial<NonNullable<NonNullable<ProfileCardData["effects"]>["pfp"]>["border"]>) {
    // Creating pfp.border switches render to `border.width ?? 2` — seed the
    // width currently shown (0 on minimal) so editing only the color doesn't
    // also make a border appear.
    patchPfpFx({ border: mergePatch(pfpFx?.border ?? { width: pfpBorder.width }, patch) });
  }
  function patchPfpShadow(patch: Partial<NonNullable<NonNullable<ProfileCardData["effects"]>["pfp"]>["shadow"]>) {
    // No stored shadow = the guns/poster variant default is what's visible
    // (the controls only show while it's on) — seed the intensity the
    // slider displays, otherwise an explicit shadow without intensity
    // would render as 0 and the edit would make the shadow vanish.
    patchPfpFx({ shadow: mergePatch(pfpFx?.shadow ?? { intensity: 0.5 }, patch) });
  }
  function patchPfpGlow(patch: Partial<NonNullable<NonNullable<ProfileCardData["effects"]>["pfp"]>["glow"]>) {
    patchPfpFx({ glow: mergePatch(pfpFx?.glow, patch) });
  }

  // Block 1 (estado efectivo): the photo style shows what ProfileCard.tsx
  // actually draws — absent pfp.border/pfp.shadow fall back to variant-
  // derived values there (minimal = no border; guns/poster = a default
  // shadow), so the controls read those same formulas
  // (effectEditorDefaults.ts) instead of fixed placeholders.
  const variant = card.variant;
  const pfpBorder = pfpBorderDisplay(variant, baseColor, pfpFx?.border);
  const shadowOn = pfpShadowOn(variant, pfpFx?.shadow);
  // "Apagar no borra" (effectPause.ts). The PFP shadow needs one extra
  // rule: on guns/poster, ABSENCE renders the variant's default shadow, so
  // "off" must leave an explicit {intensity: 0} sentinel; and "on" with
  // nothing paused simply drops the sentinel, bringing the variant default
  // back exactly as it was.
  function setPfpShadowOn(on: boolean) {
    const effects = card.effects;
    const variantDefault = pfpVariantShadowOn(variant);
    if (!on) {
      onChange({ effects: pauseEffect(effects, "pfp.shadow", variantDefault ? { intensity: 0 } : undefined) });
      return;
    }
    const hasPaused = getPaused(effects, "pfp.shadow") !== undefined;
    if (!hasPaused && variantDefault) { onChange({ effects: removeEffect(effects, "pfp.shadow") }); return; }
    // resumeWithIntensity: a stashed/legacy intensity 0 would render nothing.
    onChange({ effects: resumeWithIntensity(effects, "pfp.shadow") });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const { publicUrl } = await uploadToStorage(f);
    onChange({ photo: publicUrl });
    if (photoRef.current) photoRef.current.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[4] }}>
      <MenuSection label="Foto" first>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div onClick={() => photoRef.current?.click()} style={{
            width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
            overflow: "hidden", cursor: "pointer",
            border: `1px solid ${T.border.default}`, background: T.surface.raised,
          }}>
            {photo
              ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.text.muted} strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <ActionButton onClick={() => photoRef.current?.click()}>subir</ActionButton>
            {photo && <ActionButton variant="danger" onClick={() => onChange({ photo: "" })}>quitar</ActionButton>}
          </div>
        </div>
        <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />

        <SliderRow label="Tamaño" min={sizeMin} max={sizeMax} step={1} value={currentSize} unit="px"
          onChange={v => onChange({ pfpSizePx: v })} />

        <SliderRow label="Forma" min={0} max={100} step={1} value={pfpRadius ?? 100} unit="%"
          fmt={v => pfpRadiusToPercent(v) === 50 ? "círculo" : pfpRadiusToPercent(v) === 0 ? "cuadrado" : `${Math.round(v)}%`}
          onChange={v => onChange({ pfpRadius: v })} />

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
                <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={pfpFx?.shadow?.intensity ?? 0.5}
                  onChange={v => patchPfpShadow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
              </>
            )}
          </MenuSection>

          <MenuSection label="Glow">
            <MenuRow label="Activar">
              <Toggle value={!!pfpFx?.glow} onChange={v => onChange({ effects: v ? resumeWithIntensity(card.effects, "pfp.glow") : pauseEffect(card.effects, "pfp.glow") })} />
            </MenuRow>
            {pfpFx?.glow && (
              <>
                <ColorRow label="Color" value={pfpFx.glow.color ?? PFP_GLOW_DEFAULT_COLOR} onChange={v => patchPfpGlow({ color: v })} />
                <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={pfpFx.glow.intensity ?? 0}
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
      </MenuSection>

      <MenuSection label="Nombre">
        {editingName ? (
          <input autoFocus
            value={name}
            onChange={e => onChange({ name: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); closeNameEdit(false); }
              else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeNameEdit(true); }
            }}
            onMouseDown={e => e.stopPropagation()}
            placeholder="nombre"
            aria-label="Nombre"
            className="mn-focusable"
            style={{ width: "100%", background: "transparent", color: T.text.primary, fontSize: 18, fontWeight: 600, fontFamily: T.font.sans, padding: "6px 0", borderBottom: `1px solid ${T.border.default}`, boxSizing: "border-box", outline: "none" }}
          />
        ) : (
          // Block 2: keyboard-operable (Tab + Enter/Space opens the field).
          <div ref={nameBtnRef} onClick={openNameEdit}
            role="button" tabIndex={0} aria-label={name ? `Nombre: ${name}. Editar` : "Editar nombre"} className="mn-focusable"
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openNameEdit(); } }}
            style={{ fontSize: 18, fontWeight: 600, fontFamily: T.font.sans, color: name ? T.ui.text.primary : T.ui.text.tertiary, cursor: "text", padding: "6px 0", borderBottom: `1px solid ${T.ui.line.group}` }}>
            {name || "nombre"}
          </div>
        )}
      </MenuSection>

      <MenuSection label="Handle">
        <MenuRow>
          <span style={{ ...T.type.help, color: T.ui.text.secondary }}>@{handle}</span>
        </MenuRow>
      </MenuSection>

      {/* Identity block = name+handle+descriptor+bio grouped as one draggable
          block (see cardComposition.ts's IDENTITY_ROLES) — its blockStyle
          override lives here since Name is its primary content control. No
          textColor/iconColor: those already exist per-role in TEXT (see
          blockStyle.ts's header for why). */}
      <BlockStyleFields card={card} blockKey="identity" onChange={onChange} />
    </div>
  );
}
