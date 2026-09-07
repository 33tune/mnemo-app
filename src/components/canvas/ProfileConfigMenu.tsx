"use client";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { ProfileCardData, CardEffects, CardFormat } from "@/types";
import { T, MenuSection } from "@/ui";
import { getCardConstraints, clampCardSize, getCardPadding } from "@/lib/cardGeometry";
import ProfileIdentityMenu from "./ProfileIdentityMenu";
import ProfileMetadataMenu from "./ProfileMetadataMenu";
import ProfileTypographyMenu from "./ProfileTypographyMenu";
import PersonalizePanel from "./PersonalizePanel";

// Internal ids only — never shown as UI copy (see FormatTile). The label here
// is just the hover tooltip; the tile itself communicates the geometry visually.
const FORMATS: { key: CardFormat; label: string }[] = [
  { key: "vertical",   label: "Vertical" },
  { key: "horizontal", label: "Horizontal" },
  { key: "square",     label: "Cuadrado" },
  { key: "phone",      label: "Teléfono" },
  { key: "card",       label: "Tarjeta" },
];

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
// Format = geometry/ratio family only. Size lives exclusively in w/h, set by
// dragging the canvas resize handles — there is deliberately no size control
// here, so w/h never has two competing sources of truth (see Stage 3B-fix).

function formatPreviewRatio(key: CardFormat): number {
  const c = getCardConstraints(key);
  return c.ratioKind === "fixed" ? c.ratio! : (c.ratioRange![0] + c.ratioRange![1]) / 2;
}

function GeometryControls({ card, onChange }: { card: ProfileCardData; onChange: (patch: Partial<ProfileCardData>) => void }) {
  const format = card.format ?? "vertical";

  function setFormat(next: CardFormat) {
    if (next === format) return;
    // Re-project the card's CURRENT actual size into the new format's
    // constraints (ratio + min/max) — w/h is the only source of truth for
    // size, format never drives it. Center-x is preserved the same way
    // useDragDrop's handle-resize does it (fixed center, x re-derived from
    // the new width) so a format switch never displaces the card sideways.
    const { w: nw, h: nh } = clampCardSize(next, card.w, card.h);
    const nx = Math.round(card.x + card.w / 2 - nw / 2);
    onChange({ format: next, w: nw, h: nh, x: nx });
  }

  return (
    <MenuSection label="Formato" first>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {FORMATS.map(f => (
          <FormatTile key={f.key} label={f.label} selected={format === f.key}
            ratio={formatPreviewRatio(f.key)} onClick={() => setFormat(f.key)} />
        ))}
      </div>
    </MenuSection>
  );
}

// Visual-only picker: each tile draws a small rectangle in the format's own
// proportion instead of a technical name — the shape communicates the
// geometry directly. Labels exist only as hover tooltips (see FORMATS above);
// no format name is rendered as visible copy.
const TILE = 44;
const SHAPE_MAX = 28;

function FormatTile({ label, ratio, selected, onClick }: { label: string; ratio: number; selected: boolean; onClick: () => void }) {
  const w = ratio >= 1 ? SHAPE_MAX : SHAPE_MAX * ratio;
  const h = ratio >= 1 ? SHAPE_MAX / ratio : SHAPE_MAX;
  return (
    <button
      title={label}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        width: TILE, height: TILE, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: T.radius.sm, cursor: "pointer", flexShrink: 0,
        border: selected ? `1px solid ${T.border.strong}` : `1px solid ${T.border.default}`,
        background: selected ? T.surface.overlay : "transparent",
        transition: "background 0.12s, border-color 0.12s",
      }}
    >
      <div style={{
        width: w, height: h, borderRadius: 3,
        border: `1.5px solid ${selected ? T.text.primary : T.text.secondary}`,
        background: selected ? "rgba(255,255,255,0.10)" : "transparent",
      }} />
    </button>
  );
}
