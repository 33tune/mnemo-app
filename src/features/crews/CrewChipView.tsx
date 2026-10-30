"use client";
/**
 * The crew chip inside the card (Crews, 2026-10-30): the crew's emblem, name
 * and the owner's number, in the crew's color and font. ProfileCard places it
 * (a block of the layout engine, crewChip.ts gives its size).
 * On the public card it is checked against the crew (the owner must still be
 * a member — a card can't claim a crew it isn't in) and shows the crew's
 * current look; a tap opens the crew's house over the profile.
 */
import { useEffect, useState } from "react";
import type { CrewChip } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { CREW_CHIP_NUMBER_FONT, crewChipMetrics, crewFontStyle, crewNumberText, isTagChip } from "@/lib/crewChip";
import { googleFontsHref } from "./crewLook";
import { inkOn } from "./crewTypes";
import { CrewHouseOverlay } from "./CrewHouseOverlay";

type Live = CrewChip | null;
const liveCache = new Map<string, Promise<Live>>();

/** The crew's current look + the owner's number, or null when they aren't in it. */
function liveChip(chip: CrewChip, userId: string): Promise<Live> {
  const key = `${chip.id}:${userId}`;
  let p = liveCache.get(key);
  if (!p) {
    const sb = createClient();
    p = Promise.all([
      sb.from("crews").select("slug, name, font, color, emblem_url, tag").eq("id", chip.id).maybeSingle(),
      sb.from("crew_members").select("number").eq("crew_id", chip.id).eq("user_id", userId).maybeSingle(),
    ]).then(([c, m]) => {
      if (c.error || m.error) return { ...chip }; // can't tell: show what the card saved
      if (!c.data || !m.data) return null;
      return { ...chip, slug: c.data.slug, name: c.data.name, font: c.data.font, color: c.data.color,
        emblem: c.data.emblem_url ?? undefined, number: m.data.number, tag: (c.data.tag as string | null) ?? chip.tag };
    }).catch(() => ({ ...chip }));
    liveCache.set(key, p);
  }
  return p;
}

export function CrewChipView({ chip, userId, verify, onGone }: {
  chip: CrewChip;
  userId?: string;
  /** Public card: check membership, live look, tap → the house. */
  verify: boolean;
  /** The crew is gone or the owner left it: the card drops the block. */
  onGone?: () => void;
}) {
  const [live, setLive] = useState<Live | undefined>(verify ? undefined : chip);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!verify) { setLive(chip); return; }
    if (!userId) { setLive(null); return; }
    let on = true;
    liveChip(chip, userId).then(v => { if (!on) return; setLive(v); if (v === null) onGone?.(); });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verify, chip, userId]);

  if (!live) return null;
  // Sizes always from the saved chip (what the engine placed); look from live.
  const m = crewChipMetrics({ ...live, name: chip.name, number: chip.number, size: chip.size, emblem: live.emblem ?? chip.emblem });
  const ink = inkOn(live.color);
  const fonts = googleFontsHref([live.font]);
  const tagMode = isTagChip({ style: chip.style, tag: live.tag ?? chip.tag });
  const body = tagMode ? (
    <>
      {fonts && <link rel="stylesheet" href={fonts} precedence="default" />}
      <span style={{ width: "100%", textAlign: "center", fontFamily: crewFontStyle(live.font), fontWeight: 800, fontSize: m.nameSize, lineHeight: 1 }}>{live.tag ?? chip.tag}</span>
    </>
  ) : (
    <>
      {fonts && <link rel="stylesheet" href={fonts} precedence="default" />}
      {live.emblem && (
        <img src={live.emblem} alt="" draggable={false} style={{ width: m.emblem, height: m.emblem, objectFit: "contain", borderRadius: 999, pointerEvents: "none", flex: "none" }} />
      )}
      <span style={{ minWidth: 0, fontFamily: crewFontStyle(live.font), fontWeight: 800, fontSize: m.nameSize, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{live.name}</span>
      <span style={{ fontFamily: CREW_CHIP_NUMBER_FONT, fontWeight: 700, fontSize: m.numberSize, opacity: 0.75, flex: "none" }}>{crewNumberText(live.number)}</span>
    </>
  );
  const style: React.CSSProperties = {
    width: "100%", height: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: m.gap,
    padding: `0 ${m.padR}px 0 ${m.padL}px`, borderRadius: tagMode ? Math.round(m.h * 0.28) : 999, background: live.color, color: ink, whiteSpace: "nowrap", overflow: "hidden",
    boxShadow: `0 1px 2px rgba(0,0,0,.25), 0 6px 18px -6px ${live.color}`, userSelect: "none", border: "none", font: "inherit",
  };
  if (!verify) return <div style={style}>{body}</div>;
  return (
    <>
      <button type="button" aria-label={`Crew ${live.name}${tagMode ? ` (${live.tag ?? chip.tag})` : ""}, miembro ${crewNumberText(live.number)}. Abrir la sala`} onClick={e => { e.stopPropagation(); setOpen(true); }}
        style={{ ...style, cursor: "pointer" }}>{body}</button>
      {open && <CrewHouseOverlay slug={live.slug} inEditor={false} onClose={() => setOpen(false)} />}
    </>
  );
}
