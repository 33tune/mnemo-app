"use client";
import { useRef, useState } from "react";
import { uploadToStorage } from "@/lib/storage";
import { T, MenuSection, MenuRow, ActionButton } from "@/ui";

interface ProfileIdentityMenuProps {
  photo:    string;
  name:     string;
  handle:   string;
  onChange: (patch: { photo?: string; name?: string }) => void;
}

// DATOS: quién sos. Foto, nombre y handle (de cuenta, solo lectura) — nada visual acá,
// eso vive en ESTILO → Tipografía. Ver [[ProfileMetadataMenu]] para descriptor/ubicación/bio/views.
export default function ProfileIdentityMenu({ photo, name, handle, onChange }: ProfileIdentityMenuProps) {
  const [editingName, setEditingName] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const { publicUrl } = await uploadToStorage(f);
    onChange({ photo: publicUrl });
    if (photoRef.current) photoRef.current.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[4] }}>
      <MenuSection label="Foto" first>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div onClick={() => photoRef.current?.click()} style={{
            width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
            overflow: "hidden", cursor: "pointer",
            border: `1px solid ${T.border.default}`, background: T.surface.raised,
          }}>
            {photo
              ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.text.muted} strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <ActionButton onClick={() => photoRef.current?.click()}>subir</ActionButton>
            {photo && <ActionButton variant="danger" onClick={() => onChange({ photo: "" })}>quitar</ActionButton>}
          </div>
        </div>
        <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
      </MenuSection>

      <MenuSection label="Nombre">
        {editingName ? (
          <input autoFocus
            value={name}
            onChange={e => onChange({ name: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => e.key === "Enter" && setEditingName(false)}
            onMouseDown={e => e.stopPropagation()}
            placeholder="nombre"
            style={{ width: "100%", background: "transparent", color: T.text.primary, fontSize: 18, fontWeight: 600, fontFamily: T.font.sans, padding: "6px 0", borderBottom: `1px solid ${T.border.default}`, boxSizing: "border-box", outline: "none" }}
          />
        ) : (
          <div onClick={() => setEditingName(true)}
            style={{ fontSize: 18, fontWeight: 600, fontFamily: T.font.sans, color: name ? T.text.primary : T.text.muted, cursor: "text", padding: "6px 0", borderBottom: `1px solid ${T.border.subtle}` }}>
            {name || "nombre"}
          </div>
        )}
      </MenuSection>

      <MenuSection label="Handle">
        <MenuRow>
          <span style={{ fontFamily: T.font.mono, fontSize: T.size.sm, color: T.text.muted }}>@{handle}</span>
        </MenuRow>
      </MenuSection>
    </div>
  );
}
