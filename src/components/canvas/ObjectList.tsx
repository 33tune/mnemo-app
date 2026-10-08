"use client";
import React, { useRef } from "react";
import { T, uv } from "@/ui";
import {
  INSPECTOR_OBJECTS, OBJECT_GROUPS, chipAccessibleName, nextTabIndex, type ChipContext, type ChipData, type ObjectId,
} from "@/lib/inspectorObjects";
import { detectPlatform, PLATFORM_LABELS, PlatformIcon } from "./SocialIcons";

interface ObjectListProps {
  active:   ObjectId;
  onSelect: (id: ObjectId) => void;
  ctx:      ChipContext;
  /** id of the tabpanel the tabs control. */
  panelId:  string;
}

export const objectTabId = (id: ObjectId) => `mnemo-object-tab-${id}`;
const platformLabel = (url: string) => PLATFORM_LABELS[detectPlatform(url)];

// Menu redesign Phase 2: the inspector's primary entry — a visual map of the
// card. One chip per object (inspectorObjects.ts), showing the REAL content
// (the user's text, the photo, the link icons, the background swatch, how
// many effects are on). Because selecting a chip swaps the body below, it is
// an APG tablist (not a radiogroup): roving tabindex, arrows + Home/End move
// AND select (automatic activation), focus stays on the chip; the body is
// the tabpanel, labelled by the inspector's h2. Names = caption + visible
// content (WCAG 2.5.3), capped at ~60 characters. No live region: the
// selected tab is announced by itself.
export function ObjectList({ active, onSelect, ctx, panelId }: ObjectListProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(0, INSPECTOR_OBJECTS.findIndex(o => o.id === active));

  function onKeyDown(e: React.KeyboardEvent) {
    const next = nextTabIndex(e.key, activeIndex, INSPECTOR_OBJECTS.length);
    if (next < 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(INSPECTOR_OBJECTS[next].id);
    refs.current[next]?.focus();
  }

  // r2: three fixed clusters (the card's texts · its blocks · the card as a
  // whole) separated by space, not labels — a map of the card, not a tag
  // cloud. Cluster wrappers are role="none": the tabs stay owned by the
  // tablist and the arrow keys walk all of them in order.
  return (
    <div role="tablist" aria-label="Objetos de la card" aria-orientation="horizontal" onKeyDown={onKeyDown}
      className="mn-objlist">
      {OBJECT_GROUPS.map(group => (
        <div key={group} role="none" className="mn-objlist__group" data-group={group}>
          {INSPECTOR_OBJECTS.map((o, i) => {
            if (o.group !== group) return null;
            const selected = o.id === active;
            const data = o.chip(ctx);
            return (
              <button
                key={o.id}
                ref={el => { refs.current[i] = el; }}
                type="button"
                role="tab"
                id={objectTabId(o.id)}
                aria-selected={selected}
                aria-controls={panelId}
                aria-label={chipAccessibleName(o, data, platformLabel)}
                title={o.caption}
                tabIndex={selected ? 0 : -1}
                className="mn-objchip"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onSelect(o.id); }}
              >
                <ChipVisual data={data} />
                {data.text && <span className="mn-objchip__text" data-placeholder={data.placeholder ? "" : undefined}>{data.text}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** The user's background drawn over the editor's checker (transparent stays visible). */
function SwatchLayers({ swatch }: { swatch: NonNullable<ChipData["swatch"]> }) {
  const layers = [swatch.image ? `url("${swatch.image}")` : null, swatch.gradient ?? null].filter(Boolean).join(", ");
  return (
    <span className="mn-objchip__layers" aria-hidden="true"
      style={{ backgroundColor: swatch.color, backgroundImage: layers || undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
  );
}

function ChipVisual({ data }: { data: ChipData }) {
  if (data.thumb) {
    return <img className="mn-objchip__thumb" src={data.thumb} alt="" draggable={false} />;
  }
  if (data.links) {
    return (
      <span className="mn-objchip__icons" aria-hidden="true" style={{ color: uv("text-primary") }}>
        {data.links.urls.map((u, i) => <PlatformIcon key={i} platform={detectPlatform(u)} size={14} color="currentColor" />)}
        {data.links.more > 0 && <span className="mn-objchip__more">+{data.links.more}</span>}
      </span>
    );
  }
  if (data.emptyThumb) {
    return <span className="mn-objchip__thumb mn-objchip__thumb--empty" aria-hidden="true" />;
  }
  if (data.sampleColor) {
    return (
      <span className="mn-objchip__sample" aria-hidden="true">
        {data.swatch && <SwatchLayers swatch={data.swatch} />}
        <span className="mn-objchip__sample-text" style={{ color: data.sampleColor }}>Aa</span>
      </span>
    );
  }
  if (data.swatch) {
    return <span className="mn-objchip__swatch" aria-hidden="true"><SwatchLayers swatch={data.swatch} /></span>;
  }
  return null;
}
