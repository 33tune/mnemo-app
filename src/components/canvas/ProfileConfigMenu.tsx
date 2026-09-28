"use client";
import { useState } from "react";
import type { ProfileCardData, CardEffects } from "@/types";
import { T, Tabs } from "@/ui";
import { getCardPadding } from "@/lib/cardGeometry";
import ProfileIdentityMenu from "./ProfileIdentityMenu";
import ProfileMetadataMenu from "./ProfileMetadataMenu";
import ProfileContactLinksMenu from "./ProfileContactLinksMenu";
import ProfileMusicMenu from "./ProfileMusicMenu";
import ProfileTypographyMenu from "./ProfileTypographyMenu";
import ProfileBackgroundMenu from "./ProfileBackgroundMenu";
import ProfileEffectsMenu from "./ProfileEffectsMenu";

// Stage FASE 2 (Personalization UI/UX): one flat Tabs bar, no nested "doors".
// Before this stage: root -> Datos/Estilo doors -> (inside Estilo) 4 more
// doors (Fondo/Tipografía/Forma/Efectos) -> controls — 2 clicks of pure
// navigation before reaching anything. The audit's own UX finding (see
// CLAUDE.md) was that this asymmetry wasn't justified by content volume.
// Now: open the menu, the 4 tabs are all visible immediately, one click
// reaches any category. "Datos" -> CONTENT, "Fondo" -> BACKGROUND,
// "Tipografía" -> TEXT (now much deeper — every role, not just one global
// size), "Forma"+"Efectos" merged into EFFECTS (Border renamed from "Forma"
// per the audit's naming-collision finding — see ProfileEffectsMenu.tsx).
type View = "content" | "background" | "text" | "effects";

const TAB_ITEMS: { id: View; label: string }[] = [
  { id: "content",    label: "Content" },
  { id: "background", label: "Background" },
  { id: "text",       label: "Text" },
  { id: "effects",    label: "Effects" },
];

interface ProfileConfigMenuProps {
  card:     ProfileCardData;
  /** Stage 4.2-C.2.7: render-time verdict from ProfileCard's blockFits() —
   * whether each optional block's resolved box still fits inside the card's
   * padded content area. `undefined` = not applicable (layout "free", which
   * doesn't use these blocks); only an explicit `false` warns. */
  linksFits?: boolean;
  musicFits?: boolean;
  /** The already-resolved base text color (isLight-derived fallback
   * applied) — ProfileCard.tsx computes this once for render; threaded down
   * to TEXT so every role's ColorRow shows the REAL current color. */
  baseColor: string;
  onChange: (patch: Partial<ProfileCardData>) => void;
}

export default function ProfileConfigMenu({ card, linksFits, musicFits, baseColor, onChange }: ProfileConfigMenuProps) {
  const [view, setView] = useState<View>("content");

  function patchEffects(effects: CardEffects) {
    onChange({ effects });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ marginBottom: T.space[4] }}>
        <Tabs tabs={TAB_ITEMS} active={view} onChange={id => setView(id as View)} variant="underline" />
      </div>

      {view === "content" && (
        <div style={{ display: "flex", flexDirection: "column", gap: T.space[5] }}>
          <ProfileIdentityMenu
            card={card}
            cardW={card.w}
            cardH={card.h}
            pad={getCardPadding(card.variant)}
            onChange={onChange}
          />
          <ProfileMetadataMenu card={card} onChange={onChange} />
          <ProfileContactLinksMenu card={card} fitsInCard={linksFits} onChange={onChange} />
          <ProfileMusicMenu
            card={card}
            availableWidth={Math.max(0, card.w - 2 * getCardPadding(card.variant))}
            fitsInCard={musicFits}
            onChange={onChange}
          />
        </div>
      )}

      {view === "background" && (
        <ProfileBackgroundMenu effects={card.effects} onChange={patchEffects} />
      )}

      {view === "text" && (
        <ProfileTypographyMenu card={card} baseColor={baseColor} onChange={onChange} />
      )}

      {view === "effects" && (
        <ProfileEffectsMenu effects={card.effects} onChange={patchEffects} />
      )}
    </div>
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
      <span style={{
        fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.1em",
        textTransform: "uppercase", color: T.text.primary,
      }}>
        presentation card
      </span>
    </div>
  );
}
