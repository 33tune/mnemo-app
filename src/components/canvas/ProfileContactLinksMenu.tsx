"use client";
import { useState } from "react";
import type { ContactLink, ProfileCardData } from "@/types";
import { T, MenuSection, SliderRow, TextInput } from "@/ui";
import { detectPlatform, PlatformIcon, PLATFORM_LABELS } from "./SocialIcons";
import { CONTACT_LINKS_MAX, CONTACT_LINK_ICON_SIZE, CONTACT_LINK_ICON_SIZE_MIN, CONTACT_LINK_ICON_SIZE_MAX } from "@/lib/contactLinksBlock";

type ContactLinksPatch = Partial<Pick<ProfileCardData, "contactLinks" | "linksIconSize">>;

interface Props {
  contactLinks?: ContactLink[];
  linksIconSize?: number;
  onChange: (patch: ContactLinksPatch) => void;
}

// DATOS: agregar/editar/eliminar Contact Links. La plataforma no se elige acá
// — se detecta de la URL (ver detectPlatform) y solo se muestra como preview,
// consistente con "no almacenar info derivable". Sin inline editing en el
// canvas: todo pasa por este menú, igual que el resto de ProfileConfigMenu.
export default function ProfileContactLinksMenu({ contactLinks, linksIconSize, onChange }: Props) {
  const links = contactLinks ?? [];
  const [newUrl, setNewUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");

  function addLink() {
    const url = newUrl.trim();
    if (!url || links.length >= CONTACT_LINKS_MAX) return;
    onChange({ contactLinks: [...links, { id: crypto.randomUUID(), url }] });
    setNewUrl("");
  }

  function startEdit(link: ContactLink) {
    setEditingId(link.id);
    setEditUrl(link.url);
  }

  function confirmEdit() {
    const url = editUrl.trim();
    if (url && editingId) {
      onChange({ contactLinks: links.map(l => l.id === editingId ? { ...l, url } : l) });
    }
    setEditingId(null);
    setEditUrl("");
  }

  function removeLink(id: string) {
    onChange({ contactLinks: links.filter(l => l.id !== id) });
    if (editingId === id) { setEditingId(null); setEditUrl(""); }
  }

  return (
    // `first`: this component is used as a direct flex child (gap-managed by
    // the parent "datos" view in ProfileConfigMenu.tsx), same as
    // ProfileIdentityMenu/ProfileMetadataMenu — without it, MenuSection's own
    // marginTop would stack on top of that flex gap and double the spacing
    // above this section.
    <MenuSection label="Contact Links" first>
      <SliderRow
        label="Tamaño" min={CONTACT_LINK_ICON_SIZE_MIN} max={CONTACT_LINK_ICON_SIZE_MAX} step={1}
        value={linksIconSize ?? CONTACT_LINK_ICON_SIZE} unit="px"
        onChange={v => onChange({ linksIconSize: v })}
      />
      {links.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: T.space[2] }}>
          {links.map(link => (
            <div key={link.id} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: T.surface.raised, border: `1px solid ${T.border.subtle}`,
              borderRadius: T.radius.sm, padding: "5px 8px",
            }}>
              <PlatformIcon platform={detectPlatform(link.url)} size={12} color={T.text.secondary} />
              {editingId === link.id ? (
                <TextInput
                  value={editUrl}
                  onChange={setEditUrl}
                  onKeyDown={e => {
                    if (e.key === "Enter") confirmEdit();
                    if (e.key === "Escape") { setEditingId(null); setEditUrl(""); }
                  }}
                  placeholder="https://..."
                  type="url"
                  mono
                  style={{ flex: 1 }}
                />
              ) : (
                <span style={{
                  fontFamily: T.font.mono, fontSize: 9, color: T.text.muted, flex: 1,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {PLATFORM_LABELS[detectPlatform(link.url)]} · {link.url.replace(/^https?:\/\/(www\.)?/, "")}
                </span>
              )}
              {editingId === link.id ? (
                <button
                  title="Confirmar"
                  onClick={confirmEdit}
                  onMouseDown={e => e.stopPropagation()}
                  style={{ background: "transparent", border: "none", color: T.text.secondary, fontSize: 12, cursor: "pointer", padding: "0 2px" }}
                >✓</button>
              ) : (
                <button
                  title="Editar"
                  onClick={() => startEdit(link)}
                  onMouseDown={e => e.stopPropagation()}
                  style={{ background: "transparent", border: "none", color: T.text.muted, fontSize: 11, cursor: "pointer", padding: "0 2px" }}
                >✎</button>
              )}
              <button
                title="Eliminar"
                onClick={() => removeLink(link.id)}
                onMouseDown={e => e.stopPropagation()}
                style={{ background: "transparent", border: "none", color: T.text.muted, fontSize: 14, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}
              >×</button>
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
            type="url"
            mono
            style={{ flex: 1 }}
          />
          <button
            onClick={addLink}
            onMouseDown={e => e.stopPropagation()}
            style={{
              height: T.comp.inputH, padding: "0 12px",
              background: T.surface.raised, border: `1px solid ${T.border.default}`,
              borderRadius: T.radius.md, color: T.text.secondary, fontFamily: T.font.mono,
              fontSize: 12, cursor: "pointer", flexShrink: 0,
            }}
          >+</button>
        </div>
      )}
    </MenuSection>
  );
}
