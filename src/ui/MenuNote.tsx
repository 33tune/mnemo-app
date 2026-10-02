import type { ReactNode } from "react";
import { T } from "./tokens";

interface MenuNoteProps {
  children: ReactNode;
}

// Aviso discreto dentro de un MenuSection — monocromático (solo grises de T,
// nunca accent/danger), sin iconos ni emojis. Es información de estado, no una
// alerta: algo que el usuario configuró existe pero no se está mostrando, y
// este es el único lugar donde puede enterarse de por qué.
// Block 2: "help" type (DM Sans 12/16, secondary) on an L2 group surface —
// Space Mono is reserved for section headers and numeric values.
export function MenuNote({ children }: MenuNoteProps) {
  return (
    <div role="note" style={{
      ...T.type.help,
      color: T.ui.text.secondary,
      background: T.ui.surface.group,
      boxShadow: `inset 0 0 0 0.5px ${T.ui.line.group}`,
      borderRadius: T.ui.radius.control,
      padding: "8px 10px",
    }}>
      {children}
    </div>
  );
}
