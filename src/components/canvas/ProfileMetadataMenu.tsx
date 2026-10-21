"use client";
import type { ProfileCardData } from "@/types";
import { MenuSection, SwitchRow, TextInput, TextArea } from "@/ui";
import { getFontStyle } from "@/lib/fontList";
import BlockStyleFields from "./BlockStyleFields";
import { metadataController } from "@/lib/objectControllers";
import { ABOUT_MAX } from "@/lib/profileCardLayout";

type MetadataPatch = Partial<ProfileCardData>;

interface ProfileMetadataMenuProps {
  card:     ProfileCardData;
  onChange: (patch: MetadataPatch) => void;
  /** Menu redesign Phase 2: which object's content to render — each one
   * is mounted under its own object (ProfileConfigMenu.tsx). */
  only: MetadataPart;
}

export type MetadataPart = "descriptor" | "location" | "bio" | "about" | "views" | "locationBlock" | "viewsBlock" | "aboutBlock";

// CONTENT: qué querés mostrar. Tamaño/fuente/color de estos campos viven en
// TEXT, no acá — ver [[ProfileTypographyMenu]]. El estilo (background/color/
// radio) de los bloques Location y Views vive acá, junto a su contenido —
// mismo principio que Contact Links/Music (Stage FASE 2).
// Block 1 (un solo dueño): el color de TEXTO de Ubicación/Views ya no se
// edita acá (era un segundo control, blockStyle.<bloque>.textColor, que
// pisaba al del rol en render) — vive solo en TEXTO, que además limpia ese
// override viejo al editarse. Ver ProfileTypographyMenu.tsx.
export default function ProfileMetadataMenu({ card, onChange, only }: ProfileMetadataMenuProps) {
  const { status, location, bio, showViews } = card;
  // Editor v3 Phase C: writes go through the metadata controller.
  const meta = metadataController(onChange);
  // Liquid glass (design menu-schema.js roles): the content is a pinned
  // card whose field writes in the role's own font; Ubicación's and
  // Visitas' block style are their own cards (at the end of the part).
  const mono = "Space Mono";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {only === "descriptor" && <MenuSection label="Contenido" pinned>
        {/* Iteration 0: shared TextInput — named by the visible section
            heading (was placeholder-only) and with the editor focus ring. */}
        <TextInput value={status ?? ""} onChange={v => meta.setText("status", v)}
          placeholder="diseñador multimedia, just for fun…" maxLength={60} fontFamily={getFontStyle(card.statusFont ?? mono)} />
      </MenuSection>}

      {only === "location" && <MenuSection label="Contenido" pinned>
        <TextInput value={location ?? ""} onChange={v => meta.setText("location", v)}
          placeholder="la plata, buenos aires" maxLength={60} fontFamily={getFontStyle(card.locationFont ?? mono)} />
      </MenuSection>}
      {only === "locationBlock" && <BlockStyleFields card={card} blockKey="location" onChange={onChange} scope="Ubicación" />}

      {only === "bio" && <MenuSection label="Contenido" pinned>
        <TextArea value={bio ?? ""} onChange={v => meta.setText("bio", v)}
          placeholder="Contá algo de vos" maxLength={120} rows={3} fontFamily={getFontStyle(card.bioFont ?? mono)} />
      </MenuSection>}

      {/* "Sobre mí" (2026-10-21): plain text, line breaks kept. */}
      {only === "about" && <MenuSection label="Contenido" pinned>
        <TextArea value={card.aboutText ?? ""} onChange={v => meta.setText("aboutText", v)}
          placeholder="Contá quién sos, qué hacés, lo que quieras" maxLength={ABOUT_MAX} rows={5} fontFamily={getFontStyle(card.aboutFont ?? mono)} />
      </MenuSection>}
      {only === "aboutBlock" && <BlockStyleFields card={card} blockKey="about" onChange={onChange} scope="Sobre mí" />}

      {only === "views" && <MenuSection label="Contador" pinned>
        <SwitchRow label="Mostrar cantidad" icon="eye" value={!!showViews} onChange={v => meta.setShowViews(v)} />
      </MenuSection>}
      {only === "viewsBlock" && <BlockStyleFields card={card} blockKey="views" onChange={onChange} scope="Visitas" />}
    </div>
  );
}
