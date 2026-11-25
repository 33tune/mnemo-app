"use client";
/**
 * Muro (2026-11-25; was the comments panel's menu): the wall's own menu (the
 * gear on the back of the card). Show the wall or not, who can write (applies
 * at once: profiles.comments_off) and its look — unset fields follow the card
 * (its background, corners and text color). The look goes out with the card.
 */
import React from "react";
import type { CommentsBoxStyle, ProfileCardData } from "@/types";
import { InspectorShell, SliderRow, ColorRow, SwitchRow, MenuSection, ChoiceTiles } from "@/ui";
import { useWallSettings } from "@/hooks/useWall";
import { COMMENTS_OPACITY, COMMENTS_RADIUS } from "@/lib/comments";
import { resolveWallLook } from "@/lib/wall";

export interface CommentsInspectorProps {
  card: ProfileCardData;
  onChange: (p: Partial<Pick<ProfileCardData, "commentsBox">>) => void;
  id?: string;
  onClose: () => void;
  returnFocusTo: () => HTMLElement | null;
  top: number;
  width: number;
  mode: "dock" | "sheet";
  height?: number;
  collapsed: boolean;
  onExpand: () => void;
}

export default function CommentsInspector(p: CommentsInspectorProps) {
  const { card, onChange } = p;
  const w = useWallSettings();
  const raw = card.commentsBox;
  const look = resolveWallLook(card);
  const setStyle = (patch: Partial<CommentsBoxStyle>) => {
    const next = { ...raw, ...patch };
    for (const k of Object.keys(next) as (keyof CommentsBoxStyle)[]) if (next[k] === undefined) delete next[k];
    onChange({ commentsBox: Object.keys(next).length ? next : undefined });
  };
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const px = (v: number) => `${Math.round(v)} px`;
  const shown = !raw?.hidden;

  return (
    <InspectorShell id={p.id} title="Muro" icon="quote" path="dorso de la card"
      onClose={p.onClose} returnFocusTo={p.returnFocusTo} top={p.top} width={p.width} mode={p.mode}
      height={p.height} collapsed={p.collapsed} onExpand={p.onExpand}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SwitchRow label="Mostrar el muro" icon="eye" value={shown} onChange={v => setStyle({ hidden: v ? undefined : true })} />
        {shown && (
          <>
            <MenuSection label="Quién escribe" icon="quote" pinned>
              <ChoiceTiles label="Quién escribe" columns={2} value={w.off ? "me" : "all"}
                onChange={id => w.setOff(id === "me")}
                options={[
                  { id: "all", label: "Todos", draw: PEOPLE },
                  { id: "me", label: "Solo yo", draw: PERSON },
                ]} />
            </MenuSection>
            <MenuSection label="Aspecto" icon="frame" pinned>
              <ColorRow label="Fondo" value={look.bg} onChange={v => setStyle({ bg: v })}
                state={raw?.bg ? "modified" : undefined} onReset={() => setStyle({ bg: undefined })} />
              <SliderRow label="Opacidad" icon="eye" min={COMMENTS_OPACITY.min} max={COMMENTS_OPACITY.max} step={0.01} value={look.opacity} fmt={pct}
                defaultValue={0.94} onChange={v => setStyle({ opacity: v })} />
              <SliderRow label="Redondez" icon="corner" min={COMMENTS_RADIUS.min} max={COMMENTS_RADIUS.max} step={1} value={look.radius} fmt={px}
                onChange={v => setStyle({ radius: v })} />
              <ColorRow label="Texto" value={look.color} onChange={v => setStyle({ color: v })}
                state={raw?.color ? "modified" : undefined} onReset={() => setStyle({ color: undefined })} />
              <ColorRow label="Acento" value={look.accent} onChange={v => setStyle({ accent: v })}
                state={raw?.accent ? "modified" : undefined} onReset={() => setStyle({ accent: undefined })} />
            </MenuSection>
          </>
        )}
      </div>
    </InspectorShell>
  );
}

// 48×32 drawings (currentColor): several heads vs one.
const head = (cx: number, o = 1) => (
  <g fill="currentColor" opacity={o}><circle cx={cx} cy="12" r="4.2" /><path d={`M${cx - 7} 27a7 7 0 0 1 14 0z`} /></g>
);
const PEOPLE = <g>{head(14, 0.5)}{head(34, 0.5)}{head(24)}</g>;
const PERSON = <g>{head(24)}</g>;
