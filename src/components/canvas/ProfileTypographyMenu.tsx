"use client";
import type { TextFont, ProfileCardData } from "@/types";
import { CANVAS_FONTS } from "@/lib/fontList";
import { T, SliderRow, ColorSwatch, MenuSection, MenuRow, Tabs } from "@/ui";

const FONTS = CANVAS_FONTS;
type TextAlign = NonNullable<ProfileCardData["textAlign"]>;
const ALIGN_TABS: { id: TextAlign; label: string }[] = [
  { id: "left", label: "Izq" }, { id: "center", label: "Centro" }, { id: "right", label: "Der" },
];

interface ProfileTypographyMenuProps {
  font:          TextFont;
  nameFontSize?: number;
  bioFontSize?:  number;
  textColor?:    string;
  textAlign?:    TextAlign;
  onChange:      (patch: { font?: TextFont; nameFontSize?: number; bioFontSize?: number; textColor?: string; textAlign?: TextAlign }) => void;
}

// Cómo se ve el contenido de la Card — separado de DATOS (qué dice).
// textAlign controla la alineación interna del bloque de identidad/contenido
// (name/handle/descriptor/location/bio/views) — independiente de dónde el
// composition engine ubica ese bloque en la card (eso lo decide el anchor del
// PFP, no esto). Ver cardComposition.ts.
export default function ProfileTypographyMenu({ font, nameFontSize, bioFontSize, textColor, textAlign, onChange }: ProfileTypographyMenuProps) {
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

      <MenuSection label="Alineación">
        <Tabs tabs={ALIGN_TABS} active={textAlign ?? "left"} onChange={v => onChange({ textAlign: v as TextAlign })} />
      </MenuSection>

      <MenuSection label="Color del texto">
        <MenuRow label="Color">
          <ColorSwatch value={textColor ?? "#ffffff"} onChange={v => onChange({ textColor: v })} />
        </MenuRow>
      </MenuSection>
    </div>
  );
}
