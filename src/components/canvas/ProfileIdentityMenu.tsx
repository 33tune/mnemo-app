"use client";
import { useState, type CSSProperties } from "react";
import type { TextFont } from "@/types";
import { CANVAS_FONTS } from "@/lib/fontList";

const SANS = "'DM Sans', sans-serif";
const MONO = "'Space Mono', monospace";
const FONTS = CANVAS_FONTS;

const MICRO: CSSProperties = {
  fontFamily: MONO, fontSize: 8, letterSpacing: 2,
  color: "rgba(255,255,255,0.22)", textTransform: "uppercase",
  flexShrink: 0, userSelect: "none",
};

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 14, userSelect: "none" }}>
      {children}
    </div>
  );
}

interface ProfileIdentityMenuProps {
  name:          string;
  nameFontSize?: number;
  font:          TextFont;
  textColor?:    string;
  globalFont:    string;
  onChange:      (patch: { name?: string; nameFontSize?: number; font?: TextFont; textColor?: string }) => void;
}

// Identity only: name, its typography, and the global font/color used across the card.
// Bio/views/descriptor/location live in ProfileMetadataMenu — see [[project_mnemo]] split rationale.
export default function ProfileIdentityMenu({ name, nameFontSize, font, textColor, globalFont, onChange }: ProfileIdentityMenuProps) {
  const [editingName, setEditingName] = useState(false);

  return (
    <div className="pcfg-s pcfg-s2">
      <PanelLabel>identidad</PanelLabel>

      {editingName ? (
        <input autoFocus className="pcfg-inline"
          value={name}
          onChange={e => onChange({ name: e.target.value })}
          onBlur={() => setEditingName(false)}
          onKeyDown={e => e.key === "Enter" && setEditingName(false)}
          onMouseDown={e => e.stopPropagation()}
          placeholder="nombre"
          style={{ width: "100%", color: "rgba(255,255,255,0.92)", fontSize: 22, fontWeight: 700, fontFamily: globalFont, letterSpacing: "-0.4px", lineHeight: 1.15, padding: "0 0 4px", borderBottom: "1px solid rgba(255,255,255,0.22)", boxSizing: "border-box" }}
        />
      ) : (
        <div onClick={() => setEditingName(true)}
          style={{ fontSize: 22, fontWeight: 700, fontFamily: globalFont, letterSpacing: "-0.4px", lineHeight: 1.15, color: name ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.15)", cursor: "text", paddingBottom: 4 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
          {name || "nombre"}
        </div>
      )}

      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "8px 0 10px" }} />

      {/* Name size */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={MICRO}>tamaño nombre</span>
        <input type="range" min={10} max={32} step={1}
          value={nameFontSize ?? 15}
          onChange={e => onChange({ nameFontSize: Number(e.target.value) })}
          onMouseDown={e => e.stopPropagation()}
          style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)" }} />
        <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)", minWidth: 22 }}>{nameFontSize ?? 15}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={MICRO}>font</span>
          <select value={font} onChange={e => onChange({ font: e.target.value as TextFont })}
            onMouseDown={e => e.stopPropagation()}
            style={{ background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: SANS, cursor: "pointer" }}>
            {FONTS.map(f => <option key={f.key} value={f.key} style={{ background: "#09090b" }}>{f.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={MICRO}>color</span>
          <div style={{ width: 20, height: 20, borderRadius: 2, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", flexShrink: 0 }}>
            <input type="color" value={textColor ?? "#ffffff"}
              onChange={e => onChange({ textColor: e.target.value })}
              onMouseDown={e => e.stopPropagation()}
              style={{ width: "140%", height: "140%", transform: "translate(-14%,-14%)", border: "none", cursor: "pointer" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
