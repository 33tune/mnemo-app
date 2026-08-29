"use client";
import type { TextFont } from "@/types";
import { CANVAS_FONTS } from "@/lib/fontList";
import { T, SliderRow, ColorSwatch, MenuSection, MenuRow } from "@/ui";

const FONTS = CANVAS_FONTS;

interface ProfileTypographyMenuProps {
  font:          TextFont;
  nameFontSize?: number;
  bioFontSize?:  number;
  textColor?:    string;
  onChange:      (patch: { font?: TextFont; nameFontSize?: number; bioFontSize?: number; textColor?: string }) => void;
}

// Cómo se ve el contenido de la Card — separado de DATOS (qué dice).
export default function ProfileTypographyMenu({ font, nameFontSize, bioFontSize, textColor, onChange }: ProfileTypographyMenuProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[4] }}>
      <MenuSection label="Fuente" first>
        <MenuRow>
          <select value={font} onChange={e => onChange({ font: e.target.value as TextFont })}
            onMouseDown={e => e.stopPropagation()}
            style={{ background: "transparent", border: `1px solid ${T.border.default}`, borderRadius: T.radius.sm, padding: "4px 8px", outline: "none", color: T.text.secondary, fontSize: T.size.sm, fontFamily: T.font.sans, cursor: "pointer", width: "100%" }}>
            {FONTS.map(f => <option key={f.key} value={f.key} style={{ background: T.surface.base }}>{f.label}</option>)}
          </select>
        </MenuRow>
      </MenuSection>

      <SliderRow label="Tamaño del nombre" min={10} max={32} step={1} value={nameFontSize ?? 15}
        onChange={v => onChange({ nameFontSize: v })} unit="px" />

      <SliderRow label="Tamaño de la bio" min={7} max={18} step={1} value={bioFontSize ?? 8}
        onChange={v => onChange({ bioFontSize: v })} unit="px" />

      <MenuSection label="Color del texto">
        <MenuRow label="Color">
          <ColorSwatch value={textColor ?? "#ffffff"} onChange={v => onChange({ textColor: v })} />
        </MenuRow>
      </MenuSection>
    </div>
  );
}
