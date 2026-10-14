import type { ReactNode } from "react";
import { uv } from "./tokens";
import { Icon, type IconName } from "./icons";

interface MenuNoteProps {
  children: ReactNode;
  /** Phase 2 r2: lets a control reference the note (aria-describedby). */
  id?: string;
  /** Liquid glass: "warn" = the DS accent dot (something needs attention,
   * e.g. "Prendé Brillo para ver el pulso"); "hint" (default) = a short line
   * with an optional glyph. */
  tone?: "hint" | "warn";
  icon?: IconName;
}

// Liquid glass (DS isHint / isWarn rows): one short line in ink2 (12.5px),
// no box — a glyph before a hint, the accent dot before a warning. Status
// information, not an alert.
export function MenuNote({ children, id, tone = "hint", icon }: MenuNoteProps) {
  return (
    <div role="note" id={id} className="mn-note" data-tone={tone}>
      {tone === "warn"
        ? <span className="mn-note__dot" aria-hidden />
        : icon ? <Icon name={icon} size={14} /> : null}
      <span style={{ minWidth: 0, color: uv("text-secondary") }}>{children}</span>
    </div>
  );
}

interface GotoRowProps {
  label:   string;
  /** Where it goes ("Todos los textos"). */
  hint?:   string;
  onGo:    () => void;
}

/** Liquid glass (DS isGoto): an outlined 44px row that jumps to the part
 * that owns a related control ("Sombra, brillo y contorno · Todos los
 * textos ›"). */
export function GotoRow({ label, hint, onGo }: GotoRowProps) {
  return (
    <button type="button" className="mn-goto mn-objlink" onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onGo(); }}>
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
      {hint && <span className="mn-goto__hint">{hint}</span>}
      <Icon name="chevron-right" size={14} />
    </button>
  );
}
