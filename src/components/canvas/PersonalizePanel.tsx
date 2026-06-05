"use client";
import React, { useState, type CSSProperties } from "react";
import type { CardEffects, TextFont } from "@/types";

type Tab = "apariencia" | "efectos" | "interacciones" | "animaciones" | "tipografia";

const TABS: { key: Tab; label: string }[] = [
  { key: "apariencia",    label: "Apariencia" },
  { key: "efectos",       label: "Efectos" },
  { key: "interacciones", label: "Interacciones" },
  { key: "animaciones",   label: "Animaciones" },
  { key: "tipografia",    label: "Tipografía" },
];

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";

const FONTS: { key: TextFont; label: string }[] = [
  { key: "DM Sans",          label: "DM Sans" },
  { key: "Space Mono",       label: "Mono" },
  { key: "Playfair Display", label: "Playfair" },
  { key: "Bebas Neue",       label: "Bebas" },
  { key: "Syne",             label: "Syne" },
  { key: "Impact",           label: "Impact" },
];

interface PersonalizePanelProps {
  effects?:       CardEffects;
  onChange:       (patch: CardEffects) => void;
  isProfileCard?: boolean;
}

// ── Small UI helpers ──────────────────────────────────────────────────────────

function Row({ children, gap = 6 }: { children: React.ReactNode; gap?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap, flexWrap: "wrap" as const }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1.5, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const, userSelect: "none", flexShrink: 0 }}>
      {children}
    </span>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, marginBottom: 8, userSelect: "none" }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "12px 0" }} />;
}

// Toggle pill button
function Toggle({
  active, onClick, children, color = "rgba(212,240,196,0.12)", borderColor = "rgba(212,240,196,0.28)"
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
  borderColor?: string;
}) {
  return (
    <button
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        padding: "5px 10px",
        borderRadius: 20,
        border: active ? `1px solid ${borderColor}` : "1px solid rgba(255,255,255,0.1)",
        background: active ? color : "rgba(255,255,255,0.04)",
        color: active ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.38)",
        fontFamily: MONO, fontSize: 8, letterSpacing: 0.8,
        cursor: "pointer",
        transition: "all 0.12s ease",
        whiteSpace: "nowrap" as const,
        userSelect: "none" as const,
      }}
    >{children}</button>
  );
}

// 3-level button group: Low / Mid / High -> maps to numeric values
function ThreeLevel({
  labels, values, current, onSelect,
}: {
  labels: [string, string, string];
  values: [number, number, number];
  current: number | undefined;
  onSelect: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {labels.map((lbl, i) => {
        const v = values[i];
        const isActive = current !== undefined && Math.abs(current - v) < 0.001;
        return (
          <button
            key={lbl}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onSelect(v); }}
            style={{
              padding: "4px 8px", borderRadius: 4, fontSize: 8,
              fontFamily: MONO, letterSpacing: 0.5, cursor: "pointer",
              border: isActive ? "1px solid rgba(212,240,196,0.35)" : "1px solid rgba(255,255,255,0.08)",
              background: isActive ? "rgba(212,240,196,0.1)" : "rgba(255,255,255,0.03)",
              color: isActive ? "rgba(212,240,196,0.9)" : "rgba(255,255,255,0.35)",
              transition: "all 0.1s ease",
              userSelect: "none" as const,
            }}
          >{lbl}</button>
        );
      })}
    </div>
  );
}

// Color swatch + hidden input
function ColorSwatch({ value, onChange, size = 22 }: { value: string; onChange: (v: string) => void; size?: number }) {
  return (
    <div style={{
      position: "relative", width: size, height: size, borderRadius: 4,
      overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)",
      cursor: "pointer", flexShrink: 0,
    }}>
      <div style={{ position: "absolute", inset: 0, background: value || "rgba(255,255,255,0.12)" }} />
      <input
        type="color"
        value={value?.startsWith("#") ? value : "#a855f7"}
        onChange={e => onChange(e.target.value)}
        onMouseDown={e => e.stopPropagation()}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
      />
    </div>
  );
}

// Stepper: [-] value [+]
function Stepper({ value, onChange, step = 1, min = 0, max = 100, suffix = "" }: {
  value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number; suffix?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onChange(Math.max(min, +(value - step).toFixed(3))); }}
        style={{ width: 18, height: 18, borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", userSelect: "none" as const }}
      >−</button>
      <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.5)", minWidth: 28, textAlign: "center" }}>{value}{suffix}</span>
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onChange(Math.min(max, +(value + step).toFixed(3))); }}
        style={{ width: 18, height: 18, borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", userSelect: "none" as const }}
      >+</button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PersonalizePanel({ effects, onChange, isProfileCard }: PersonalizePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("apariencia");

  // Helpers to patch nested effect keys
  function patchBg(patch: Partial<NonNullable<CardEffects["bg"]>>) {
    onChange({ ...effects, bg: { ...effects?.bg, ...patch } });
  }
  function patchBorder(patch: Partial<NonNullable<CardEffects["border"]>>) {
    onChange({ ...effects, border: { ...effects?.border, ...patch } });
  }
  function patchGlow(patch: Partial<NonNullable<CardEffects["glow"]>>) {
    onChange({ ...effects, glow: { ...effects?.glow, ...patch } });
  }
  function patchLayers(patch: Partial<NonNullable<CardEffects["layers"]>>) {
    onChange({ ...effects, layers: { ...effects?.layers, ...patch } });
  }
  function patchInteractions(patch: Partial<NonNullable<CardEffects["interactions"]>>) {
    onChange({ ...effects, interactions: { ...effects?.interactions, ...patch } });
  }
  function patchAnimations(patch: Partial<NonNullable<CardEffects["animations"]>>) {
    onChange({ ...effects, animations: { ...effects?.animations, ...patch } });
  }
  function patchTypography(patch: Partial<NonNullable<CardEffects["typography"]>>) {
    onChange({ ...effects, typography: { ...effects?.typography, ...patch } });
  }

  const bg   = effects?.bg;
  const bord = effects?.border;
  const glow = effects?.glow;
  const lays = effects?.layers;
  const inter = effects?.interactions;
  const anim  = effects?.animations;
  const typo  = effects?.typography;

  // ── Tab bar ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Tab row */}
      <div style={{
        display: "flex", gap: 2, overflowX: "auto", paddingBottom: 8, marginBottom: 4,
        scrollbarWidth: "none" as CSSProperties["scrollbarWidth"],
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setActiveTab(t.key); }}
            style={{
              padding: "4px 9px", borderRadius: 5, fontSize: 8,
              fontFamily: MONO, letterSpacing: 0.6, whiteSpace: "nowrap" as const,
              cursor: "pointer", flexShrink: 0, userSelect: "none" as const,
              border: activeTab === t.key ? "1px solid rgba(212,240,196,0.3)" : "1px solid rgba(255,255,255,0.07)",
              background: activeTab === t.key ? "rgba(212,240,196,0.08)" : "transparent",
              color: activeTab === t.key ? "rgba(212,240,196,0.85)" : "rgba(255,255,255,0.32)",
              transition: "all 0.1s ease",
            }}
          >{t.label}</button>
        ))}
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 12 }} />

      {/* ══════════════════════════════════════════
          TAB: APARIENCIA
      ══════════════════════════════════════════ */}
      {activeTab === "apariencia" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Background color */}
          <div>
            <SectionHead>Fondo</SectionHead>
            <Row>
              <Label>Color</Label>
              <ColorSwatch
                value={bg?.color ?? "#141416"}
                onChange={v => patchBg({ color: v })}
              />
              {bg?.color && (
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); patchBg({ color: undefined }); }}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: MONO }}
                >×</button>
              )}
            </Row>
          </div>

          {/* Opacity */}
          <Row>
            <Label>Opacidad</Label>
            <input
              type="range" min={0} max={1} step={0.05}
              value={bg?.opacity ?? 1}
              onChange={e => patchBg({ opacity: Number(e.target.value) })}
              onMouseDown={e => e.stopPropagation()}
              style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)", minWidth: 60 }}
            />
            <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)", width: 26, textAlign: "right" }}>
              {Math.round((bg?.opacity ?? 1) * 100)}%
            </span>
          </Row>

          {/* Background blur */}
          <div>
            <Label>Blur de fondo</Label>
            <div style={{ marginTop: 6 }}>
              <ThreeLevel
                labels={["Ninguno", "Sutil", "Intenso"]}
                values={[0, 8, 20]}
                current={bg?.blur}
                onSelect={v => patchBg({ blur: v })}
              />
            </div>
          </div>

          {/* Brightness */}
          <div>
            <Label>Brillo</Label>
            <div style={{ marginTop: 6 }}>
              <ThreeLevel
                labels={["Oscuro", "Normal", "Brillante"]}
                values={[0.6, 1, 1.4]}
                current={bg?.brightness}
                onSelect={v => patchBg({ brightness: v })}
              />
            </div>
          </div>

          <Divider />

          {/* Border */}
          <div>
            <SectionHead>Borde</SectionHead>
            <Row gap={8}>
              <Label>Color</Label>
              <ColorSwatch
                value={bord?.color ?? "#ffffff"}
                onChange={v => patchBorder({ color: v })}
              />
              {bord?.color && (
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); patchBorder({ color: undefined }); }}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 12, cursor: "pointer", padding: 0 }}
                >×</button>
              )}
            </Row>
            <div style={{ marginTop: 8 }}>
              <Row>
                <Label>Ancho</Label>
                <input
                  type="range" min={0} max={8} step={1}
                  value={bord?.width ?? 1}
                  onChange={e => patchBorder({ width: Number(e.target.value) })}
                  onMouseDown={e => e.stopPropagation()}
                  style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)", minWidth: 60 }}
                />
                <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)", width: 22, textAlign: "right" }}>{bord?.width ?? 1}px</span>
              </Row>
            </div>
            <div style={{ marginTop: 8 }}>
              <Row>
                <Label>Radio</Label>
                <input
                  type="range" min={0} max={60} step={1}
                  value={bord?.radius ?? 14}
                  onChange={e => patchBorder({ radius: Number(e.target.value) })}
                  onMouseDown={e => e.stopPropagation()}
                  style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)", minWidth: 60 }}
                />
                <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)", width: 22, textAlign: "right" }}>{bord?.radius ?? 14}px</span>
              </Row>
            </div>
          </div>

          <Divider />

          {/* Global opacity */}
          <Row>
            <Label>Opacidad global</Label>
            <input
              type="range" min={0} max={1} step={0.05}
              value={effects?.opacity ?? 1}
              onChange={e => onChange({ ...effects, opacity: Number(e.target.value) })}
              onMouseDown={e => e.stopPropagation()}
              style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)", minWidth: 60 }}
            />
            <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)", width: 26, textAlign: "right" }}>
              {Math.round((effects?.opacity ?? 1) * 100)}%
            </span>
          </Row>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: EFECTOS
      ══════════════════════════════════════════ */}
      {activeTab === "efectos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Layers toggles */}
          <div>
            <SectionHead>Capas</SectionHead>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              <Toggle active={!!lays?.glass}  onClick={() => patchLayers({ glass:  !lays?.glass  })}>Glass</Toggle>
              <Toggle active={!!(lays?.noise && lays.noise > 0)} onClick={() => patchLayers({ noise: lays?.noise ? 0 : 0.12 })}>Noise</Toggle>
              <Toggle active={!!lays?.grain}  onClick={() => patchLayers({ grain:  !lays?.grain  })}>Grain</Toggle>
              <Toggle active={!!(lays?.vignette && lays.vignette > 0)} onClick={() => patchLayers({ vignette: lays?.vignette ? 0 : 0.5 })}>Vignette</Toggle>
              <Toggle active={!!lays?.gradient} onClick={() => patchLayers({ gradient: lays?.gradient ? undefined : { from: "#0f0f0f", to: "#1a1a2e", angle: 135, opacity: 0.6 } })}>Gradiente</Toggle>
            </div>
          </div>

          {/* Glass blur intensity if glass active */}
          {lays?.glass && (
            <div>
              <Label>Intensidad Glass</Label>
              <div style={{ marginTop: 6 }}>
                <ThreeLevel
                  labels={["Suave", "Normal", "Intenso"]}
                  values={[8, 20, 40]}
                  current={lays?.glassBlur}
                  onSelect={v => patchLayers({ glassBlur: v })}
                />
              </div>
            </div>
          )}

          {/* Gradient config if gradient active */}
          {lays?.gradient && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Row>
                <Label>De</Label>
                <ColorSwatch value={lays.gradient.from} onChange={v => patchLayers({ gradient: { ...lays.gradient!, from: v } })} />
                <Label>A</Label>
                <ColorSwatch value={lays.gradient.to} onChange={v => patchLayers({ gradient: { ...lays.gradient!, to: v } })} />
              </Row>
              <Row>
                <Label>Ángulo</Label>
                <Stepper
                  value={lays.gradient.angle} min={0} max={360} step={15}
                  onChange={v => patchLayers({ gradient: { ...lays.gradient!, angle: v } })}
                  suffix="°"
                />
              </Row>
            </div>
          )}

          <Divider />

          {/* Glow */}
          <div>
            <SectionHead>Glow</SectionHead>
            <Row gap={6}>
              <Toggle active={!!glow?.outer} onClick={() => patchGlow({ outer: !glow?.outer })}>Exterior</Toggle>
              <Toggle active={!!glow?.inner} onClick={() => patchGlow({ inner: !glow?.inner })}>Interior</Toggle>
              <Toggle active={!!(glow?.animated)} onClick={() => patchGlow({ animated: !glow?.animated })}>Animado</Toggle>
            </Row>
            {(glow?.outer || glow?.inner) && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <Row>
                  <Label>Color</Label>
                  <ColorSwatch value={glow?.color ?? "#a855f7"} onChange={v => patchGlow({ color: v })} />
                </Row>
                <div>
                  <Label>Intensidad</Label>
                  <div style={{ marginTop: 6 }}>
                    <ThreeLevel
                      labels={["Suave", "Normal", "Intenso"]}
                      values={[0.3, 0.6, 1.0]}
                      current={glow?.intensity}
                      onSelect={v => patchGlow({ intensity: v })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Divider />

          {/* Shadow */}
          <div>
            <SectionHead>Sombra</SectionHead>
            <Row>
              <Label>Color</Label>
              <ColorSwatch
                value={effects?.shadow?.color ?? "#000000"}
                onChange={v => onChange({ ...effects, shadow: { ...effects?.shadow, color: v } })}
              />
              <Label>Blur</Label>
              <Stepper
                value={effects?.shadow?.blur ?? 20} step={4} min={0} max={80}
                onChange={v => onChange({ ...effects, shadow: { ...effects?.shadow, blur: v } })}
                suffix="px"
              />
            </Row>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: INTERACCIONES
      ══════════════════════════════════════════ */}
      {activeTab === "interacciones" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHead>Interacciones con cursor</SectionHead>

          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
            <Toggle active={!!inter?.tilt3d}    onClick={() => patchInteractions({ tilt3d:    !inter?.tilt3d    })}>Tilt 3D</Toggle>
            <Toggle active={!!inter?.spotlight} onClick={() => patchInteractions({ spotlight: !inter?.spotlight })}>Spotlight</Toggle>
            <Toggle active={!!inter?.magnetic}  onClick={() => patchInteractions({ magnetic:  !inter?.magnetic  })}>Magnético</Toggle>
            <Toggle active={!!inter?.hoverGlow} onClick={() => patchInteractions({ hoverGlow: !inter?.hoverGlow })}>Hover Glow</Toggle>
            <Toggle active={!!(inter?.hoverScale && inter.hoverScale > 1)} onClick={() => patchInteractions({ hoverScale: (inter?.hoverScale && inter.hoverScale > 1) ? 1 : 1.05 })}>Hover Escala</Toggle>
          </div>

          {inter?.tilt3d && (
            <div>
              <Label>Intensidad Tilt</Label>
              <div style={{ marginTop: 6 }}>
                <ThreeLevel
                  labels={["Suave", "Normal", "Intenso"]}
                  values={isProfileCard ? [4, 8, 16] : [2, 4, 10]}
                  current={inter?.tiltIntensity}
                  onSelect={v => patchInteractions({ tiltIntensity: v })}
                />
              </div>
            </div>
          )}

          {inter?.spotlight && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Row>
                <Label>Color Spotlight</Label>
                <ColorSwatch
                  value={inter?.spotlightColor?.startsWith("#") ? inter.spotlightColor : "#ffffff"}
                  onChange={v => patchInteractions({ spotlightColor: v })}
                />
              </Row>
              <div>
                <Label>Intensidad Spotlight</Label>
                <div style={{ marginTop: 6 }}>
                  <ThreeLevel
                    labels={["Suave", "Normal", "Intenso"]}
                    values={[0.12, 0.35, 0.65]}
                    current={inter?.spotlightIntensity}
                    onSelect={v => patchInteractions({ spotlightIntensity: v })}
                  />
                </div>
              </div>
            </div>
          )}

          {inter?.magnetic && (
            <div>
              <Label>Fuerza Magnética</Label>
              <div style={{ marginTop: 6 }}>
                <ThreeLevel
                  labels={["Suave", "Normal", "Fuerte"]}
                  values={[0.15, 0.3, 0.6]}
                  current={inter?.magneticStrength}
                  onSelect={v => patchInteractions({ magneticStrength: v })}
                />
              </div>
            </div>
          )}

          {inter?.hoverScale && inter.hoverScale > 1 && (
            <Row>
              <Label>Escala hover</Label>
              <Stepper
                value={inter.hoverScale} step={0.01} min={1} max={1.2}
                onChange={v => patchInteractions({ hoverScale: v })}
              />
            </Row>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: ANIMACIONES
      ══════════════════════════════════════════ */}
      {activeTab === "animaciones" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHead>Animaciones continuas</SectionHead>

          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
            <Toggle active={!!anim?.floating}     onClick={() => patchAnimations({ floating:     !anim?.floating     })}>Flotando</Toggle>
            <Toggle active={!!anim?.pulse}        onClick={() => patchAnimations({ pulse:        !anim?.pulse        })}>Pulso</Toggle>
            <Toggle active={!!anim?.breathingGlow} onClick={() => patchAnimations({ breathingGlow: !anim?.breathingGlow })}>Glow Respira</Toggle>
            <Toggle active={!!anim?.shineSweep}   onClick={() => patchAnimations({ shineSweep:   !anim?.shineSweep   })}>Destello</Toggle>
            <Toggle active={!!anim?.shimmer}      onClick={() => patchAnimations({ shimmer:      !anim?.shimmer      })}>Shimmer</Toggle>
            <Toggle active={!!anim?.borderAnimation} onClick={() => patchAnimations({ borderAnimation: !anim?.borderAnimation })}>Borde Animado</Toggle>
          </div>

          {anim?.floating && (
            <div>
              <Label>Altura flotación</Label>
              <div style={{ marginTop: 6 }}>
                <ThreeLevel
                  labels={["Suave", "Normal", "Intenso"]}
                  values={[4, 8, 16]}
                  current={anim?.floatHeight}
                  onSelect={v => patchAnimations({ floatHeight: v })}
                />
              </div>
            </div>
          )}

          {anim?.pulse && (
            <div>
              <Label>Velocidad pulso</Label>
              <div style={{ marginTop: 6 }}>
                <ThreeLevel
                  labels={["Lento", "Normal", "Rápido"]}
                  values={[3, 1.8, 0.9]}
                  current={anim?.pulseSpeed}
                  onSelect={v => patchAnimations({ pulseSpeed: v })}
                />
              </div>
            </div>
          )}

          {anim?.shineSweep && (
            <div>
              <Label>Intervalo destello</Label>
              <div style={{ marginTop: 6 }}>
                <ThreeLevel
                  labels={["Seguido", "Normal", "Lento"]}
                  values={[2, 4, 8]}
                  current={anim?.sweepInterval}
                  onSelect={v => patchAnimations({ sweepInterval: v })}
                />
              </div>
            </div>
          )}

          {anim?.breathingGlow && (
            <div>
              <Label>Velocidad respiración</Label>
              <div style={{ marginTop: 6 }}>
                <ThreeLevel
                  labels={["Lento", "Normal", "Rápido"]}
                  values={[4, 2.5, 1.2]}
                  current={anim?.breathSpeed}
                  onSelect={v => patchAnimations({ breathSpeed: v })}
                />
              </div>
            </div>
          )}

          <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 7.5, color: "rgba(255,255,255,0.18)", lineHeight: 1.5 }}>
            Todas las animaciones son opt-in y se guardan con tu perfil.
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: TIPOGRAFÍA
      ══════════════════════════════════════════ */}
      {activeTab === "tipografia" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHead>Tipografía</SectionHead>

          {/* Font picker */}
          <div>
            <Label>Fuente</Label>
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
              {FONTS.map(f => (
                <button
                  key={f.key}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); patchTypography({ font: f.key }); }}
                  style={{
                    padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                    border: typo?.font === f.key ? "1px solid rgba(212,240,196,0.38)" : "1px solid rgba(255,255,255,0.08)",
                    background: typo?.font === f.key ? "rgba(212,240,196,0.1)" : "rgba(255,255,255,0.03)",
                    color: typo?.font === f.key ? "rgba(212,240,196,0.9)" : "rgba(255,255,255,0.38)",
                    fontFamily: f.key === "Space Mono" ? "'Space Mono',monospace" : f.key === "Playfair Display" ? "'Playfair Display',serif" : f.key === "Bebas Neue" ? "'Bebas Neue',sans-serif" : f.key === "Syne" ? "'Syne',sans-serif" : f.key === "Impact" ? "Impact,sans-serif" : "'DM Sans',sans-serif",
                    fontSize: 9, letterSpacing: 0.3,
                    userSelect: "none" as const,
                    transition: "all 0.1s ease",
                  }}
                >{f.label}</button>
              ))}
            </div>
          </div>

          {/* Color */}
          <Row>
            <Label>Color texto</Label>
            <ColorSwatch
              value={typo?.color ?? "#ffffff"}
              onChange={v => patchTypography({ color: v })}
            />
          </Row>

          {/* Letter spacing */}
          <Row>
            <Label>Espaciado letras</Label>
            <Stepper
              value={typo?.letterSpacing ?? 0} step={0.5} min={-2} max={10}
              onChange={v => patchTypography({ letterSpacing: v })}
              suffix="px"
            />
          </Row>

          {/* Weight */}
          <div>
            <Label>Peso</Label>
            <div style={{ marginTop: 6 }}>
              <ThreeLevel
                labels={["Ligero", "Normal", "Bold"]}
                values={[300, 400, 700]}
                current={typo?.weight}
                onSelect={v => patchTypography({ weight: v })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
