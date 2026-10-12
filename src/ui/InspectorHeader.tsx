"use client";
import React from "react";
import { T, uv } from "./tokens";
import { IconButton } from "./IconButton";

interface InspectorHeaderProps {
  /** Route in mono ("sala", "tarjeta / nombre"). */
  path?:     string;
  /** The object's name — the inspector's visible h2 (focus target). */
  title:     string;
  titleId:   string;
  titleRef?: React.Ref<HTMLHeadingElement>;
  /** Serif aside next to the title ("de la tarjeta", "nada seleccionado"). */
  aside?:    string;
  /** Mono meta line (measures, "5 objetos"). */
  meta?:     string;
  onClose:   () => void;
  /** Bottom sheet: 44px close target, compact layout (design screen 10). */
  sheet?:    boolean;
  /** Editor v3 Phase F: what stays put under the title while the body
   * scrolls (the card's object chips). */
  children?: React.ReactNode;
}

/** Editor v3 Phase D: the inspector header of the design (screen 01) — route
 * in mono, title in the display face, aside in serif, a meta line and
 * Cerrar. Shared by every inspector the dock hosts (Tu sala, the card).
 * Phase F: in the bottom sheet the title, aside and Cerrar share one row and
 * the route / meta lines are left out (design screen 10); `children` (the
 * object chips) sit under it in both layouts. */
export function InspectorHeader({ path, title, titleId, titleRef, aside, meta, onClose, sheet, children }: InspectorHeaderProps) {
  const close = (
    <IconButton icon="close" aria-label="Cerrar inspector" title="Cerrar · Esc" size={sheet ? 44 : 28}
      className="mn-iconbtn--filled" style={{ borderRadius: "50%", flexShrink: 0 }} onClick={() => onClose()} />
  );
  const titleBlock = (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", minWidth: 0, flex: sheet ? 1 : undefined }}>
      <h2 ref={titleRef} id={titleId} tabIndex={-1} className="mn-inspector__title" style={{
        margin: 0, fontFamily: T.uiFont.display, fontSize: sheet ? 28 : 34, lineHeight: 0.98, fontWeight: 800,
        letterSpacing: "-0.045em", color: uv("text-primary"),
        maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {title}
      </h2>
      {aside && (
        <span style={{ fontFamily: T.uiFont.serif, fontStyle: "italic", fontSize: sheet ? 16 : 19, lineHeight: 1, color: uv("text-secondary") }}>
          {aside}
        </span>
      )}
    </div>
  );
  return (
    <div className="mn-inspector__header" style={{
      display: "flex", flexDirection: "column", gap: sheet ? T.space[2] : 12,
      padding: sheet ? `${T.space[2]}px ${T.ui.size.panelPad}px ${T.space[2]}px` : "18px 20px 14px",
      boxShadow: `inset 0 -1px 0 ${uv("line-group")}`,
      flexShrink: 0, minWidth: 0,
    }}>
      {sheet ? (
        <div style={{ display: "flex", alignItems: "center", gap: T.space[2], minWidth: 0 }}>
          {titleBlock}
          {close}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: T.space[2], minHeight: 28 }}>
            <span className="mn-inspector__path" style={{
              fontFamily: T.uiFont.mono, fontSize: 11, lineHeight: "14px", fontWeight: 500, letterSpacing: "0.06em",
              color: uv("text-tertiary"), marginRight: "auto", minWidth: 0,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {path}
            </span>
            {close}
          </div>
          {titleBlock}
          {meta && (
            <span style={{ fontFamily: T.uiFont.mono, fontSize: 11, lineHeight: "14px", fontWeight: 500, color: uv("text-tertiary"), wordSpacing: 2 }}>
              {meta}
            </span>
          )}
        </>
      )}
      {children}
    </div>
  );
}
