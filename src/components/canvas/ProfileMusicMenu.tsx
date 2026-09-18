"use client";
import { useRef } from "react";
import type { MusicBlockData, MusicSourceType, ProfileCardData } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { T, MenuSection, MenuRow, SliderRow, TextInput, Tabs, ActionButton, Toggle, Collapsible } from "@/ui";

type MusicPatch = Partial<Pick<ProfileCardData, "music">>;

interface Props {
  music?:   MusicBlockData;
  onChange: (patch: MusicPatch) => void;
}

const DEFAULT_MUSIC: MusicBlockData = { sourceType: "url", audioUrl: "" };

// DATOS: activar/configurar el bloque Music. Presencia de `card.music`
// (no un boolean aparte) es lo que activa el bloque — mismo criterio que
// Contact Links usa la presencia de `contactLinks`. Apagar el toggle hace
// `onChange({ music: undefined })`: hasMusic pasa a false, el bloque deja
// de entrar en `extraBlocks` (ProfileCard.tsx) y computeBlockLayout()/
// computeRequiredCardHeight() liberan el espacio solos — nunca se tocan
// posiciones de otros bloques a mano acá. Solo audio propio (upload o URL
// directa a un archivo) — sin Spotify/YouTube/SoundCloud, ver CLAUDE.md.
export default function ProfileMusicMenu({ music, onChange }: Props) {
  const audioRef   = useRef<HTMLInputElement>(null);
  const artworkRef = useRef<HTMLInputElement>(null);

  function patch(p: Partial<MusicBlockData>) {
    if (!music) return;
    onChange({ music: { ...music, ...p } });
  }

  function setSourceType(t: MusicSourceType) {
    if (!music) return;
    // A URL string and an uploaded storage URL aren't the same kind of
    // value — switching tabs clears the previous audioUrl instead of
    // silently keeping the old source under the new tab.
    onChange({ music: { ...music, sourceType: t, audioUrl: "" } });
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !music) return;
    const { publicUrl } = await uploadToStorage(f);
    patch({ audioUrl: publicUrl });
    if (audioRef.current) audioRef.current.value = "";
  }

  async function handleArtworkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !music) return;
    const { publicUrl } = await uploadToStorage(f);
    patch({ artwork: publicUrl });
    if (artworkRef.current) artworkRef.current.value = "";
  }

  const sourceType = music?.sourceType ?? "url";

  return (
    // `first`: same reasoning as ProfileContactLinksMenu — this component is
    // a direct flex child of the "datos" view's gap-managed column
    // (ProfileConfigMenu.tsx), so its own leading MenuSection needs `first`
    // or its marginTop would double up on top of that flex gap.
    <MenuSection label="Music" first>
      <MenuRow label="Activar Music">
        <Toggle
          value={!!music}
          onChange={v => onChange({ music: v ? DEFAULT_MUSIC : undefined })}
        />
      </MenuRow>

      {music && (
        <>
          <Tabs
            tabs={[{ id: "url", label: "URL" }, { id: "upload", label: "Subir" }]}
            active={sourceType}
            onChange={id => setSourceType(id as MusicSourceType)}
          />

          {sourceType === "url" ? (
            <TextInput
              value={music.audioUrl}
              onChange={v => patch({ audioUrl: v })}
              placeholder="https://.../track.mp3"
              type="url"
              mono
            />
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <ActionButton onClick={() => audioRef.current?.click()}>
                {music.audioUrl ? "reemplazar audio" : "subir audio"}
              </ActionButton>
              {music.audioUrl && (
                <ActionButton variant="danger" onClick={() => patch({ audioUrl: "" })}>quitar</ActionButton>
              )}
            </div>
          )}
          <input ref={audioRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={handleAudioUpload} />

          <TextInput value={music.title ?? ""} onChange={v => patch({ title: v })} placeholder="Título" />

          <Collapsible label="Más">
            <TextInput value={music.artist ?? ""} onChange={v => patch({ artist: v })} placeholder="Artista" />

            <SubLabel>Artwork</SubLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div onClick={() => artworkRef.current?.click()} style={{
                width: 46, height: 46, borderRadius: 4, flexShrink: 0,
                overflow: "hidden", cursor: "pointer",
                border: `1px solid ${T.border.default}`, background: T.surface.raised,
              }}>
                {music.artwork
                  ? <img src={music.artwork} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.text.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                      </svg>
                    </div>
                  )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <ActionButton onClick={() => artworkRef.current?.click()}>subir</ActionButton>
                {music.artwork && <ActionButton variant="danger" onClick={() => patch({ artwork: undefined })}>quitar</ActionButton>}
              </div>
            </div>
            <input ref={artworkRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleArtworkUpload} />

            <SliderRow
              label="Volumen inicial" min={0} max={1} step={0.01}
              value={music.volume ?? 1} fmt={v => `${Math.round(v * 100)}%`}
              onChange={v => patch({ volume: v })}
            />
          </Collapsible>
        </>
      )}
    </MenuSection>
  );
}

// Small muted mono caption for a sub-group inside one MenuSection — same
// typographic language as MenuSection's own label, just not a new top-level
// section (Artwork is part of Music, not its own door in ProfileConfigMenu).
function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em",
      textTransform: "uppercase", color: T.text.muted, userSelect: "none",
      marginTop: T.space[1],
    }}>
      {children}
    </div>
  );
}
