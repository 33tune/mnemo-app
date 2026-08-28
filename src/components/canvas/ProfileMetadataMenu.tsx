"use client";
import type { CSSProperties } from "react";
import type { ProfileCardData } from "@/types";

const MONO = "'Space Mono', monospace";

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

const lineInputStyle: CSSProperties = {
  display: "block", width: "100%", marginTop: 6,
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 3, padding: "6px 8px", color: "rgba(255,255,255,0.52)",
  fontFamily: MONO, fontSize: 9, letterSpacing: 0.3, outline: "none",
  boxSizing: "border-box",
};

type MetadataPatch = Partial<Pick<ProfileCardData, "status" | "location" | "bio" | "bioFontSize" | "showViews">>;

interface ProfileMetadataMenuProps {
  status?:      string; // descriptor / profesión — reuses the existing `status` field
  location?:    string;
  bio?:         string;
  bioFontSize?: number;
  showViews?:   boolean;
  onChange:     (patch: MetadataPatch) => void;
}

// Metadata: descriptor, location, bio, views. Reserved for future: favoritos/corazones
// (needs a public-count backend piece first, see plan discussion — not this pass).
export default function ProfileMetadataMenu({ status, location, bio, bioFontSize, showViews, onChange }: ProfileMetadataMenuProps) {
  return (
    <div className="pcfg-s pcfg-s3">
      <PanelLabel>metadata</PanelLabel>

      <div style={{ marginBottom: 12 }}>
        <span style={MICRO}>descriptor</span>
        <input value={status ?? ""} onChange={e => onChange({ status: e.target.value })}
          onMouseDown={e => e.stopPropagation()} placeholder="diseñador multimedia, just for fun..." maxLength={60}
          style={lineInputStyle} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <span style={MICRO}>ubicación</span>
        <input value={location ?? ""} onChange={e => onChange({ location: e.target.value })}
          onMouseDown={e => e.stopPropagation()} placeholder="la plata, buenos aires" maxLength={60}
          style={lineInputStyle} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <span style={MICRO}>bio</span>
        <textarea value={bio ?? ""} onChange={e => onChange({ bio: e.target.value })}
          onMouseDown={e => e.stopPropagation()} placeholder="short bio..." maxLength={120} rows={2}
          style={{ ...lineInputStyle, resize: "none", lineHeight: 1.55 }} />
      </div>

      {/* Bio size */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={MICRO}>tamaño bio</span>
        <input type="range" min={7} max={18} step={1}
          value={bioFontSize ?? 8}
          onChange={e => onChange({ bioFontSize: Number(e.target.value) })}
          onMouseDown={e => e.stopPropagation()}
          style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)" }} />
        <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)", minWidth: 22 }}>{bioFontSize ?? 8}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <span style={MICRO}>mostrar views</span>
        <button
          onClick={() => onChange({ showViews: !(showViews ?? false) })}
          onMouseDown={e => e.stopPropagation()}
          style={{
            padding: "3px 8px", borderRadius: 4, cursor: "pointer",
            border: showViews ? "1px solid rgba(212,240,196,0.3)" : "1px solid rgba(255,255,255,0.1)",
            background: showViews ? "rgba(212,240,196,0.08)" : "rgba(255,255,255,0.04)",
            color: showViews ? "rgba(212,240,196,0.85)" : "rgba(255,255,255,0.35)",
            fontFamily: MONO, fontSize: 8, letterSpacing: 1, textTransform: "uppercase",
          }}
        >
          {showViews ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}
