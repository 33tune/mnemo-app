"use client";
import React from "react";
import { T, uv } from "./tokens";
import { IconButton } from "./IconButton";
import { Icon, type IconName } from "./icons";

interface InspectorHeaderProps {
  /** Route in mono ("tarjeta / nombre", "sala · nada seleccionado"). */
  path?:     string;
  /** The object's name — the inspector's visible h2 (focus target). */
  title:     string;
  titleId:   string;
  titleRef?: React.Ref<HTMLHeadingElement>;
  /** Liquid glass: the object's glyph in the 36px well left of the title. */
  icon?:     IconName;
  /** Kept for the callers; the DS header carries the route only (the
   * measures moved to each object's "Medidas"). */
  aside?:    string;
  meta?:     string;
  onClose:   () => void;
  /** Liquid glass L6: "Buscar ajuste   /" (absent = no search button). */
  onSearch?: () => void;
  /** Bottom sheet: 44px targets. */
  sheet?:    boolean;
  /** What stays put under the title while the body scrolls (the part
   * picker of the card, tabs). */
  children?: React.ReactNode;
}

/** Liquid glass (DS dock header, L2): the object's icon in a 36px well, the
 * title (Geist 19/650) with the route in mono under it, then Buscar and
 * Cerrar as filled round 36px buttons; the part picker / tabs below. */
export function InspectorHeader({ path, title, titleId, titleRef, icon, onClose, onSearch, sheet, children }: InspectorHeaderProps) {
  const btn = sheet ? 44 : 36;
  return (
    <div className="mn-inspector__header" style={{
      display: "flex", flexDirection: "column", gap: 14,
      padding: sheet ? `${T.space[2]}px ${T.ui.size.panelPad}px ${T.space[3]}px` : "16px 14px 12px 18px",
      flexShrink: 0, minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {icon && (
          <span key={icon} className="mn-inspector__icon" aria-hidden="true">
            <Icon name={icon} size={17} />
          </span>
        )}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
          <h2 key={title} ref={titleRef} id={titleId} tabIndex={-1} className="mn-inspector__title" style={{
            margin: 0, fontFamily: T.type.title.fontFamily, fontSize: T.type.title.fontSize, fontWeight: T.type.title.fontWeight,
            lineHeight: 1.15, letterSpacing: "-0.02em", color: uv("text-primary"),
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {title}
          </h2>
          {path && (
            <span className="mn-inspector__path" style={{
              fontFamily: T.uiFont.mono, fontSize: 11.5, lineHeight: "16px", fontWeight: 500, color: uv("text-tertiary"),
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {path}
            </span>
          )}
        </div>
        {onSearch && (
          <IconButton icon="search" aria-label="Buscar ajuste" title="Buscar ajuste   /" size={btn} iconSize={16}
            className="mn-iconbtn--filled" onClick={() => onSearch()} />
        )}
        <IconButton icon="close" aria-label="Cerrar inspector" title="Cerrar   esc" size={btn} iconSize={14}
          className="mn-iconbtn--filled" onClick={() => onClose()} />
      </div>
      {children}
    </div>
  );
}
