"use client";
import type { ProfileCardData } from "@/types";
import { T, MenuSection, MenuRow, Toggle } from "@/ui";
import BlockStyleFields from "./BlockStyleFields";

const fieldInputStyle: React.CSSProperties = {
  display: "block", width: "100%",
  background: T.surface.input, border: `1px solid ${T.border.default}`,
  borderRadius: T.radius.sm, padding: "6px 8px", color: T.text.secondary,
  fontFamily: T.font.sans, fontSize: T.size.sm, outline: "none",
  boxSizing: "border-box",
};

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
        <input value={status ?? ""} onChange={e => onChange({ status: e.target.value })}
          onMouseDown={e => e.stopPropagation()} placeholder="diseñador multimedia, just for fun..." maxLength={60}
          style={fieldInputStyle} />
      </MenuSection>

      <MenuSection label="Ubicación">
        <input value={location ?? ""} onChange={e => onChange({ location: e.target.value })}
          onMouseDown={e => e.stopPropagation()} placeholder="la plata, buenos aires" maxLength={60}
          style={fieldInputStyle} />
        <BlockStyleFields card={card} blockKey="location" onChange={onChange} />
      </MenuSection>

      <MenuSection label="Bio">
        <textarea value={bio ?? ""} onChange={e => onChange({ bio: e.target.value })}
          onMouseDown={e => e.stopPropagation()} placeholder="short bio..." maxLength={120} rows={2}
          style={{ ...fieldInputStyle, resize: "none", lineHeight: 1.5 }} />
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
