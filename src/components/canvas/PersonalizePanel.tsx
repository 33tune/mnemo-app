"use client";
import React, { useState, type CSSProperties } from "react";
import type { CardEffects } from "@/types";

type Tab = "fondo" | "efectos" | "interaccion";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";
const GREEN = "rgba(212,240,196,0.85)";
const GREEN_DIM = "rgba(212,240,196,0.12)";
const GREEN_BRD = "rgba(212,240,196,0.25)";

interface PersonalizePanelProps {
  effects?:       CardEffects;
  onChange:       (patch: CardEffects) => void;
  isProfileCard?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "10px 0" }} />;
}

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, userSelect: "none" as const }}>
        {children}
      </span>
    </div>
  );
}

function SliderRow({
  label, min, max, step = 1, value, onChange, unit = "", fmt,
}: {
  label: string; min: number; max: number; step?: number;
  value: number; onChange: (v: number) => void; unit?: string; fmt?: (v: number) => string;
}) {
  const display = fmt ? fmt(value) : `${Math.round(value * (unit === "%" ? 100 : 1))}${unit}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 1, color: "rgba(255,255,255,0.32)", textTransform: "uppercase" as const }}>
          {label}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: GREEN, minWidth: 30, textAlign: "right" }}>
          {display}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onMouseDown={e => e.stopPropagation()}
        style={{ width: "100%", accentColor: "rgba(212,240,196,0.75)", cursor: "pointer" }}
      />
    </div>
  );
}

function ColorSwatch({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {label && <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 1, color: "rgba(255,255,255,0.32)", textTransform: "uppercase" as const, minWidth: 32 }}>{label}</span>}
      <div style={{
        position: "relative", width: 32, height: 26, borderRadius: 5,
        overflow: "hidden", border: "1px solid rgba(255,255,255,0.15)",
        cursor: "pointer", flexShrink: 0,
        boxShadow: `0 0 0 2px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.05)`,
      }}>
        <div style={{ position: "absolute", inset: 0, background: value || "rgba(255,255,255,0.12)", borderRadius: 4 }} />
        <input
          type="color"
          value={value?.startsWith("#") ? value : "#a855f7"}
          onChange={e => onChange(e.target.value)}
          onMouseDown={e => e.stopPropagation()}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        padding: "5px 12px", borderRadius: 20,
        border: active ? `1px solid ${GREEN_BRD}` : "1px solid rgba(255,255,255,0.1)",
        background: active ? GREEN_DIM : "rgba(255,255,255,0.04)",
        color: active ? GREEN : "rgba(255,255,255,0.38)",
        fontFamily: MONO, fontSize: 8, letterSpacing: 0.5,
        cursor: "pointer", transition: "all 0.12s ease",
        whiteSpace: "nowrap" as const, userSelect: "none" as const,
      }}
    >{children}</button>
  );
}

function ClearBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        background: "transparent", border: "none", padding: "2px 6px",
        color: "rgba(255,255,255,0.22)", fontSize: 11, cursor: "pointer",
        fontFamily: MONO, lineHeight: 1, borderRadius: 3,
        transition: "color 0.1s ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,80,80,0.7)"; }}
      onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.22)"; }}
    >×</button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PersonalizePanel({ effects, onChange, isProfileCard }: PersonalizePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("fondo");

  const TABS: { key: Tab; icon: string; label: string }[] = [
    { key: "fondo",       icon: "◻",  label: "Fondo" },
    { key: "efectos",     icon: "✦",  label: "Efectos" },
    { key: "interaccion", icon: "⟡",  label: "Interact" },
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
  const sh    = effects?.shadow;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Tab row */}
      <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setActiveTab(t.key); }}
            style={{
              flex: 1, padding: "6px 4px", borderRadius: 6, fontSize: 7.5,
              fontFamily: MONO, letterSpacing: 0.5,
              cursor: "pointer", userSelect: "none" as const,
              border: activeTab === t.key ? `1px solid ${GREEN_BRD}` : "1px solid rgba(255,255,255,0.07)",
              background: activeTab === t.key ? GREEN_DIM : "rgba(255,255,255,0.02)",
              color: activeTab === t.key ? GREEN : "rgba(255,255,255,0.3)",
              transition: "all 0.1s ease",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}
          >
            <span style={{ fontSize: 11, lineHeight: 1 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 14 }} />

      {/* ══════════ TAB: FONDO ══════════ */}
      {activeTab === "fondo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Color */}
          <div>
            <SectionTitle icon="🎨">Color de fondo</SectionTitle>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ColorSwatch value={bg?.color ?? "#141416"} onChange={v => patchBg({ color: v })} />
              <div style={{ flex: 1, height: 26, borderRadius: 5, overflow: "hidden", border: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(255,255,255,0.2)", letterSpacing: 0.5 }}>
                  {bg?.color?.toUpperCase() ?? "AUTO"}
                </span>
              </div>
              {bg?.color && <ClearBtn onClick={() => patchBg({ color: undefined })} />}
            </div>
          </div>

          {/* Opacidad */}
          <SliderRow
            label="Opacidad fondo" min={0} max={1} step={0.01}
            value={bg?.opacity ?? 1}
            onChange={v => patchBg({ opacity: v })}
            fmt={v => `${Math.round(v * 100)}%`}
          />

          {/* Blur */}
          <SliderRow
            label="Blur" min={0} max={24} step={1}
            value={bg?.blur ?? 0}
            onChange={v => patchBg({ blur: v || undefined })}
            unit="px"
          />

          {/* Glass */}
          <Pill active={!!bg?.glass} onClick={() => patchBg({ glass: !bg?.glass })}>
            {bg?.glass ? "✓ Glass (blur)" : "Glass (blur)"}
          </Pill>

          <Divider />

          {/* Gradiente */}
          <div>
            <SectionTitle icon="🌈">Gradiente</SectionTitle>
            <Pill active={!!grad} onClick={() => {
              if (grad) onChange({ ...effects, gradient: undefined });
              else onChange({ ...effects, gradient: { from: "#0f0f0f", to: "#1a1a2e", angle: 135, opacity: 0.6 } });
            }}>
              {grad ? "✓ Activo" : "Activar"}
            </Pill>

            {grad && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <ColorSwatch label="De" value={grad.from} onChange={v => patchGradient({ from: v })} />
                  <ColorSwatch label="A" value={grad.to} onChange={v => patchGradient({ to: v })} />
                </div>
                <SliderRow
                  label="Ángulo" min={0} max={360} step={5}
                  value={grad.angle} onChange={v => patchGradient({ angle: v })}
                  fmt={v => `${v}°`}
                />
                <SliderRow
                  label="Opacidad" min={0} max={1} step={0.01}
                  value={grad.opacity} onChange={v => patchGradient({ opacity: v })}
                  fmt={v => `${Math.round(v * 100)}%`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ TAB: EFECTOS ══════════ */}
      {activeTab === "efectos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Glow */}
          <div>
            <SectionTitle icon="✨">Glow</SectionTitle>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <Pill active={!!glow?.outer} onClick={() => patchGlow({ outer: !glow?.outer })}>Exterior</Pill>
              <Pill active={!!glow?.inner} onClick={() => patchGlow({ inner: !glow?.inner })}>Interior</Pill>
            </div>
            {(glow?.outer || glow?.inner) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <ColorSwatch label="Color" value={glow?.color ?? "#a855f7"} onChange={v => patchGlow({ color: v })} />
                <SliderRow
                  label="Intensidad" min={0} max={1} step={0.01}
                  value={glow?.intensity ?? 0}
                  onChange={v => patchGlow({ intensity: v, outer: (glow?.outer || v > 0) })}
                  fmt={v => `${Math.round(v * 100)}%`}
                />
              </div>
            )}
          </div>

          <Divider />

          {/* Sombra */}
          <div>
            <SectionTitle icon="🌑">Sombra</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ColorSwatch label="Color" value={sh?.color ?? "#000000"} onChange={v => patchShadow({ color: v })} />
              <SliderRow
                label="Intensidad" min={0} max={1} step={0.01}
                value={sh?.intensity ?? 0}
                onChange={v => patchShadow({ intensity: v })}
                fmt={v => `${Math.round(v * 100)}%`}
              />
            </div>
          </div>

          <Divider />

          {/* Borde */}
          <div>
            <SectionTitle icon="⬜">Borde</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ColorSwatch label="Color" value={bord?.color ?? "#ffffff"} onChange={v => patchBorder({ color: v })} />
                {bord?.color && <ClearBtn onClick={() => patchBorder({ color: undefined })} />}
              </div>
              <SliderRow
                label="Grosor" min={0} max={6} step={0.5}
                value={bord?.width ?? 1}
                onChange={v => patchBorder({ width: v })}
                fmt={v => `${v}px`}
              />
              <SliderRow
                label="Radio" min={0} max={60} step={1}
                value={bord?.radius ?? 14}
                onChange={v => patchBorder({ radius: v })}
                fmt={v => `${v}px`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════ TAB: INTERACCIÓN ══════════ */}
      {activeTab === "interaccion" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Tilt 3D */}
          <div>
            <SectionTitle icon="↗">Tilt 3D</SectionTitle>
            <Pill active={!!inter?.tilt3d} onClick={() => patchInteractions({ tilt3d: !inter?.tilt3d })}>
              {inter?.tilt3d ? "✓ Activado" : "Activar"}
            </Pill>
            {inter?.tilt3d && (
              <div style={{ marginTop: 10 }}>
                <SliderRow
                  label="Intensidad" min={1} max={isProfileCard ? 20 : 15} step={0.5}
                  value={inter?.tiltIntensity ?? (isProfileCard ? 10 : 6)}
                  onChange={v => patchInteractions({ tiltIntensity: v })}
                  fmt={v => `${v}°`}
                />
              </div>
            )}
          </div>

          <Divider />

          {/* Spotlight */}
          <div>
            <SectionTitle icon="💡">Spotlight</SectionTitle>
            <Pill active={!!inter?.spotlight} onClick={() => patchInteractions({ spotlight: !inter?.spotlight })}>
              {inter?.spotlight ? "✓ Activado" : "Activar"}
            </Pill>
            {inter?.spotlight && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                <ColorSwatch
                  label="Color"
                  value={inter?.spotlightColor?.startsWith("#") ? inter.spotlightColor : "#ffffff"}
                  onChange={v => patchInteractions({ spotlightColor: v })}
                />
                <SliderRow
                  label="Tamaño" min={20} max={100} step={1}
                  value={inter?.spotlightSize ?? 65}
                  onChange={v => patchInteractions({ spotlightSize: v })}
                  fmt={v => `${v}%`}
                />
              </div>
            )}
          </div>

          <Divider />

          {/* Flotando */}
          <div>
            <SectionTitle icon="〜">Flotando</SectionTitle>
            <Pill active={!!anim?.floating} onClick={() => patchAnimations({ floating: !anim?.floating })}>
              {anim?.floating ? "✓ Activado" : "Activar"}
            </Pill>
            {anim?.floating && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                <SliderRow
                  label="Altura" min={2} max={24} step={1}
                  value={anim?.floatHeight ?? 8}
                  onChange={v => patchAnimations({ floatHeight: v })}
                  fmt={v => `${v}px`}
                />
                <SliderRow
                  label="Velocidad" min={1} max={8} step={0.5}
                  value={anim?.floatSpeed ?? 3}
                  onChange={v => patchAnimations({ floatSpeed: v })}
                  fmt={v => `${v}s`}
                />
              </div>
            )}
          </div>

          <Divider />

          {/* Otros */}
          <div>
            <SectionTitle icon="◈">Otros</SectionTitle>
            <Pill active={!!inter?.hoverGlow} onClick={() => patchInteractions({ hoverGlow: !inter?.hoverGlow })}>
              {inter?.hoverGlow ? "✓ Hover Glow" : "Hover Glow"}
            </Pill>
          </div>
        </div>
      )}
    </div>
  );
}
