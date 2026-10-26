"use client";
import React, { useEffect, useRef, useState } from "react";
import type { CardSticker, ProfileCardData } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { MenuSection, MenuNote, UploadField, ActionButton, IconButton, Icon } from "@/ui";
import { CARD_ROW, STICKER_MAX, moveRow, newSticker, stickerRows } from "@/lib/stickerGeometry";
import { stickerEditing, useStickerEditing } from "@/lib/stickerEditing";

type StickersPatch = Partial<Pick<ProfileCardData, "stickers">>;

interface Props {
  card:     ProfileCardData;
  onChange: (patch: StickersPatch) => void;
}

/** The image's natural size (its aspect never changes); 1:1 if it can't be read. */
function naturalSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve({ w: 1, h: 1 }); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

// Tarjeta › Stickers (2026-10-27): images / GIFs stuck to the card (frames
// above all). "Editar" makes them editable on the card like the room's images
// (pick, Shift to add, move together, scale, rotate); "Aplicar" turns them
// back into ghosts that never get in the way of a click. The list is by
// layers, top = front: the "Tarjeta" row splits the stickers in front of the
// card from the ones behind it — drag a row across it to change sides.
export default function ProfileStickersMenu({ card, onChange }: Props) {
  const stickers = card.stickers ?? [];
  const edit = useStickerEditing();
  const editing = edit.cardId === card.id;
  const full = stickers.length >= STICKER_MAX;
  const [busy, setBusy] = useState(false);

  // Leaving the section (another part, inspector closed) applies.
  useEffect(() => () => { if (stickerEditing.get().cardId === card.id) stickerEditing.apply(); }, [card.id]);

  const setStickers = (next: CardSticker[]) => onChange({ stickers: next });

  async function add(file: File) {
    if (full || busy) return;
    setBusy(true);
    try {
      const [{ publicUrl }, size] = await Promise.all([uploadToStorage(file), naturalSize(file)]);
      const st = newSticker(crypto.randomUUID(), publicUrl, size.w, size.h, card.w, card.h);
      setStickers([...(card.stickers ?? []), st]);
      stickerEditing.start(card.id, [st.id]);
    } catch { /* uploadToStorage already told the user */ }
    finally { setBusy(false); }
  }

  // ── Rows (top = front) and dragging them ─────────────────────────────────
  const rows = stickerRows(stickers);
  const byId = new Map(stickers.map(s => [s.id, s]));
  const number = new Map(stickers.map((s, i) => [s.id, i + 1]));
  const rowEls = useRef(new Map<string, HTMLElement>());
  const [drag, setDrag] = useState<{ id: string; over: number } | null>(null);

  function slotAt(y: number): number {
    let i = 0;
    for (const id of rows) {
      const el = rowEls.current.get(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
      i++;
    }
    return rows.length - 1;
  }
  function gripDown(e: React.PointerEvent, id: string) {
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id, over: rows.indexOf(id) });
  }
  function gripMove(e: React.PointerEvent) {
    if (!drag) return;
    const over = slotAt(e.clientY);
    if (over !== drag.over) setDrag({ ...drag, over });
  }
  function gripUp(e: React.PointerEvent) {
    if (!drag) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (drag.over !== rows.indexOf(drag.id)) setStickers(moveRow(stickers, drag.id, drag.over));
    setDrag(null);
  }
  /** Keyboard: Alt + ↑ / ↓ on a row moves it one place. */
  function rowKey(e: React.KeyboardEvent, id: string) {
    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    const at = rows.indexOf(id);
    setStickers(moveRow(stickers, id, e.key === "ArrowUp" ? at - 1 : at + 1));
  }

  function pick(id: string, additive: boolean) {
    if (!editing) { stickerEditing.start(card.id, [id]); return; }
    const next = new Set(edit.selected);
    if (additive) { if (next.has(id)) next.delete(id); else next.add(id); }
    else { next.clear(); next.add(id); }
    stickerEditing.select([...next]);
  }

  const toggleHidden = (id: string) => setStickers(stickers.map(s => s.id === id ? { ...s, hidden: s.hidden ? undefined : true } : s));
  const remove = (id: string) => {
    setStickers(stickers.filter(s => s.id !== id));
    if (editing) stickerEditing.select([...edit.selected].filter(x => x !== id));
  };

  const summary = stickers.length === 0 ? "Sin stickers" : `${stickers.length} de ${STICKER_MAX}${editing ? " · editando" : ""}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <MenuSection label="Stickers" pinned summary={summary}>
        <UploadField kind="logo" value={null} label={full ? `Máximo ${STICKER_MAX} stickers` : busy ? "Subiendo…" : "Agregar sticker"}
          caption="PNG, GIF o WebP" accept="image/*" onFile={add} disabled={full || busy} />
        <div style={{ display: "flex", gap: 8 }}>
          <ActionButton variant={editing ? "primary" : "secondary"} fullWidth disabled={!editing && stickers.length === 0}
            onClick={e => { e.stopPropagation(); if (editing) stickerEditing.apply(); else stickerEditing.start(card.id); }}>
            {editing ? "Aplicar" : "Editar"}
          </ActionButton>
        </div>
        <MenuNote icon={editing ? "move" : "eye"}>
          {editing
            ? "Arrastrá en la tarjeta para mover, las esquinas para el tamaño y el círculo para rotar. Mayús suma a la selección."
            : "Son decorativos: nunca tapan un botón ni un link. Tocá Editar para moverlos."}
        </MenuNote>
      </MenuSection>

      {stickers.length > 0 && (
        <MenuSection label="Capas" icon="layers" pinned summary="Arriba = delante">
          <div className="mn-layers" role="group" aria-label="Stickers y tarjeta, de adelante hacia atrás">
            <div role="list" className="mn-layers__list">
              {rows.map((id, i) => {
                const dropLine = drag && drag.over === i && drag.id !== id;
                if (id === CARD_ROW) {
                  return (
                    <div key={id} role="listitem" ref={el => { if (el) rowEls.current.set(id, el); else rowEls.current.delete(id); }}
                      className="mn-layer" data-drop={dropLine || undefined} style={{ opacity: 0.85 }}>
                      <span className="mn-layer__grip" aria-hidden style={{ visibility: "hidden" }}><Icon name="move" size={14} /></span>
                      <span className="mn-layer__btn" style={{ cursor: "default" }}>
                        <span className="mn-layer__thumb mn-layer__thumb--none" aria-hidden><Icon name="card" size={16} /></span>
                        <span className="mn-layer__text">
                          <span className="mn-layer__name">Tarjeta</span>
                          <span className="mn-layer__detail">arriba: delante · abajo: detrás</span>
                        </span>
                      </span>
                    </div>
                  );
                }
                const st = byId.get(id)!;
                const isSel = editing && edit.selected.has(id);
                const front = i < rows.indexOf(CARD_ROW);
                const name = `Sticker ${number.get(id)}`;
                return (
                  <div key={id} role="listitem" ref={el => { if (el) rowEls.current.set(id, el); else rowEls.current.delete(id); }}
                    className="mn-layer" data-selected={isSel || undefined} data-dragging={drag?.id === id || undefined}
                    data-drop={dropLine || undefined}>
                    <span className="mn-layer__grip" aria-hidden title="Arrastrá para reordenar"
                      onPointerDown={e => gripDown(e, id)} onPointerMove={gripMove} onPointerUp={gripUp}
                      style={{ touchAction: "none", cursor: "grab" }}>
                      <Icon name="move" size={14} />
                    </span>
                    <button type="button" className="mn-layer__btn" aria-pressed={isSel}
                      aria-label={`${name}, ${front ? "delante" : "detrás"} de la tarjeta${st.hidden ? ", oculto" : ""}. Alt más flechas para moverlo`}
                      onKeyDown={e => rowKey(e, id)}
                      onClick={e => { e.stopPropagation(); pick(id, e.shiftKey || e.metaKey || e.ctrlKey); }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="mn-layer__thumb" src={st.src} alt="" draggable={false} style={{ objectFit: "contain", opacity: st.hidden ? 0.4 : 1 }} />
                      <span className="mn-layer__text">
                        <span className="mn-layer__name">{name}</span>
                        <span className="mn-layer__detail">{[front ? "delante" : "detrás", st.hidden ? "oculto" : ""].filter(Boolean).join(" · ")}</span>
                      </span>
                    </button>
                    <IconButton icon={st.hidden ? "eye-off" : "eye"} aria-label={st.hidden ? `Mostrar ${name}` : `Ocultar ${name}`}
                      onClick={e => { e.stopPropagation(); toggleHidden(id); }} />
                    <IconButton icon="trash" tone="danger" aria-label={`Borrar ${name}`}
                      onClick={e => { e.stopPropagation(); remove(id); }} />
                  </div>
                );
              })}
            </div>
          </div>
        </MenuSection>
      )}
    </div>
  );
}
