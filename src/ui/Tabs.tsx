"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { T, uv } from "./tokens";
import { useFieldLabelId } from "./MenuRow";
import { Icon, type IconName } from "./icons";

/** Phase F: a segment may show an icon instead of its text (the label
 * stays its accessible name and tooltip). */
interface Tab { id: string; label: string; icon?: IconName; /** Liquid glass: show the label next to the icon (DS IconTabs "Claro"). */ withText?: boolean }

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
  // Liquid glass (DS IconTabs): the thumb squashes a little while it glides.
  const prev = useRef(activeIndex);
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    if (prev.current === activeIndex) return;
    prev.current = activeIndex;
    setMoving(true);
    const t = setTimeout(() => setMoving(false), 220);
    return () => clearTimeout(t);
  }, [activeIndex]);
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
        // Liquid glass (DS IconTabs): a 44px well capsule, 36px buttons.
        position: "relative", display: "flex", height: 44, padding: 4, boxSizing: "border-box",
        background: uv("surface-group"), borderRadius: T.ui.radius.segTrack,
      }}>
      <div
        aria-hidden
        className="mn-seg__thumb"
        data-moving={moving || undefined}
        style={{
          position: "absolute", top: 4, bottom: 4, left: 4,
          width: `calc((100% - 8px) / ${n})`,
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
            aria-label={t.icon && !t.withText ? t.label : undefined}
            title={t.icon && !t.withText ? t.label : undefined}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onChange(t.id); }}
            style={{
              position:     "relative",
              flex:         1,
              background:   "transparent",
              border:       "none",
              borderRadius: T.ui.radius.segThumb,
              cursor:       "pointer",
              ...T.type.tab, fontWeight: selected ? 650 : 550,
              userSelect:   "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minWidth: 0,
            }}
          >{t.icon && <Icon name={t.icon} size={15} />}{(!t.icon || t.withText) && t.label}</button>
        );
      })}
    </div>
  );
}
