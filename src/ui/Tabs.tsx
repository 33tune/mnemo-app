"use client";
import React, { useId, useRef } from "react";
import { T, uv } from "./tokens";
import { useFieldLabelId } from "./MenuRow";

interface Tab { id: string; label: string; }

interface TabsProps {
  tabs:     Tab[];
  active:   string;
  onChange: (id: string) => void;
  variant?: "pill" | "underline";
  /** Accessible name for the tablist / radiogroup. */
  label?:   string;
}

// Block 2: keyboard-operable tabs.
// - "underline" = real navigation tabs: role=tablist/tab, aria-selected,
//   roving tabindex, ArrowLeft/Right/Home/End move AND select (automatic
//   activation — panels are cheap to switch).
// - "pill" = a Segmented control (track L2 32px, sliding thumb 240ms). It
//   picks a value rather than switching panels (e.g. text alignment), so it
//   is exposed as role=radiogroup/radio with the same arrow-key behavior.
// Same props as before.
export function Tabs({ tabs, active, onChange, variant = "pill", label }: TabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const activeIndex = Math.max(0, tabs.findIndex(t => t.id === active));
  // A11Y-4: unnamed tablists/radiogroups fall back to the row label.
  const labelledBy = useFieldLabelId();
  const nameProps = label ? { "aria-label": label } : { "aria-labelledby": labelledBy };

  function onKeyDown(e: React.KeyboardEvent) {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (activeIndex + 1) % tabs.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (activeIndex - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    e.stopPropagation();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  if (variant === "underline") {
    return (
      <div role="tablist" {...nameProps} onKeyDown={onKeyDown}
        style={{ display: "flex", gap: 2, boxShadow: `inset 0 -1px 0 ${uv("line-group")}`, marginBottom: T.space[4] }}>
        {tabs.map((t, i) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              ref={el => { refs.current[i] = el; }}
              type="button"
              role="tab"
              id={`${baseId}-${t.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className="mn-tab"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onChange(t.id); }}
              style={{
                flex:         1,
                height:       36,
                padding:      "0 4px",
                background:   "transparent",
                border:       "none",
                borderRadius: `${T.ui.radius.segment}px ${T.ui.radius.segment}px 0 0`,
                // Selected underline + focus ring: editor.css (.mn-tab) — an inline
                // box-shadow here would swallow the :focus-visible ring.
                cursor:       "pointer",
                ...T.type.tab,
                userSelect:   "none",
              }}
            >{t.label}</button>
          );
        })}
      </div>
    );
  }

  const n = Math.max(1, tabs.length);
  return (
    <div role="radiogroup" {...nameProps} onKeyDown={onKeyDown}
      style={{
        // v3 segmented: `field` track radius 10, `seg` thumb radius 8.
        position: "relative", display: "flex", height: 34, padding: 2, boxSizing: "border-box",
        background: uv("surface-group"), borderRadius: T.ui.radius.segTrack,
      }}>
      <div
        aria-hidden
        className="mn-seg__thumb"
        style={{
          position: "absolute", top: 2, bottom: 2, left: 2,
          width: `calc((100% - 4px) / ${n})`,
          transform: `translateX(${activeIndex * 100}%)`,
          background: uv("surface-thumb"),
          borderRadius: T.ui.radius.segThumb,
          boxShadow: uv("shadow-thumb"),
          pointerEvents: "none",
        }}
      />
      {tabs.map((t, i) => {
        const selected = active === t.id;
        return (
          <button
            key={t.id}
            ref={el => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className="mn-seg__btn"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onChange(t.id); }}
            style={{
              position:     "relative",
              flex:         1,
              background:   "transparent",
              border:       "none",
              borderRadius: T.ui.radius.segThumb,
              cursor:       "pointer",
              ...T.type.tab, fontWeight: selected ? 650 : 500,
              userSelect:   "none",
            }}
          >{t.label}</button>
        );
      })}
    </div>
  );
}
