"use client";
import type { ProfileCardData } from "@/types";
import { T, MenuSection, MenuRow, Toggle } from "@/ui";

const fieldInputStyle: React.CSSProperties = {
  display: "block", width: "100%",
  background: T.surface.input, border: `1px solid ${T.border.default}`,
  borderRadius: T.radius.sm, padding: "6px 8px", color: T.text.secondary,
  fontFamily: T.font.sans, fontSize: T.size.sm, outline: "none",
  boxSizing: "border-box",
};

type MetadataPatch = Partial<Pick<ProfileCardData, "status" | "location" | "bio" | "showViews">>;

interface ProfileMetadataMenuProps {
  status?:    string; // descriptor / profesión — reuses the existing `status` field
  location?:  string;
  bio?:       string;
  showViews?: boolean;
  onChange:   (patch: MetadataPatch) => void;
}

// DATOS: qué querés mostrar. Tamaño/fuente/color de estos campos viven en
// ESTILO → Tipografía, no acá — ver [[ProfileTypographyMenu]].
export default function ProfileMetadataMenu({ status, location, bio, showViews, onChange }: ProfileMetadataMenuProps) {
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
      </MenuSection>
    </div>
  );
}
