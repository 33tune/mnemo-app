"use client";
import React, { useRef, useState } from "react";
import type { LinkButton, LinkButtonStyle, ProfileCardData } from "@/types";
import {
  MenuSection, MenuRow, MenuNote, SliderRow, Tabs, ColorRow, FontField, SwitchRow, EffectList, EffectRow,
  TextInput, IconButton, Icon, refocusFieldControl,
} from "@/ui";
import { detectPlatform, PlatformIcon } from "./SocialIcons";
import { CANVAS_FONTS } from "@/lib/fontList";
import { linkButtonsController } from "@/lib/objectControllers";
import {
  LINK_BUTTONS_MAX, LINK_BUTTON_LABEL_MAX, LINK_BUTTON_FONT_SIZE, LINK_BUTTON_GAP,
  resolveLinkButtonStyle,
} from "@/lib/linkButtons";

interface Props {
  card: Pick<ProfileCardData, "linkButtons" | "linkButtonStyle">;
  /** The card's base text color (the buttons' default color). */
  baseColor: string;
  /** ProfileCard's render verdict (EditorHost facts). The card grows to fit
   * its content by itself (profileCardLayout.ts), so this is false only when
   * the card is at its maximum size and still cannot hold everything. */
  fits?: boolean;
  onChange: (patch: Partial<ProfileCardData>) => void;
}

const SHAPES = [{ id: "square", label: "Recta" }, { id: "soft", label: "Suave" }, { id: "pill", label: "Píldora" }];
const FILLS = [{ id: "solid", label: "Sólido" }, { id: "outline", label: "Contorno" }, { id: "glass", label: "Vidrio" }];
const WIDTHS = [{ id: "full", label: "Completo" }, { id: "fit", label: "Ajustado" }];
const px = (v: number) => `${Math.round(v)} px`;

// Link buttons (Linktree-style, user decision 2026-10-14). Content first —
// the list (drag the grip or ↑/↓ on it to reorder, edit, remove) and the add
// row (Texto del botón + link) — then ONE style for every button: Estilo
// (shape, fill, colors, font, size, network icon), Distribución (width,
// spacing) and Al pasar el cursor (tiles). The icon comes from the link.
export default function ProfileLinkButtonsMenu({ card, baseColor, fits, onChange }: Props) {
  const buttons = card.linkButtons ?? [];
  const style = card.linkButtonStyle;
  const r = resolveLinkButtonStyle(style, baseColor);
  const ctl = linkButtonsController(buttons, style, onChange);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ label: string; url: string }>({ label: "", url: "" });
  const full = buttons.length >= LINK_BUTTONS_MAX;

  function add() {
    const u = url.trim();
    if (!u || full) return;
    // The card grows to fit by itself (the content floor, ProfileCard).
    ctl.add(label.trim() || u.replace(/^https?:\/\/(www\.)?/, ""), u);
    setLabel(""); setUrl("");
  }
  function confirmEdit() {
    if (editingId && draft.url.trim()) ctl.update(editingId, { label: draft.label.trim() || draft.url.trim(), url: draft.url.trim() });
    setEditingId(null);
  }

  const shapeName = SHAPES.find(s => s.id === r.shape)?.label ?? "";
  const fillName = FILLS.find(f => f.id === r.fill)?.label ?? "";
  const styleChanged = ["shape", "fill", "color", "textColor", "font", "fontSize", "showIcon"].filter(k => style?.[k as keyof LinkButtonStyle] !== undefined).length;
  const layoutChanged = ["width", "gap"].filter(k => style?.[k as keyof LinkButtonStyle] !== undefined).length;
  const hoverOn = [r.hover.lift && "Elevar", r.hover.glow && "Brillo", r.hover.invert && "Invertir"].filter(Boolean) as string[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <MenuSection label="Botones" pinned>
        {buttons.length > 0 && fits === false && (
          <MenuNote tone="warn">La tarjeta llegó a su tamaño máximo y no entra todo: sacá contenido o achicá textos y botones.</MenuNote>
        )}
        {buttons.length > 0 && (
          <ButtonList buttons={buttons} editingId={editingId} draft={draft} setDraft={setDraft}
            onEdit={b => { setEditingId(b.id); setDraft({ label: b.label, url: b.url }); }}
            onConfirm={confirmEdit} onCancel={() => setEditingId(null)}
            onRemove={(id, el) => { ctl.remove(id); if (editingId === id) setEditingId(null); refocusFieldControl(el); }}
            onMove={(from, to) => ctl.move(from, to)} />
        )}
        {!full && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <TextInput value={label} onChange={setLabel} placeholder="Texto del botón" label="Texto del botón" maxLength={LINK_BUTTON_LABEL_MAX}
              onKeyDown={e => { if (e.key === "Enter") add(); }} />
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <TextInput value={url} onChange={setUrl} placeholder="https://…" mono label="Link del botón"
                  onKeyDown={e => { if (e.key === "Enter") add(); }} />
              </div>
              <IconButton icon="plus" aria-label="Agregar botón" title="Agregar botón" size={44} iconSize={16}
                className={url.trim() ? "mn-iconbtn--accent" : "mn-iconbtn--filled"} disabled={!url.trim()} onClick={add} />
            </div>
          </div>
        )}
        <span className="mn-linkrow__count">{buttons.length}/{LINK_BUTTONS_MAX} · el ícono sale del link{buttons.length > 1 ? " · arrastrá para ordenar" : ""}</span>
      </MenuSection>

      <MenuSection label="Estilo" icon="palette" changed={styleChanged} swatch={r.fill === "solid" ? r.color : undefined}
        summary={`${shapeName} · ${fillName} · ${r.fontSize} px`}
        onReset={() => ctl.setStyle({ shape: undefined, fill: undefined, color: undefined, textColor: undefined, font: undefined, fontSize: undefined, showIcon: undefined })}>
        <MenuRow label="Forma" state={style?.shape ? "modified" : undefined} onReset={() => ctl.setStyle({ shape: undefined })}>
          <div style={{ width: 212 }}><Tabs tabs={SHAPES} active={r.shape} onChange={v => ctl.setStyle({ shape: v as LinkButtonStyle["shape"] })} /></div>
        </MenuRow>
        <MenuRow label="Relleno" state={style?.fill ? "modified" : undefined} onReset={() => ctl.setStyle({ fill: undefined })}>
          <div style={{ width: 212 }}><Tabs tabs={FILLS} active={r.fill} onChange={v => ctl.setStyle({ fill: v as LinkButtonStyle["fill"] })} /></div>
        </MenuRow>
        <ColorRow label="Color del botón" value={r.color} onChange={v => ctl.setStyle({ color: v })}
          state={style?.color ? "modified" : "inherited"} inheritedLabel="Color de los textos" onReset={() => ctl.setStyle({ color: undefined })} />
        <ColorRow label="Color del texto" value={r.textColor} onChange={v => ctl.setStyle({ textColor: v })}
          state={style?.textColor ? "modified" : "inherited"} inheritedLabel="Automático" onReset={() => ctl.setStyle({ textColor: undefined })} />
        <FontField value={r.font} onChange={v => ctl.setStyle({ font: v })} fonts={CANVAS_FONTS} label="Fuente de los botones"
          detail={style?.font ? undefined : "Predeterminada"} modified={!!style?.font} onReset={() => ctl.setStyle({ font: undefined })} sample="Aa" />
        <SliderRow label="Tamaño" icon="maximize" min={LINK_BUTTON_FONT_SIZE.min} max={LINK_BUTTON_FONT_SIZE.max} step={1} value={r.fontSize} unit="px" fmt={px}
          onChange={v => ctl.setStyle({ fontSize: v })} state={style?.fontSize != null ? "modified" : undefined} onReset={() => ctl.setStyle({ fontSize: undefined })} />
        <SwitchRow label="Ícono de la red" icon="link" value={r.showIcon} onChange={v => ctl.setStyle({ showIcon: v ? undefined : false })} />
      </MenuSection>

      <MenuSection label="Distribución" icon="spacing" changed={layoutChanged}
        summary={`${r.width === "full" ? "Ancho completo" : "Ajustado al texto"} · ${r.gap} px`}
        onReset={() => ctl.setStyle({ width: undefined, gap: undefined })}>
        <MenuRow label="Ancho" state={style?.width ? "modified" : undefined} onReset={() => ctl.setStyle({ width: undefined })}>
          <div style={{ width: 212 }}><Tabs tabs={WIDTHS} active={r.width} onChange={v => ctl.setStyle({ width: v as LinkButtonStyle["width"] })} /></div>
        </MenuRow>
        <SliderRow label="Separación" icon="spacing" min={LINK_BUTTON_GAP.min} max={LINK_BUTTON_GAP.max} step={1} value={r.gap} unit="px" fmt={px}
          onChange={v => ctl.setStyle({ gap: v })} state={style?.gap != null ? "modified" : undefined} onReset={() => ctl.setStyle({ gap: undefined })} />
      </MenuSection>

      <MenuSection label="Al pasar el cursor" icon="pointer" active={hoverOn.length} summary={hoverOn.length ? hoverOn.join(", ") : "Ninguno activo"}>
        <EffectList label="Al pasar el cursor">
          <EffectRow id="lift" label="Elevar" icon="arrow-up" preview="c-float" on={r.hover.lift} onToggle={v => ctl.setHover({ lift: v ? undefined : false })} />
          <EffectRow id="glow" label="Brillo" icon="sun" preview="c-glow" on={r.hover.glow} onToggle={v => ctl.setHover({ glow: v || undefined })} />
          <EffectRow id="invert" label="Invertir" icon="blend" preview="c-grad" on={r.hover.invert} onToggle={v => ctl.setHover({ invert: v || undefined })} />
        </EffectList>
      </MenuSection>
    </div>
  );
}

/** The list: drag the grip (pointer) or press ↑/↓ on it (keyboard) to
 * reorder; edit in place; remove. */
function ButtonList({ buttons, editingId, draft, setDraft, onEdit, onConfirm, onCancel, onRemove, onMove }: {
  buttons: LinkButton[]; editingId: string | null; draft: { label: string; url: string };
  setDraft: (d: { label: string; url: string }) => void;
  onEdit: (b: LinkButton) => void; onConfirm: () => void; onCancel: () => void;
  onRemove: (id: string, el: HTMLElement) => void; onMove: (from: number, to: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ from: number; dy: number; rowH: number } | null>(null);
  const target = drag ? Math.max(0, Math.min(buttons.length - 1, drag.from + Math.round(drag.dy / drag.rowH))) : -1;
  const gripRefs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div ref={listRef} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {buttons.map((b, i) => {
        if (editingId === b.id) {
          return (
            <div key={b.id} className="mn-linkrow" style={{ flexDirection: "column", alignItems: "stretch", padding: 8, gap: 6 }}
              onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } if (e.key === "Enter") onConfirm(); }}>
              <TextInput value={draft.label} onChange={v => setDraft({ ...draft, label: v })} label="Texto del botón" placeholder="Texto del botón" maxLength={LINK_BUTTON_LABEL_MAX} />
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}><TextInput value={draft.url} onChange={v => setDraft({ ...draft, url: v })} label="Link del botón" placeholder="https://…" mono /></div>
                <IconButton icon="check" aria-label="Confirmar" title="Confirmar" size={36} iconSize={15} onClick={onConfirm} />
              </div>
            </div>
          );
        }
        const dragging = drag?.from === i;
        const shift = drag && !dragging
          ? (i > drag.from && i <= target ? -drag.rowH : i < drag.from && i >= target ? drag.rowH : 0) : 0;
        return (
          <div key={b.id} data-mn-item="" className="mn-linkrow"
            style={{ transform: dragging ? `translateY(${drag!.dy}px)` : shift ? `translateY(${shift}px)` : undefined,
              transition: dragging ? "none" : "transform 160ms ease", position: "relative", zIndex: dragging ? 1 : undefined }}>
            <button ref={el => { gripRefs.current[i] = el; }} type="button" className="mn-linkrow__grip"
              aria-label={`Mover ${b.label}, ${i + 1} de ${buttons.length}`} title="Arrastrá o usá ↑ ↓ para ordenar"
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={e => {
                const to = e.key === "ArrowUp" ? i - 1 : e.key === "ArrowDown" ? i + 1 : -1;
                if (to < 0 || to >= buttons.length) return;
                e.preventDefault(); onMove(i, to);
                requestAnimationFrame(() => gripRefs.current[to]?.focus());
              }}
              onPointerDown={e => {
                e.stopPropagation();
                const row = e.currentTarget.parentElement!;
                e.currentTarget.setPointerCapture(e.pointerId);
                const startY = e.clientY;
                setDrag({ from: i, dy: 0, rowH: row.getBoundingClientRect().height + 6 });
                const el = e.currentTarget;
                const move = (ev: PointerEvent) => setDrag(d => d && { ...d, dy: ev.clientY - startY });
                const up = () => {
                  el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
                  setDrag(d => { if (d) { const to = Math.max(0, Math.min(buttons.length - 1, d.from + Math.round(d.dy / d.rowH))); if (to !== d.from) onMove(d.from, to); } return null; });
                };
                el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
              }}>
              <Icon name="grip" size={14} />
            </button>
            <span className="mn-linkrow__ico" aria-hidden><PlatformIcon platform={detectPlatform(b.url)} size={16} color="currentColor" /></span>
            <span className="mn-linkrow__text">
              <span className="mn-linkrow__name">{b.label}</span>
              <span className="mn-linkrow__url">{b.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
            </span>
            <IconButton icon="pencil" aria-label={`Editar ${b.label}`} title="Editar" size={34} iconSize={15} onClick={() => onEdit(b)} />
            <IconButton icon="trash" tone="danger" aria-label={`Quitar ${b.label}`} title="Quitar botón" size={34} iconSize={15}
              onClick={e => onRemove(b.id, e.currentTarget as HTMLElement)} />
          </div>
        );
      })}
    </div>
  );
}

