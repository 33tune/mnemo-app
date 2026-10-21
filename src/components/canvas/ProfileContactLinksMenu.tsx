"use client";
import { useState } from "react";
import type { ContactLink, ProfileCardData } from "@/types";
import { MenuSection, MenuNote, SliderRow, ColorRow, TextInput, IconButton, refocusFieldControl } from "@/ui";
import { detectPlatform, PlatformIcon, PLATFORM_LABELS } from "./SocialIcons";
import { CONTACT_LINKS_MAX, CONTACT_LINK_ICON_SIZE, CONTACT_LINK_ICON_SIZE_MIN, CONTACT_LINK_ICON_SIZE_MAX, CONTACT_LINK_ICON_OPACITY } from "@/lib/contactLinksBlock";
import { DEFAULT_ROLE_OPACITY, withOpacity } from "@/lib/cardColors";
import BlockStyleFields from "./BlockStyleFields";
import { linksController } from "@/lib/objectControllers";

type ContactLinksPatch = Partial<ProfileCardData>;

interface Props {
  card: Pick<ProfileCardData, "contactLinks" | "linksIconSize" | "linksIconColor" | "linksIconOpacity" | "blockStyle" | "blockStylePaused">;
  /** The card's text color: the icons' default is it at 45%. */
  baseColor: string;
  /** Stage 4.2-C.2.7: whether the block's resolved box still fits in the
   * card's padded content area (ProfileCard.tsx's blockFits). `undefined` =
   * not applicable; only an explicit `false` shows the note below. */
  fitsInCard?: boolean;
  onChange: (patch: ContactLinksPatch) => void;
}

// CONTENT: agregar/editar/eliminar Contact Links. La plataforma no se elige
// acá — se detecta de la URL (ver detectPlatform) y solo se muestra como
// preview, consistente con "no almacenar info derivable". Sin inline editing
// en el canvas: todo pasa por este menú. Tamaño de ícono y el override de
// estilo del bloque (background/color de ícono/radio) viven acá, junto al
// contenido (Stage FASE 2) — no en una pestaña de estilo aparte.
export default function ProfileContactLinksMenu({ card, baseColor, fitsInCard, onChange }: Props) {
  const { contactLinks, linksIconSize, linksIconOpacity } = card;
  const links = contactLinks ?? [];
  const [newUrl, setNewUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  // Editor v3 Phase C: writes go through the links controller.
  const linksCtl = linksController(links, onChange);
  // The icons' color (2026-10-21: in Íconos, next to the size). A color
  // stored the old way (Estilo del bloque › Ícono) still wins in render; the
  // controller moves it here on the next pick.
  const ownIconColor = card.blockStyle?.links?.iconColor ?? card.linksIconColor;
  const iconColor = ownIconColor ?? withOpacity(baseColor, DEFAULT_ROLE_OPACITY.linksIcon);

  function addLink() {
    const url = newUrl.trim();
    if (!url || links.length >= CONTACT_LINKS_MAX) return;
    linksCtl.add(url);
    setNewUrl("");
  }

  function startEdit(link: ContactLink) {
    setEditingId(link.id);
    setEditUrl(link.url);
  }

  function confirmEdit() {
    const url = editUrl.trim();
    if (url && editingId) {
      linksCtl.update(editingId, url);
    }
    setEditingId(null);
    setEditUrl("");
  }

  function removeLink(id: string) {
    linksCtl.remove(id);
    if (editingId === id) { setEditingId(null); setEditUrl(""); }
  }

  // Liquid glass (design menu-schema.js "links"): the list as a pinned card
  // (platform tile, name + URL, Editar / Quitar), the add row (Enter or +),
  // "3/12 · la plataforma se detecta sola"; then Íconos and the block style.
  const draftReady = !!newUrl.trim();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <MenuSection label="Links" pinned>
        {links.length > 0 && fitsInCard === false && (
          <MenuNote tone="warn">La tarjeta llegó a su tamaño máximo y no entra todo: sacá contenido o achicá textos y botones.</MenuNote>
        )}
        {links.map(link => {
          const platform = PLATFORM_LABELS[detectPlatform(link.url)];
          const editing = editingId === link.id;
          return (
            <div key={link.id} data-mn-item="" className="mn-linkrow">
              <span className="mn-linkrow__ico" aria-hidden><PlatformIcon platform={detectPlatform(link.url)} size={16} color="currentColor" /></span>
              {editing ? (
                <TextInput
                  value={editUrl}
                  onChange={setEditUrl}
                  onKeyDown={e => {
                    if (e.key === "Enter") confirmEdit();
                    // stopPropagation: Esc cancels the edit only — it must not
                    // also reach the inspector's Esc and close it.
                    if (e.key === "Escape") { e.stopPropagation(); setEditingId(null); setEditUrl(""); }
                  }}
                  placeholder="https://..."
                  label="Editar URL"
                  type="url"
                  mono
                  style={{ flex: 1, minWidth: 0, height: 40, padding: "0 10px" }}
                />
              ) : (
                <span className="mn-linkrow__text">
                  <span className="mn-linkrow__name">{platform}</span>
                  <span className="mn-linkrow__url">{link.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
                </span>
              )}
              {editing ? (
                <IconButton icon="check" aria-label="Confirmar" title="Confirmar" size={34} iconSize={15} onClick={confirmEdit} />
              ) : (
                <IconButton icon="pencil" aria-label={`Editar link de ${platform}`} title="Editar" size={34} iconSize={15} onClick={() => startEdit(link)} />
              )}
              <IconButton icon="trash" tone="danger" aria-label={`Quitar link de ${platform}`} title="Quitar link" size={34} iconSize={15}
                onClick={e => { const el = e.currentTarget as HTMLElement; removeLink(link.id); refocusFieldControl(el); }} />
            </div>
          );
        })}

        {links.length < CONTACT_LINKS_MAX && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <TextInput
              value={newUrl}
              onChange={setNewUrl}
              onKeyDown={e => e.key === "Enter" && addLink()}
              placeholder="instagram.com/usuario…"
              label="URL del link nuevo"
              type="url"
              mono
              style={{ flex: 1, minWidth: 0 }}
            />
            <IconButton icon="plus" aria-label="Agregar link" title="Agregar link" onClick={addLink}
              size={44} className={draftReady ? "mn-iconbtn--accent" : "mn-iconbtn--filled"} />
          </div>
        )}
        <span className="mn-linkrow__count">{links.length}/{CONTACT_LINKS_MAX} · la plataforma se detecta sola</span>
      </MenuSection>

      <MenuSection label="Íconos" icon="maximize"
        summary={`${linksIconSize ?? CONTACT_LINK_ICON_SIZE} px · ${Math.round((linksIconOpacity ?? CONTACT_LINK_ICON_OPACITY) * 100)}%`}
        swatch={iconColor}
        changed={[linksIconSize, ownIconColor, linksIconOpacity].filter(v => v != null).length}
        onReset={() => linksCtl.resetIcons(card.blockStyle)}>
        <ColorRow label="Color" value={iconColor} onChange={v => linksCtl.setIconColor(v, card.blockStyle)}
          state={ownIconColor ? "modified" : "inherited"} inheritedLabel="Color de los textos"
          onReset={() => linksCtl.setIconColor(undefined, card.blockStyle)} />
        <SliderRow
          label="Tamaño" icon="maximize" min={CONTACT_LINK_ICON_SIZE_MIN} max={CONTACT_LINK_ICON_SIZE_MAX} step={1}
          value={linksIconSize ?? CONTACT_LINK_ICON_SIZE} unit="px" fmt={v => `${Math.round(v)} px`}
          onChange={v => linksCtl.setIconSize(v)}
          state={linksIconSize != null ? "modified" : undefined} onReset={() => linksCtl.resetIconSize()}
        />
        <SliderRow
          label="Opacidad" icon="eye" min={0.1} max={1} step={0.01}
          value={linksIconOpacity ?? CONTACT_LINK_ICON_OPACITY} fmt={v => `${Math.round(v * 100)}%`}
          onChange={v => linksCtl.setIconOpacity(v)}
          state={linksIconOpacity != null ? "modified" : undefined} onReset={() => linksCtl.resetIconOpacity()}
        />
        <MenuNote>Al pasar el mouse, cada ícono se ve entero y con el color de su plataforma.</MenuNote>
      </MenuSection>

      <BlockStyleFields card={card} blockKey="links" onChange={onChange} scope="Links" />
    </div>
  );
}
