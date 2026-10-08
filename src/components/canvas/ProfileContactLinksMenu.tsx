"use client";
import { useState } from "react";
import type { ContactLink, ProfileCardData } from "@/types";
import { T, uv, MenuSection, MenuNote, SliderRow, TextInput, IconButton, refocusFieldControl } from "@/ui";
import { detectPlatform, PlatformIcon, PLATFORM_LABELS } from "./SocialIcons";
import { CONTACT_LINKS_MAX, CONTACT_LINK_ICON_SIZE, CONTACT_LINK_ICON_SIZE_MIN, CONTACT_LINK_ICON_SIZE_MAX } from "@/lib/contactLinksBlock";
import BlockStyleFields from "./BlockStyleFields";
import { linksController } from "@/lib/objectControllers";

type ContactLinksPatch = Partial<ProfileCardData>;

interface Props {
  card: Pick<ProfileCardData, "contactLinks" | "linksIconSize" | "blockStyle" | "blockStylePaused">;
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
export default function ProfileContactLinksMenu({ card, fitsInCard, onChange }: Props) {
  const { contactLinks, linksIconSize } = card;
  const links = contactLinks ?? [];
  const [newUrl, setNewUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  // Editor v3 Phase C: writes go through the links controller.
  const linksCtl = linksController(links, onChange);

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

  return (
    // `first`: this component is used as a direct flex child (gap-managed by
    // the parent "datos" view in ProfileConfigMenu.tsx), same as
    // ProfileIdentityMenu/ProfileMetadataMenu — without it, MenuSection's own
    // marginTop would stack on top of that flex gap and double the spacing
    // above this section.
    <MenuSection label="Contact Links" first>
      {links.length > 0 && fitsInCard === false && (
        <MenuNote>
          No entra en la altura actual de la card — no se muestra hasta que la agrandes.
        </MenuNote>
      )}
      <SliderRow
        label="Tamaño" min={CONTACT_LINK_ICON_SIZE_MIN} max={CONTACT_LINK_ICON_SIZE_MAX} step={1}
        value={linksIconSize ?? CONTACT_LINK_ICON_SIZE} unit="px"
        onChange={v => linksCtl.setIconSize(v)}
      />
      {links.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: T.space[2] }}>
          {links.map(link => (
            <div key={link.id} data-mn-item="" style={{
              display: "flex", alignItems: "center", gap: 6,
              background: uv("surface-group"), color: uv("text-secondary"), boxShadow: `inset 0 0 0 0.5px ${uv("line-group")}`,
              borderRadius: T.ui.radius.control, padding: "2px 2px 2px 10px", minHeight: T.ui.size.row,
            }}>
              <PlatformIcon platform={detectPlatform(link.url)} size={12} color="currentColor" />
              {editingId === link.id ? (
                <TextInput
                  value={editUrl}
                  onChange={setEditUrl}
                  onKeyDown={e => {
                    if (e.key === "Enter") confirmEdit();
                    // stopPropagation: Esc cancels the edit only — it must not
                    // also reach MenuPanel's Esc and close the whole editor.
                    if (e.key === "Escape") { e.stopPropagation(); setEditingId(null); setEditUrl(""); }
                  }}
                  placeholder="https://..."
                  label="Editar URL del link"
                  type="url"
                  mono
                  style={{ flex: 1, minWidth: 0, height: T.ui.size.control }}
                />
              ) : (
                <span style={{
                  ...T.type.value, color: uv("text-secondary"), flex: 1, minWidth: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {PLATFORM_LABELS[detectPlatform(link.url)]} · {link.url.replace(/^https?:\/\/(www\.)?/, "")}
                </span>
              )}
              {editingId === link.id ? (
                <IconButton icon="check" aria-label="Confirmar cambio" title="Confirmar" onClick={confirmEdit} />
              ) : (
                <IconButton icon="pencil" aria-label={`Editar link de ${PLATFORM_LABELS[detectPlatform(link.url)]}`} title="Editar" onClick={() => startEdit(link)} />
              )}
              <IconButton icon="close" tone="danger" aria-label={`Eliminar link de ${PLATFORM_LABELS[detectPlatform(link.url)]}`} title="Eliminar" onClick={e => { const el = e.currentTarget as HTMLElement; removeLink(link.id); refocusFieldControl(el); }} />
            </div>
          ))}
        </div>
      )}

      {links.length < CONTACT_LINKS_MAX && (
        <div style={{ display: "flex", gap: 6 }}>
          <TextInput
            value={newUrl}
            onChange={setNewUrl}
            onKeyDown={e => e.key === "Enter" && addLink()}
            placeholder="instagram.com/usuario, github.com/user…"
            label="URL del link nuevo"
            type="url"
            mono
            style={{ flex: 1 }}
          />
          <IconButton icon="plus" aria-label="Agregar link" title="Agregar" onClick={addLink}
            size={T.comp.inputH} className="mn-iconbtn--filled" />
        </div>
      )}

      <BlockStyleFields card={card} blockKey="links" showIconColor onChange={onChange} />
    </MenuSection>
  );
}
