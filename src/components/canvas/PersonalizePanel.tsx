"use client";
import React, { useState, type CSSProperties } from "react";
import type { CardEffects } from "@/types";

type Tab = "fondo" | "efectos" | "interaccion";

const MONO = "'Space Mono', monospace";

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

function Toggle({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        padding: "5px 10px", borderRadius: 20,
        border: active ? "1px solid rgba(212,240,196,0.28)" : "1px solid rgba(255,255,255,0.1)",
        background: active ? "rgba(212,240,196,0.12)" : "rgba(255,255,255,0.04)",
        color: active ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.38)",
        fontFamily: MONO, fontSize: 8, letterSpacing: 0.8,
        cursor: "pointer", transition: "all 0.12s ease",
        whiteSpace: "nowrap" as const, userSelect: "none" as const,
      }}
    >{children}</button>
  );
}

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
              transition: "all 0.1s ease", userSelect: "none" as const,
            }}
          >{lbl}</button>
        );
      })}
    </div>
  );
}

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

// ── Main component ────────────────────────────────────────────────────────────

export default function PersonalizePanel({ effects, onChange, isProfileCard }: PersonalizePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("fondo");

  const TABS: { key: Tab; label: string }[] = [
    { key: "fondo",      label: "Fondo" },
    { key: "efectos",    label: "Efectos" },
    { key: "interaccion", label: "Interacción" },
  ];

  function patchBg(patch: Partial<NonNullable<CardEffects["bg"]>>) {
    onChange({ ...effects, bg: { ...effects?.bg, ...patch } });
  }
  function patchBorder(patch: Partial<NonNullable<CardEffects["border"]>>) {
    onChange({ ...effects, border: { ...effects?.border, ...patch } });
  }
  function patchGlow(patch: Partial<NonNullable<CardEffects["glow"]>>) {
    onChange({ ...effects, glow: { ...effects?.glow, ...patch } });
  }
  function patchShadow(patch: Partial<NonNullable<CardEffects["shadow"]>>) {
    onChange({ ...effects, shadow: { ...effects?.shadow, ...patch } });
  }
  function patchGradient(patch: Partial<NonNullable<CardEffects["gradient"]>>) {
    const base = effects?.gradient ?? { from: "#0f0f0f", to: "#1a1a2e", angle: 135, opacity: 0.6 };
    onChange({ ...effects, gradient: { ...base, ...patch } });
  }
  function patchInteractions(patch: Partial<NonNullable<CardEffects["interactions"]>>) {
    onChange({ ...effects, interactions: { ...effects?.interactions, ...patch } });
  }
  function patchAnimations(patch: Partial<NonNullable<CardEffects["animations"]>>) {
    onChange({ ...effects, animations: { ...effects?.animations, ...patch } });
  }

  const bg    = effects?.bg;
  const bord  = effects?.border;
  const glow  = effects?.glow;
  const grad  = effects?.gradient;
  const inter = effects?.interactions;
  const anim  = effects?.animations;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Tab row */}
      <div style={{
        display: "flex", gap: 2, paddingBottom: 8, marginBottom: 4,
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
          TAB: FONDO
      ══════════════════════════════════════════ */}
      {activeTab === "fondo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div>
            <SectionHead>Color de fondo</SectionHead>
            <Row>
              <ColorSwatch value={bg?.color ?? "#141416"} onChange={v => patchBg({ color: v })} />
              {bg?.color && (
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); patchBg({ color: undefined }); }}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: MONO }}
                >× limpiar</button>
              )}
            </Row>
          </div>

          <div>
            <Label>Opacidad fondo</Label>
            <div style={{ marginTop: 6 }}>
              <input
                type="range" min={0} max={1} step={0.05}
                value={bg?.opacity ?? 1}
                onChange={e => patchBg({ opacity: Number(e.target.value) })}
                onMouseDown={e => e.stopPropagation()}
                style={{ width: "100%", accentColor: "rgba(212,240,196,0.8)" }}
              />
              <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)" }}>
                {Math.round((bg?.opacity ?? 1) * 100)}%
              </span>
            </div>
          </div>

          <div>
            <Label>Blur</Label>
            <div style={{ marginTop: 6 }}>
              <ThreeLevel
                labels={["Ninguno", "Sutil", "Intenso"]}
                values={[0, 8, 20]}
                current={bg?.blur}
                onSelect={v => patchBg({ blur: v || undefined })}
              />
            </div>
          </div>

          <Toggle active={!!bg?.glass} onClick={() => patchBg({ glass: !bg?.glass })}>
            Glass (glassmorphism)
          </Toggle>

          <Divider />

          <div>
            <SectionHead>Gradiente</SectionHead>
            <Toggle active={!!grad} onClick={() => {
              if (grad) onChange({ ...effects, gradient: undefined });
              else onChange({ ...effects, gradient: { from: "#0f0f0f", to: "#1a1a2e", angle: 135, opacity: 0.6 } });
            }}>
              {grad ? "Gradiente activo" : "Activar gradiente"}
            </Toggle>

            {grad && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                <Row>
                  <Label>De</Label>
                  <ColorSwatch value={grad.from} onChange={v => patchGradient({ from: v })} />
                  <Label>A</Label>
                  <ColorSwatch value={grad.to} onChange={v => patchGradient({ to: v })} />
                </Row>
                <Row>
                  <Label>Ángulo</Label>
                  <input
                    type="range" min={0} max={360} step={15}
                    value={grad.angle}
                    onChange={e => patchGradient({ angle: Number(e.target.value) })}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)" }}
                  />
                  <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)", minWidth: 28, textAlign: "right" }}>{grad.angle}°</span>
                </Row>
                <Row>
                  <Label>Opacidad</Label>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={grad.opacity}
                    onChange={e => patchGradient({ opacity: Number(e.target.value) })}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)" }}
                  />
                  <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)", minWidth: 28, textAlign: "right" }}>{Math.round(grad.opacity * 100)}%</span>
                </Row>
              </div>
            )}
          </div>

          <Divider />

          <div>
            <Label>Opacidad global</Label>
            <div style={{ marginTop: 6 }}>
              <input
                type="range" min={0} max={1} step={0.05}
                value={effects?.opacity ?? 1}
                onChange={e => onChange({ ...effects, opacity: Number(e.target.value) })}
                onMouseDown={e => e.stopPropagation()}
                style={{ width: "100%", accentColor: "rgba(212,240,196,0.8)" }}
              />
              <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)" }}>
                {Math.round((effects?.opacity ?? 1) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: EFECTOS
      ══════════════════════════════════════════ */}
      {activeTab === "efectos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div>
            <SectionHead>Glow</SectionHead>
            <Row gap={6}>
              <Toggle active={!!glow?.outer} onClick={() => patchGlow({ outer: !glow?.outer })}>Exterior</Toggle>
              <Toggle active={!!glow?.inner} onClick={() => patchGlow({ inner: !glow?.inner })}>Interior</Toggle>
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

          <div>
            <SectionHead>Sombra</SectionHead>
            <Row>
              <Label>Color</Label>
              <ColorSwatch
                value={effects?.shadow?.color ?? "#000000"}
                onChange={v => patchShadow({ color: v })}
              />
            </Row>
            <div style={{ marginTop: 8 }}>
              <Label>Intensidad</Label>
              <div style={{ marginTop: 6 }}>
                <ThreeLevel
                  labels={["Suave", "Normal", "Intensa"]}
                  values={[0.25, 0.5, 1.0]}
                  current={effects?.shadow?.intensity}
                  onSelect={v => patchShadow({ intensity: v })}
                />
              </div>
            </div>
          </div>

          <Divider />

          <div>
            <SectionHead>Borde</SectionHead>
            <Row gap={8}>
              <Label>Color</Label>
              <ColorSwatch value={bord?.color ?? "#ffffff"} onChange={v => patchBorder({ color: v })} />
              {bord?.color && (
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); patchBorder({ color: undefined }); }}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 12, cursor: "pointer", padding: 0 }}
                >×</button>
              )}
            </Row>
            <div style={{ marginTop: 8 }}>
              <Label>Grosor</Label>
              <div style={{ marginTop: 6 }}>
                <ThreeLevel
                  labels={["Fino", "Normal", "Grueso"]}
                  values={[1, 2, 4]}
                  current={bord?.width}
                  onSelect={v => patchBorder({ width: v })}
                />
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <Label>Radio</Label>
              <div style={{ marginTop: 6 }}>
                <input
                  type="range" min={0} max={60} step={2}
                  value={bord?.radius ?? 14}
                  onChange={e => patchBorder({ radius: Number(e.target.value) })}
                  onMouseDown={e => e.stopPropagation()}
                  style={{ width: "100%", accentColor: "rgba(212,240,196,0.8)" }}
                />
                <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)" }}>
                  {bord?.radius ?? 14}px
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: INTERACCIÓN
      ══════════════════════════════════════════ */}
      {activeTab === "interaccion" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div>
            <SectionHead>Tilt 3D</SectionHead>
            <Toggle active={!!inter?.tilt3d} onClick={() => patchInteractions({ tilt3d: !inter?.tilt3d })}>
              {inter?.tilt3d ? "Activado" : "Desactivado"}
            </Toggle>
            {inter?.tilt3d && (
              <div style={{ marginTop: 10 }}>
                <Label>Intensidad</Label>
                <div style={{ marginTop: 6 }}>
                  <ThreeLevel
                    labels={["Suave", "Normal", "Intenso"]}
                    values={isProfileCard ? [5, 10, 18] : [3, 6, 12]}
                    current={inter?.tiltIntensity}
                    onSelect={v => patchInteractions({ tiltIntensity: v })}
                  />
                </div>
              </div>
            )}
          </div>

          <Divider />

          <div>
            <SectionHead>Spotlight</SectionHead>
            <Toggle active={!!inter?.spotlight} onClick={() => patchInteractions({ spotlight: !inter?.spotlight })}>
              {inter?.spotlight ? "Activado" : "Desactivado"}
            </Toggle>
            {inter?.spotlight && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                <Row>
                  <Label>Color</Label>
                  <ColorSwatch
                    value={inter?.spotlightColor?.startsWith("#") ? inter.spotlightColor : "#ffffff"}
                    onChange={v => patchInteractions({ spotlightColor: v })}
                  />
                </Row>
                <div>
                  <Label>Tamaño</Label>
                  <div style={{ marginTop: 6 }}>
                    <ThreeLevel
                      labels={["Pequeño", "Normal", "Grande"]}
                      values={[40, 65, 90]}
                      current={inter?.spotlightSize}
                      onSelect={v => patchInteractions({ spotlightSize: v })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Divider />

          <div>
            <SectionHead>Otros</SectionHead>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              <Toggle active={!!inter?.hoverGlow} onClick={() => patchInteractions({ hoverGlow: !inter?.hoverGlow })}>
                Hover Glow
              </Toggle>
              <Toggle active={!!anim?.floating} onClick={() => patchAnimations({ floating: !anim?.floating })}>
                Flotando
              </Toggle>
            </div>
            {anim?.floating && (
              <div style={{ marginTop: 10 }}>
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
          </div>
        </div>
      )}
    </div>
  );
}
