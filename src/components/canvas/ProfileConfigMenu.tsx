"use client";
import React from "react";
import type { ProfileCardData, CardEffects } from "@/types";
import { T, Collapsible, NumberField, MenuNote, Icon } from "@/ui";
import { getCardPadding, getFreeformCardBounds, clampFreeformCardSize, centerCardPosition } from "@/lib/cardGeometry";
import { getProfileCardEffects } from "@/lib/profileCardEffects";
import type { ObjectId } from "@/lib/inspectorObjects";
import ProfileIdentityMenu, { type IdentityPart } from "./ProfileIdentityMenu";
import ProfileMetadataMenu, { type MetadataPart } from "./ProfileMetadataMenu";
import ProfileContactLinksMenu from "./ProfileContactLinksMenu";
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
  /** Iteration 0 (O1 "Medidas"): the canvas the card is centered in.
   * Absent (space_mobile) = no Medidas. */
  canvas?:   { w: number; h: number; topOffset: number };
  onChange:  (patch: Partial<ProfileCardData>) => void;
  /** r2: switch the inspector to another object (in-section links). */
  goTo?:     (id: ObjectId) => void;
}

export interface Section {
  key: string;
  render: (c: SectionContext) => React.ReactNode;
}

const identity = (only: IdentityPart): Section => ({
  key: `identity-${only}`,
  render: c => (
    <ProfileIdentityMenu only={only} card={c.card} cardW={c.card.w} cardH={c.card.h}
      pad={getCardPadding(c.card.variant)} baseColor={c.baseColor} onChange={c.onChange} />
  ),
});
const metadata = (only: MetadataPart): Section => ({
  key: `metadata-${only}`,
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
    link("allText", TEXT_FX_LINK),
    identity("identityBlock"),
  ],
  handle: [
    identity("handle"),
    roleText("handle"),
    link("allText", TEXT_FX_LINK),
    identity("identityBlock"),
  ],
  descriptor: [
    metadata("descriptor"),
    roleText("descriptor"),
    link("allText", TEXT_FX_LINK),
    identity("identityBlock"),
  ],
  location: [
    metadata("location"),
    roleText("location"),
    link("allText", TEXT_FX_LINK),
  ],
  bio: [
    metadata("bio"),
    roleText("bio"),
    link("allText", TEXT_FX_LINK),
    identity("identityBlock"),
  ],
  views: [
    metadata("views"),
    roleText("views"),
    link("allText", TEXT_FX_LINK),
  ],
  photo: [
    identity("photo"),
  ],
  links: [
    { key: "links", render: c => <ProfileContactLinksMenu card={c.card} fitsInCard={c.linksFits} onChange={c.onChange} /> },
  ],
  logo: [
    { key: "logo", render: c => <ProfileLogoMenu logo={c.card.logo} onChange={c.onChange} /> },
  ],
  cardBg: [
    { key: "bg", render: c => <ProfileBackgroundMenu effective={c.effective} raw={c.card.effects} onChange={patchEffects(c)} /> },
    { key: "corners", render: c => <CardCornersSection effective={c.effective} raw={c.card.effects} onChange={patchEffects(c)} /> },
    link("cardFx", "Color y grosor del borde: en Efectos de la card"),
    { key: "measures", render: c => c.canvas ? <ProfileMeasures card={c.card} canvas={c.canvas} onChange={c.onChange} /> : null },
  ],
  cardFx: [
    { key: "effects", render: c => (
      <CardEffectsSection effective={c.effective} raw={c.card.effects} onChange={patchEffects(c)}
        borderFooter={<ObjectLink c={c} to="cardBg" label="Esquinas: en Fondo de la card" />} />
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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[5] }}>
      {OBJECT_SECTIONS[object].map(s => <React.Fragment key={s.key}>{s.render(c)}</React.Fragment>)}
    </div>
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
  return (
    <Collapsible label="Medidas">
      <NumberField label="Ancho (px)" min={b.minW} max={b.maxW} step={1} unit="px" value={Math.round(card.w)} onChange={v => setSize(v, card.h)} />
      <NumberField label="Alto (px)" min={b.minH} max={b.maxH} step={1} unit="px" value={Math.round(card.h)} onChange={v => setSize(card.w, v)} />
      <MenuNote>La card de presentación siempre queda centrada.</MenuNote>
    </Collapsible>
  );
}
