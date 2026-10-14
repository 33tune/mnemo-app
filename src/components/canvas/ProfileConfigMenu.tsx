"use client";
import React from "react";
import type { ProfileCardData, CardEffects } from "@/types";
import { NumberField, MenuNote, Icon, SectionNumber, Accordion, GotoRow, type SectionNumberValue } from "@/ui";
import { getCardPadding, getFreeformCardBounds, clampFreeformCardSize, centerCardPosition } from "@/lib/cardGeometry";
import { getProfileCardEffects } from "@/lib/profileCardEffects";
import type { ObjectId } from "@/lib/inspectorObjects";
import ProfileIdentityMenu, { type IdentityPart } from "./ProfileIdentityMenu";
import ProfileMetadataMenu, { type MetadataPart } from "./ProfileMetadataMenu";
import ProfileContactLinksMenu from "./ProfileContactLinksMenu";
import ProfileLinkButtonsMenu from "./ProfileLinkButtonsMenu";
import ProfileLogoMenu from "./ProfileLogoMenu";
import { RoleTextSection, GlobalTextSection } from "./ProfileTypographyMenu";
import ProfileBackgroundMenu from "./ProfileBackgroundMenu";
import { CardCornersSection, CardEffectsSection } from "./ProfileEffectsMenu";

// Menu redesign Phase 2: the ProfileCard editor is routed by OBJECT, not by
// facet. The four facet tabs (Contenido/Fondo/Texto/Efectos) are gone as the
// entry point: the inspector's ObjectList picks an object and this file
// renders exactly that object's sections — the CURRENT controls, re-mounted
// (Phase 3 brings specimen plates/visual pickers, Phase 4 effect tiles; each
// swaps a Section here without touching the routing).
//
// OBJECT_SECTIONS mounts, per object, only components from the files that
// inspectorObjects.ts's OBJECT_FILES lists for it (inspectorObjects.test.ts
// checks this file's imports) — the capability matrix then proves every
// route against those files.

export interface SectionContext {
  card:      ProfileCardData;
  /** getProfileCardEffects(card) — what the card renders (display only). */
  effective: CardEffects;
  /** cardBaseColor(card) — the effective base text color. */
  baseColor: string;
  /** Stage 4.2-C.2.7: render-time verdict from ProfileCard's blockFits() —
   * only an explicit `false` warns. */
  linksFits?: boolean;
  /** Link buttons (2026-10-14): fit verdict + px short (ProfileCard). */
  buttonsFits?: boolean;
  buttonsOverflow?: number;
  buttonsGrowNext?: number;
  /** Iteration 0 (O1 "Medidas"): the canvas the card is centered in.
   * Absent (space_mobile) = no Medidas. */
  canvas?:   { w: number; h: number; topOffset: number };
  onChange:  (patch: Partial<ProfileCardData>) => void;
  /** r2: switch the inspector to another object (in-section links). */
  goTo?:     (id: ObjectId) => void;
}

export interface Section {
  key: string;
  /** Editor v3 Phase F: the number + tone of the section this entry renders
   * (design screen 02: 01 Contenido, 02 Tipografía, 03 Color…). Entries that
   * number their own several sections (role text, effects, Fondo) omit it;
   * "more" rows (links to other objects, Estilo del bloque) have none. */
  num?: SectionNumberValue;
  render: (c: SectionContext) => React.ReactNode;
}
const N1: SectionNumberValue = { num: "01", tone: 1 };

const identity = (only: IdentityPart): Section => ({
  key: `identity-${only}`,
  num: only === "name" || only === "handle" ? N1 : undefined,
  render: c => (
    <ProfileIdentityMenu only={only} card={c.card} cardW={c.card.w} cardH={c.card.h}
      pad={getCardPadding(c.card.variant)} baseColor={c.baseColor} onChange={c.onChange} />
  ),
});
const metadata = (only: MetadataPart): Section => ({
  key: `metadata-${only}`,
  num: N1,
  render: c => <ProfileMetadataMenu only={only} card={c.card} onChange={c.onChange} />,
});
const roleText = (role: Extract<ObjectId, "name" | "handle" | "descriptor" | "location" | "bio" | "views">): Section => ({
  key: `text-${role}`,
  render: c => <RoleTextSection role={role} card={c.card} baseColor={c.baseColor} onChange={c.onChange} />,
});
/** r2: a visible, keyboard-reachable path to the object that owns a
 * related control (e.g. text shadow lives in "Todos los textos"). Focus
 * moves to the new object's h2 (ProfileInspector's goTo). */
function ObjectLink({ c, to, label }: { c: SectionContext; to: ObjectId; label: string }) {
  if (!c.goTo) return null;
  return (
    <button type="button" className="mn-objlink" onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); c.goTo?.(to); }}>
      {label}<Icon name="chevron-right" size={12} />
    </button>
  );
}
const link = (to: ObjectId, label: string): Section => ({
  key: `link-${to}`,
  render: c => <ObjectLink c={c} to={to} label={label} />,
});
const TEXT_FX_LINK = "Sombra, brillo y contorno: en Todos los textos";

// Block 1 (read-effective / write-raw): effects menus display `effective`
// and build every patch on the raw `card.effects`.
const patchEffects = (c: SectionContext) => (effects: CardEffects) => c.onChange({ effects });

export const OBJECT_SECTIONS: Record<ObjectId, readonly Section[]> = {
  name: [
    identity("name"),
    roleText("name"),
    identity("identityBlock"),
  ],
  handle: [
    identity("handle"),
    roleText("handle"),
    identity("identityBlock"),
  ],
  descriptor: [
    metadata("descriptor"),
    roleText("descriptor"),
    identity("identityBlock"),
  ],
  location: [
    metadata("location"),
    roleText("location"),
    metadata("locationBlock"),
  ],
  bio: [
    metadata("bio"),
    roleText("bio"),
    identity("identityBlock"),
  ],
  views: [
    metadata("views"),
    roleText("views"),
    metadata("viewsBlock"),
  ],
  photo: [
    identity("photo"),
  ],
  links: [
    { key: "links", num: N1, render: c => <ProfileContactLinksMenu card={c.card} fitsInCard={c.linksFits} onChange={c.onChange} /> },
  ],
  buttons: [
    { key: "buttons", num: N1, render: c => <ProfileLinkButtonsMenu card={c.card} baseColor={c.baseColor} fits={c.buttonsFits}
      overflow={c.buttonsOverflow} growNext={c.buttonsGrowNext} canvas={c.canvas} onChange={c.onChange} /> },
  ],
  logo: [
    { key: "logo", num: N1, render: c => <ProfileLogoMenu logo={c.card.logo} onChange={c.onChange} /> },
  ],
  cardBg: [
    { key: "bg", render: c => <ProfileBackgroundMenu effective={c.effective} raw={c.card.effects} onChange={patchEffects(c)} /> },
    // Liquid glass: "Forma y medidas" = Esquinas + Medidas in one card.
    { key: "corners", render: c => (
      <CardCornersSection effective={c.effective} raw={c.card.effects} onChange={patchEffects(c)}
        summaryExtra={`${Math.round(c.card.w)} × ${Math.round(c.card.h)}`}>
        {c.canvas ? <ProfileMeasures card={c.card} canvas={c.canvas} onChange={c.onChange} /> : null}
        {c.goTo && <GotoRow label="Color y grosor del borde" hint="Efectos" onGo={() => c.goTo?.("cardFx")} />}
      </CardCornersSection>
    ) },
  ],
  cardFx: [
    { key: "effects", render: c => (
      <CardEffectsSection effective={c.effective} raw={c.card.effects} onChange={patchEffects(c)}
        borderFooter={c.goTo ? <GotoRow label="Esquinas" hint="Fondo" onGo={() => c.goTo?.("cardBg")} /> : null} />
    ) },
  ],
  allText: [
    { key: "global", render: c => <GlobalTextSection card={c.card} baseColor={c.baseColor} onChange={c.onChange} /> },
  ],
};

interface ProfileConfigMenuProps extends Omit<SectionContext, "effective"> {
  object: ObjectId;
}

/** The active object's sections (the inspector's tabpanel body). */
export default function ProfileConfigMenu({ object, ...ctx }: ProfileConfigMenuProps) {
  const c: SectionContext = { ...ctx, effective: getProfileCardEffects(ctx.card) };
  // Liquid glass (DS accordion): one card open per part, remembered per part
  // while the inspector is open.
  const [openByObject, setOpenByObject] = React.useState<Partial<Record<ObjectId, string | null>>>({});
  return (
    <Accordion open={openByObject[object] ?? null} onOpenChange={k => setOpenByObject(m => ({ ...m, [object]: k }))}>
      <div key={object} className="mn-swap" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {OBJECT_SECTIONS[object].map(s => <SectionNumber key={s.key} value={s.num ?? null}>{s.render(c)}</SectionNumber>)}
      </div>
    </Accordion>
  );
}

// ── Medidas (Iteration 0, O1) ───────────────────────────────────────────────
// A secondary precision / keyboard alternative to the resize handles
// (WCAG 2.5.7, 2.1.1) — closed by default, under "Fondo de la card".
// Width/height only: the card's position is always derived
// (centerCardPosition), never edited. Writes through exactly what the
// resize drag writes: clampFreeformCardSize + centerCardPosition, one patch.
function ProfileMeasures({ card, canvas, onChange }: {
  card: ProfileCardData; canvas: { w: number; h: number; topOffset: number };
  onChange: (patch: Partial<ProfileCardData>) => void;
}) {
  const b = getFreeformCardBounds();
  function setSize(w: number, h: number) {
    const c = clampFreeformCardSize(w, h);
    const { x, y } = centerCardPosition(canvas.w, canvas.h, c.w, c.h, canvas.topOffset);
    onChange({ w: c.w, h: c.h, x, y });
  }
  // Liquid glass (DS measures): two fields side by side + "Siempre centrada".
  return (
    <>
      <div className="mn-measures">
        <NumberField label="Ancho" min={b.minW} max={b.maxW} step={1} unit="px" value={Math.round(card.w)} onChange={v => setSize(v, card.h)} />
        <NumberField label="Alto" min={b.minH} max={b.maxH} step={1} unit="px" value={Math.round(card.h)} onChange={v => setSize(card.w, v)} />
      </div>
      <MenuNote>Siempre centrada</MenuNote>
    </>
  );
}
