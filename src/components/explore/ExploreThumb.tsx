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

export interface ExploreItem { userId: string; handle: string; name: string; isNew: boolean; favorite: boolean; thumb: string }

/** Picture size (explore thumbnail, 4:5). */
export const EXPLORE_THUMB_W = 480;
export const EXPLORE_THUMB_H = 600;

export default function ExploreThumb({ item, onFavorite, canFavorite }: {
  item: ExploreItem; onFavorite: (item: ExploreItem) => void; canFavorite: boolean;
}) {
  return (
    <a href={`/${item.handle}`} data-explore-card="" aria-label={`${item.name} (@${item.handle})`}
      style={{ position: "relative", display: "block", aspectRatio: "4 / 5", borderRadius: 18, overflow: "hidden", textDecoration: "none", color: "#fff",
        background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.09)",
        // Off-screen cells are skipped by the browser (paint and decoded picture).
        contentVisibility: "auto", containIntrinsicSize: "auto 220px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.thumb} alt="" loading="lazy" decoding="async" draggable={false} width={EXPLORE_THUMB_W} height={EXPLORE_THUMB_H}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <span data-no-i18n="" style={{ position: "absolute", left: 8, bottom: 8, maxWidth: "calc(100% - 52px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        font: "700 12px var(--font-sans, system-ui), sans-serif", background: "rgba(0,0,0,.6)", padding: "4px 9px", borderRadius: 99 }}>
        @{item.handle}
      </span>
      {item.isNew && (
        <span style={{ position: "absolute", right: 8, top: 8, font: "700 11px var(--font-sans, system-ui), sans-serif", background: "rgba(0,0,0,.6)", padding: "3px 8px", borderRadius: 99 }}>Nueva</span>
      )}
      {canFavorite && (
        <button type="button" aria-label={item.favorite ? `Sacar a @${item.handle} de favoritos` : `Agregar a @${item.handle} a favoritos`} aria-pressed={item.favorite}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onFavorite(item); }}
          style={{ position: "absolute", right: 8, bottom: 8, width: 32, height: 32, borderRadius: 16, border: "none", display: "grid", placeItems: "center",
            background: "rgba(0,0,0,.6)", color: item.favorite ? "#FF4F94" : "#fff", cursor: "pointer", padding: 0 }}>
          <HeartIcon size={15} filled={item.favorite} />
        </button>
      )}
    </a>
  );
}
