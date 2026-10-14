"use client";
import React, { useId, useRef, useState } from "react";
import { SliderRow } from "./SliderRow";

interface OffsetRowProps {
  label?:   string;
  x:        number;
  y:        number;
  min:      number;
  max:      number;
  step?:    number;
  /** Double-click on the pad centers it on these (DS onPadReset). */
  defaultX?: number;
  defaultY?: number;
  onChange: (x: number, y: number) => void;
}

// Liquid glass (DS isOffset): a 104px pad — drag the accent dot to place the
// shadow (crosshair, double-click recenters to the default) — next to the
// two liquid X / Y capsules, which stay the keyboard / precise path (the pad
// itself is pointer-only and hidden from assistive tech: the sliders carry
// the same values, named "<label> X/Y"). One labelled group.
export function OffsetRow({ label = "Desplazamiento", x, y, min, max, step = 1, defaultX = 0, defaultY = 0, onChange }: OffsetRowProps) {
  const groupId = useId();
  const [dragging, setDragging] = useState(false);
  const span = max - min || 1;
  const pad = useRef<HTMLDivElement>(null);
  const clamp = (q: number) => Math.round(Math.max(min, Math.min(max, q)) / step) * step;
  const fromPoint = (e: React.PointerEvent) => {
    const r = pad.current!.getBoundingClientRect();
    return [clamp(min + ((e.clientX - r.left - 10) / (r.width - 20)) * span), clamp(min + ((e.clientY - r.top - 10) / (r.height - 20)) * span)] as const;
  };
  const at = (v: number) => (v - min) / span;
  return (
    <div role="group" aria-labelledby={groupId} style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <span id={groupId} className="mn-sr-only">{label}</span>
      <div ref={pad} className="mn-pad" aria-hidden="true" title="Arrastrá para mover la sombra · doble click centra"
        onMouseDown={e => e.stopPropagation()}
        onPointerDown={e => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); const [nx, ny] = fromPoint(e); onChange(nx, ny); }}
        onPointerMove={e => { if (dragging) { const [nx, ny] = fromPoint(e); onChange(nx, ny); } }}
        onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}
        onDoubleClick={() => onChange(defaultX, defaultY)}>
        <span className="mn-pad__axis mn-pad__axis--v" />
        <span className="mn-pad__axis mn-pad__axis--h" />
        <span className="mn-pad__center" />
        <span className="mn-pad__dot" data-dragging={dragging || undefined} style={{
          left: `calc(10px + ${at(x) * 100}% - ${at(x) * 20}px)`, top: `calc(10px + ${at(y) * 100}% - ${at(y) * 20}px)`,
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <SliderRow label="X" min={min} max={max} step={step} value={x} fmt={v => `${Math.round(v)} px`} defaultValue={defaultX}
          onChange={v => onChange(v, y)} />
        <SliderRow label="Y" min={min} max={max} step={step} value={y} fmt={v => `${Math.round(v)} px`} defaultValue={defaultY}
          onChange={v => onChange(x, v)} />
      </div>
    </div>
  );
}
