import type { ReactNode } from "react";
import { T } from "./tokens";

interface MenuNoteProps {
  children: ReactNode;
}

// Aviso discreto dentro de un MenuSection — monocromático (solo grises de T,
// nunca accent/danger), sin iconos ni emojis. Es información de estado, no una
// alerta: algo que el usuario configuró existe pero no se está mostrando, y
// este es el único lugar donde puede enterarse de por qué.
export function MenuNote({ children }: MenuNoteProps) {
  return (
    <div style={{
      fontFamily: T.font.mono, fontSize: T.size.label, lineHeight: 1.5,
      color: T.text.secondary,
      background: T.surface.input,
      border: `1px solid ${T.border.subtle}`,
      borderRadius: T.radius.sm,
      padding: "6px 8px",
    }}>
      {children}
    </div>
  );
}
