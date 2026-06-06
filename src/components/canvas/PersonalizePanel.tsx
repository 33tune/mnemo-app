"use client";
import React, { useState } from "react";
import type { CardEffects } from "@/types";
import { T, Tabs, SliderRow, Toggle, ColorSwatch, MenuSection, MenuRow, Divider } from "@/ui";

type Tab = "fondo" | "efectos" | "animar";

interface PersonalizePanelProps {
  effects?:       CardEffects;
  onChange:       (patch: CardEffects) => void;
  isProfileCard?: boolean;
  tabs?:          Tab[];
}

export default function PersonalizePanel({ effects, onChange, isProfileCard, tabs: allowedTabs }: PersonalizePanelProps) {
  const allTabs: { id: Tab; label: string }[] = [
    { id: "fondo",   label: "Fondo"   },
    { id: "efectos", label: "Efectos" },
    { id: "animar",  label: "Animar"  },
  ];
  const visibleTabs = allowedTabs ? allTabs.filter(t => allowedTabs.includes(t.id)) : allTabs;
  const [activeTab, setActiveTab] = useState<Tab>(visibleTabs[0]?.id ?? "fondo");

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

  const anyGlow = !!(glow?.outer || glow?.inner);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {visibleTabs.length > 1 && (
        <Tabs tabs={visibleTabs} active={activeTab} onChange={id => setActiveTab(id as Tab)} variant="underline" />
      )}

      {/* ── FONDO ── */}
      {activeTab === "fondo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: T.space[4] }}>
          <MenuSection label="Color de fondo" first>
            <MenuRow label="Color">
              <ColorSwatch
                value={bg?.color ?? "#141416"}
                onChange={v => patchBg({ color: v })}
                clearable={!!bg?.color}
                onClear={() => patchBg({ color: undefined })}
              />
            </MenuRow>
          </MenuSection>

          <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={bg?.opacity ?? 1}
            onChange={v => patchBg({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />

          <SliderRow label="Blur" min={0} max={24} step={1} value={bg?.blur ?? 0}
            onChange={v => patchBg({ blur: v || undefined })} unit="px" />

          <MenuRow label="Glass">
            <Toggle value={!!bg?.glass} onChange={v => patchBg({ glass: v })} />
          </MenuRow>

          <Divider />

          <MenuSection label="Gradiente">
            <MenuRow label="Activar">
              <Toggle value={!!grad} onChange={v => {
                if (v) onChange({ ...effects, gradient: { from: "#0f0f0f", to: "#1a1a2e", angle: 135, opacity: 0.6 } });
                else onChange({ ...effects, gradient: undefined });
              }} />
            </MenuRow>
            {grad && (
              <>
                <MenuRow label="Color A">
                  <ColorSwatch value={grad.from} onChange={v => patchGradient({ from: v })} />
                </MenuRow>
                <MenuRow label="Color B">
                  <ColorSwatch value={grad.to} onChange={v => patchGradient({ to: v })} />
                </MenuRow>
                <SliderRow label="Angulo" min={0} max={360} step={5} value={grad.angle}
                  onChange={v => patchGradient({ angle: v })} fmt={v => `${v}°`} />
                <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={grad.opacity}
                  onChange={v => patchGradient({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
              </>
            )}
          </MenuSection>
        </div>
      )}

      {/* ── EFECTOS ── */}
      {activeTab === "efectos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: T.space[4] }}>
          <MenuSection label="Glow" first>
            <MenuRow label="Exterior">
              <Toggle value={!!glow?.outer} onChange={v => patchGlow({ outer: v })} />
            </MenuRow>
            <MenuRow label="Interior">
              <Toggle value={!!glow?.inner} onChange={v => patchGlow({ inner: v })} />
            </MenuRow>
            {anyGlow && (
              <>
                <MenuRow label="Color">
                  <ColorSwatch value={glow?.color ?? "#a855f7"} onChange={v => patchGlow({ color: v })} />
                </MenuRow>
                <SliderRow label="Intensidad" min={0} max={1} step={0.01}
                  value={glow?.intensity ?? 0}
                  onChange={v => patchGlow({ intensity: v })}
                  fmt={v => `${Math.round(v * 100)}%`} />
              </>
            )}
          </MenuSection>

          <Divider />

          <MenuSection label="Sombra">
            <MenuRow label="Color">
              <ColorSwatch value={sh?.color ?? "#000000"} onChange={v => patchShadow({ color: v })} />
            </MenuRow>
            <SliderRow label="Intensidad" min={0} max={1} step={0.01}
              value={sh?.intensity ?? 0}
              onChange={v => patchShadow({ intensity: v })}
              fmt={v => `${Math.round(v * 100)}%`} />
          </MenuSection>

          <Divider />

          <MenuSection label="Borde">
            <MenuRow label="Color">
              <ColorSwatch
                value={bord?.color ?? "#ffffff"}
                onChange={v => patchBorder({ color: v })}
                clearable={!!bord?.color}
                onClear={() => patchBorder({ color: undefined })}
              />
            </MenuRow>
            <SliderRow label="Grosor" min={0} max={6} step={0.5}
              value={bord?.width ?? 1}
              onChange={v => patchBorder({ width: v })} fmt={v => `${v}px`} />
            <SliderRow label="Radio" min={0} max={60} step={1}
              value={bord?.radius ?? 14}
              onChange={v => patchBorder({ radius: v })} unit="px" />
          </MenuSection>
        </div>
      )}

      {/* ── ANIMAR ── */}
      {activeTab === "animar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: T.space[4] }}>
          <MenuSection label="Flotacion" first>
            <MenuRow label="Activar">
              <Toggle value={!!anim?.floating} onChange={v => patchAnimations({ floating: v })} />
            </MenuRow>
            {anim?.floating && (
              <>
                <SliderRow label="Altura" min={2} max={24} step={1}
                  value={anim?.floatHeight ?? 8}
                  onChange={v => patchAnimations({ floatHeight: v })} unit="px" />
                <SliderRow label="Velocidad" min={1} max={8} step={0.5}
                  value={anim?.floatSpeed ?? 3}
                  onChange={v => patchAnimations({ floatSpeed: v })} fmt={v => `${v}s`} />
              </>
            )}
          </MenuSection>

          <Divider />

          <MenuSection label="Inclinacion 3D">
            <MenuRow label="Activar">
              <Toggle value={!!inter?.tilt3d} onChange={v => patchInteractions({ tilt3d: v })} />
            </MenuRow>
            {inter?.tilt3d && (
              <SliderRow label="Intensidad" min={1} max={isProfileCard ? 20 : 15} step={0.5}
                value={inter?.tiltIntensity ?? (isProfileCard ? 10 : 6)}
                onChange={v => patchInteractions({ tiltIntensity: v })} fmt={v => `${v}°`} />
            )}
          </MenuSection>

          <Divider />

          <MenuSection label="Spotlight">
            <MenuRow label="Activar">
              <Toggle value={!!inter?.spotlight} onChange={v => patchInteractions({ spotlight: v })} />
            </MenuRow>
            {inter?.spotlight && (
              <>
                <MenuRow label="Color">
                  <ColorSwatch
                    value={inter?.spotlightColor?.startsWith("#") ? inter.spotlightColor : "#ffffff"}
                    onChange={v => patchInteractions({ spotlightColor: v })}
                  />
                </MenuRow>
                <SliderRow label="Radio" min={20} max={100} step={1}
                  value={inter?.spotlightSize ?? 65}
                  onChange={v => patchInteractions({ spotlightSize: v })} unit="%" />
              </>
            )}
          </MenuSection>

          <Divider />

          <MenuSection label="Hover">
            <MenuRow label="Glow al pasar">
              <Toggle value={!!inter?.hoverGlow} onChange={v => patchInteractions({ hoverGlow: v })} />
            </MenuRow>
          </MenuSection>
        </div>
      )}
    </div>
  );
}
