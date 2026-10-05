"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { T } from "./tokens";
import { EDITOR_ATTR } from "@/lib/editorGuards";
import { formatColor, hsvToRgb, parseColor, rgbToHex, toHsva, resolveHexCommit, resolveAlphaCommit, resolveFieldEscape, HUE_SPECTRUM_CSS, svAreaCss, type HSVA } from "@/lib/colorModel";

interface ColorPopoverProps {
  anchor:   HTMLElement | null;
  value:    string;
  /** Show the alpha bar / alpha field and emit rgba() when alpha < 1. */
  alpha:    boolean;
  label?:   string;
  onChange: (color: string) => void;
  onClose:  () => void;
}

const WIDTH = 240;
const GAP = 8;
const CHECKER = `${T.ui.picker.checker} 0 0 / 8px 8px`;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Block 2: the L3 color picker — SV area + hue bar + (optional) alpha bar +
// hex/alpha fields. Portaled to <body> (so a transformed/blurred ancestor
// can't trap position:fixed) and marked `data-mnemo-editor` itself, so
// editorGuards still treats it as editor UI and editor.css still applies.
// React events from the portal still bubble through the opener's tree
// (MenuPanel's mousedown/click isolation keeps working); the root also
// stops them itself for openers outside a MenuPanel (MyLand).
// Closes on Esc (without letting the panel's own Esc handler close the
// whole menu), on pointerdown outside, and when focus leaves it; focus
// returns to the well that opened it.
export function ColorPopover({ anchor, value, alpha, label, onChange, onClose }: ColorPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [hsva, setHsva] = useState<HSVA>(() => toHsva(value));
  const lastEmitted = useRef<string | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const [alphaDraft, setAlphaDraft] = useState<string | null>(null);
  // Review round (UX-1): the text each field showed when it got focus. Blur
  // (or Enter) with the text untouched must NOT emit — tabbing through the
  // picker would otherwise turn an inherited rgba(...,0.45) into an opaque
  // override, or round a 0.055 alpha to 0.06.
  const hexInitial = useRef<string | null>(null);
  const alphaInitial = useRef<string | null>(null);

  // External value changes (undo, another control) resync — but never the
  // echo of our own emission, which would lose hue on greys/black.
  useEffect(() => {
    if (value !== lastEmitted.current) setHsva(toHsva(value));
  }, [value]);

  function emit(next: HSVA) {
    const effective = alpha ? next : { ...next, a: 1 };
    setHsva(effective);
    const out = formatColor(hsvToRgb(effective), alpha);
    lastEmitted.current = out;
    onChange(out);
  }

  // ── Positioning ─────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    function place() {
      if (!anchor || !rootRef.current) return;
      const r = anchor.getBoundingClientRect();
      const h = rootRef.current.offsetHeight;
      const vw = window.innerWidth, vh = window.innerHeight;
      let left = r.right - WIDTH;
      left = Math.min(Math.max(GAP, left), vw - WIDTH - GAP);
      let top = r.bottom + GAP;
      if (top + h > vh - GAP) top = Math.max(GAP, r.top - h - GAP);
      setPos({ left, top });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);

  // ── Focus in / out, outside click ───────────────────────────────────────
  // Review round (A11Y-1): focus the SV area only once the popover is
  // positioned — before that the root is visibility:hidden and focus()
  // silently does nothing.
  const focusedOnce = useRef(false);
  const placed = pos !== null;
  useEffect(() => {
    if (!placed || focusedOnce.current) return;
    focusedOnce.current = true;
    areaRef.current?.focus({ preventScroll: true });
  }, [placed]);
  useEffect(() => {
    function onDown(e: PointerEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      if (rootRef.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    }
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [anchor, onClose]);

  function closeAndRefocus() {
    onClose();
    anchor?.focus({ preventScroll: true });
  }

  // ── Pointer drags (SV area / bars) ──────────────────────────────────────
  function dragHandler(apply: (fx: number, fy: number) => void) {
    return (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const el = e.currentTarget;
      el.focus({ preventScroll: true });
      el.setPointerCapture(e.pointerId);
      const update = (cx: number, cy: number) => {
        const r = el.getBoundingClientRect();
        apply(clamp01((cx - r.left) / r.width), clamp01((cy - r.top) / r.height));
      };
      update(e.clientX, e.clientY);
      const move = (ev: PointerEvent) => update(ev.clientX, ev.clientY);
      const up = (ev: PointerEvent) => {
        el.releasePointerCapture(ev.pointerId);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    };
  }
  // Read through a ref so a drag in progress always builds on the latest
  // state, not the closure from pointerdown.
  const hsvaRef = useRef(hsva);
  hsvaRef.current = hsva;

  const onAreaDown = dragHandler((fx, fy) => emit({ ...hsvaRef.current, s: fx, v: 1 - fy }));
  const onHueDown = dragHandler(fx => emit({ ...hsvaRef.current, h: Math.min(359.9, fx * 360) }));
  const onAlphaDown = dragHandler(fx => emit({ ...hsvaRef.current, a: +fx.toFixed(3) }));

  function arrowDelta(e: React.KeyboardEvent): [number, number] | null {
    const big = e.shiftKey ? 10 : 1;
    switch (e.key) {
      case "ArrowLeft":  return [-big, 0];
      case "ArrowRight": return [big, 0];
      case "ArrowUp":    return [0, big];
      case "ArrowDown":  return [0, -big];
      case "PageUp":     return [0, 10];
      case "PageDown":   return [0, -10];
      default: return null;
    }
  }
  function onAreaKey(e: React.KeyboardEvent) {
    const d = arrowDelta(e);
    if (!d) return;
    e.preventDefault(); e.stopPropagation();
    emit({ ...hsva, s: clamp01(hsva.s + d[0] / 100), v: clamp01(hsva.v + d[1] / 100) });
  }
  function onHueKey(e: React.KeyboardEvent) {
    const d = arrowDelta(e);
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault(); e.stopPropagation();
      emit({ ...hsva, h: e.key === "Home" ? 0 : 359 });
      return;
    }
    if (!d) return;
    e.preventDefault(); e.stopPropagation();
    const step = d[0] || d[1];
    emit({ ...hsva, h: (hsva.h + step + 360) % 360 });
  }
  function onAlphaKey(e: React.KeyboardEvent) {
    const d = arrowDelta(e);
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault(); e.stopPropagation();
      emit({ ...hsva, a: e.key === "Home" ? 0 : 1 });
      return;
    }
    if (!d) return;
    e.preventDefault(); e.stopPropagation();
    emit({ ...hsva, a: +clamp01(hsva.a + (d[0] || d[1]) / 100).toFixed(2) });
  }

  // ── Text fields ─────────────────────────────────────────────────────────
  const rgb = hsvToRgb(hsva);
  const hex = rgbToHex(rgb);
  const alphaPct = Math.round(hsva.a * 100);

  // Iteration 0: commit decisions are pure (colorModel.ts, tested).
  function commitHex() {
    if (hexDraft === null) return;
    const next = resolveHexCommit(hexDraft, hexInitial.current, hsva);
    setHexDraft(null);
    if (next) emit(next);
  }
  function commitAlpha() {
    if (alphaDraft === null) return;
    const next = resolveAlphaCommit(alphaDraft, alphaInitial.current, hsva);
    setAlphaDraft(null);
    if (next) emit(next);
  }
  // Esc in a field: first Esc reverts an edited draft (focus stays, and the
  // field shows the committed value again, re-armed as "unchanged"); Esc
  // with nothing edited closes the picker and returns focus to the well.
  function fieldKeys(commit: () => void, draft: string | null, initial: React.MutableRefObject<string | null>, setDraft: (v: string | null) => void) {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      else if (e.key === "Escape") {
        e.preventDefault(); e.stopPropagation();
        if (resolveFieldEscape(draft, initial.current) === "revert") {
          setDraft(initial.current);
          const el = e.currentTarget;
          requestAnimationFrame(() => el.select());
        } else {
          setDraft(null);
          closeAndRefocus();
        }
      }
    };
  }

  const pureHue = `hsl(${hsva.h}, 100%, 50%)`;
  const opaque = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  const handle: React.CSSProperties = {
    position: "absolute", width: 14, height: 14, borderRadius: "50%",
    border: `2px solid ${T.ui.picker.handleBorder}`, boxShadow: T.ui.shadow.handle,
    transform: "translate(-50%, -50%)", pointerEvents: "none", boxSizing: "border-box",
  };
  const bar: React.CSSProperties = { position: "relative", height: 12, borderRadius: 6 };
  const fieldStyle: React.CSSProperties = {
    ...T.type.value, height: 28, padding: "0 8px", boxSizing: "border-box", width: "100%",
  };

  return createPortal(
    <div
      ref={rootRef}
      {...{ [EDITOR_ATTR]: "" }}
      className="mn-popover"
      role="dialog"
      aria-label={label ? `Color: ${label}` : "Selector de color"}
      onMouseDown={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeAndRefocus(); return; }
        // Review round (A11Y-3): Tab past the last field / Shift+Tab before
        // the first closes the popover and returns to the well — focus is
        // never left behind an open popover.
        if (e.key === "Tab" && rootRef.current) {
          const items = Array.from(rootRef.current.querySelectorAll<HTMLElement>('[tabindex="0"], input'));
          const first = items[0], last = items[items.length - 1];
          const active = document.activeElement;
          if ((e.shiftKey && active === first) || (!e.shiftKey && active === last)) {
            e.preventDefault(); e.stopPropagation(); closeAndRefocus();
          }
        }
      }}
      onBlur={e => {
        const next = e.relatedTarget as Node | null;
        if (next && !rootRef.current?.contains(next) && !anchor?.contains(next)) onClose();
      }}
      style={{
        position: "fixed", left: pos?.left ?? -9999, top: pos?.top ?? -9999,
        width: WIDTH, padding: 12, boxSizing: "border-box", zIndex: T.z.popover,
        display: "flex", flexDirection: "column", gap: 10, fontFamily: T.font.sans,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      <div
        ref={areaRef}
        className="mn-picker__area"
        tabIndex={0}
        role="slider"
        aria-label="Saturación y brillo"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hsva.s * 100)}
        aria-valuetext={`Saturación ${Math.round(hsva.s * 100)}%, brillo ${Math.round(hsva.v * 100)}%`}
        onPointerDown={onAreaDown}
        onKeyDown={onAreaKey}
        style={{
          position: "relative", height: 148, borderRadius: 8,
          background: svAreaCss(pureHue),
          // Hairline + focus ring live in editor.css (.mn-picker__area) —
          // inline box-shadow would hide the :focus-visible ring.
        }}
      >
        <span className="mn-picker__handle" style={{ ...handle, left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%`, background: opaque }} />
      </div>

      <div
        className="mn-picker__bar"
        tabIndex={0}
        role="slider"
        aria-label="Tono"
        aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(hsva.h)}
        aria-valuetext={`${Math.round(hsva.h)} grados`}
        onPointerDown={onHueDown}
        onKeyDown={onHueKey}
        style={{ ...bar, background: HUE_SPECTRUM_CSS }}
      >
        <span className="mn-picker__handle" style={{ ...handle, left: `${(hsva.h / 360) * 100}%`, top: "50%", background: pureHue }} />
      </div>

      {alpha && (
        <div
          className="mn-picker__bar"
          tabIndex={0}
          role="slider"
          aria-label="Opacidad"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={alphaPct}
          aria-valuetext={`${alphaPct}%`}
          onPointerDown={onAlphaDown}
          onKeyDown={onAlphaKey}
          style={{ ...bar, background: `linear-gradient(to right, rgba(${rgb.r},${rgb.g},${rgb.b},0), ${opaque}), ${CHECKER}` }}
        >
          <span className="mn-picker__handle" style={{ ...handle, left: `${hsva.a * 100}%`, top: "50%", background: `rgba(${rgb.r},${rgb.g},${rgb.b},${hsva.a})` }} />
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ ...T.type.section, color: T.ui.text.section }}>Hex</span>
          <input
            className="mn-input"
            spellCheck={false}
            value={hexDraft ?? hex.toUpperCase()}
            aria-label="Hex"
            onFocus={e => { hexInitial.current = hex.toUpperCase(); setHexDraft(hex.toUpperCase()); e.currentTarget.select(); }}
            onChange={e => setHexDraft(e.target.value)}
            onBlur={commitHex}
            onMouseDown={e => e.stopPropagation()}
            onKeyDown={fieldKeys(commitHex, hexDraft, hexInitial, setHexDraft)}
            style={fieldStyle}
          />
        </label>
        {alpha && (
          <label style={{ width: 64, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ ...T.type.section, color: T.ui.text.section }}>Alfa</span>
            <input
              className="mn-input"
              inputMode="numeric"
              value={alphaDraft ?? `${alphaPct}%`}
              aria-label="Alfa, porcentaje"
              onFocus={e => { alphaInitial.current = String(alphaPct); setAlphaDraft(String(alphaPct)); e.currentTarget.select(); }}
              onChange={e => setAlphaDraft(e.target.value)}
              onBlur={commitAlpha}
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={fieldKeys(commitAlpha, alphaDraft, alphaInitial, setAlphaDraft)}
              style={{ ...fieldStyle, textAlign: "right" }}
            />
          </label>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Display helpers for the well (kept here so ColorSwatch stays thin). */
export function wellHex(value: string | undefined): string {
  const c = parseColor(value);
  return c ? rgbToHex(c).toUpperCase() : "—";
}
export function wellAlpha(value: string | undefined): number {
  return parseColor(value)?.a ?? 1;
}
