"use client";
/**
 * Explorar v2 (2026-11-27): one community card in the grid = its PICTURE
 * (explore_cards.thumb: the card with its stickers and what touches it, over
 * its room's background, taken when its owner saved). A plain lazy <img>:
 * hundreds of them weigh what two live cards did (the live grid lagged on
 * computers and reloaded the page on iPhones). The whole cell opens the
 * profile, where the card is alive; the heart gives / removes a favorite.
 */
import React from "react";
import { HeartIcon } from "@/components/canvas/StatsRow";

export interface ExploreItem { userId: string; handle: string; name: string; isNew: boolean; favorite: boolean; thumb: string; live?: boolean }

/** Picture size (explore thumbnail, 4:5). */
export const EXPLORE_THUMB_W = 480;
export const EXPLORE_THUMB_H = 600;

export default function ExploreThumb({ item, onFavorite, canFavorite, onOpen }: {
  item: ExploreItem; onFavorite: (item: ExploreItem) => void; canFavorite: boolean; onOpen?: () => void;
}) {
  // Grafito (2026-11-28): the name on a frosted strip (with the heart), EN VIVO as a graphite tag with the lime gem.
  const tag: React.CSSProperties = { position: "absolute", left: 8, top: 8, display: "flex", alignItems: "center", gap: 5, height: 21, padding: "0 9px", borderRadius: 99,
    font: "700 10.5px var(--gf-font)", letterSpacing: ".05em", background: "rgba(20,22,26,.74)", color: "#C6F432", boxShadow: "inset 0 1px 0 rgba(255,255,255,.15)" };
  return (
    <a href={`/${item.handle}`} onClick={onOpen} data-explore-card="" aria-label={`${item.name} (@${item.handle})`}
      style={{ position: "relative", display: "block", aspectRatio: "4 / 5", borderRadius: 14, overflow: "hidden", textDecoration: "none", color: "#15171A",
        background: "#dfe2e5", boxShadow: "0 0 0 .5px rgba(0,0,0,.25), 0 8px 18px -8px rgba(0,0,0,.4)",
        // Off-screen cells are skipped by the browser (paint and decoded picture).
        contentVisibility: "auto", containIntrinsicSize: "auto 220px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.thumb} alt="" loading="lazy" decoding="async" draggable={false} width={EXPLORE_THUMB_W} height={EXPLORE_THUMB_H}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {item.live ? (
        <span style={tag}><span aria-hidden className="gf-gem" style={{ width: 7, height: 7 }} />EN VIVO</span>
      ) : item.isNew && (
        <span style={{ ...tag, color: "#fff" }}>Nueva</span>
      )}
      {/* No backdrop blur per cell (dozens on screen while scrolling): a near-opaque frost. */}
      <span style={{ position: "absolute", left: 8, right: 8, bottom: 8, height: 32, borderRadius: 9, background: "rgba(240,242,244,.88)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.95), 0 0 0 .5px rgba(0,0,0,.14), 0 2px 6px rgba(0,0,0,.18)", display: "flex", alignItems: "center", gap: 6, padding: "0 4px 0 10px" }}>
        <span data-no-i18n="" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", font: "600 12.5px var(--gf-font)" }}>@{item.handle}</span>
        {canFavorite && (
          <button type="button" aria-label={item.favorite ? `Sacar a @${item.handle} de favoritos` : `Agregar a @${item.handle} a favoritos`} aria-pressed={item.favorite}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onFavorite(item); }}
            style={{ flex: "none", width: 26, height: 26, borderRadius: 13, border: "none", display: "grid", placeItems: "center",
              background: "transparent", color: item.favorite ? "#FF3D8B" : "rgba(21,23,26,.5)", cursor: "pointer", padding: 0 }}>
            <HeartIcon size={15} filled={item.favorite} />
          </button>
        )}
      </span>
    </a>
  );
}
