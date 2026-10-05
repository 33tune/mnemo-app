"use client";
import { useState } from "react";
import type { ProfileCardData, CardEffects } from "@/types";
import { T, Tabs, Collapsible, NumberField, MenuNote } from "@/ui";
import { getCardPadding, getFreeformCardBounds, clampFreeformCardSize, centerCardPosition } from "@/lib/cardGeometry";
import { getProfileCardEffects } from "@/lib/profileCardEffects";
import ProfileIdentityMenu from "./ProfileIdentityMenu";
import ProfileMetadataMenu from "./ProfileMetadataMenu";
import ProfileContactLinksMenu from "./ProfileContactLinksMenu";
import ProfileLogoMenu from "./ProfileLogoMenu";
import ProfileTypographyMenu from "./ProfileTypographyMenu";
import ProfileBackgroundMenu from "./ProfileBackgroundMenu";
import ProfileEffectsMenu from "./ProfileEffectsMenu";

// Stage FASE 2 (Personalization UI/UX): one flat Tabs bar, no nested "doors".
// Before that stage: root -> Datos/Estilo doors -> (inside Estilo) 4 more
// doors (Fondo/Tipografía/Forma/Efectos) -> controls — 2 clicks of pure
// navigation before reaching anything. Now: open the menu, the 4 tabs are
// all visible immediately, one click reaches any category.
// "Product closeout" UX audit: tab labels moved to Spanish (matching every
// label underneath them, which was already Spanish — English tab labels
// over a Spanish body was its own small inconsistency). Music removed
// entirely from this tab (it's now an independent canvas element — see
// MusicCardWidget.tsx); Logo added in its place (a free visual element
// living inside ProfileCard, not a structural block).
type View = "content" | "background" | "text" | "effects";

const TAB_ITEMS: { id: View; label: string }[] = [
  { id: "content",    label: "Contenido" },
  { id: "background", label: "Fondo" },
  { id: "text",       label: "Texto" },
  { id: "effects",    label: "Efectos" },
];

interface ProfileConfigMenuProps {
  card:     ProfileCardData;
  /** Stage 4.2-C.2.7: render-time verdict from ProfileCard's blockFits() —
   * whether the Links block's resolved box still fits inside the card's
   * padded content area. `undefined` = not applicable (layout "free", which
   * doesn't use this engine); only an explicit `false` warns. */
  linksFits?: boolean;
  /** The already-resolved base text color (isLight-derived fallback
   * applied) — ProfileCard.tsx computes this once for render; threaded down
   * to TEXT so every role's ColorRow shows the REAL current color. */
  baseColor: string;
  onChange: (patch: Partial<ProfileCardData>) => void;
  /** Iteration 0 (O1 "Medidas"): the canvas the card is centered in — the
   * same bounds/topOffset the resize drag uses. Absent (space_mobile) =
   * no Medidas. */
  canvas?: { w: number; h: number; topOffset: number };
}

export default function ProfileConfigMenu({ card, linksFits, baseColor, onChange, canvas }: ProfileConfigMenuProps) {
  const [view, setView] = useState<View>("content");

  function patchEffects(effects: CardEffects) {
    onChange({ effects });
  }
  // Block 1 (read-effective / write-raw): what the card RENDERS is
  // getProfileCardEffects(card) — card.effects merged with legacy fields
  // (bgColor, glowColor/Intensity, borderColor/Width/Radius, opacity) and
  // variant defaults (spotlight, glass). Menus display `effective`, but
  // build every patch on top of the raw `card.effects`, so a derived value
  // is only ever persisted when the user actually changes that control.
  const effective = getProfileCardEffects(card);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ marginBottom: T.space[4] }}>
        <Tabs tabs={TAB_ITEMS} active={view} onChange={id => setView(id as View)} variant="underline" label="Secciones del editor" />
      </div>

      {view === "content" && (
        <div style={{ display: "flex", flexDirection: "column", gap: T.space[5] }}>
          <ProfileIdentityMenu
            card={card}
            cardW={card.w}
            cardH={card.h}
            pad={getCardPadding(card.variant)}
            baseColor={baseColor}
            onChange={onChange}
          />
          <ProfileMetadataMenu card={card} onChange={onChange} />
          <ProfileContactLinksMenu card={card} fitsInCard={linksFits} onChange={onChange} />
          <ProfileLogoMenu logo={card.logo} onChange={onChange} />
          {canvas && <ProfileMeasures card={card} canvas={canvas} onChange={onChange} />}
        </div>
      )}

      {view === "background" && (
        <ProfileBackgroundMenu effective={effective} raw={card.effects} onChange={patchEffects} />
      )}

      {view === "text" && (
        <ProfileTypographyMenu card={card} baseColor={baseColor} onChange={onChange} />
      )}

      {view === "effects" && (
        <ProfileEffectsMenu effective={effective} raw={card.effects} onChange={patchEffects} />
      )}
    </div>
  );
}

// ── Medidas (Iteration 0, O1) ───────────────────────────────────────────────
// A secondary precision / keyboard alternative to the resize handles
// (WCAG 2.5.7, 2.1.1) — closed by default; Iteration 1 moves it to "Más
// ajustes". Width/height only: the card's position is always derived
// (centerCardPosition), never edited. Writes through exactly what the
// resize drag writes: clampFreeformCardSize + centerCardPosition, one patch.
function ProfileMeasures({ card, canvas, onChange }: {
  card: ProfileCardData; canvas: { w: number; h: number; topOffset: number };
  onChange: (patch: Partial<ProfileCardData>) => void;
}) {
  const b = getFreeformCardBounds();
  function setSize(w: number, h: number) {
    const c = clampFreeformCardSize(w, h);
    const { x, y } = centerCardPosition(canvas.w, canvas.h, c.w, c.h, canvas.topOffset);
    onChange({ w: c.w, h: c.h, x, y });
  }
  return (
    <Collapsible label="Medidas">
      <NumberField label="Ancho (px)" min={b.minW} max={b.maxW} step={1} unit="px" value={Math.round(card.w)} onChange={v => setSize(v, card.h)} />
      <NumberField label="Alto (px)" min={b.minH} max={b.maxH} step={1} unit="px" value={Math.round(card.h)} onChange={v => setSize(card.w, v)} />
      <MenuNote>La card de presentación siempre queda centrada.</MenuNote>
    </Collapsible>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

function Header() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      paddingBottom: T.space[3], marginBottom: T.space[4],
      borderBottom: `1px solid ${T.border.subtle}`,
    }}>
      <span role="heading" aria-level={2} style={{
        fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.1em",
        textTransform: "uppercase", color: T.text.primary,
      }}>
        Card de presentación
      </span>
    </div>
  );
}
