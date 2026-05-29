"use client";
import { useRef } from "react";
import type { GuestbookCardData, GuestbookPreset } from "@/types";
import { UISlider, UILabel, UIButton } from "@/components/ui";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";
const EASE = "cubic-bezier(0.2,0.8,0.2,1)";

interface PresetDef {
  label:        string;
  desc:         string;
  swatch:       string;
  bgColor:      string;
  borderRadius: number;
  opacity:      number;
}

export const GB_PRESETS: Record<GuestbookPreset, PresetDef> = {
  default: {
    label: "default",
    desc:  "dark glass",
    swatch: "rgba(14,13,18,1)",
    bgColor:      "rgba(14,13,18,0.96)",
    borderRadius: 14,
    opacity:      1,
  },
  notebook: {
    label: "notebook",
    desc:  "warm paper",
    swatch: "#f5f0d8",
    bgColor:      "rgba(250,246,230,0.97)",
    borderRadius: 8,
    opacity:      1,
  },
  ambient: {
    label: "ambient",
    desc:  "blurred void",
    swatch: "rgba(10,8,28,0.88)",
    bgColor:      "rgba(10,8,28,0.88)",
    borderRadius: 20,
    opacity:      0.9,
  },
  minimal: {
    label: "minimal",
    desc:  "ghost glass",
    swatch: "rgba(255,255,255,0.06)",
    bgColor:      "rgba(255,255,255,0.04)",
    borderRadius: 4,
    opacity:      0.88,
  },
  "old-internet": {
    label: "old internet",
    desc:  "terminal",
    swatch: "rgba(4,10,4,1)",
    bgColor:      "rgba(4,10,4,0.97)",
    borderRadius: 0,
    opacity:      1,
  },
  sticky: {
    label: "sticky",
    desc:  "paper note",
    swatch: "rgba(255,236,120,0.97)",
    bgColor:      "rgba(255,236,120,0.97)",
    borderRadius: 12,
    opacity:      1,
  },
};

interface Props {
  guestbook:       GuestbookCardData;
  menuRect:        DOMRect;
  updateGuestbook: (id: string, patch: Partial<GuestbookCardData>) => void;
  onUploadBg:      () => void;
  onClose:         () => void;
}

export default function GuestbookMenu({ guestbook, menuRect, updateGuestbook, onUploadBg }: Props) {
  const menuPos = {
    x: Math.max(8, Math.min(menuRect.right + 8, window.innerWidth  - 248)),
    y: Math.max(52, Math.min(menuRect.top,       window.innerHeight - 580)),
  };

  function applyPreset(preset: GuestbookPreset) {
    const def = GB_PRESETS[preset];
    updateGuestbook(guestbook.id, {
      preset,
      bgColor:      guestbook.bgImage ? guestbook.bgColor : def.bgColor,
      borderRadius: def.borderRadius,
      opacity:      def.opacity,
    });
  }

  const activePreset = guestbook.preset ?? "default";

  return (
    <>
      <style>{`
        @keyframes gbmenu-in {
          from { opacity: 0; transform: translateX(6px) scale(0.98); }
          to   { opacity: 1; transform: translateX(0)   scale(1); }
        }
        .gbmenu { animation: gbmenu-in 0.14s ${EASE} both; }
      `}</style>

      <div
        className="gbmenu"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        style={{
          position:      "fixed",
          top:           menuPos.y,
          left:          menuPos.x,
          zIndex:        9999,
          width:         232,
          background:    "#09090b",
          border:        "1px solid rgba(255,255,255,0.09)",
          borderRadius:  5,
          padding:       "16px 14px 20px",
          boxShadow:     "0 2px 20px rgba(0,0,0,0.5)",
          fontFamily:    SANS,
          maxHeight:     "86vh",
          overflowY:     "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.08) transparent",
        } as React.CSSProperties}
      >
        {/* Header */}
        <div style={{
          display:      "flex",
          alignItems:   "center",
          gap:          8,
          marginBottom: 18,
          paddingBottom: 14,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(232,224,212,0.6)", flexShrink: 0 }} />
          <span style={{
            fontFamily:    MONO,
            fontSize:      7,
            letterSpacing: 2.5,
            color:         "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
          }}>
            guestbook
          </span>
        </div>

        {/* ─── PRESETS ─────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 10 }}><UILabel>Preset</UILabel></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(Object.entries(GB_PRESETS) as [GuestbookPreset, PresetDef][]).map(([key, def]) => {
              const active = activePreset === key;
              return (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    gap:            10,
                    padding:        "8px 10px",
                    borderRadius:   4,
                    border:         active
                      ? "1px solid rgba(232,224,212,0.28)"
                      : "1px solid rgba(255,255,255,0.06)",
                    background:    active ? "rgba(232,224,212,0.06)" : "rgba(255,255,255,0.02)",
                    cursor:        "pointer",
                    width:         "100%",
                    textAlign:     "left",
                    transition:    `background 0.1s ${EASE}, border-color 0.1s ${EASE}`,
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = active ? "rgba(232,224,212,0.06)" : "rgba(255,255,255,0.02)"; }}
                >
                  {/* Color swatch */}
                  <div style={{
                    width:        18,
                    height:       18,
                    borderRadius: Math.min(4, def.borderRadius),
                    background:   def.swatch,
                    border:       "1px solid rgba(255,255,255,0.12)",
                    flexShrink:   0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: SANS,
                      fontSize:   11,
                      color:      active ? "rgba(232,224,212,0.9)" : "rgba(255,255,255,0.55)",
                      fontWeight: active ? 600 : 400,
                    }}>
                      {def.label}
                    </div>
                    <div style={{
                      fontFamily:    MONO,
                      fontSize:      8,
                      color:         "rgba(255,255,255,0.2)",
                      letterSpacing: "0.5px",
                      marginTop:     2,
                    }}>
                      {def.desc}
                    </div>
                  </div>
                  {active && (
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(232,224,212,0.7)", flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 0 18px" }} />

        {/* ─── STYLE ───────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Background color */}
          <div>
            <div style={{ marginBottom: 8 }}><UILabel>Color de fondo</UILabel></div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div
                onClick={() => updateGuestbook(guestbook.id, { bgColor: "" })}
                title="limpiar"
                style={{
                  width: 26, height: 26, borderRadius: 3, cursor: "pointer",
                  background:    "rgba(255,255,255,0.05)",
                  border:        !guestbook.bgColor
                    ? "2px solid rgba(255,255,255,0.5)"
                    : "1.5px solid rgba(255,255,255,0.12)",
                  flexShrink:    0,
                  transition:    "border-color 0.1s",
                  display:       "flex",
                  alignItems:    "center",
                  justifyContent:"center",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
              <input
                type="color"
                value={guestbook.bgColor?.startsWith("#") ? guestbook.bgColor : "#0e0d12"}
                onChange={e => updateGuestbook(guestbook.id, { bgColor: e.target.value })}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  flex:          1,
                  height:        26,
                  borderRadius:  3,
                  border:        "1.5px solid rgba(255,255,255,0.12)",
                  cursor:        "pointer",
                  background:    "transparent",
                  padding:       0,
                }}
              />
            </div>
          </div>

          {/* Opacity */}
          <UISlider
            label="Transparencia"
            value={Math.round((guestbook.opacity ?? 1) * 100)}
            unit="%"
            min={5} max={100}
            onChange={v => updateGuestbook(guestbook.id, { opacity: v / 100 })}
            onMouseDown={e => e.stopPropagation()}
          />

          {/* Blur */}
          <UISlider
            label="Blur de fondo"
            value={guestbook.blur ?? 28}
            unit="px"
            min={0} max={60}
            onChange={v => updateGuestbook(guestbook.id, { blur: v })}
            onMouseDown={e => e.stopPropagation()}
          />

          {/* Border radius */}
          <UISlider
            label="Redondeado"
            value={guestbook.borderRadius ?? 14}
            unit="px"
            min={0} max={40}
            onChange={v => updateGuestbook(guestbook.id, { borderRadius: v })}
            onMouseDown={e => e.stopPropagation()}
          />

          {/* Background image */}
          <div>
            <div style={{ marginBottom: 8 }}><UILabel>Imagen de fondo</UILabel></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <UIButton onClick={onUploadBg} full>
                + subir imagen
              </UIButton>
              {guestbook.bgImage && (
                <UIButton onClick={() => updateGuestbook(guestbook.id, { bgImage: "" })} danger full>
                  quitar imagen
                </UIButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
