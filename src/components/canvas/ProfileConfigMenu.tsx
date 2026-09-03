"use client";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { ProfileCardData, CardEffects, CardFormat } from "@/types";
import { T, MenuSection, SliderRow } from "@/ui";
import { resolveCardSize, sizeScaleFromDimensions } from "@/lib/cardGeometry";
import ProfileIdentityMenu from "./ProfileIdentityMenu";
import ProfileMetadataMenu from "./ProfileMetadataMenu";
import ProfileTypographyMenu from "./ProfileTypographyMenu";
import PersonalizePanel from "./PersonalizePanel";

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
          <Door label="Forma"      desc="formato, tamaño, borde"    onClick={() => setView("estilo/forma")} />
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

// ── Geometry (Stage 1 test control — format + size only, no composition yet) ─

function GeometryControls({ card, onChange }: { card: ProfileCardData; onChange: (patch: Partial<ProfileCardData>) => void }) {
  const format = card.format ?? "vertical";
  const sizeScale = card.sizeScale ?? sizeScaleFromDimensions(format, card.w);

  function setFormat(next: CardFormat) {
    const { w, h } = resolveCardSize(next, sizeScale, card.w, card.h);
    onChange({ format: next, w, h });
  }

  function setSize(t: number) {
    const { w, h } = resolveCardSize(format, t, card.w, card.h);
    onChange({ sizeScale: t, w, h });
  }

  return (
    <MenuSection label="Formato y tamaño" first>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: T.space[3] }}>
        {FORMATS.map(f => (
          <button key={f.key}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setFormat(f.key); }}
            style={{
              padding: "5px 10px", borderRadius: T.radius.sm, cursor: "pointer",
              border: format === f.key ? `1px solid ${T.border.strong}` : `1px solid ${T.border.default}`,
              background: format === f.key ? T.surface.overlay : "transparent",
              color: format === f.key ? T.text.primary : T.text.secondary,
              fontFamily: T.font.sans, fontSize: T.size.xs,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <SliderRow label="Tamaño" min={0} max={1} step={0.01} value={sizeScale}
        onChange={setSize} fmt={v => `${Math.round(v * 100)}%`} />
    </MenuSection>
  );
}
