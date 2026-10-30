"use client";
/**
 * Contenido › Crew (Crews, 2026-10-30): show one of your crews on the card,
 * which one, and its size. The chip is a block of the card's layout engine
 * (crewChip.ts): dragged on the card like the buttons. It keeps a snapshot of
 * the crew's look and your number; opening this part refreshes it.
 */
import { useEffect, useState } from "react";
import type { CrewChip, ProfileCardData } from "@/types";
import { MenuSection, SliderRow, MenuNote, SwitchRow, ActionButton, Icon, T } from "@/ui";
import { CREW_CHIP_SIZE_MAX, CREW_CHIP_SIZE_MIN, crewFontStyle, crewNumberText } from "@/lib/crewChip";
import { crewApi } from "@/features/crews/crewApi";
import { inkOn, type MyCrew } from "@/features/crews/crewTypes";
import { RAIL_CREWS_BUTTON_ID } from "./EditorHost";

type CrewPatch = Partial<Pick<ProfileCardData, "crew" | "crewAnchorX" | "crewAnchorY">>;

/** The card's chip for one of your crews (keeps the size it already had). */
export function chipOf(m: MyCrew, size?: number): CrewChip {
  return {
    id: m.crew.id, slug: m.crew.slug, name: m.crew.name, font: m.crew.font, color: m.crew.color,
    ...(m.crew.emblem_url ? { emblem: m.crew.emblem_url } : {}), number: m.number, ...(size != null ? { size } : {}),
  };
}

const sameChip = (a: CrewChip, b: CrewChip) =>
  a.id === b.id && a.slug === b.slug && a.name === b.name && a.font === b.font && a.color === b.color && (a.emblem ?? "") === (b.emblem ?? "") && a.number === b.number;

export default function ProfileCrewMenu({ card, onChange }: { card: ProfileCardData; onChange: (patch: CrewPatch) => void }) {
  const [crews, setCrews] = useState<MyCrew[] | null>(null);
  useEffect(() => {
    if (!card.userId) { setCrews([]); return; }
    crewApi.mine(card.userId).then(setCrews).catch(() => setCrews([]));
  }, [card.userId]);

  const chip = card.crew;
  const current = chip ? crews?.find(m => m.crew.id === chip.id) : undefined;

  // The crew changed (name, color, emblem…): the card follows.
  useEffect(() => {
    if (!chip || !current) return;
    const fresh = chipOf(current, chip.size);
    if (!sameChip(chip, fresh)) onChange({ crew: fresh });
  }, [chip, current, onChange]);

  const show = (m: MyCrew) => onChange({ crew: chipOf(m, chip?.size) });
  const hide = () => onChange({ crew: undefined, crewAnchorX: undefined, crewAnchorY: undefined });
  const openCrews = () => document.getElementById(RAIL_CREWS_BUTTON_ID)?.click();

  if (crews === null) return <MenuNote>Cargando…</MenuNote>;
  if (crews.length === 0 && !chip) {
    return (
      <MenuSection label="Crew" pinned>
        <MenuNote>Todavía no estás en ningún crew. Creá uno o unite con un link desde Crews.</MenuNote>
        <ActionButton variant="secondary" fullWidth onClick={openCrews}><Icon name="crew" size={15} />Abrir Crews</ActionButton>
      </MenuSection>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <MenuSection label="Crew" pinned>
        <SwitchRow label="Mostrar en la card" icon="crew" value={!!chip}
          onChange={v => { if (v) { const first = crews[0]; if (first) show(first); } else hide(); }} />
        {chip && !current && (
          <>
            <MenuNote tone="warn">Ya no sos parte de {chip.name}: no se muestra en tu perfil.</MenuNote>
            <ActionButton variant="secondary" fullWidth onClick={hide}>Quitar de la card</ActionButton>
          </>
        )}
        {crews.length > 1 && chip && (
          <div role="radiogroup" aria-label="Crew que se muestra" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {crews.map(m => {
              const on = m.crew.id === chip.id;
              return (
                <button key={m.crew.id} type="button" role="radio" aria-checked={on} onClick={() => show(m)}
                  style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "6px 10px", border: "none", borderRadius: 14, cursor: "pointer", textAlign: "left",
                    background: on ? T.ui.surface.sel : T.ui.surface.control, color: on ? T.ui.text.sel : T.ui.text.primary, font: "inherit" }}>
                  {m.crew.emblem_url
                    ? <img src={m.crew.emblem_url} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                    : <span aria-hidden style={{ width: 28, height: 28, borderRadius: 999, background: m.crew.color, color: inkOn(m.crew.color), display: "grid", placeItems: "center", font: `800 12px ${T.uiFont.sans}` }}>{m.crew.name.trim().charAt(0).toUpperCase()}</span>}
                  <span style={{ flex: 1, minWidth: 0, fontFamily: crewFontStyle(m.crew.font), fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.crew.name}</span>
                  <span style={{ font: `600 12px ${T.uiFont.mono}`, opacity: 0.75 }}>{crewNumberText(m.number)}</span>
                </button>
              );
            })}
          </div>
        )}
      </MenuSection>
      {chip && (
        <MenuSection label="Tamaño" icon="maximize" summary={`${Math.round((chip.size ?? 1) * 100)}%`}>
          <SliderRow label="Tamaño" icon="maximize" min={CREW_CHIP_SIZE_MIN} max={CREW_CHIP_SIZE_MAX} step={0.05} value={chip.size ?? 1}
            defaultValue={1} fmt={v => `${Math.round(v * 100)}%`} onChange={v => onChange({ crew: { ...chip, size: v } })} />
          <MenuNote icon="move">Arrastralo sobre la tarjeta para moverlo. En tu perfil, tocarlo abre la sala del crew.</MenuNote>
        </MenuSection>
      )}
    </div>
  );
}
