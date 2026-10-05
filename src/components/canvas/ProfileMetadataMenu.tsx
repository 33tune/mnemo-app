"use client";
import type { ProfileCardData } from "@/types";
import { T, MenuSection, MenuRow, Toggle, TextInput, TextArea } from "@/ui";
import BlockStyleFields from "./BlockStyleFields";

type MetadataPatch = Partial<ProfileCardData>;

interface ProfileMetadataMenuProps {
  card:     ProfileCardData;
  onChange: (patch: MetadataPatch) => void;
}

// CONTENT: qué querés mostrar. Tamaño/fuente/color de estos campos viven en
// TEXT, no acá — ver [[ProfileTypographyMenu]]. El estilo (background/color/
// radio) de los bloques Location y Views vive acá, junto a su contenido —
// mismo principio que Contact Links/Music (Stage FASE 2).
// Block 1 (un solo dueño): el color de TEXTO de Ubicación/Views ya no se
// edita acá (era un segundo control, blockStyle.<bloque>.textColor, que
// pisaba al del rol en render) — vive solo en TEXTO, que además limpia ese
// override viejo al editarse. Ver ProfileTypographyMenu.tsx.
export default function ProfileMetadataMenu({ card, onChange }: ProfileMetadataMenuProps) {
  const { status, location, bio, showViews } = card;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[4] }}>
      <MenuSection label="Descriptor" first>
        {/* Iteration 0: shared TextInput — named by the visible section
            heading (was placeholder-only) and with the editor focus ring
            (was outline:none). */}
        <TextInput value={status ?? ""} onChange={v => onChange({ status: v })}
          placeholder="diseñador multimedia, just for fun..." maxLength={60} />
      </MenuSection>

      <MenuSection label="Ubicación">
        <TextInput value={location ?? ""} onChange={v => onChange({ location: v })}
          placeholder="la plata, buenos aires" maxLength={60} />
        <BlockStyleFields card={card} blockKey="location" onChange={onChange} />
      </MenuSection>

      <MenuSection label="Bio">
        <TextArea value={bio ?? ""} onChange={v => onChange({ bio: v })}
          placeholder="una bio corta…" maxLength={120} rows={2} />
      </MenuSection>

      <MenuSection label="Views">
        <MenuRow label="Mostrar cantidad">
          <Toggle value={!!showViews} onChange={v => onChange({ showViews: v })} />
        </MenuRow>
        {showViews && <BlockStyleFields card={card} blockKey="views" onChange={onChange} />}
      </MenuSection>
    </div>
  );
}
