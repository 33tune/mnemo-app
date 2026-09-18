"use client";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { ProfileCardData, CardEffects } from "@/types";
import { T, MenuSection, SliderRow } from "@/ui";
import { getFreeformCardBounds, getCardPadding } from "@/lib/cardGeometry";
import ProfileIdentityMenu from "./ProfileIdentityMenu";
import ProfileMetadataMenu from "./ProfileMetadataMenu";
import ProfileContactLinksMenu from "./ProfileContactLinksMenu";
import ProfileMusicMenu from "./ProfileMusicMenu";
import ProfileTypographyMenu from "./ProfileTypographyMenu";
import PersonalizePanel from "./PersonalizePanel";

type View = "root" | "datos" | "estilo" | "estilo/fondo" | "estilo/tipografia" | "estilo/forma" | "estilo/efectos";

const PARENT_VIEW: Partial<Record<View, View>> = {
  datos: "root",
  estilo: "root",
  "estilo/fondo": "estilo",
  "estilo/tipografia": "estilo",
  "estilo/forma": "estilo",
  "estilo/efectos": "estilo",
};

const TITLES: Record<View, string> = {
  root: "presentation card",
  datos: "datos",
  estilo: "estilo",
  "estilo/fondo": "fondo",
  "estilo/tipografia": "tipografía",
  "estilo/forma": "forma",
  "estilo/efectos": "efectos",
};

interface ProfileConfigMenuProps {
  card:     ProfileCardData;
  onChange: (patch: Partial<ProfileCardData>) => void;
}

export default function ProfileConfigMenu({ card, onChange }: ProfileConfigMenuProps) {
  const [view, setView] = useState<View>("root");
  const parent = PARENT_VIEW[view];

  function patchEffects(effects: CardEffects) {
    onChange({ effects });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Header title={TITLES[view]} onBack={parent ? () => setView(parent) : undefined} />

      {view === "root" && (
        <Doors>
          <Door label="Datos" desc="quién sos" onClick={() => setView("datos")} />
          <Door label="Estilo" desc="cómo se ve" onClick={() => setView("estilo")} />
        </Doors>
      )}

      {view === "datos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: T.space[5] }}>
          <ProfileIdentityMenu
            photo={card.photo}
            name={card.name}
            handle={card.handle}
            photoSize={card.photoSize}
            pfpSizePx={card.pfpSizePx}
            pfpRadius={card.pfpRadius}
            cardW={card.w}
            cardH={card.h}
            pad={getCardPadding(card.variant)}
            onChange={onChange}
          />
          <ProfileMetadataMenu
            status={card.status}
            location={card.location}
            bio={card.bio}
            showViews={card.showViews}
            onChange={onChange}
          />
          <ProfileContactLinksMenu
            contactLinks={card.contactLinks}
            linksIconSize={card.linksIconSize}
            onChange={onChange}
          />
          <ProfileMusicMenu
            music={card.music}
            onChange={onChange}
          />
        </div>
      )}

      {view === "estilo" && (
        <Doors>
          <Door label="Fondo"      desc="color, imagen, blur"       onClick={() => setView("estilo/fondo")} />
          <Door label="Tipografía" desc="fuente, tamaños, color"    onClick={() => setView("estilo/tipografia")} />
          <Door label="Forma"      desc="geometría, borde"          onClick={() => setView("estilo/forma")} />
          <Door label="Efectos"    desc="glow, sombra, más"         onClick={() => setView("estilo/efectos")} />
        </Doors>
      )}

      {view === "estilo/fondo" && (
        <PersonalizePanel tabs={["fondo"]} effects={card.effects} onChange={patchEffects} isProfileCard />
      )}

      {view === "estilo/tipografia" && (
        <ProfileTypographyMenu
          font={card.font ?? "DM Sans"}
          nameFontSize={card.nameFontSize}
          bioFontSize={card.bioFontSize}
          textColor={card.textColor}
          textAlign={card.textAlign}
          onChange={onChange}
        />
      )}

      {view === "estilo/forma" && (
        <div style={{ display: "flex", flexDirection: "column", gap: T.space[4] }}>
          <GeometryControls card={card} onChange={onChange} />
          <PersonalizePanel tabs={["forma"]} effects={card.effects} onChange={patchEffects} isProfileCard />
        </div>
      )}

      {view === "estilo/efectos" && (
        <PersonalizePanel tabs={["efectos"]} effects={card.effects} onChange={patchEffects} isProfileCard />
      )}
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      paddingBottom: T.space[3], marginBottom: T.space[4],
      borderBottom: `1px solid ${T.border.subtle}`,
    }}>
      {onBack && (
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onBack(); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 22, height: 22, borderRadius: T.radius.sm, flexShrink: 0,
            background: "transparent", border: `1px solid ${T.border.default}`, cursor: "pointer",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.text.secondary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <span style={{
        fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.1em",
        textTransform: "uppercase", color: T.text.primary,
      }}>
        {title}
      </span>
    </div>
  );
}

// ── Doors (nivel de navegación visual, no un formulario) ─────────────────────

function Doors({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: T.space[2] }}>{children}</div>;
}

function Door({ label, desc, onClick }: { label: string; desc: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const style: CSSProperties = {
    display: "flex", flexDirection: "column", gap: 2, textAlign: "left",
    padding: "14px 16px", borderRadius: T.radius.md, cursor: "pointer",
    background: hov ? T.surface.overlay : T.surface.raised,
    border: `1px solid ${hov ? T.border.strong : T.border.default}`,
    transition: "background 0.12s, border-color 0.12s",
  };
  return (
    <button
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={style}
    >
      <span style={{ fontFamily: T.font.sans, fontSize: 15, fontWeight: 600, color: T.text.primary }}>{label}</span>
      <span style={{ fontFamily: T.font.mono, fontSize: T.size.xs, color: T.text.muted }}>{desc}</span>
    </button>
  );
}

// ── Geometry ───────────────────────────────────────────────────────────────
// Stage 4.2-C.2.2: no more format picker — CardFormat stays an internal
// concept (cardComposition.ts's FORMAT_BIAS topology tiebreaker, and the
// fallback for any card whose `format` was set before this stage), but the
// user never chooses one directly anymore. Width and height are the only
// user-facing size controls, independently adjustable within the unified
// envelope every format's own bounds already implied (see
// getFreeformCardBounds in cardGeometry.ts) — no ratio lock.

function GeometryControls({ card, onChange }: { card: ProfileCardData; onChange: (patch: Partial<ProfileCardData>) => void }) {
  const bounds = getFreeformCardBounds();

  function setWidth(nw: number) {
    // Center-x preserved the same way useDragDrop's handle-resize and the
    // old format switch both already did it — fixed center, x re-derived
    // from the new width, so changing width never displaces the card
    // sideways. Height needs no equivalent here: vertical centering is the
    // vertical-recentering effect's job (Stage 4.2-C.2.2 Part 3), not this
    // menu's — it reacts to card.h on its own.
    const nx = Math.round(card.x + card.w / 2 - nw / 2);
    onChange({ w: nw, x: nx });
  }

  return (
    <MenuSection label="Tamaño" first>
      <SliderRow label="Ancho" min={bounds.minW} max={bounds.maxW} step={1} value={card.w} unit="px" onChange={setWidth} />
      <SliderRow label="Alto" min={bounds.minH} max={bounds.maxH} step={1} value={card.h} unit="px" onChange={h => onChange({ h })} />
    </MenuSection>
  );
}
