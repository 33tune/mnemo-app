"use client";
/**
 * Comentarios (2026-11-17): the comments panel's own menu (the gear on the
 * panel). Minimal on purpose: allow comments, roundness, color, opacity
 * (glass below 100 %), text and accent colors. The switch applies at once
 * (profiles.comments_off); the look goes out with "Publicar".
 */
import React from "react";
import type { CommentsBoxStyle, ProfileCardData } from "@/types";
import { InspectorShell, SliderRow, ColorRow, SwitchRow, MenuSection } from "@/ui";
import { useComments } from "@/hooks/useComments";
import { useViewerId } from "@/lib/viewer";
import { COMMENTS_DEFAULTS, COMMENTS_OPACITY, COMMENTS_RADIUS, resolveCommentsBox } from "@/lib/comments";

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
  const me = useViewerId();
  const c = useComments(me ?? undefined, true);
  const raw = card.commentsBox;
  const st = resolveCommentsBox(raw);
  const setStyle = (patch: Partial<CommentsBoxStyle>) => {
    const next = { ...raw, ...patch };
    for (const k of Object.keys(next) as (keyof CommentsBoxStyle)[]) if (next[k] === undefined) delete next[k];
    onChange({ commentsBox: Object.keys(next).length ? next : undefined });
  };
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const px = (v: number) => `${Math.round(v)} px`;

  return (
    <InspectorShell id={p.id} title="Comentarios" icon="quote" path="panel de comentarios"
      onClose={p.onClose} returnFocusTo={p.returnFocusTo} top={p.top} width={p.width} mode={p.mode}
      height={p.height} collapsed={p.collapsed} onExpand={p.onExpand}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SwitchRow label="Permitir comentarios" icon="eye" value={!c.off} onChange={v => c.setOff(!v)} />
        <MenuSection label="Panel" icon="frame" pinned>
          <ColorRow label="Color" value={st.bg} onChange={v => setStyle({ bg: v })}
            state={raw?.bg ? "modified" : undefined} onReset={() => setStyle({ bg: undefined })} />
          <SliderRow label="Opacidad" icon="eye" min={COMMENTS_OPACITY.min} max={COMMENTS_OPACITY.max} step={0.01} value={st.opacity} fmt={pct}
            defaultValue={COMMENTS_DEFAULTS.opacity} onChange={v => setStyle({ opacity: v })} />
          <SliderRow label="Redondez" icon="corner" min={COMMENTS_RADIUS.min} max={COMMENTS_RADIUS.max} step={1} value={st.radius} fmt={px}
            defaultValue={COMMENTS_DEFAULTS.radius} onChange={v => setStyle({ radius: v })} />
          <ColorRow label="Texto" value={st.color} onChange={v => setStyle({ color: v })}
            state={raw?.color ? "modified" : undefined} onReset={() => setStyle({ color: undefined })} />
          <ColorRow label="Acento" value={st.accent} onChange={v => setStyle({ accent: v })}
            state={raw?.accent ? "modified" : undefined} onReset={() => setStyle({ accent: undefined })} />
        </MenuSection>
      </div>
    </InspectorShell>
  );
}
