"use client";
import { useRef, useState } from "react";
import type { ProfileCardData } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { T, MenuSection, MenuRow, SliderRow, ActionButton, ColorRow, Toggle, Collapsible } from "@/ui";
import { getPfpSizeBounds, resolvePfpSize, pfpRadiusToPercent } from "@/lib/cardGeometry";
import BlockStyleFields from "./BlockStyleFields";

type IdentityPatch = Partial<ProfileCardData>;

interface ProfileIdentityMenuProps {
  card:     ProfileCardData;
  cardW:    number;
  cardH:    number;
  pad:      number;
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
export default function ProfileIdentityMenu({ card, cardW, cardH, pad, onChange }: ProfileIdentityMenuProps) {
  const { photo, name, handle, photoSize, pfpSizePx, pfpRadius } = card;
  const [editingName, setEditingName] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const { min: sizeMin, max: sizeMax } = getPfpSizeBounds(cardW, cardH, pad);
  const currentSize = resolvePfpSize(photoSize, pfpSizePx, cardW, cardH, pad);

  const pfpFx = card.effects?.pfp;
  function patchPfpFx(patch: Partial<NonNullable<ProfileCardData["effects"]>["pfp"]>) {
    onChange({ effects: { ...card.effects, pfp: { ...card.effects?.pfp, ...patch } } });
  }
  function patchPfpBorder(patch: Partial<NonNullable<NonNullable<ProfileCardData["effects"]>["pfp"]>["border"]>) {
    patchPfpFx({ border: { ...pfpFx?.border, ...patch } });
  }
  function patchPfpShadow(patch: Partial<NonNullable<NonNullable<ProfileCardData["effects"]>["pfp"]>["shadow"]>) {
    patchPfpFx({ shadow: { ...pfpFx?.shadow, ...patch } });
  }
  function patchPfpGlow(patch: Partial<NonNullable<NonNullable<ProfileCardData["effects"]>["pfp"]>["glow"]>) {
    patchPfpFx({ glow: { ...pfpFx?.glow, ...patch } });
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
          fmt={v => pfpRadiusToPercent(v) === 50 ? "○" : pfpRadiusToPercent(v) === 0 ? "□" : `${Math.round(v)}%`}
          onChange={v => onChange({ pfpRadius: v })} />

        <Collapsible label="Avanzado">
          <MenuSection label="Borde" first>
            <ColorRow
              label="Color" value={pfpFx?.border?.color} onChange={v => patchPfpBorder({ color: v })}
              clearable={!!pfpFx?.border?.color} onClear={() => patchPfpBorder({ color: undefined })}
            />
            <SliderRow label="Grosor" min={0} max={6} step={0.5} value={pfpFx?.border?.width ?? 2}
              onChange={v => patchPfpBorder({ width: v })} unit="px" />
            <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={pfpFx?.border?.opacity ?? 1}
              onChange={v => patchPfpBorder({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
          </MenuSection>

          <MenuSection label="Sombra">
            <MenuRow label="Activar">
              <Toggle value={!!pfpFx?.shadow} onChange={v => patchPfpFx({ shadow: v ? { intensity: 0.5 } : undefined })} />
            </MenuRow>
            {pfpFx?.shadow && (
              <>
                <ColorRow label="Color" value={pfpFx.shadow.color} onChange={v => patchPfpShadow({ color: v })}
                  clearable={!!pfpFx.shadow.color} onClear={() => patchPfpShadow({ color: undefined })} />
                <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={pfpFx.shadow.intensity ?? 0.5}
                  onChange={v => patchPfpShadow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
              </>
            )}
          </MenuSection>

          <MenuSection label="Glow">
            <MenuRow label="Activar">
              <Toggle value={!!pfpFx?.glow} onChange={v => patchPfpFx({ glow: v ? { intensity: 0.5 } : undefined })} />
            </MenuRow>
            {pfpFx?.glow && (
              <>
                <ColorRow label="Color" value={pfpFx.glow.color ?? "#ffffff"} onChange={v => patchPfpGlow({ color: v })} />
                <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={pfpFx.glow.intensity ?? 0.5}
                  onChange={v => patchPfpGlow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                <SliderRow label="Radio" min={0} max={40} step={1} value={pfpFx.glow.radius ?? Math.round((pfpFx.glow.intensity ?? 0.5) * 24)}
                  onChange={v => patchPfpGlow({ radius: v })} unit="px" />
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
            onKeyDown={e => e.key === "Enter" && setEditingName(false)}
            onMouseDown={e => e.stopPropagation()}
            placeholder="nombre"
            style={{ width: "100%", background: "transparent", color: T.text.primary, fontSize: 18, fontWeight: 600, fontFamily: T.font.sans, padding: "6px 0", borderBottom: `1px solid ${T.border.default}`, boxSizing: "border-box", outline: "none" }}
          />
        ) : (
          <div onClick={() => setEditingName(true)}
            style={{ fontSize: 18, fontWeight: 600, fontFamily: T.font.sans, color: name ? T.text.primary : T.text.muted, cursor: "text", padding: "6px 0", borderBottom: `1px solid ${T.border.subtle}` }}>
            {name || "nombre"}
          </div>
        )}
      </MenuSection>

      <MenuSection label="Handle">
        <MenuRow>
          <span style={{ fontFamily: T.font.mono, fontSize: T.size.sm, color: T.text.muted }}>@{handle}</span>
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
