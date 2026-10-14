"use client";
import React, { useState } from "react";
import type { LinkButton } from "@/types";
import { detectPlatform, PlatformIcon } from "./SocialIcons";
import { getFontStyle } from "@/lib/fontList";
import { linkButtonCss, linkButtonHref, type ResolvedLinkButtonStyle } from "@/lib/linkButtons";
import { resolveClickAfterDrag } from "@/lib/dragClickGuard";

/**
 * Link buttons (Linktree-style, 2026-10-14) — the stacked buttons, drawn
 * from the resolved style (linkButtons.ts). Self-contained on purpose: it
 * knows nothing about ProfileCard's engine or the canvas, so the future
 * mobile renderer mounts it as is (MobilePublicCanvas is untouched today).
 *
 * Editor safety (CLAUDE.md rules): every <a> is draggable={false} (a native
 * HTML5 drag would hijack the block drag), and with `didDragRef` (editor
 * only) the click that ends a block drag never navigates
 * (resolveClickAfterDrag). `inert` (menu open) also blocks navigation.
 */
export function LinkButtonsBlock({ buttons, style, inert, didDragRef }: {
  buttons: readonly LinkButton[];
  style: ResolvedLinkButtonStyle;
  /** The inspector is open: the buttons do not navigate. */
  inert?: boolean;
  didDragRef?: React.RefObject<boolean>;
}) {
  const fontFamily = getFontStyle(style.font);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: style.gap, width: "100%", height: "100%" }}>
      {buttons.map(b => (
        <ButtonLink key={b.id} button={b} style={style} fontFamily={fontFamily} inert={inert} didDragRef={didDragRef} />
      ))}
    </div>
  );
}

function ButtonLink({ button, style, fontFamily, inert, didDragRef }: {
  button: LinkButton; style: ResolvedLinkButtonStyle; fontFamily: string; inert?: boolean; didDragRef?: React.RefObject<boolean>;
}) {
  const [hov, setHov] = useState(false);
  const platform = detectPlatform(button.url);
  const css = linkButtonCss(style, fontFamily, hov);
  const iconSize = Math.round(style.fontSize * 1.15);
  return (
    <a
      href={linkButtonHref(button.url)}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      onClick={e => {
        e.stopPropagation();
        const { suppress, nextDidDrag } = resolveClickAfterDrag(didDragRef?.current ?? false);
        if (didDragRef) didDragRef.current = nextDidDrag;
        if (inert || suppress) e.preventDefault();
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={css}
    >
      {style.showIcon && <PlatformIcon platform={platform} size={iconSize} color="currentColor" />}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{button.label || button.url}</span>
    </a>
  );
}
